import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { verifyToken } from '../middleware/auth.js';
import { validateAIRequest } from '../middleware/validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const router = express.Router();

// --- Configuration ---
const GROQ_API_KEY = (process.env.GROQ_API_KEY || "").trim();
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || "").trim();
const GROQ_MODELS = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "mixtral-8x7b-32768"];
const GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"; // Free multimodal model on Groq
const REQUEST_TIMEOUT = 30000;

console.log(`[AI Service] VERSION 8.2 (MODEL UPDATE) ACTIVE`);

// ... (keep existing code)

// ...

const callGroqVision = async (messages) => {
    if (!GROQ_API_KEY) throw new Error("Missing Groq API Key");

    // Attempting the most likely valid model ID. 
    // If 'preview' is dead, we try 'instruct' which is the standard GA suffix.
    const model = "meta-llama/llama-4-scout-17b-16e-instruct";

    console.log(`[AI] Attempting Groq Vision with model: ${model}`);

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: 0.5,
                max_tokens: 6000,
                stream: false
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[AI] Groq Vision REST Error ${response.status}:`, errorText);

            // GRACEFUL FAILURE: Do not crash the app. Return a polite message.
            return {
                choices: [{
                    message: {
                        role: 'assistant',
                        content: "I'm sorry, I cannot analyze images right now because the specific AI vision model is currently unavailable on the server. Please try asking me questions via text!"
                    }
                }]
            };
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("[AI] Groq Vision Network Error:", error.message);
        throw new Error(`Vision Service Unavailable: ${error.message}`);
    }
};

// --- Helper: Standard Groq Text Call ---
const callGroqStealth = async (messages) => {
    if (!GROQ_API_KEY) throw new Error("Missing Groq API Key");
    const model = "llama-3.3-70b-versatile";

    console.log(`[Groq] Sending text request to ${model}`);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: 0.7,
            max_tokens: 4096
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Groq API Error (${response.status}): ${err}`);
    }

    return await response.json();
};

// Remove Gemini Routes/Helpers completely

