import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
    console.error("Error: GROQ_API_KEY is missing in .env");
    process.exit(1);
}

const listGroqModels = async () => {
    try {
        const response = await fetch("https://api.groq.com/openai/v1/models", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Groq API Error: ${response.status} - ${text}`);
        }

        const data = await response.json();
        console.log("--- Available Groq Models ---");
        const visionModels = data.data.filter(m => m.id.includes('vision'));

        console.log("--- Vision Models ---");
        if (visionModels.length > 0) {
            visionModels.forEach(m => console.log(`[VISIBLE] ${m.id}`));
        } else {
            console.log("No explicit 'vision' models found.");
        }

        console.log("\n--- All Models ---");
        data.data.forEach(m => console.log(`- ${m.id}`));

    } catch (error) {
        console.error("Failed to list models:", error.message);
    }
};

listGroqModels();
