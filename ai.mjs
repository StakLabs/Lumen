import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const upload = multer({ dest: path.join(__dirname, 'uploads/') });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cors({
    origin: ['https://www.timelypro.online', 'http://127.0.0.1:5500', 'https://staklabs.github.io'],
    methods: ['GET', 'POST']
}));
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const LUMEN_PING_URL = 'https://lumen-ai.onrender.com/ping';
const PING_INTERVAL = 1000 * 60 * 10;

function keepLumenAlive() {
    fetch(LUMEN_PING_URL)
        .then(res => {
            if (res.ok) console.log('[捲] Lumen still vibin.');
            else console.warn('[豫] Weird response:', res.status);
        })
        .catch(err => console.error('[彫] Lumen may be snoozin:', err));
}
keepLumenAlive();
setInterval(keepLumenAlive, PING_INTERVAL);

function findModel(modelName) {
    if (modelName === 'Lumen o3') return 'gpt-4o';
    if (modelName === 'Lumen 4.1') return 'gpt-4.1-mini';
    return 'gpt-3.5-turbo';
}

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    console.log('刀 File uploaded:', fileUrl);
    res.json({ success: true, url: fileUrl });
});

app.post('/ask', async (req, res) => {
    try {
        const { prompt = '', system = '', model, userTier = 'free', file: fileUrl, type } = req.body;

        if (!model) return res.status(400).json({ error: 'Model not specified.' });

        if (type === 'image') {
            if (userTier !== 'premium' && userTier !== 'ultra') {
                return res.status(403).json({ error: 'Image generation only for premium users.' });
            }
            const dalleModel = model === 'Lumen o3' ? 'dall-e-3' : 'dall-e-2';
            const dalleSize = model === 'Lumen o3' ? '1024x1024' : '512x512';

            const response = await openai.images.generate({
                model: dalleModel,
                prompt,
                n: 1,
                size: dalleSize,
            });
            return res.json(response);
        }

        const chatModel = findModel(model);

        let messages = [{ role: 'system', content: system }];
        let userMessageContent;

        if (fileUrl) {
            const lowerUrl = fileUrl.toLowerCase();
            const isImage = /\.(png|jpe?g|gif|bmp|webp)$/i.test(lowerUrl);
            const isText = /\.(txt|md|csv|json)$/i.test(lowerUrl);

            if (isImage) {
                if (chatModel !== 'gpt-4o') {
                    return res.status(400).json({ error: 'Image analysis requires Lumen o3 (gpt-4o).' });
                }
                userMessageContent = [
                    { type: 'text', text: prompt || 'Describe this image.' },
                    { type: 'image_url', image_url: { url: fileUrl } }
                ];
            } else if (isText) {
                let fileText = '';
                try {
                    const response = await fetch(fileUrl);
                    fileText = await response.text();
                } catch (e) {
                    return res.status(500).json({ error: 'Failed to fetch file content.' });
                }
                userMessageContent = `${prompt}\n\n----- FILE CONTENT -----\n${fileText}`;
            } else {
                userMessageContent = prompt || 'File uploaded but unsupported file type for analysis.';
            }
        } else {
            userMessageContent = prompt;
        }
        messages.push({ role: 'user', content: userMessageContent });

        const completion = await openai.chat.completions.create({
            model: chatModel,
            messages
        });

        res.json({ response: completion.choices[0].message.content });
    } catch (error) {
        console.error('笶/ask failed:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

app.listen(PORT, () => {
    console.log(`櫨 AI server is lit on port ${PORT}`);
});
