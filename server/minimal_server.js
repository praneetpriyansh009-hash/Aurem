import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 5050;

app.use(cors({ origin: ['http://localhost:8080', 'http://localhost:5173'], credentials: true }));
app.use(express.json({ limit: '50mb' }));

console.log('========================================');
console.log('ATLAS MINIMAL SERVER STARTING');
console.log('Port:', PORT);
console.log('Groq Key:', process.env.GROQ_API_KEY ? 'LOADED' : 'MISSING');
console.log('========================================');

app.get('/health', (req, res) => {
    console.log('[HEALTH CHECK] Request received');
    res.json({ status: 'ok', port: PORT, time: new Date().toISOString() });
});

app.get('/', (req, res) => {
    console.log('[ROOT] Request received');
    res.send('<h1>Atlas Backend Running</h1><p>Port: ' + PORT + '</p>');
});

app.post('/api/ai/groq', async (req, res) => {
    console.log('[GROQ] Request received');
    try {
        if (!process.env.GROQ_API_KEY) throw new Error('Missing Groq API Key');

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: req.body.model || 'llama-3.3-70b-versatile',
                messages: req.body.messages || []
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Groq API Error: ${err}`);
        }

        const data = await response.json();
        console.log('[GROQ] Success!');
        res.json(data);
    } catch (error) {
        console.error('[GROQ] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/ai/gemini', (req, res) => {
    console.log('[GEMINI] Redirecting to Groq...');
    req.url = '/api/ai/groq';
    app.handle(req, res);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('✅ SERVER SUCCESSFULLY STARTED!');
    console.log(`✅ Listening on http://localhost:${PORT}`);
    console.log('✅ Ready to accept requests');
    console.log('');
});
