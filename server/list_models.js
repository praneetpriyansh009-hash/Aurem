const fetch = require('node-fetch');

const API_KEY = "AIzaSyBUlCibyB-ut3kOYNHBI1OrdmaUjBEuL_o";

async function listModels() {
    console.log("Listing Gemini Models...");
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        const data = await response.json();

        if (data.error) {
            console.error("Error:", data.error);
            return;
        }

        console.log("Available Models:");
        if (data.models) {
            data.models.forEach(m => {
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`- ${m.name}`);
                }
            });
        } else {
            console.log("No models found?", data);
        }

    } catch (e) {
        console.error("Exception:", e.message);
    }
}

listModels();
