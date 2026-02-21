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
        const { mode, ...params } = await request.json();

        let prompt = "";

        if (mode === "career") {
            prompt = `You are an expert career counselor for students. Based on the following interests and strengths, recommend 5 ideal career paths.

Interests: ${params.interests || "Not specified"}
Strengths: ${params.strengths || "Not specified"}
Preferred Field: ${params.field || "Any"}

Return JSON:
{
  "careers": [
    {
      "title": "Career Title",
      "description": "2-3 sentence description",
      "avgSalary": "$XX,XXX - $XX,XXX",
      "growthOutlook": "High/Medium/Low",
      "requiredEducation": "What degree/certification needed",
      "skills": ["skill1", "skill2", "skill3"],
      "topColleges": ["College 1", "College 2", "College 3"],
      "matchScore": 85
    }
  ]
}
Return ONLY valid JSON.`;
        } else if (mode === "colleges") {
            prompt = `You are a college admissions expert. Find the best matching colleges based on these criteria:

Country: ${params.country || "Any"}
Major: ${params.major || "Any"}
Budget: ${params.budget || "Any"}
Preferred Ranking: ${params.ranking || "Any"}
Test Scores: ${params.scores || "Not provided"}

Return JSON with 8-10 colleges:
{
  "colleges": [
    {
      "name": "University Name",
      "location": "City, Country",
      "matchPercentage": 85,
      "ranking": "#X in Country",
      "acceptanceRate": "XX%",
      "tuition": "$XX,XXX/year",
      "strengths": ["strength1", "strength2"],
      "scholarshipInfo": "Available scholarships info"
    }
  ]
}
Return ONLY valid JSON.`;
        } else if (mode === "profile") {
            prompt = `You are an expert college admissions analyst. Analyze this student profile and match them to colleges:

GPA: ${params.gpa || "Not provided"}
Test Scores: ${JSON.stringify(params.testScores || [])}
Target Major: ${params.major || "Undecided"}
Extracurriculars: ${(params.extracurriculars || []).join(", ") || "None listed"}
Budget: ${params.budget || "Not specified"}
Preferred Location: ${params.location || "Anywhere"}
Preferred Country: ${params.country || "Any"}

Return JSON:
{
  "profileStrength": "Strong/Moderate/Developing",
  "overallScore": 78,
  "analysis": "3-4 sentence analysis of the profile",
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "matchedColleges": [
    {
      "name": "College Name",
      "location": "City, Country",
      "matchPercentage": 90,
      "category": "Reach/Target/Safety",
      "ranking": "#X",
      "acceptanceRate": "XX%",
      "tuition": "$XX,XXX/year",
      "strengths": ["strength1", "strength2"],
      "whyGoodFit": "1-2 sentence explanation"
    }
  ]
}
Return ONLY valid JSON.`;
        } else if (mode === "chat") {
            prompt = `You are an friendly, expert college admissions counselor chatbot named "AUREM College Guide". 
Answer the student's question helpfully and specifically. Be encouraging but realistic.

Student's question: ${params.message}

${params.context ? `Previous context: ${params.context}` : ""}

Provide a helpful, detailed but concise response. Format nicely for readability.`;
        } else {
            return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
        }

        const response = await callAI(prompt);

        if (mode === "chat") {
            return NextResponse.json({ reply: response });
        }

        // Parse JSON response
        let result;
        try {
            const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            result = JSON.parse(cleaned);
        } catch {
            const match = response.match(/\{[\s\S]*\}/);
            if (match) result = JSON.parse(match[0]);
            else return NextResponse.json({ error: "Failed to parse response" }, { status: 500 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("[College API Error]:", error);
        return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
    }
}
