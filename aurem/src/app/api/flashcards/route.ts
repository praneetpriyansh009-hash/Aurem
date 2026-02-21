import { NextResponse } from "next/server";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

async function callAI(prompt: string): Promise<string> {
    try {
        const res = await fetch(GROQ_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
            body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }], temperature: 0.7, max_tokens: 4096 }),
        });
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
    } catch {
        const res = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 4096 } }),
        });
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }
}

export async function POST(request: Request) {
    try {
        const { content, topic, count = 15 } = await request.json();

        if (!content && !topic) {
            return NextResponse.json({ error: "Content or topic required" }, { status: 400 });
        }

        const prompt = `Generate ${count} educational flashcards ${topic ? `about "${topic}"` : "from the following content"}.

${content ? `CONTENT:\n${content.slice(0, 4000)}` : ""}

Return a JSON array of flashcards:
[
  {
    "front": "Clear, specific question or concept prompt",
    "back": "Comprehensive answer with key details and examples",
    "topic": "specific topic name",
    "difficulty": "easy" | "medium" | "hard"
  },
  ...
]

Rules:
- Front side should be a clear question or "Define/Explain/What is..." prompt
- Back side should teach the concept thoroughly but concisely
- Mix difficulties: ~30% easy, ~50% medium, ~20% hard
- Cover the most important concepts first
- Each card should be self-contained

Return ONLY the JSON array, no markdown.`;

        const response = await callAI(prompt);

        let flashcards;
        try {
            const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            flashcards = JSON.parse(cleaned);
        } catch {
            const match = response.match(/\[[\s\S]*\]/);
            if (match) flashcards = JSON.parse(match[0]);
            else return NextResponse.json({ error: "Failed to parse flashcards" }, { status: 500 });
        }

        // Add SM-2 defaults
        flashcards = flashcards.map((f: Record<string, unknown>, i: number) => ({
            id: `fc_${Date.now()}_${i}`,
            ...f,
            interval: 1,
            easeFactor: 2.5,
            repetitions: 0,
            nextReview: new Date().toISOString(),
            status: "new",
        }));

        return NextResponse.json({ flashcards });
    } catch (error) {
        console.error("[Flashcard API Error]:", error);
        return NextResponse.json({ error: "Failed to generate flashcards" }, { status: 500 });
    }
}
