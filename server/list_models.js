import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function listGroqModels() {
    console.log("\n--- GROQ MODELS ---");
    try {
        const res = await fetch("https://api.groq.com/openai/v1/models", {
            headers: { "Authorization": `Bearer ${GROQ_API_KEY}` }
        });
        const data = await res.json();
        if (data.data) {
            data.data.forEach(m => console.log(m.id));
        } else {
            console.error("No data:", data);
        }
    } catch (e) {
        console.error("Groq Error:", e.message);
    }
}

async function listGeminiModels() {
    console.log("\n--- GEMINI MODELS ---");
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
        const data = await res.json();
        if (data.models) {
            data.models.forEach(m => console.log(m.name));
        } else {
            console.error("No data:", data);
        }
    } catch (e) {
        console.error("Gemini Error:", e.message);
    }
}

async function main() {
    await listGroqModels();
    await listGeminiModels();
}

main();
