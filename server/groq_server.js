import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const PORT = 5050;

// Middleware
app.use(cors({
    origin: ['http://localhost:8080', 'http://localhost:5173', 'http://127.0.0.1:8080'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// --- AI CONFIG ---
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = "llama-3.3-70b-versatile";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = "gemini-2.0-flash";

console.log("-----------------------------------------");
console.log("AUREM SERVER STARTING");
console.log("Groq Key Present:", !!GROQ_API_KEY);
console.log("Gemini Key Present:", !!GEMINI_API_KEY);
console.log("-----------------------------------------");

// --- ROUTES ---

app.get('/health', (req, res) => res.json({ status: 'ok', mode: 'groq+gemini', gemini: !!GEMINI_API_KEY, groq: !!GROQ_API_KEY }));

app.get('/', (req, res) => {
    res.send('<h1>Aurem AI Server Running</h1><p>Routes: /api/ai/groq | /api/ai/gemini | /api/ai/podcast</p>');
});

// ── Gemini Route (Primary) ────────────────────────────────────────────────────
app.post('/api/ai/gemini', async (req, res) => {
    try {
        if (!GEMINI_API_KEY) throw new Error("Missing Gemini API Key — set GEMINI_API_KEY in .env");

        const { messages, model } = req.body;
        const geminiModel = model || GEMINI_MODEL;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${GEMINI_API_KEY}`;

        // Convert OpenAI-style messages → Gemini contents format
        let systemInstruction = null;
        const contents = [];

        for (const msg of messages) {
            if (msg.role === 'system') {
                systemInstruction = { parts: [{ text: msg.content }] };
                continue;
            }

            const role = msg.role === 'assistant' ? 'model' : 'user';

            // Handle multimodal content (images passed as base64 data URLs)
            if (Array.isArray(msg.content)) {
                const parts = msg.content.map(c => {
                    if (c.type === 'text') return { text: c.text };
                    if (c.type === 'image_url') {
                        const dataUrl = c.image_url?.url || '';
                        const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
                        const mimeType = dataUrl.match(/^data:([^;]+)/)?.[1] || 'image/jpeg';
                        return { inlineData: { mimeType, data: base64 } };
                    }
                    return { text: JSON.stringify(c) };
                });
                contents.push({ role, parts });
            } else {
                contents.push({ role, parts: [{ text: msg.content }] });
            }
        }

        const body = { contents };
        if (systemInstruction) body.systemInstruction = systemInstruction;

        console.log(`[Gemini] Model: ${geminiModel} | Messages: ${messages.length}`);

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini API Error ${response.status}: ${errText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        // Return in OpenAI-compatible format so all frontend components work unchanged
        res.json({
            choices: [{ message: { role: 'assistant', content: text }, finish_reason: 'stop' }],
            model: geminiModel,
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
        });

        console.log(`[Gemini] Success. ${text.length} chars returned.`);

    } catch (error) {
        console.error("[Gemini] Error:", error.message);
        res.status(500).json({ error: error.message, details: "Check server logs" });
    }
});

// ── Podcast Route → Gemini ────────────────────────────────────────────────────
// Podcast uses Gemini for richer, more natural dialogue scripts
app.post('/api/ai/podcast', (req, res, next) => {
    req.url = '/api/ai/gemini';
    next();
});

// ── Groq Route (Fallback / Vision) ───────────────────────────────────────────
app.post('/api/ai/groq', async (req, res) => {
    let { messages, model } = req.body;

    const hasImages = messages?.some(m => Array.isArray(m.content));
    const selectedModel = hasImages ? "llama-3.2-11b-vision-preview" : (model || GROQ_MODEL);

    if (!hasImages) {
        messages = messages.map(m => ({
            ...m,
            content: Array.isArray(m.content)
                ? m.content.map(c => c.text || JSON.stringify(c)).join('\n')
                : m.content
        }));
    }

    try {
        if (!GROQ_API_KEY) throw new Error("Missing Groq API Key — set GROQ_API_KEY in .env");

        console.log(`[Groq] Mode: ${hasImages ? 'VISION' : 'TEXT'} | Model: ${selectedModel}`);

        const response = await fetch(GROQ_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ model: selectedModel, messages })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Groq API Error: ${err}`);
        }

        const data = await response.json();
        console.log("[Groq] Success. Response chars:", JSON.stringify(data).length);
        res.json(data);

    } catch (error) {
        console.error("[Groq] Error:", error.message);
        res.status(500).json({ error: error.message, details: "Check server logs" });
    }
});

import { YoutubeTranscript } from 'youtube-transcript';

// ── YouTube Transcript Route ──────────────────────────────────────────────────
app.post('/api/youtube/transcript', async (req, res) => {
    try {
        const { videoId } = req.body;
        if (!videoId) throw new Error("Missing videoId");

        console.log(`[YouTube] Fetching transcript for: ${videoId}`);
        const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);

        // Combine into single text
        const fullText = transcriptItems.map(item => item.text).join(' ');

        res.json({ transcript: fullText });
        console.log(`[YouTube] Success. ${fullText.length} chars.`);
    } catch (error) {
        console.error("[YouTube] Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aurem AI Server running on http://localhost:${PORT}`);
});
