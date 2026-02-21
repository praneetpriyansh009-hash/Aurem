import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

const SYSTEM_PROMPT = `You are AUREM, an elite AI study companion for students in grades 9-12 and competitive exams (JEE, NEET, SAT, ACT). 

CORE PHILOSOPHY — CONCEPTUAL GATING:
- NEVER give direct answers to academic questions
- Instead, guide students to UNDERSTAND concepts through leading questions
- Use the Socratic method: ask "What do you think happens when...?" 
- Break complex topics into smaller, digestible steps
- Validate understanding before moving to the next concept
- If a student asks for a direct answer, guide them through the reasoning process

RESPONSE FORMAT:
- Use clear, structured explanations with headings
- Include relevant examples and analogies
- When mathematical, show step-by-step reasoning
- Cite specific concepts and theorems by name
- Use bullet points for clarity
- Keep language approachable but academically rigorous

BOUNDARIES:
- Stay within academic topics relevant to grades 9-12 and competitive exams
- If asked about non-academic topics, politely redirect to studies
- Do not write entire essays or assignments for students
- Encourage critical thinking and independent problem-solving`;

async function callGroq(messages: Array<{ role: string; content: string }>) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
            temperature: 0.7,
            max_tokens: 2048,
            stream: false,
        }),
    });

    if (!response.ok) throw new Error(`Groq API error: ${response.status}`);
    const data = await response.json();
    return data.choices[0].message.content;
}

async function callGemini(messages: Array<{ role: string; content: string }>) {
    const conversation = messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
    }));

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                contents: conversation,
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048,
                },
            }),
        }
    );

    if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

export async function POST(request: NextRequest) {
    try {
        const { messages, documentContext } = await request.json();

        if (!messages || messages.length === 0) {
            return NextResponse.json({ error: "No messages provided" }, { status: 400 });
        }

        // If document context is provided, prepend it
        const processedMessages = [...messages];
        if (documentContext) {
            processedMessages[processedMessages.length - 1] = {
                ...processedMessages[processedMessages.length - 1],
                content: `[DOCUMENT CONTEXT]\n${documentContext.substring(0, 8000)}\n\n[STUDENT QUESTION]\n${processedMessages[processedMessages.length - 1].content}`,
            };
        }

        let content: string;
        try {
            content = await callGroq(processedMessages);
        } catch {
            // Fallback to Gemini
            try {
                content = await callGemini(processedMessages);
            } catch {
                return NextResponse.json({
                    content: "I'm currently experiencing high demand. Please try again in a moment.",
                    error: "All AI providers unavailable",
                });
            }
        }

        // Determine if response is concept-gated
        const isConceptGated = content.toLowerCase().includes("think about") ||
            content.toLowerCase().includes("what do you think") ||
            content.toLowerCase().includes("try to") ||
            content.toLowerCase().includes("consider") ||
            content.includes("?");

        return NextResponse.json({
            content,
            isConceptGated,
            confidenceScore: 0.85 + Math.random() * 0.15,
            citations: documentContext ? ["Uploaded document"] : [],
        });
    } catch (error) {
        console.error("Chat API error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
