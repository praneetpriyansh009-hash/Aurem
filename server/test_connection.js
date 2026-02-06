import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const GROQ_KEY = process.env.GROQ_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

let log = "--- Connection Test ---\n";
log += `Groq Key Loaded: ${!!GROQ_KEY}\n`;
log += `Gemini Key Loaded: ${!!GEMINI_KEY}\n`;

async function run() {
    log += "\nTesting Groq...\n";
    try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_KEY}`,
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0"
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [{ role: "user", content: "hi" }]
            }),
            timeout: 10000
        });
        log += `Groq Status: ${res.status}\n`;
        if (!res.ok) log += `Groq Response: ${await res.text()}\n`;
        else log += "Groq: SUCCESS\n";
    } catch (e) {
        log += `Groq Error: ${e.message}\n`;
    }

    log += "\nTesting Gemini...\n";
    try {
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`;
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: "hi" }] }] }),
            timeout: 10000
        });
        log += `Gemini Status: ${res.status}\n`;
        if (!res.ok) log += `Gemini Response: ${await res.text()}\n`;
        else log += "Gemini: SUCCESS\n";
    } catch (e) {
        log += `Gemini Error: ${e.message}\n`;
    }

    fs.writeFileSync('diag_results.txt', log);
    process.exit(0);
}

run();
