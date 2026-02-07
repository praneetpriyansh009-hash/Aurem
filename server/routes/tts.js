import express from 'express';
import googleTTS from 'google-tts-api';

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

        // Speaker mapping: Alex=UK, Sam=US for distinction
        const lang = speaker === 'Alex' ? 'en-GB' : 'en-US';

        // google-tts-api v0.0.6 uses getAudioUrl which returns a URL directly
        // For text > 200 chars, we need to use getAllAudioUrls
        let audioData;

        if (text.length <= 200) {
            // Short text - get single URL
            const url = googleTTS.getAudioUrl(text, {
                lang: lang,
                slow: false
            });
            audioData = url;
        } else {
            // Long text - get array of URLs, just use first for now
            const urls = googleTTS.getAllAudioUrls(text, {
                lang: lang,
                slow: false
            });
            // Return the first URL to keep it simple
            audioData = urls[0]?.url || googleTTS.getAudioUrl(text.substring(0, 200), { lang, slow: false });
        }

        res.json({
            audioData: audioData,
            speaker: speaker
        });

    } catch (error) {
        console.error('[TTS] Error:', error);
        res.status(500).json({ error: 'TTS Generation Failed: ' + error.message });
    }
});

export default router;
