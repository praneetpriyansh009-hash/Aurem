import fetch from 'node-fetch';

async function testVisionLive() {
    console.log("Testing Live Vision at http://localhost:5050/api/ai/groq ...");

    // Simulate a vision request (content is array)
    const payload = {
        messages: [
            {
                role: "user",
                content: [
                    { type: "text", text: "What is this?" },
                    { type: "image_url", image_url: { url: "data:image/jpeg;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" } }
                ]
            }
        ]
    };

    try {
        const response = await fetch("http://localhost:5050/api/ai/groq", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        console.log(`Status: ${response.status} ${response.statusText}`);
        const data = await response.text();
        console.log("Body:", data);
    } catch (error) {
        console.error("Request Failed:", error.message);
    }
}

testVisionLive();
