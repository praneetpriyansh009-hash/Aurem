import express from 'express';
console.log('--- BACKEND BOOTING UP: ' + new Date().toLocaleTimeString() + ' ---');
console.log('--- VERIFICATION VERSION: 9.0 ---');
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

console.log('[Startup] Importing routes...');
import authRoutes from './routes/auth.js';
import aiRoutes from './routes/ai.js';
// import ttsRoutes from './routes/tts.js';
console.log('[Startup] Routes imported.');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory first, then fall back to root
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config(); // Also load root .env for any missing vars


const app = express();
const PORT = process.env.PORT || 5050; // Consolidated to port 5050

// Security Middleware
app.use(helmet()); // Set security HTTP headers

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api', limiter); // Apply to all API routes

// CORS Configuration
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? process.env.ALLOWED_ORIGINS?.split(',') || true
        : ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:8082', 'http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:8080'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' })); // Increased limit for document processing

// Health check endpoint for deployment monitoring
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
// app.use('/api/ai', ttsRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, '..', 'dist');
    app.use(express.static(distPath));

    // Handle SPA routing - serve index.html for all non-API routes
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(distPath, 'index.html'));
        }
    });
}

// Database Connection
// Change 'localhost' to '127.0.0.1'
const MONGODB_URI = process.env.MONGODB_URI;

// Check if we are in production/Vercel and trying to connect to localhost (which fails)
const isLocalhostDb = MONGODB_URI?.includes('localhost') || MONGODB_URI?.includes('127.0.0.1');
const shouldConnect = MONGODB_URI && (!process.env.VERCEL || !isLocalhostDb);

if (shouldConnect) {
    mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
        .then(() => console.log('MongoDB Connected'))
        .catch(err => console.error('MongoDB Connection Error:', err.message));
} else {
    console.log('MongoDB URI missing or invalid for production. Skipping database connection.');
}

// Basic Route
app.get('/', (req, res) => {
    res.send('Atlas API Server Running');
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Only start the server if running directly (dev/prod server), not when imported by Vercel
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    console.log(`[Startup] Attempting to listen on port ${PORT}...`);
    app.listen(PORT, () => {
        console.log(`[Startup] Server successfully running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

        // Masked key logging for verification
        const mask = (key) => key ? `${key.substring(0, 4)}...${key.substring(key.length - 2)}` : 'MISSING';
        console.log(`[AI Status] Gemini Key: ${mask(process.env.GEMINI_API_KEY)}`);
        console.log(`[AI Status] Groq Key: ${mask(process.env.GROQ_API_KEY)}`);
    });
}

export default app;