// --- Route: Podcast ---
// --- Route: Podcast ---
router.post('/podcast', async (req, res) => {
    const { content, topics, mode, syllabus, tier, images } = req.body;
    try {
        let topicContent;

        // If images are provided (handwritten PDF), extract text using vision first
        if (images && images.length > 0) {
            console.log(`[Podcast] Extracting content from ${images.length} handwritten images...`);

            // Build vision request to extract text from handwritten notes
            const visionContent = [
                {
                    type: "text",
                    text: "You are an expert at reading handwritten notes. Please carefully extract and transcribe ALL the text content from these handwritten pages. Include all formulas, definitions, equations, and notes. Format the extracted content clearly with proper structure."
                }
            ];

            // Add images (limit to 5 for API limits)
            images.slice(0, 5).forEach(imgUrl => {
                visionContent.push({
                    type: "image_url",
                    image_url: { url: imgUrl }
                });
            });

            const visionMessages = [{ role: "user", content: visionContent }];

            try {
                const extractedResult = await callGroqVision(visionMessages);
                const extractedText = extractedResult.choices[0]?.message?.content || '';
                topicContent = extractedText.substring(0, 4000); // Use extracted text
                console.log(`[Podcast] Extracted ${extractedText.length} chars from handwritten notes`);
            } catch (visionError) {
                console.error("[Podcast] Vision extraction failed:", visionError.message);
                topicContent = "handwritten notes (extraction failed - generating generic content)";
            }
        } else if (mode === 'syllabus') {
            topicContent = `Subject: ${syllabus.subject}, Topic: ${syllabus.topic}, Level: ${syllabus.level}`;
        } else {
            topicContent = content ? content.substring(0, 6000) : 'general educational topic';
        }

        const exchanges = tier === 'pro' ? 40 : 24;

        const prompt = `You are a world-class podcast script writer creating a DEEP, EDUCATIONAL conversation between two speakers. This is NOT a surface-level overview — it is a thorough, concept-by-concept breakdown.

SPEAKERS:
- Alex: The curious, engaged host. Asks sharp follow-up questions. Challenges Sam to go deeper. Occasionally shares "aha moments" or connects ideas to everyday life. Thinks out loud.
- Sam: The brilliant teacher-friend. Explains complex things using vivid, relatable, daily-life analogies (cooking, sports, driving, social media, etc.). Goes deep into WHY things work, not just WHAT they are. Self-corrects sometimes. Thinks step-by-step.

=== SOURCE MATERIAL (USE ALL OF THIS) ===
${topicContent}
${topics ? `\n=== FOCUS AREAS ===\n${topics}` : ''}

=== CRITICAL RULES ===

1. **CONTENT DEPTH IS KING**: Cover EVERY major concept from the source material. Don't skip anything. If the document has 5 topics, discuss all 5 in detail. Each concept should get at least 2-3 exchanges of discussion.

2. **REAL-WORLD EXAMPLES**: For EVERY concept, Sam MUST give a concrete, daily-life example:
   - Physics forces? → "Think about when you're in a car and it brakes suddenly — your body lurches forward. That's inertia."
   - Chemical bonding? → "It's like two friends sharing their lunch — that's covalent bonding."
   - Economics inflation? → "Remember when that samosa used to cost ₹5? Now it's ₹15. That's inflation hitting your pocket."
   - Math derivatives? → "It's literally just asking: how fast is something changing RIGHT NOW? Like checking your speedometer."

3. **NATURAL CONVERSATION** (but NOT empty filler):
   - Alex's reactions should ADD value: "Wait, so you're saying that even gravity is just curved spacetime? That changes everything."
   - Use occasional fillers like "honestly", "I mean", "right", but NEVER let fillers replace actual content.
   - Include moments of genuine curiosity: "Okay but here's what I don't get..." followed by a real question.
   - Self-correction that teaches: "Actually wait, I said 6 but it's really 8 — because we're counting the noble gases too."

4. **STRUCTURE**: Start with a hook, build up systematically through concepts, end with a powerful summary/takeaway.

5. **LENGTH**: EXACTLY ${exchanges} exchanges. Each response should be 2-5 sentences. Make every sentence count — no fluff.

6. **SPEAKER BALANCE**: Alternate strictly between Alex and Sam. Alex asks, reacts, connects; Sam explains, analogizes, deepens.

Output ONLY valid JSON:
{"script":[{"speaker":"Alex","text":"..."},{"speaker":"Sam","text":"..."}]}

Begin with energy and immediately dive into the first concept.`;

        const msgs = [{ role: 'user', content: prompt }];


        let result;
        try {
            // Direct call
            result = await callGroqStealth(msgs);
        } catch (apiError) {
            console.error("[Podcast] API Failed:", apiError.message);
            // Fallback to a simple static script so the UI doesn't break
            result = {
                choices: [{
                    message: {
                        content: JSON.stringify({
                            script: [
                                { speaker: "Alex", text: "Welcome back! Today we're discussing this interesting topic." },
                                { speaker: "Sam", text: "That's right, Alex. The AI service is experiencing heavy load, but let's dive into the basics." },
                                { speaker: "Alex", text: "Absolutely. Even without the full deep dive, the key concepts remain crucial." },
                                { speaker: "Sam", text: "Agreed. Let's keep exploring!" }
                            ]
                        })
                    }
                }]
            };
        }

        const text = result.choices[0].message.content;
        const cleanedText = text.replace(/```json|```/g, '').trim();
        let finalJson;
        try {
            finalJson = JSON.parse(cleanedText);
        } catch (e) {
            const match = cleanedText.match(/\[\s*\{.*\}\s*\]/s);
            if (match) finalJson = { script: JSON.parse(match[0]) };
            else finalJson = { script: [{ speaker: "Sam", text: text }] };
        }

        // NORMALIZE: Ensure we extract the ARRAY, no matter the structure
        let scriptArray = [];
        if (Array.isArray(finalJson)) {
            scriptArray = finalJson;
        } else if (Array.isArray(finalJson.script)) {
            scriptArray = finalJson.script;
        } else if (Array.isArray(finalJson.podcast)) {
            scriptArray = finalJson.podcast;
        } else if (Array.isArray(finalJson.dialogue)) {
            scriptArray = finalJson.dialogue;
        } else {
            // Fallback if structure is weird but has keys
            // Just try to find ANY array in values
            const possibleArray = Object.values(finalJson).find(val => Array.isArray(val));
            scriptArray = possibleArray || [{ speaker: "System", text: "Could not parse script format." }];
        }

        res.json({ script: scriptArray, provider: "atlas-groq" });
    } catch (error) {
        // This catch block handles JSON parsing critical failures (unlikely due to fallbacks)
        console.error("[Podcast Error]", error);
        res.status(500).json({ error: error.message });
    }
});

// --- Route: Groq (Chat) ---
router.post('/groq', validateAIRequest, async (req, res) => {
    try {
        const { messages } = req.body;

        // Vision Detection
        const hasImages = messages.some(m => Array.isArray(m.content));

        let result;

        if (hasImages) {
            result = await callGroqVision(messages);
        } else {
            // Text Mode - Standardize formatting
            const textMessages = messages.map(msg => ({
                ...msg,
                content: Array.isArray(msg.content)
                    ? msg.content.map(c => c.text || JSON.stringify(c)).join('\n')
                    : msg.content
            }));

            result = await callGroqStealth(textMessages);
        }

        res.json(result);
    } catch (error) {
        console.error('[Chat Error]', error);
        res.status(500).json({
            error: "AI Service Error",
            message: error.message,
            details: `Backend Failure: ${error.message}`
        });
    }
});

