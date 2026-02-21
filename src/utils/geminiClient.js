/**
 * geminiClient.js — Direct client-side Gemini API calls.
 * Eliminates the need for a backend server during development/testing.
 * Uses VITE_GEMINI_API_KEY from the .env file.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GEMINI_MODEL = "gemini-2.0-flash";

/**
 * Calls Gemini directly from the browser.
 * Accepts OpenAI-style messages and converts to Gemini format.
 * Returns OpenAI-compatible response so all existing components work unchanged.
 */
export async function callGemini(messages, model) {
    if (!GEMINI_API_KEY) throw new Error("Missing VITE_GEMINI_API_KEY in .env");

    const VALID_GEMINI_MODELS = [
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-pro-vision",
        "gemini-pro"
    ];

    // Map common aliases or incorrect model names to valid Gemini models
    let geminiModel = model || GEMINI_MODEL;
    if (!VALID_GEMINI_MODELS.includes(geminiModel)) {
        console.warn(`[Gemini] Model ${geminiModel} not recognized. Defaulting to ${GEMINI_MODEL}`);
        geminiModel = GEMINI_MODEL;
    }

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

        if (Array.isArray(msg.content)) {
            const parts = [];
            for (const c of msg.content) {
                if (c.type === 'text') {
                    parts.push({ text: c.text });
                } else if (c.type === 'image_url') {
                    const dataUrl = c.image_url?.url || '';
                    // Handle both data URLs and plain base64
                    if (dataUrl.startsWith('data:')) {
                        const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
                        const mimeType = dataUrl.match(/^data:([^;]+)/)?.[1] || 'image/jpeg';
                        parts.push({ inlineData: { mimeType, data: base64 } });
                    } else if (dataUrl.length > 100) {
                        // Likely raw base64 without prefix
                        parts.push({ inlineData: { mimeType: 'image/jpeg', data: dataUrl } });
                    } else {
                        // URL — skip or add as text
                        parts.push({ text: `[Image: ${dataUrl}]` });
                    }
                } else {
                    parts.push({ text: JSON.stringify(c) });
                }
            }
            contents.push({ role, parts });
        } else {
            contents.push({ role, parts: [{ text: msg.content }] });
        }
    }

    // If system prompt exists but no user content, merge system into contents
    if (systemInstruction && contents.length === 0) {
        contents.push({ role: 'user', parts: systemInstruction.parts });
        systemInstruction = null;
    }

    const body = { contents };
    if (systemInstruction) body.systemInstruction = systemInstruction;

    // Add safety settings to prevent blocks on educational content
    body.safetySettings = [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
    ];

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error(`[Gemini] API Error ${response.status}:`, errText);
        throw new Error(`Gemini API Error ${response.status}: ${errText.substring(0, 200)}`);
    }

    const data = await response.json();

    // Handle blocked responses
    if (data.candidates?.[0]?.finishReason === 'SAFETY') {
        return {
            choices: [{ message: { role: 'assistant', content: "I'm sorry, I can't respond to that query. Please try rephrasing your question." }, finish_reason: 'stop' }],
            model: geminiModel,
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
        };
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Return OpenAI-compatible format
    return {
        choices: [{ message: { role: 'assistant', content: text }, finish_reason: 'stop' }],
        model: geminiModel,
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    };
}


export const callGeminiDirect = callGemini;

export default callGemini;
