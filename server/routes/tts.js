import express from 'express';
import * as googleTTS from 'google-tts-api';

const router = express.Router();

/**
 * POST /api/ai/tts
 * Generates audio URL for the given text.
 * Body: { text: "string", speaker: "Alex" | "Sam" }
 */
router.post('/tts', async (req, res) => {
    try {
        const { text, speaker } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        // --- Speaker Mapping ---
        // "Alex" (Host) -> UK English (to sound distinct/smart) or US.
        // "Sam" (Expert) -> US English or AU.
        // Let's use: Alex=UK, Sam=US for clear distinction.
        const lang = speaker === 'Alex' ? 'en-GB' : 'en-US';
        const slow = false;

        // google-tts-api limitation: max 200 chars per request usually.
        // However, getAudioBase64() handles splitting internally usually, 
        // OR we can use getAllAudioBase64 for long text.
        // Since podcast lines can be long, we should be safe.
        // Let's use getAudioBase64 which returns a single base64 string (if short enough)
        // or we might need to handle splitting if text is very long.
        // Actually, for podcast lines (usually 1-3 sentences), standard generation might work.
        // But to be robust, let's use getAllAudioBase64 and combine? 
        // Or just let the frontend handle the URL.

        // Better approach: Use `getAudioBase64` which returns a promise.
        // If text is > 200 chars, the library splits it. 
        // We will try to generate a single playable buffer.

        // Note: google-tts-api `getAudioBase64` returns the base64 of the MP3.
        const base64Audio = await googleTTS.getAudioBase64(text, {
            lang: lang,
            slow: false,
            host: 'https://translate.google.com',
            timeout: 10000,
        });

        // Return as a playable data URI or just the base64
        res.json({
            audioData: `data:audio/mp3;base64,${base64Audio}`,
            speaker: speaker
        });

    } catch (error) {
        // Fallback for very long text (library throws if too long for single request)
        if (error.message && error.message.includes('text length')) {
            try {
                // If too long, just give the first chunk for now or fail gracefully
                // Real fix would be stitching, but for now let's truncate or split.
                console.warn("[TTS] Text too long, truncating or splitting not implemented yet.");
                return res.status(400).json({ error: 'Text too long for TTS chunk' });
            } catch (e) {
                console.error('[TTS] Error:', e);
                return res.status(500).json({ error: 'TTS Generation Failed' });
            }
        }

        console.error('[TTS] Error:', error);
        res.status(500).json({ error: 'TTS Generation Failed' });
    }
});

export default router;
