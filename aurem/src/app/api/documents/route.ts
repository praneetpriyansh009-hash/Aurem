import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

async function callAI(prompt: string) {
    // Try Groq first
    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.6,
                max_tokens: 3000,
            }),
        });
        if (!response.ok) throw new Error("Groq failed");
        const data = await response.json();
        return data.choices[0].message.content;
    } catch {
        // Fallback to Gemini
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.6, maxOutputTokens: 3000 },
                }),
            }
        );
        if (!response.ok) throw new Error("Gemini failed");
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }
}

function extractJSON(text: string) {
    // Try to extract JSON from markdown code blocks or raw text
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
        try { return JSON.parse(jsonMatch[1]); } catch { /* */ }
    }
    try { return JSON.parse(text); } catch { return null; }
}

export async function POST(request: NextRequest) {
    try {
        const { content } = await request.json();
        if (!content) return NextResponse.json({ error: "No content provided" }, { status: 400 });

        const prompt = `Analyze the following study document/notes and return a JSON response with this exact structure:
{
  "summary": "A comprehensive summary of the document in 3-5 paragraphs",
  "keyPoints": ["key point 1", "key point 2", ...at least 5 key points],
  "questions": [
    {"question": "An exam-worthy question based on the content", "answer": "A clear, concise answer"},
    ...at least 5 questions
  ]
}

IMPORTANT: Return ONLY valid JSON. No markdown, no extra text.

DOCUMENT:
${content.substring(0, 15000)}`;

        const result = await callAI(prompt);
        const parsed = extractJSON(result);

        if (parsed) {
            return NextResponse.json(parsed);
        }

        return NextResponse.json({
            summary: result,
            keyPoints: ["Analysis complete — see summary above"],
            questions: [{ question: "What is the main idea of this document?", answer: "Refer to the summary for details." }],
        });
    } catch (error) {
        console.error("Documents API error:", error);
        return NextResponse.json({ error: "Failed to analyze document" }, { status: 500 });
    }
}
