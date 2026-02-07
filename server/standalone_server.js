import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const PORT = 5050;

// Middleware
app.use(cors({
    origin: ['http://localhost:8080', 'http://localhost:5173', 'http://127.0.0.1:8080'],
    credentials: true
}));
app.use(express.json());

// --- AI CONFIG ---
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = "llama-3.1-8b-instant";

console.log("-----------------------------------------");
console.log("STANDALONE SERVER STARTING");
console.log("Groq Key Present:", !!GROQ_API_KEY);
console.log("Gemini Key Present:", !!GEMINI_API_KEY);
if (GEMINI_API_KEY) console.log("Gemini Key Start:", GEMINI_API_KEY.substring(0, 10) + "...");
console.log("-----------------------------------------");

// --- ROUTES ---

// Health Check
app.get('/health', (req, res) => {
    console.log("[Health] Check received");
    res.json({ status: 'ok', mode: 'standalone' });
});

// Root Route (Visual Confirmation)
app.get('/', (req, res) => {
    res.send('<h1>Atlas Server is RUNNING!</h1><p>The API is active. You can go back to the app.</p>');
});

// --- Helper: Mock Response ---
const getMockResponse = () => {
    return "## ⚠️ API Limit Reached\n\nI'm currently unable to connect to the AI services due to high traffic (Quota Exceeded) or network blocks.\n\n**Common Fixes:**\n1. Wait 1-2 minutes and try again.\n2. Get a new free API Key from [Google AI Studio](https://aistudio.google.com/apikey) and update your `.env` file.\n3. Check your internet connection.\n\n*This is a system message to prevent the app from crashing.*";
};

// --- Helper: SDK Gemini Call ---
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const callGeminiSDK = async (fullText) => {
    console.log("[Gemini] Attempting via SDK...");
    try {
        // Try gemini-1.5-flash first (most reliable for free tier)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(fullText);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.warn("[Gemini] SDK 'gemini-1.5-flash' failed:", error.message);

        // Fallback to gemini-pro
        try {
            console.log("[Gemini] Trying SDK fallback to gemini-pro...");
            const modelLegacy = genAI.getGenerativeModel({ model: "gemini-pro" });
            const resultLegacy = await modelLegacy.generateContent(fullText);
            const responseLegacy = await resultLegacy.response;
            return responseLegacy.text();
        } catch (legacyError) {
            console.warn("[Gemini] SDK 'gemini-pro' failed:", legacyError.message);
            // If this fails, throw so we hit the mock fallback
            throw new Error("All SDK models failed");
        }
    }
};

// Gemini Route (SDK Mode)
app.post('/api/ai/gemini', async (req, res) => {
    console.log("[Gemini] Request received");
    try {
        if (!GEMINI_API_KEY) throw new Error("Missing Gemini Key");

        const messages = req.body.messages || [];
        const lastMsg = messages[messages.length - 1];
        const userPrompt = lastMsg?.content || "";
        const systemMsg = messages.find(m => m.role === 'system')?.content || "";
        const fullText = systemMsg ? `${systemMsg}\n\nUser: ${userPrompt}` : userPrompt;

        // Use SDK Call
        const responseText = await callGeminiSDK(fullText);

        console.log("[Gemini] Success (SDK)");
        res.json({ choices: [{ message: { content: responseText, role: 'assistant' } }] });

    } catch (error) {
        console.error("[Gemini] Limit Reached:", error.message);
        res.json({ choices: [{ message: { content: getMockResponse(), role: 'assistant' } }] });
    }
});

// Groq Route (Simple & Direct per User Request)
app.post('/api/ai/groq', async (req, res) => {
    console.log("[Groq] Request received");
    try {
        if (!GROQ_API_KEY) throw new Error("Missing Groq Key");

        let { messages, model } = req.body;
        const hasImages = messages?.some(m => Array.isArray(m.content));

        // Choose correct model
        const selectedModel = hasImages ? "llama-3.2-11b-vision-preview" : (model || "llama-3.1-8b-instant");

        // ENSURE Content is string for Text Models
        if (!hasImages) {
            messages = messages.map(m => ({
                ...m,
                content: Array.isArray(m.content)
                    ? m.content.map(c => c.text || JSON.stringify(c)).join('\n')
                    : m.content
            }));
        }

        console.log(`[Groq] Mode: ${hasImages ? 'VISION' : 'TEXT'} | Model: ${selectedModel}`);

        // Standard Headers for Groq
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: messages,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[Groq] API Failed (${response.status}): ${errText}`);
            throw new Error(`Groq API Error: ${errText}`);
        }

        const data = await response.json();
        console.log("[Groq] Success");
        res.json(data);

    } catch (error) {
        console.error("[Groq] Error:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// Start
app.listen(PORT, () => {
    console.log(`Standalone Server running on http://localhost:${PORT}`);
});
