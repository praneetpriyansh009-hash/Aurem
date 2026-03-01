// Auto-detect environment: Use relative path for Vercel, localhost for dev
const isProduction = import.meta.env.PROD;
export const API_BASE_URL = isProduction ? '/api' : 'http://localhost:5050/api';

// Backend server endpoints (when server is running)
export const GEMINI_API_URL = `${API_BASE_URL}/ai/gemini`;
export const GROQ_API_URL = `${API_BASE_URL}/ai/groq`;
export const PODCAST_API_URL = `${API_BASE_URL}/ai/podcast`;
export const YOUTUBE_TRANSCRIPT_URL = `${API_BASE_URL}/ai/youtube-transcript`;

// Direct API clients (no backend needed)
import { callGemini } from './geminiClient';
import { callGroq } from './groqClient';

// Shared message formatter (OpenAI-style, works for both Gemini & Groq)
export const formatGroqPayload = (userContent, systemContent) => {
    return {
        messages: [
            { role: "system", content: systemContent },
            { role: "user", content: userContent }
        ]
    };
};
export const formatGeminiPayload = formatGroqPayload;

import { auth } from '../firebase';

/**
 * Smart AI fetch: Calls Groq/Gemini DIRECTLY from the browser first.
 * Falls back to backend server if the direct call fails.
 * No retry delays — fails fast and surfaces errors immediately.
 */
export const retryableFetch = async (url, options = {}, retries = 2) => {
    const isAICall = url.includes('/ai/gemini') || url.includes('/ai/groq') || url.includes('/ai/podcast');

    if (isAICall && options.body) {
        try {
            const payload = JSON.parse(options.body);
            if (payload.messages && payload.messages.length > 0) {
                const isGroqModel = payload.model && (payload.model.includes('llama') || payload.model.includes('mixtral'));

                if (isGroqModel) {
                    console.log('[AI] Calling Groq directly...');
                    const hasImage = payload.messages.some(m => Array.isArray(m.content) && m.content.some(c => c.type === 'image_url'));
                    const result = await callGroq(payload.messages, payload.model, hasImage);
                    if (result && result.choices && result.choices.length > 0) {
                        return result;
                    }
                } else {
                    console.log('[AI] Calling Gemini directly...');
                    const result = await callGemini(payload.messages, payload.model);
                    if (result && result.choices && result.choices.length > 0) {
                        return result;
                    }
                }
            }
        } catch (directErr) {
            console.warn('[AI] Direct API call failed, trying backend...', directErr.message);
        }
    }

    // Fallback: call the backend server
    try {
        const headers = { ...options.headers };

        if (auth.currentUser) {
            try {
                const token = await auth.currentUser.getIdToken();
                headers['Authorization'] = `Bearer ${token}`;
            } catch (authErr) {
                console.warn('[Auth] Could not get token:', authErr.message);
            }
        }

        const response = await fetch(url, { ...options, headers });

        if (response.status === 429 && retries > 0) {
            console.warn(`[AI] Rate limit hit, retrying... (${retries} left)`);
            return retryableFetch(url, options, retries - 1);
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            return {
                ...data,
                error: data.error || data.message || `HTTP ${response.status} error.`
            };
        }

        return data;
    } catch (err) {
        if (retries > 0) {
            console.warn(`[AI] Network error: ${err.message}. Retrying...`);
            return retryableFetch(url, options, retries - 1);
        }
        return {
            error: err.message || 'Network error',
            choices: [{ message: { role: 'assistant', content: `Connection error: ${err.message}. Please try again.` }, finish_reason: 'stop' }]
        };
    }
};

export const useRetryableFetch = () => {
    return { retryableFetch };
};