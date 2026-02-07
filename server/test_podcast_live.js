import fetch from 'node-fetch';

async function testPodcastLive() {
    console.log("Testing Live Podcast Generation at http://localhost:5050/api/ai/podcast ...");

    const payload = {
        content: "Photosynthesis",
        mode: "topic"
    };

    try {
        const start = Date.now();
        const response = await fetch("http://localhost:5050/api/ai/podcast", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const duration = Date.now() - start;

        console.log(`Status: ${response.status} ${response.statusText} (${duration}ms)`);
        const text = await response.text();

        try {
            const json = JSON.parse(text);
            console.log("Response JSON (Preview):", JSON.stringify(json).substring(0, 200) + "...");
            if (json.script) {
                console.log("Script Length:", json.script.length);
            }
        } catch (e) {
            console.log("Raw Body:", text);
        }

    } catch (error) {
        console.error("Request Failed:", error.message);
    }
}

testPodcastLive();
