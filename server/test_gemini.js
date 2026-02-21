// Quick test to verify the Gemini API key works
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const key = process.env.GEMINI_API_KEY;
console.log('Key present:', !!key);
console.log('Key starts with:', key?.substring(0, 10) + '...');

const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;

try {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: 'Say OK if you can hear me.' }] }]
        })
    });

    const data = await res.json();

    if (res.ok) {
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log('SUCCESS! Gemini replied:', text);
    } else {
        console.log('ERROR:', res.status, JSON.stringify(data));
    }
} catch (err) {
    console.log('FETCH ERROR:', err.message);
}
