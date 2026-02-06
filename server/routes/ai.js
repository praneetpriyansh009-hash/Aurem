import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { verifyToken } from '../middleware/auth.js';
import { validateAIRequest } from '../middleware/validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const router = express.Router();

// --- Configuration ---
const GROQ_API_KEY = (process.env.GROQ_API_KEY || "").trim();
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || "").trim();
const GROQ_MODELS = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "mixtral-8x7b-32768"];
const GROQ_VISION_MODEL = "llama-3.2-90b-vision-preview"; // Or 11b if 90b is unavailable
const REQUEST_TIMEOUT = 30000;

console.log(`[AI Service] VERSION 8.0 (ULTRA STEALTH) ACTIVE`);

// --- Helper: Ultra-Stealth Groq Call ---
const callGroqStealth = async (messages, modelIdx = 0) => {
    if (!GROQ_API_KEY) throw new Error("No Groq Key - Please set GROQ_API_KEY in server/.env");

    const model = GROQ_MODELS[modelIdx];
    console.log(`[AI] Attempting Groq with model: ${model}`);

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: 0.7,
                max_tokens: 4096
            }),
            timeout: REQUEST_TIMEOUT
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[AI] Groq ${model} failed (${response.status}):`, errorText.substring(0, 200));

            // Rate limit or quota exceeded - try next model
            if (response.status === 429 || response.status === 503) {
                console.warn(`[AI] Rate limited on ${model}, trying fallback...`);
                if (modelIdx < GROQ_MODELS.length - 1) {
                    return callGroqStealth(messages, modelIdx + 1);
                }
                throw new Error("RATE_LIMITED");
            }

            // Auth issues
            if (response.status === 403 || response.status === 401) {
                throw new Error("GROQ_AUTH_ERROR");
            }

            // Try next model for other errors
            if (modelIdx < GROQ_MODELS.length - 1) {
                return callGroqStealth(messages, modelIdx + 1);
            }
            throw new Error(`GROQ_ERROR_${response.status}`);
        }

        const data = await response.json();
        console.log(`[AI] Groq ${model} success`);
        return data;
    } catch (fetchError) {
        console.error(`[AI] Groq fetch error:`, fetchError.message);
        if (modelIdx < GROQ_MODELS.length - 1) {
            return callGroqStealth(messages, modelIdx + 1);
        }
        throw fetchError;
    }
};

// --- Robust Gemini Helper ---
const GEMINI_MODELS = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-1.0-pro",
    "gemini-pro"
];

const callGeminiRobust = async (prompt, modelIdx = 0) => {
    if (modelIdx >= GEMINI_MODELS.length) throw new Error("All Gemini models failed");

    const model = GEMINI_MODELS[modelIdx];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!response.ok) {
            if ([404, 429, 503, 500].includes(response.status)) {
                return callGeminiRobust(prompt, modelIdx + 1);
            }
            const errText = await response.text();
            throw new Error(errText);
        }
        return await response.json();
    } catch (e) {
        return callGeminiRobust(prompt, modelIdx + 1);
    }
};

const callGroqVision = async (messages) => {
    if (!GROQ_API_KEY) throw new Error("No Groq Key");

    console.log(`[AI] Attempting Groq Vision with model: ${GROQ_VISION_MODEL}`);

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: GROQ_VISION_MODEL,
                messages: messages,
                temperature: 0.5,
                max_tokens: 6000,
                stream: false
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Groq Vision Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error("[AI] Groq Vision failed:", error.message);
        throw error;
    }
};

// --- Route: Gemini Chat ---
router.post('/gemini', async (req, res) => {
    try {
        const { messages } = req.body;
        const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');

        if (!GEMINI_API_KEY) throw new Error("No Gemini Key");

        const data = await callGeminiRobust(prompt);
        res.json(data);
    } catch (error) {
        console.error("[Gemini] Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// --- Route: Podcast ---
router.post('/podcast', async (req, res) => {
    const { content, topics, mode, syllabus } = req.body;
    try {
        const prompt = `Create a podcast script JSON between Alex and Sam. Topic: ${mode === 'syllabus' ? syllabus.topic : content}. Exchanges: 12. Rules: Output ONLY JSON.`;
        const msgs = [{ role: 'user', content: prompt }];

        let result;
        try {
            result = await callGroqStealth(msgs);
        } catch (e) {
            result = await callGeminiFallback(msgs);
        }

        const text = result.choices[0].message.content;
        const cleanedText = text.replace(/```json|```/g, '').trim();
        let finalJson;
        try {
            finalJson = JSON.parse(cleanedText);
        } catch (e) {
            const match = cleanedText.match(/\[\s*\{.*\}\s*\]/s);
            if (match) finalJson = { script: JSON.parse(match[0]) };
            else finalJson = { script: [{ speaker: "Sam", text: text }] };
        }

        res.json({ script: finalJson.script || finalJson, provider: "atlas-hybrid" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Route: Groq (Chat) ---
router.post('/groq', validateAIRequest, async (req, res) => {
    try {
        let result;
        try {
            result = await callGroqStealth(req.body.messages);
        } catch (e) {
            console.warn("[AI] Groq blocked or failed, using Gemini workaround.");
            result = await callGeminiFallback(req.body.messages);
        }
        res.json(result);
    } catch (error) {
        console.error('[Chat Error]', error);
        res.status(500).json({
            error: "AI Service Error",
            message: error.message,
            details: "Both Groq and Gemini fallback failed. Check server console."
        });
    }
});

// --- Route: YouTube Transcript ---
router.post('/youtube-transcript', async (req, res) => {
    const { videoUrl, videoId } = req.body;

    // For now, we return a placeholder that tells the frontend to work without transcript
    // The frontend will handle this gracefully and allow AI analysis based on video topic
    res.json({
        videoId: videoId,
        title: "YouTube Video",
        transcript: null,
        noTranscript: true,
        message: "Transcript not available. You can still analyze the video by providing context or asking questions about the topic."
    });
});

// --- Route: Generate Sample Paper (Groq Vision) ---
router.post('/generate-paper', async (req, res) => {
    try {
        const { extractedText, images } = req.body; // images: array of base64 strings (data:image/jpeg;base64,...)

        console.log(`[Paper Gen] Received request. Text len: ${extractedText?.length}, Images: ${images?.length}`);

        if (!extractedText && (!images || images.length === 0)) {
            return res.status(400).json({ error: "No content provided (text or images)" });
        }

        // Construct messages for Groq Vision
        const content = [];

        // Add text context
        if (extractedText) {
            content.push({ type: "text", text: `Here is the text content of a sample paper:\n${extractedText}\n\n` });
        }

        // Add images (limit to 3 to avoid payload size issues/token limits if needed, but Groq handles 4-5 well)
        if (images && images.length > 0) {
            content.push({ type: "text", text: "Here are the visual pages of the sample paper for context (styling, diagrams, etc.):" });
            images.slice(0, 5).forEach((img, idx) => {
                // Ensure base64 formatting is correct for Groq
                // Groq expects image_url: { url: "data:image/jpeg;base64,..." }
                content.push({
                    type: "image_url",
                    image_url: {
                        url: img
                    }
                });
            });
        }

        // The Prompt
        content.push({
            type: "text",
            text: `
            ROLE: You are an expert academic examiner.
            TASK: Create a BRAND NEW question paper based on the sample provided above.
            
            REQUIREMENTS:
            1.  **Pattern Match**: Strictly follow the same pattern (sections, question types, marks distribution) as the sample.
            2.  **Difficulty Match**: The difficulty level must match the sample.
            3.  **Topic/Syllabus**: Cover the same syllabus/topics as implied by the sample questions.
            4.  **Length**: Generate exactly the same number of questions (up to 35).
            5.  **NO HOLD BACKS**: Generate ALL questions. Do not summarize. Full question paper required.
            6.  **Image Integration**: If the sample has image-based questions, generate similar NEW questions.
                - Since you cannot generate actual images, provide a [Visual Description] in square brackets where the image should be.
                - Example: Q5. Find the area of the shaded region. [Image: A circle of radius 5cm with a 90-degree sector removed].
            
            OUTPUT FORMAT:
            Return the output in clean Markdown format.
            - Use # for Header (School Name/Exam Name inferred or generic)
            - Use ## for Sections
            - Use **Bold** for marks.
            
            Now, generate the full paper.
            `
        });

        const messages = [{ role: "user", content: content }];

        const generatedPaper = await callGroqVision(messages);

        res.json({ success: true, paper: generatedPaper });

    } catch (error) {
        console.error("[Paper Gen] Error:", error);
        res.status(500).json({
            error: "Failed to generate paper",
            details: error.message
        });
    }
});

export default router;
