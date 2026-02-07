import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
    console.error("No GROQ_API_KEY found.");
    process.exit(1);
}

const runTest = async (model) => {
    console.log(`\nTesting Model: ${model}`);

    // Minimal 1x1 pixel transparent gif base64
    const imageBase64 = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

    const payload = {
        model: model,
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: "What is in this image?" },
                    { type: "image_url", image_url: { url: imageBase64 } }
                ]
            }
        ],
        max_tokens: 300
    };

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`FAILED (${response.status}): ${text}`);
        } else {
            const data = await response.json();
            console.log("SUCCESS!");
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("EXCEPTION:", e.message);
    }
};

(async () => {
    await runTest("llama-3.2-11b-vision-preview");
    await runTest("llama-3.2-90b-vision-preview");
})();
