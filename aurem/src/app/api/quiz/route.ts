import { NextResponse } from "next/server";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

interface QuizRequest {
    board?: string;
    classLevel?: string;
    subject: string;
    chapters?: string[];
    questionCount: number;
    difficulty: string;
    questionType: string;
    weakTopics?: string[];
    content?: string;
}

async function callGroq(prompt: string): Promise<string> {
    const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 4096,
        }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
}

async function callGemini(prompt: string): Promise<string> {
    const res = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
        }),
    });
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

function buildQuizPrompt(req: QuizRequest): string {
    const typeMap: Record<string, string> = {
        mcq: "Multiple Choice Questions with 4 options each",
        theory: "Short answer/theory questions requiring 2-3 sentence answers",
        "true-false": "True or False statements",
        mixed: "A mix of MCQ, True/False, and short answer questions",
    };

    const examPatterns: Record<string, string> = {
        JEE: "Follow JEE Main/Advanced pattern with numerical and conceptual questions. Include calculation-heavy problems.",
        NEET: "Follow NEET pattern with biology-heavy MCQs. Focus on NCERT concepts and application.",
        SAT: "Follow SAT pattern with reading comprehension and data analysis.",
        ACT: "Follow ACT pattern with time-pressured reasoning questions.",
        CBSE: "Follow CBSE board exam pattern with NCERT-aligned questions.",
        ICSE: "Follow ICSE pattern with application-based questions.",
    };

    const weakContext = req.weakTopics?.length
        ? `\n\nIMPORTANT: The student is weak in these specific topics: ${req.weakTopics.join(", ")}. 
           Include 40% of questions specifically targeting these weak areas to help them improve.
           Make questions on weak topics slightly easier to build confidence, then gradually harder.`
        : "";

    const examPattern = req.board && examPatterns[req.board]
        ? `\nExam Pattern: ${examPatterns[req.board]}`
        : "";

    return `You are an expert education assessment designer. Generate a quiz with these specifications:

Subject: ${req.subject}
${req.chapters?.length ? `Chapters/Topics: ${req.chapters.join(", ")}` : ""}
${req.board ? `Board/Exam: ${req.board}` : ""}
${req.classLevel ? `Class: ${req.classLevel}` : ""}
Number of Questions: ${req.questionCount}
Difficulty: ${req.difficulty === "adaptive" ? "Start easy, gradually increase difficulty" : req.difficulty}
Question Type: ${typeMap[req.questionType] || "Multiple Choice Questions"}
${examPattern}
${weakContext}

${req.content ? `\nReference Content:\n${req.content.slice(0, 3000)}` : ""}

RESPOND WITH ONLY A VALID JSON ARRAY of questions. Each question object must have:
{
  "id": "q1",
  "type": "mcq" | "theory" | "true-false",
  "question": "the question text",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],  // only for mcq
  "correctAnswer": "the correct answer",
  "explanation": "detailed explanation of why this is correct, referencing the concept",
  "difficulty": "easy" | "medium" | "hard",
  "topic": "specific topic name",
  "chapter": "chapter name",
  "subject": "${req.subject}",
  "marks": 1
}

Rules:
- Questions must be conceptually challenging, not just memorization
- Explanations must teach the concept, not just state the answer
- For MCQs, distractors must be plausible and test common misconceptions
- For theory questions, omit the "options" field
- For true-false, set options to ["True", "False"]
- Vary the difficulty according to the specified level
- Each question must have a clear, specific "topic" tag for weakness tracking

Return ONLY the JSON array, no markdown, no explanation.`;
}

export async function POST(request: Request) {
    try {
        const body: QuizRequest = await request.json();

        if (!body.subject || !body.questionCount) {
            return NextResponse.json({ error: "Subject and question count required" }, { status: 400 });
        }

        const prompt = buildQuizPrompt(body);

        let response: string;
        try {
            response = await callGroq(prompt);
        } catch {
            response = await callGemini(prompt);
        }

        // Parse JSON from response
        let questions;
        try {
            const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            questions = JSON.parse(cleaned);
        } catch {
            const match = response.match(/\[[\s\S]*\]/);
            if (match) {
                questions = JSON.parse(match[0]);
            } else {
                return NextResponse.json({ error: "Failed to parse quiz questions" }, { status: 500 });
            }
        }

        // Ensure IDs
        questions = questions.map((q: Record<string, unknown>, i: number) => ({
            ...q,
            id: q.id || `q${i + 1}`,
            marks: q.marks || 1,
            subject: q.subject || body.subject,
        }));

        // Analyze potential weak areas
        const topicDistribution = questions.reduce((acc: Record<string, number>, q: Record<string, unknown>) => {
            const topic = (q.topic as string) || "General";
            acc[topic] = (acc[topic] || 0) + 1;
            return acc;
        }, {});

        return NextResponse.json({
            questions,
            metadata: {
                totalQuestions: questions.length,
                totalMarks: questions.reduce((a: number, q: Record<string, unknown>) => a + ((q.marks as number) || 1), 0),
                difficulty: body.difficulty,
                topicDistribution,
                board: body.board,
                subject: body.subject,
            },
        });
    } catch (error) {
        console.error("[Quiz API Error]:", error);
        return NextResponse.json({ error: "Failed to generate quiz" }, { status: 500 });
    }
}
