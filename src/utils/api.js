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
 * Smart AI fetch: Calls Gemini DIRECTLY from the browser first.
 * Falls back to backend server if the direct call fails.
 * This means the app works even when the backend server is offline.
 */
export const retryableFetch = async (url, options = {}, retries = 3) => {
    // If calling an AI endpoint, try Gemini direct first (no server needed)
    const isAICall = url.includes('/ai/gemini') || url.includes('/ai/groq') || url.includes('/ai/podcast');

    if (isAICall && options.body) {
        try {
            const payload = JSON.parse(options.body);
            // If calling an AI endpoint, try Gemini direct first (no server needed)
            if (payload.messages && payload.messages.length > 0) {
                console.log('[AI] Calling Gemini directly (no server needed)...');

                // If the model is a Groq-only model, let Gemini use its default
                const isGroqModel = payload.model && (payload.model.includes('llama') || payload.model.includes('mixtral'));
                const targetModel = isGroqModel ? null : payload.model;

                const result = await callGemini(payload.messages, targetModel);
                if (result && result.choices && result.choices.length > 0) {
                    return result;
                }
                console.warn('[AI] Direct Gemini returned empty result, trying backend...');
            }
        } catch (directErr) {
            console.warn('[AI] Direct Gemini call failed, trying backend server...', directErr.message);
            // Fall through to backend server call below
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
        const data = await response.json();

        if (!response.ok) {
            return {
                ...data,
                error: data.error || data.message || `HTTP ${response.status}`
            };
        }

        return data;
    } catch (err) {
        if (retries > 0) return retryableFetch(url, options, retries - 1);
        // Return error object instead of throwing (prevents unhandled crashes)
        return {
            error: err.message || 'Network error',
            choices: [{ message: { role: 'assistant', content: `Connection error: ${err.message}. Please check your internet connection and try again.` }, finish_reason: 'stop' }]
        };
    }
};

export const useRetryableFetch = () => {
    return { retryableFetch };
};