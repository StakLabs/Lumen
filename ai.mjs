import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fetch from 'node-fetch';
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const upload = multer({ dest: path.join(__dirname, 'uploads/') });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cors({
    origin: ['https://www.timelypro.online', 'http://127.0.0.1:5500', 'https://staklabs.github.io'],
    methods: ['GET','POST']
}));
app.use(express.json());

// Clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const LUMEN_PING_URL = 'https://lumen-ai.onrender.com/ping';
setInterval(() => {
    fetch(LUMEN_PING_URL).catch(() => {});
}, 10 * 60 * 1000);

function findModel(modelName) {
    if (modelName === 'Lumen V') return 'gpt-5';
    if (modelName === 'Lumen o3') return 'gpt-4o';
    if (modelName === 'Lumen 4.1') return 'gpt-4.1-mini';
    return 'gpt-3.5-turbo';
}

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ success: true, url: fileUrl, filename: req.file.filename });
});

app.post('/ask', async (req, res) => {
    try {
        const { prompt='', system='', model, userTier='free', file: fileUrl, type } = req.body;
        if (!model) return res.status(400).json({ error: 'Model not specified.' });

        // 🔹 Gemini branch
        if (model === 'gemini-2.5-pro') {
            const geminiModel = genAI.getGenerativeModel({ model });
            let parts = [];

            if (prompt) parts.push(prompt);

            if (fileUrl) {
                const lowerUrl = fileUrl.toLowerCase();
                const isImage = /\.(png|jpe?g|gif|bmp|webp)$/i.test(lowerUrl);
                const isText = /\.(txt|md|csv|json|js|mjs|ts)$/i.test(lowerUrl);

                if (isImage) {
                    // Gemini supports inline base64 images
                    try {
                        const filename = fileUrl.split('/').pop();
                        const localFilePath = path.join(__dirname, 'uploads', filename);
                        const imgBuffer = await fs.readFile(localFilePath);
                        const base64Img = imgBuffer.toString("base64");

                        parts.push({
                            inlineData: {
                                data: base64Img,
                                mimeType: "image/png"
                            }
                        });
                    } catch {
                        return res.status(500).json({ error: 'Failed to read uploaded image.' });
                    }
                } else if (isText) {
                    try {
                        const filename = fileUrl.split('/').pop();
                        const localFilePath = path.join(__dirname, 'uploads', filename);
                        const fileText = await fs.readFile(localFilePath, 'utf-8');
                        parts.push(`----- FILE CONTENT (${filename}) -----\n${fileText}`);
                    } catch {
                        return res.status(500).json({ error: 'Failed to read uploaded file.' });
                    }
                } else {
                    return res.status(400).json({ error: 'Unsupported file type for Gemini.' });
                }
            }

            const result = await geminiModel.generateContent(parts);
            return res.json({ response: result.response.text() });
        }

        // 🔹 Otherwise → OpenAI branch
        if (type === 'web_search_preview') {
            const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
            const response = await client.responses.create({
                model: findModel(model),
                tools: [{ type: "web_search_preview" }],
                input: prompt,
                instructions: system
            });
            return res.json(response.output_text);
        }

        if (type === 'image') {
            if (!['premium','ultra'].includes(userTier)) return res.status(403).json({ error: 'Image generation only for premium users.' });
            const dalleModel = (model === 'Lumen o3' || model === 'Lumen V') ? 'dall-e-3' : 'dall-e-2';
            const dalleSize = (model === 'Lumen o3' || model === 'Lumen V') ? '1024x1024' : '512x512';
            const response = await openai.images.generate({ model: dalleModel, prompt, n: 1, size: dalleSize });
            return res.json(response);
        }

        const chatModel = findModel(model);
        const messages = [];
        if (system && system.trim().length > 0) {
            messages.push({ role: 'system', content: system });
        }
        let userMessageContent = prompt;

        if (fileUrl) {
            const lowerUrl = fileUrl.toLowerCase();
            const isImage = /\.(png|jpe?g|gif|bmp|webp)$/i.test(lowerUrl);
            const isText = /\.(txt|md|csv|json|js|mjs|ts)$/i.test(lowerUrl);

            if (isImage) {
                if (!['gpt-4o','gpt-5'].includes(chatModel)) return res.status(400).json({ error: 'Image analysis requires Lumen o3/V.' });
                userMessageContent = [
                    { type: 'text', text: prompt || 'Describe this image.' },
                    { type: 'image_url', image_url: { url: fileUrl } }
                ];
            } else if (isText) {
                try {
                    const filename = fileUrl.split('/').pop();
                    const localFilePath = path.join(__dirname, 'uploads', filename);
                    const fileText = await fs.readFile(localFilePath, 'utf-8');
                    userMessageContent = `${prompt}\n\n----- FILE CONTENT (${filename}) -----\n${fileText}`;
                } catch {
                    return res.status(500).json({ error: 'Failed to read uploaded file.' });
                }
            } else {
                return res.status(400).json({ error: 'Unsupported file type.' });
            }
        }

        messages.push({ role: 'user', content: userMessageContent });
        const completion = await openai.chat.completions.create({ model: chatModel, messages });
        res.json({ response: completion.choices[0].message.content });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/ping', (req, res) => res.status(200).send('pong'));

app.listen(PORT, () => console.log(`AI server running on port ${PORT}`));
