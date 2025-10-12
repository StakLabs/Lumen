import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fetch from 'node-fetch';
import { GoogleGenAI, createUserContent } from "@google/genai";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({
    origin: ['https://www.timelypro.online', 'http://127.0.0.1:5500', 'https://staklabs.github.io'],
    methods: ['GET','POST']
}));
app.use(express.json());

// Initialize API clients
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!OPENAI_API_KEY || !GEMINI_API_KEY) {
    console.error("CRITICAL ERROR: One or both API keys are missing. Check environment variables.");
    // Optionally, prevent the server from starting or set a status route
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

let sessionHistory = [];

const LUMEN_PING_URL = 'https://lumen-ai.onrender.com/ping';
setInterval(() => { fetch(LUMEN_PING_URL).catch(() => {}); }, 10 * 60 * 1000);

function getMimeType(fileName, detectedMimeType) {
    if (detectedMimeType) return detectedMimeType;
    const extension = fileName.split('.').pop().toLowerCase();
    const mimeMap = {
        'txt': 'text/plain',
        'md': 'text/markdown',
        'csv': 'text/csv',
        'json': 'application/json',
        'js': 'text/javascript',
        'mjs': 'text/javascript',
        'ts': 'application/typescript',
        'pdf': 'application/pdf',
        'mp4': 'video/mp4',
        'mp3': 'audio/mp3',
        'wav': 'audio/wav',
        'avi': 'video/x-msvideo',
        'mov': 'video/quicktime',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'bmp': 'image/bmp',
        'webp': 'image/webp'
    };
    return mimeMap[extension] || 'application/octet-stream';
}

app.get('/', (req, res) => {
    res.send('Lumen AI Server is running.');
});

app.post('/ask', upload.single('file'), async (req, res) => {
    // Check for critical missing keys early
    if (!OPENAI_API_KEY || !GEMINI_API_KEY) {
         console.error("API Key Check Failed in /ask.");
         return res.status(503).json({ error: 'Server Error: Critical API keys are missing on the server.' });
    }

    try {
        const { prompt = '', system = '', model, userTier = 'free', type } = req.body;
        const modelToUse = model || 'gpt-3.5-turbo';
        const isGeminiModel = modelToUse.startsWith('gemini-');
        
        let userMessageContent = prompt;
        const messagesArray = [];

        if (system) {
            messagesArray.push({ role: 'system', content: system });
        }
        
        // --- Gemini (GoogleGenAI) Logic ---
        if (isGeminiModel && type !== 'image' && type !== 'video') {
            const contentParts = [];
            
            // Handle file upload for Gemini (if present)
            if (req.file) {
                const mimeType = getMimeType(req.file.originalname, req.file.mimetype);
                
                if (mimeType.startsWith('image/')) {
                    if (modelToUse !== 'gemini-2.5-pro') {
                        return res.status(400).json({ error: 'Image analysis requires Lumen VI (gemini-2.5-pro) or a special request type.' });
                    }
                    contentParts.push(createUserContent.fromBuffer({
                        buffer: req.file.buffer,
                        mimeType: mimeType,
                    }));
                } else if (mimeType.startsWith('text/') || mimeType === 'application/json') {
                    // For text files, embed content in the prompt
                    userMessageContent = `${prompt}\n\n----- FILE CONTENT (${req.file.originalname}) -----\n${req.file.buffer.toString('utf-8')}`;
                } else {
                    return res.status(400).json({ error: `Unsupported file type for Gemini chat: ${mimeType}` });
                }
            }
            
            contentParts.push(userMessageContent);
            
            messagesArray.push({ role: 'user', content: contentParts });

            // Using the new `generateContent` method
            const response = await ai.models.generateContent({
                model: modelToUse, 
                contents: messagesArray, 
            });

            return res.json({ response: response.text });
        }
        
        // --- OpenAI (GPT) Logic ---
        if (!isGeminiModel) {
            let chatModel = modelToUse;

            // Handle file upload for GPT (if present)
            if (req.file) {
                const filename = req.file.originalname.toLowerCase();
                if (/\.(txt|md|csv|json|js|mjs|ts|pdf|mp4|mp3|wav|avi|mov)$/i.test(filename)) {
                    // For text/document files, embed content in the prompt
                    userMessageContent = `${prompt}\n\n----- FILE CONTENT (${req.file.originalname}) -----\n${req.file.buffer.toString('utf-8')}`;
                } else if (/\.(png|jpe?g|gif|bmp|webp)$/i.test(filename)) {
                    return res.status(400).json({ error: 'Image analysis requires Lumen VI.' });
                } else {
                    return res.status(400).json({ error: 'Unsupported file type.' });
                }
            }

            messagesArray.push({ role: 'user', content: userMessageContent });
            
            // All classification calls use gpt-3.5-turbo, which is what the client requests
            const completion = await openai.chat.completions.create({ 
                model: chatModel, 
                messages: messagesArray 
            });
            
            return res.json({ response: completion.choices[0].message.content });
        }

        // --- Image/Video Generation Logic (Only for Lumen VI) ---
        if (type === 'image' || type === 'video') {
            if (type === 'image') {
                // Image Generation (DALL-E) - requires an OpenAI key
                const imageGenerationResult = await openai.images.generate({
                    model: 'dall-e-3', // Use the latest DALL-E model
                    prompt: prompt,
                    n: 1,
                    size: '1024x1024'
                });
                return res.json({ data: imageGenerationResult.data });
            } else if (type === 'video') {
                // Video Generation (Simulated/Placeholder or requires a different API not shown)
                return res.status(501).json({ error: 'Video generation is not yet fully implemented or configured on the server.' });
            }
        }
        
        return res.status(400).json({ error: 'Invalid request type or model configuration.' });

    } catch (err) {
        console.error("Server API Error:", err.message);
        
        // Capture specific API status codes if available
        const status = err.response?.status || 500;
        let message = err.message || 'An unknown error occurred on the server.';
        
        if (status === 401) {
            message = 'Authentication Error: Invalid or missing API key. Check server environment variables.';
        } else if (status === 404 && isGeminiModel) {
            message = `Gemini Model Not Found: The model '${modelToUse}' may not exist or is unavailable in your region.`;
        } else if (status === 404) {
            message = 'OpenAI Model Not Found: Check the requested model name.';
        }

        res.status(status).json({ error: message });
    }
});

app.post('/reset', (req, res) => {
    sessionHistory = [];
    res.send('Session history reset.');
});

app.listen(PORT, () => {
    console.log(`Lumen AI server running on port ${PORT}`);
});
