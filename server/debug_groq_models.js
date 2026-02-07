import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const GROQ_API_KEY = process.env.GROQ_API_KEY;

async function listGroqModels() {
    console.log("Fetching Groq models...");
    try {
        const res = await fetch("https://api.groq.com/openai/v1/models", {
            headers: { "Authorization": `Bearer ${GROQ_API_KEY}` }
        });

        if (!res.ok) {
            console.error("Groq Fetch Error:", await res.text());
            return;
        }

        const data = await res.json();
        const models = data.data.map(m => m.id);

        console.log("--- AVAILABLE GROQ MODELS ---");
        models.sort().forEach(m => console.log(m));
        console.log("-----------------------------");

    } catch (e) {
        console.error("Script Error:", e.message);
    }
}

listGroqModels();
