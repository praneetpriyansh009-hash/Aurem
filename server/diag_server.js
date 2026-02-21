import express from 'express';
const app = express();
const PORT = 5050;

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
    console.log(`Diagnostic server on port ${PORT}`);
});
