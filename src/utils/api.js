// Auto-detect environment: Use relative path for Vercel, localhost for dev
const isProduction = import.meta.env.PROD;
export const API_BASE_URL = isProduction ? '/api' : 'http://localhost:5050/api';

// Backend server endpoints (when server is running)
export const GEMINI_API_URL = `${API_BASE_URL}/ai/gemini`;
export const GROQ_API_URL = `${API_BASE_URL}/ai/groq`;
export const PODCAST_API_URL = `${API_BASE_URL}/ai/podcast`;
export const YOUTUBE_TRANSCRIPT_URL = `${API_BASE_URL}/ai/youtube-transcript`;

// Direct Gemini client (no backend needed)
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

// Sleep helper for exponential backoff
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Smart AI fetch: Calls Gemini/Groq DIRECTLY from the browser first.
 * Falls back to backend server if the direct call fails.
 */
export const retryableFetch = async (url, options = {}, retries = 3, delayMs = 1500) => {
    // If calling an AI endpoint, try direct browser fetch first (no server needed)
    const isAICall = url.includes('/ai/gemini') || url.includes('/ai/groq') || url.includes('/ai/podcast');

    if (isAICall && options.body) {
        try {
            const payload = JSON.parse(options.body);
            if (payload.messages && payload.messages.length > 0) {
                const isGroqModel = payload.model && (payload.model.includes('llama') || payload.model.includes('mixtral'));

                if (isGroqModel) {
                    console.log('[AI] Calling Groq directly (no server needed)...');
                    const hasImage = payload.messages.some(m => Array.isArray(m.content) && m.content.some(c => c.type === 'image_url'));

                    const result = await callGroq(payload.messages, payload.model, hasImage);
                    if (result && result.choices && result.choices.length > 0) {
                        return result;
                    }
                } else {
                    console.log('[AI] Calling Gemini directly (no server needed)...');
                    const result = await callGemini(payload.messages, payload.model);
                    if (result && result.choices && result.choices.length > 0) {
                        return result;
                    }
                }
                console.warn('[AI] Direct API returned empty result, trying backend...');
            }
        } catch (directErr) {
            console.warn('[AI] Direct API call failed, trying backend server...', directErr.message);
            // If the direct call hit a 429, we should definitely wait before falling back to backend
            if (directErr.message?.includes('429')) {
                await sleep(delayMs);
            }
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

        // If it's a 429 Rate Limit, we should retry!
        if (response.status === 429 && retries > 0) {
            console.warn(`[AI] Rate Limit Hit (429). Retrying in ${delayMs}ms... (${retries} retries left)`);
            await sleep(delayMs);
            return retryableFetch(url, options, retries - 1, delayMs * 2);
        }

        const data = await response.json().catch(() => ({})); // Handle empty/text responses gracefully

        if (!response.ok) {
            // Give up if out of retries, or if it's a 400 Bad Request (which shouldn't be retried)
            if (retries === 0 || response.status === 400) {
                return {
                    ...data,
                    error: data.error || data.message || `HTTP ${response.status} - Rate limit exhausted or invalid request.`
                };
            }

            // For 500s or other errors, wait and retry
            console.warn(`[AI] Server Error ${response.status}. Retrying in ${delayMs}ms...`);
            await sleep(delayMs);
            return retryableFetch(url, options, retries - 1, delayMs * 2);
        }

        return data;
    } catch (err) {
        // Network error (fetch threw Exception)
        if (retries > 0) {
            console.warn(`[AI] Network error: ${err.message}. Retrying in ${delayMs}ms...`);
            await sleep(delayMs);
            return retryableFetch(url, options, retries - 1, delayMs * 2);
        }

        // Return error object instead of throwing (prevents unhandled crashes)
        return {
            error: err.message || 'Network error',
            choices: [{ message: { role: 'assistant', content: `Connection error: ${err.message}. Please wait a moment and try again.` }, finish_reason: 'stop' }]
        };
    }
};

export const useRetryableFetch = () => {
    return { retryableFetch };
};