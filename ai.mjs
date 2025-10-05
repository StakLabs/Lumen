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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const LUMEN_PING_URL = 'https://lumen-ai.onrender.com/ping';
setInterval(() => { fetch(LUMEN_PING_URL).catch(() => {}); }, 10 * 60 * 1000);

function findModel(modelName) {
    if (modelName === 'Lumen V') return 'gpt-5';
    if (modelName === 'Lumen o3') return 'gpt-4o';
    if (modelName === 'Lumen 4.1') return 'gpt-4.1-mini';
    if (modelName === 'Lumen 4.1 Pro') return 'gpt-4.1';
    if (modelName === 'Lumen VI') return 'gemini-2.5-pro';
    return 'gpt-3.5-turbo';
}

function getMimeType(fileName, detectedMimeType) {
    if (detectedMimeType) {
        return String(detectedMimeType);
    }
    const ext = fileName.split('.').pop().toLowerCase();
    switch (ext) {
        case 'png': return 'image/png';
        case 'jpg':
        case 'jpeg': return 'image/jpeg';
        case 'gif': return 'image/gif';
        case 'webp': return 'image/webp';
        case 'pdf': return 'application/pdf';
        case 'mp3': return 'audio/mp3';
        case 'mp4': return 'video/mp4';
        case 'txt': return 'text/plain';
        case 'csv': return 'text/csv';
        case 'json': return 'application/json';
        default: return 'application/octet-stream';
    }
}

app.post('/ask', upload.single('file'), async (req, res) => {
    try {
        const { prompt = '', system = '', model, userTier = 'free', type } = req.body;
        if (!model) return res.status(400).json({ error: 'Model not specified.' });

        const modelToUse = findModel(model);

        if (modelToUse === 'gemini-2.5-pro') {
            const contentsArray = [];
            if (prompt) contentsArray.push(prompt);

            if (req.file) {
                const mimeType = getMimeType(req.file.originalname, req.file.mimetype);
                
                const filePart = {
                    inlineData: {
                        data: req.file.buffer.toString('base64'),
                        mimeType: mimeType
                    },
                    displayName: req.file.originalname,
                };
                
                contentsArray.push(filePart);
            }

            if (contentsArray.length === 0) return res.status(400).json({ error: 'Please provide a prompt or a file for Gemini.' });

            const userMessageContent = createUserContent(contentsArray);

            const response = await ai.generateContent({
                model: modelToUse,
                contents: [userMessageContent]
            });

            const replyText = response?.text || 'Gemini generated no text.';
            return res.json({ response: replyText });
        }

        if (type === 'image') {
            if (!['premium', 'ultra'].includes(userTier)) return res.status(403).json({ error: 'Image generation only for premium users.' });
            const dalleModel = (['Lumen o3', 'Lumen V'].includes(model)) ? 'dall-e-3' : 'dall-e-2';
            const dalleSize = (['Lumen o3', 'Lumen V'].includes(model)) ? '1024x1024' : '512x512';
            const response = await openai.images.generate({ model: dalleModel, prompt, n: 1, size: dalleSize });
            return res.json(response);
        }

        const chatModelMap = {
            'Lumen V': 'gpt-5',
            'Lumen o3': 'gpt-4o',
            'Lumen 4.1': 'gpt-4.1-mini',
            'Lumen 4.1 Pro': 'gpt-4.1',
            'Lumen 3.5': 'gpt-3.5-turbo'
        };
        const chatModel = chatModelMap[model] || 'gpt-3.5-turbo';

        const messagesArray = [];
        if (system.trim()) messagesArray.push({ role: 'system', content: system });

        let userMessageContent = prompt;
        if (req.file) {
            const filename = req.file.originalname.toLowerCase();
            if (/\.(txt|md|csv|json|js|mjs|ts)$/i.test(filename)) {
                userMessageContent = `${prompt}\n\n----- FILE CONTENT (${req.file.originalname}) -----\n${req.file.buffer.toString('utf-8')}`;
            } else if (/\.(pdf|mp4|mp3|wav|avi|mov)$/i.test(filename)) {
                userMessageContent = `${prompt}\n\n[Attached file: ${req.file.originalname}]`;
            } else if (/\.(png|jpe?g|gif|bmp|webp)$/i.test(filename)) {
                return res.status(400).json({ error: 'Image analysis requires Lumen VI.' });
            } else {
                return res.status(400).json({ error: 'Unsupported file type.' });
            }
        }

        messagesArray.push({ role: 'user', content: userMessageContent });
        const completion = await openai.chat.completions.create({ model: chatModel, messages: messagesArray });
        res.json({ response: completion.choices[0].message.content });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/ping', (req, res) => res.status(200).send('pong'));

app.listen(PORT, () => console.log(`AI server running on port ${PORT}`));
