import fetch from 'node-fetch';

const GROQ_KEY = "PASTE_YOUR_GROQ_KEY_HERE";
const GEMINI_KEY_SERVER = "PASTE_YOUR_GEMINI_KEY_HERE";
const GEMINI_KEY_ROOT = "PASTE_YOUR_GEMINI_KEY_HERE";

async function testGroq() {
    console.log("Testing Groq (gsk_...PLvu)...");
    try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "llama-3.1-8b-instant", messages: [{ role: "user", content: "hi" }] })
        });
        if (!res.ok) {
            const dry = await res.text();
            return `FAILED (${res.status}): ${dry}`;
        }
        return "SUCCESS";
    } catch (e) { return `ERROR: ${e.message}`; }
}

async function testGemini(key, label) {
    console.log(`Testing Gemini ${label} (${key.substring(0, 8)}...)...`);
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] })
        });
        if (!res.ok) {
            const dry = await res.text();
            return `FAILED (${res.status}): ${dry}`;
        }
        return "SUCCESS";
    } catch (e) { return `ERROR: ${e.message}`; }
}

(async () => {
    console.log("--- KEY DIAGNOSTIC START ---");
    console.log("GROQ Result:   " + await testGroq());
    console.log("GEMINI (Server): " + await testGemini(GEMINI_KEY_SERVER, "Server"));
    console.log("GEMINI (Root):   " + await testGemini(GEMINI_KEY_ROOT, "Root"));
    console.log("--- KEY DIAGNOSTIC END ---");
})();
