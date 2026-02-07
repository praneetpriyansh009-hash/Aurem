import fetch from 'node-fetch';

async function testLiveBackend() {
    console.log("Testing Live Backend at http://localhost:5050/api/ai/groq ...");
    try {
        const response = await fetch("http://localhost:5050/api/ai/groq", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: [{ role: "user", content: "Hello, are you working?" }]
            })
        });

        console.log(`Status: ${response.status} ${response.statusText}`);
        const data = await response.text();
        console.log("Body:", data);
    } catch (error) {
        console.error("Request Failed:", error.message);
    }
}

testLiveBackend();
