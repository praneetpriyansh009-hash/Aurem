import { API_BASE_URL } from './api';

/**
 * Extracts video ID from various YouTube URL formats
 * @param {string} url 
 * @returns {string|null} videoId
 */
export const extractVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

/**
 * Fetches transcript from our backend server (which uses youtube-transcript)
 * @param {string} videoId 
 * @returns {Promise<{transcript: string}>}
 */
export const fetchTranscript = async (videoId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/youtube/transcript`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Failed to fetch transcript');
        }

        return await response.json();
    } catch (error) {
        console.error("YouTube Service Error:", error);
        throw error;
    }
};

/**
 * Start the AUREM Lens analysis pipeline
 * Returns a prompt optimized for Gemini to generate all study materials
 */
export const generateLensPrompt = (transcript) => {
    return `
You are AUREM LENS — an elite cognitive augmentation system.
Your goal is to transform this raw video transcript into a mastered study resource.

TRANSCRIPT:
${transcript.slice(0, 50000)} [TRUNCATED IF TOO LONG]

GENERATE A JSON OBJECT with these exact keys:
1. "summary": A crisp 150-200 word executive summary.
2. "notes": Comprehensive study notes in Markdown format. Use headers (#, ##), bullet points, and bold text for key concepts. Box definitions.
3. "flashcards": An array of 10 objects { "front": "question", "back": "answer" }.
4. "mindmap": A hierarchical JSON tree structure { "name": "Central Topic", "children": [{ "name": "Subtopic", "children": [...] }] }.
5. "quiz": An array of 10 objects { "question": "...", "options": ["A", "B", "C", "D"], "answer": "The full correct answer text", "explanation": "Why this is correct" }.

RULES:
- JSON ONLY. No markdown fencing around the JSON.
- Tone: Elite, intelligent, structured.
- No fluff.
`;
};