// --- Route: YouTube Transcript ---
router.post('/youtube-transcript', async (req, res) => {
    const { videoId } = req.body;
    res.json({
        videoId: videoId,
        title: "YouTube Video",
        transcript: null,
        noTranscript: true,
        message: "Transcript not available."
    });
});

// --- Route: Generate Sample Paper (Groq Vision) ---
router.post('/generate-paper', async (req, res) => {
    try {
        const { extractedText, images } = req.body;

        // ... simplify logic, assume similar to before but calling callGroqVision ...
        // For brevity in this replacement, we'll just implement the direct call logic
        // re-constructing messages identical to before
        const content = [];
        if (extractedText) content.push({ type: "text", text: `Here is the text content:\n${extractedText}\n\n` });
        if (images && images.length > 0) {
            content.push({ type: "text", text: "Visual context:" });
            images.slice(0, 5).forEach(img => {
                content.push({ type: "image_url", image_url: { url: img } });
            });
        }

        content.push({
            type: "text",
            text: `You are an expert examination paper creator. Your job is to create a COMPLETE question paper in JSON format.

STEP 1 - ANALYZE THE SAMPLE:
- Count EVERY question (1, 2, 3... including all sub-parts like a, b, c)
- Note the sections (Section A, B, C, D, E if present)
- Identify question types per section
- Note marks per question if shown

STEP 2 - GENERATE NEW PAPER:
Create a BRAND NEW paper with:
- SAME total number of questions as the original
- SAME section structure
- SAME question types per section
- SAME difficulty level
- COMPLETELY DIFFERENT content (new questions, new scenarios)

OUTPUT FORMAT:
Return ONLY a valid JSON object with this structure:
{
  "title": "Paper Title",
  "sections": [
    {
      "name": "Section A",
      "questions": [
        {
          "id": "q1",
          "number": "1",
          "text": "Question text here...",
          "type": "mcq", // or "subjective"
          "marks": 1,
          "options": ["Option A", "Option B", "Option C", "Option D"] // only for mcq
        }
      ]
    }
  ]
}

CRITICAL RULES:
1. Return ONLY JSON. No markdown formatting.
2. Complete EVERY single question. Do not truncate.
3. For "type", use "mcq" if it has options, otherwise "subjective".`
        });


        const messages = [{ role: "user", content: content }];

        // This will now use the Graceful Failure version if Groq is down
        const generatedPaperObj = await callGroqVision(messages);
        let paperContent = generatedPaperObj.choices[0].message.content;

        // Clean up markdown if present
        paperContent = paperContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

        // Parse JSON
        let paperJson;
        try {
            paperJson = JSON.parse(paperContent);
        } catch (e) {
            console.error("Failed to parse paper JSON", e);
            // Fallback: try to find JSON object in text
            const match = paperContent.match(/\{[\s\S]*\}/);
            if (match) {
                try {
                    paperJson = JSON.parse(match[0]);
                } catch (e2) {
                    throw new Error("Could not parse AI response as JSON");
                }
            } else {
                throw new Error("Could not parse AI response as JSON");
            }
        }

        res.json({ success: true, paper: paperJson });

    } catch (error) {
        console.error("[Paper Gen] Error:", error);
        res.status(500).json({ error: "Failed to generate paper", details: error.message });
    }
});

// --- Route: Evaluate Paper ---
router.post('/evaluate-paper', async (req, res) => {
    try {
        const { userAnswers, questions } = req.body; // userAnswers: { q1: "answer", ... }

        const prompt = `You are an expert examiner. Grade these student answers.

QUESTIONS & ANSWERS:
${JSON.stringify(questions.map(q => ({
            id: q.id,
            question: q.text,
            marks: q.marks,
            studentAnswer: userAnswers[q.id] || "No answer provided"
        })))}

TASK:
1. Evaluate each answer for correctness.
2. Assign marks (0 to max marks).
3. Provide brief feedback/correction.

OUTPUT JSON FORMAT:
{
  "totalMarks": 50,
  "studentScore": 42,
  "results": [
    {
      "id": "q1",
      "marksObtained": 1,
      "feedback": "Correct. The law states..."
    }
  ]
}

Return ONLY JSON.`;

        const messages = [{ role: 'user', content: prompt }];
        const result = await callGroqStealth(messages);
        let evalContent = result.choices[0].message.content;
        evalContent = evalContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

        const evaluation = JSON.parse(evalContent);
        res.json({ success: true, evaluation });

    } catch (error) {
        console.error("[Evaluation] Error:", error);
        res.status(500).json({ error: "Failed to evaluate paper" });
    }
});


export default router;
