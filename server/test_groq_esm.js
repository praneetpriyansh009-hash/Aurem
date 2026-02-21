import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const API_KEY = process.env.GROQ_API_KEY;

async function testGroq() {
    console.log("Testing Groq API with Key:", API_KEY ? (API_KEY.substring(0, 10) + "...") : "MISSING");
    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [{ role: "user", content: "Say 'Aurem is Online' if you can hear me." }]
            })
        });

        if (!response.ok) {
            const text = await response.text();
            console.error(`FAILED: ${response.status} - ${text}`);
            return;
        }

        const data = await response.json();
        console.log("SUCCESS!");
        console.log("Response:", data.choices[0].message.content);
    } catch (e) {
        console.error("ERROR:", e.message);
    }
}

testGroq();
