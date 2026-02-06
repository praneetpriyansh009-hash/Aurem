const fetch = require('node-fetch');

const dotenv = require('dotenv');
dotenv.config();

const API_KEY = process.env.GROQ_API_KEY;

async function testGroq() {
    console.log("Testing Groq API...");
    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [{ role: "user", content: "Hello" }]
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
