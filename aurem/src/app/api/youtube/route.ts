import { NextResponse } from "next/server";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

async function callGroq(prompt: string): Promise<string> {
    const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }], temperature: 0.6, max_tokens: 4096 }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
}

async function callGemini(prompt: string): Promise<string> {
    const res = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.6, maxOutputTokens: 4096 } }),
    });
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// Extract transcript using a free API approach
async function getTranscript(videoId: string): Promise<string> {
    // Try innertube API (no auth needed)
    try {
        const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
        const html = await res.text();

        // Extract captions URL from the page
        const captionMatch = html.match(/"captionTracks":\s*\[(.*?)\]/);
        if (captionMatch) {
            const tracks = JSON.parse(`[${captionMatch[1]}]`);
            const englishTrack = tracks.find((t: { languageCode: string }) =>
                t.languageCode === "en" || t.languageCode?.startsWith("en")
            ) || tracks[0];

            if (englishTrack?.baseUrl) {
                const captionRes = await fetch(englishTrack.baseUrl);
                const xml = await captionRes.text();
                // Parse XML captions
                const textMatches = xml.matchAll(/<text[^>]*>(.*?)<\/text>/g);
                const texts = [];
                for (const m of textMatches) {
                    texts.push(m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;/g, "'").replace(/&quot;/g, '"'));
                }
                return texts.join(" ");
            }
        }
    } catch (err) {
        console.error("[YouTube] Caption extraction failed:", err);
    }

    return "";
}

function extractVideoId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

export async function POST(request: Request) {
    try {
        const { url, mode = "full" } = await request.json();

        if (!url) {
            return NextResponse.json({ error: "YouTube URL required" }, { status: 400 });
        }

        const videoId = extractVideoId(url);
        if (!videoId) {
            return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
        }

        // Get transcript
        let transcript = await getTranscript(videoId);

        if (!transcript || transcript.length < 50) {
            // Fallback: ask AI to work with just the video info
            transcript = `[Video ID: ${videoId}] - Unable to extract transcript. Please generate educational content based on this video URL: ${url}`;
        }

        const truncated = transcript.slice(0, 6000);

        const prompt = `You are an expert educational content creator. A student has uploaded a YouTube video for study.

VIDEO TRANSCRIPT:
${truncated}

Generate a comprehensive study analysis in this EXACT JSON format:
{
  "summary": "A clear, concise 3-4 paragraph summary of the video content, focusing on key educational concepts",
  "notes": ["Key point 1 with detail", "Key point 2 with detail", ...],
  "flashcards": [
    {"front": "Question or concept", "back": "Detailed answer or explanation", "difficulty": "easy|medium|hard"},
    ...
  ],
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "question": "Conceptual question about the video content",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": "The correct option text",
      "explanation": "Why this is correct",
      "difficulty": "easy|medium|hard",
      "topic": "specific topic"
    },
    ...
  ]
}

Generate:
- 8-12 key notes
- 10-15 flashcards with varied difficulty
- 5-8 conceptual quiz questions
- Focus on understanding, not memorization

Return ONLY valid JSON, no markdown wrapping.`;

        let response: string;
        try {
            response = await callGroq(prompt);
        } catch {
            response = await callGemini(prompt);
        }

        let result;
        try {
            const cleaned = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            result = JSON.parse(cleaned);
        } catch {
            const match = response.match(/\{[\s\S]*\}/);
            if (match) {
                result = JSON.parse(match[0]);
            } else {
                return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
            }
        }

        return NextResponse.json({
            videoId,
            thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            ...result,
            transcriptLength: transcript.length,
        });
    } catch (error) {
        console.error("[YouTube API Error]:", error);
        return NextResponse.json({ error: "Failed to process video" }, { status: 500 });
    }
}
