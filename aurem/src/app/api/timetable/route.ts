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
                temperature: 0.6,
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
                    generationConfig: { temperature: 0.6, maxOutputTokens: 4000 },
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
        const { examDate, weakTopics, energyLevel } = await request.json();

        const prompt = `Create a 7-day study timetable for a student with these details:
- Exam date: ${examDate || "2 weeks from now"}
- Weak topics: ${weakTopics || "General revision"}
- Peak energy time: ${energyLevel || "morning"}

Return ONLY valid JSON in this exact format:
{
  "timetable": [
    {
      "id": "monday-1",
      "day": "Monday",
      "timeSlot": "9:00 - 10:30",
      "subject": "Mathematics",
      "topic": "Quadratic Equations",
      "duration": 90,
      "priority": "high",
      "completed": false
    }
  ]
}

REQUIREMENTS:
- Create 3-5 entries per day for each day of the week (Monday-Sunday)
- Schedule harder/weak topics during peak energy time
- Include breaks implicitly (between slots)
- Priority should be "high" for weak topics, "medium" for moderate, "low" for revision
- Mix subjects throughout the day to avoid fatigue
- Include at least one revision slot per day
- Return ONLY valid JSON, no markdown or extra text`;

        const result = await callAI(prompt);
        const parsed = extractJSON(result);

        if (parsed?.timetable) {
            return NextResponse.json(parsed);
        }

        return NextResponse.json({ timetable: [] });
    } catch (error) {
        console.error("Timetable API error:", error);
        return NextResponse.json({ error: "Failed to generate timetable" }, { status: 500 });
    }
}
