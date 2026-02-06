import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const key = process.env.GEMINI_API_KEY;
console.log("Checking Key:", key ? key.substring(0, 10) + "..." : "MISSING");

const genAI = new GoogleGenerativeAI(key);

async function test() {
    try {
        console.log("Testing gemini-1.5-flash...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("Hello, are you working?");
        console.log("Success! Response:", result.response.text());
    } catch (e) {
        console.error("gemini-1.5-flash FAILED:", e.message);

        try {
            console.log("\nTesting gemini-pro...");
            const model2 = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result2 = await model2.generateContent("Hello?");
            console.log("Success! Response:", result2.response.text());
        } catch (e2) {
            console.error("gemini-pro FAILED:", e2.message);
        }
    }
}

test();
