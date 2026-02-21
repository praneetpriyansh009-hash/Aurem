import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

async function callAI(prompt: string) {
    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.85,
                max_tokens: 4000,
            }),
        });
        if (!response.ok) throw new Error("Groq failed");
        const data = await response.json();
        return data.choices[0].message.content;
    } catch {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.85, maxOutputTokens: 4000 },
                }),
            }
        );
        if (!response.ok) throw new Error("Gemini failed");
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }
}

function extractJSON(text: string) {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) { try { return JSON.parse(jsonMatch[1]); } catch { /* */ } }
    try { return JSON.parse(text); } catch { return null; }
}

export async function POST(request: NextRequest) {
    try {
        const { mode, syllabus, documentContent } = await request.json();

        const context = mode === "document" && documentContent
            ? `Based on this document:\n${documentContent.substring(0, 10000)}`
            : `Topic: ${syllabus?.topic || "General Science"}\nSubject: ${syllabus?.subject || "Science"}\nLevel: ${syllabus?.level || "intermediate"}`;

        const prompt = `Generate a natural, engaging podcast script between two hosts (Alex and Sam) discussing this educational topic.

${context}

Return ONLY valid JSON in this exact format:
{
  "script": [
    {"speaker": "Alex", "text": "Welcome back to The Deep Dive! Today we're..."},
    {"speaker": "Sam", "text": "Yeah, this one is really fascinating..."},
    ...
  ]
}

REQUIREMENTS:
- Make it EXTREMELY natural and conversational — like a real podcast
- Include natural speech patterns: "um", "you know", "honestly", "actually", "right?"
- Alex is the enthusiastic host who asks great questions
- Sam is the knowledgeable expert who explains with analogies
- Include moments of genuine surprise, humor, and "aha" moments
- Cover the topic thoroughly but keep it engaging
- Generate at least 15-20 lines of dialogue
- Include interruptions, agreements ("Exactly!", "Oh yeah"), and reactions
- End with a brief recap and call to action for studying
- Return ONLY valid JSON, no markdown or extra text`;

        const result = await callAI(prompt);
        const parsed = extractJSON(result);

        if (parsed?.script) {
            return NextResponse.json(parsed);
        }

        return NextResponse.json({
            script: [
                { speaker: "Alex", text: "Hey everyone, welcome back! Today's topic is really exciting." },
                { speaker: "Sam", text: "It really is. Let me break it down for you." },
            ],
        });
    } catch (error) {
        console.error("Podcast API error:", error);
        return NextResponse.json({ error: "Failed to generate podcast" }, { status: 500 });
    }
}
