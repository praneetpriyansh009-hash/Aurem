/**
 * RAG Service — Document chunking, retrieval, and prompt building
 * Ported and enhanced from the original Atlas ragService.js
 */

export interface ChunkedDocument {
    largeChunks: string[];
    smallChunks: { text: string; parentId: number }[];
}

export const RagService = {
    /**
     * Hierarchical chunking: small chunks (300 chars) for search precision,
     * large chunks (1500 chars) for LLM context.
     */
    chunkText(text: string): ChunkedDocument {
        const largeChunks: string[] = [];
        const smallChunks: { text: string; parentId: number }[] = [];
        const largeSize = 1500;
        const smallSize = 300;
        const overlap = 50;

        for (let i = 0; i < text.length; i += largeSize - overlap) {
            const chunk = text.substring(i, i + largeSize);
            largeChunks.push(chunk);

            for (let j = 0; j < chunk.length; j += smallSize - overlap) {
                smallChunks.push({
                    text: chunk.substring(j, j + smallSize),
                    parentId: largeChunks.length - 1,
                });
            }
        }

        return { largeChunks, smallChunks };
    },

    /**
     * Multi-Vector style retrieval: search small chunks, return parent large chunks
     */
    retrieveContext(query: string, documentContent: string): string {
        if (!documentContent) return "";

        const { largeChunks, smallChunks } = this.chunkText(documentContent);
        const queryTerms = query
            .toLowerCase()
            .split(/\s+/)
            .filter((t) => t.length > 2);

        const scoredSmall = smallChunks.map((s) => {
            let score = 0;
            const textLower = s.text.toLowerCase();
            queryTerms.forEach((term) => {
                if (textLower.includes(term)) score += 1;
            });
            return { ...s, score };
        });

        const topParents = [
            ...new Set(
                scoredSmall
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 5)
                    .filter((s) => s.score > 0)
                    .map((s) => s.parentId)
            ),
        ].slice(0, 3);

        if (topParents.length === 0) return documentContent.substring(0, 3000);

        return topParents.map((id) => largeChunks[id]).join("\n\n---\n\n");
    },

    /**
     * Extract JSON from potentially messy LLM output
     */
    extractJson(text: string): unknown {
        try {
            const start = text.indexOf("{");
            const end = text.lastIndexOf("}");
            if (start === -1 || end === -1) throw new Error("No JSON object found");
            return JSON.parse(text.substring(start, end + 1));
        } catch {
            const start = text.indexOf("[");
            const end = text.lastIndexOf("]");
            if (start !== -1 && end !== -1) {
                return JSON.parse(text.substring(start, end + 1));
            }
            throw new Error("Failed to parse AI response as JSON");
        }
    },

    /**
     * Build a conceptual gating prompt that forces the AI to check understanding first
     */
    buildConceptualGatePrompt(query: string, context: string): string {
        return `You are AUREM, a premium AI study companion. You NEVER give direct full answers. Instead, you follow this protocol:

1. ASSESS: Determine what concept the student is asking about.
2. HINT: Give a targeted hint that points toward the answer without revealing it.
3. MICRO-QUIZ: Ask a simple related question to test if the student grasps the underlying concept.
4. Only if the student demonstrates understanding in follow-up messages, provide the complete explanation.

CONTEXT FROM STUDENT'S NOTES:
${context.substring(0, 6000)}

STUDENT'S QUESTION: ${query}

Respond in this JSON format:
{
  "conceptArea": "the main concept being tested",
  "hint": "a helpful hint pointing toward the answer",
  "microQuiz": "a simple question to test concept understanding",
  "confidenceScore": 0.0-1.0,
  "citations": ["relevant source references from the context"]
}`;
    },

    /**
     * Build quiz generation prompt
     */
    buildQuizPrompt(context: string, difficulty: string, count: number): string {
        return `You are an expert exam paper setter. Create a valid, syllabus-aligned assessment.

CONTEXT:
${context.substring(0, 10000)}

REQUIREMENTS:
- Difficulty: ${difficulty}
- Questions: ${count}
- Mix of MCQ, True/False, and short answer

OUTPUT: Respond ONLY with valid JSON:
{
  "quiz_metadata": {"topic": "string", "difficulty": "${difficulty}"},
  "questions": [
    {
      "id": 1,
      "type": "mcq",
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "Option text",
      "explanation": "string",
      "topic": "string",
      "difficulty": "easy|medium|hard"
    }
  ]
}`;
    },
};

export default RagService;
