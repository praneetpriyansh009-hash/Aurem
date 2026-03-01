/**
 * groqClient.js — Direct client-side Groq API calls.
 * Allows using Groq models directly from the frontend, mirroring geminiClient.js.
 */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.GROQ_API_KEY || "";

export async function callGroq(messages, model, isVision = false) {
    if (!GROQ_API_KEY) throw new Error("Missing VITE_GROQ_API_KEY in .env");

    let groqModel = model || "llama-3.3-70b-versatile";

    // If we detected image contents, switch to a vision model
    if (isVision) {
        groqModel = "llama-3.2-90b-vision-preview";
    }

    const url = "https://api.groq.com/openai/v1/chat/completions";

    const payload = {
        model: groqModel,
        messages: messages,
        temperature: 0.4,
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errText = await response.text();

        // If we hit a hard Rate Limit (429) on the 70B model, fallback to 8B instant
        // since it has a separate token-per-day pool on the free tier.
        if (response.status === 429 && groqModel.includes('70b')) {
            console.warn("[Groq Client] Daily Limit hit on 70B model. Falling back to 8B instant model...");
            return callGroq(messages, "llama-3.1-8b-instant", isVision);
        }

        console.error(`[Groq] API Error ${response.status}:`, errText);
        throw new Error(`Groq API Error ${response.status}: ${errText.substring(0, 200)}`);
    }

    const data = await response.json();
    return data;
}

export default callGroq;
