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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Keep Lumen alive
const LUMEN_PING_URL = 'https://lumen-ai.onrender.com/ping';
setInterval(() => {
    fetch(LUMEN_PING_URL)
        .then(res => console.log('Lumen ping', res.status))
        .catch(err => console.error(err));
}, 10 * 60 * 1000);

// ------------------ MODEL MAPPING ------------------
function findModel(modelName) {
  // Accept both friendly names and OpenAI names
  switch (modelName.toLowerCase()) {
    case 'lumen o3':
    case 'gpt-4o':
      return 'gpt-4o';
    case 'lumen v':
    case 'gpt-5':
      return 'gpt-5';
    default:
      throw new Error('Unsupported model. Only GPT-4o and GPT-5 are allowed.');
  }
}

// ------------------ UPLOAD ENDPOINT ------------------
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ success: true, url: fileUrl, filename: req.file.filename });
});

// ------------------ ASK ENDPOINT ------------------
app.post('/ask', async (req, res) => {
    try {
        const { prompt='', system='', model, userTier='free', file: fileUrl, type } = req.body;
        if (!model) return res.status(400).json({ error: 'Model not specified.' });

        const chatModel = findModel(model);

        // ---------------- IMAGE GENERATION ----------------
        if (type === 'image') {
            if (!['premium','ultra'].includes(userTier)) return res.status(403).json({ error: 'Image generation only for premium users.' });
            const dalleModel = chatModel === 'gpt-4o' || chatModel === 'gpt-5' ? 'dall-e-3' : 'dall-e-2';
            const dalleSize = chatModel === 'gpt-4o' || chatModel === 'gpt-5' ? '1024x1024' : '512x512';
            const response = await openai.images.generate({ model: dalleModel, prompt, n: 1, size: dalleSize });
            return res.json(response);
        }

        // ---------------- FILE INPUT ----------------
        let userMessageContent = prompt;

        if (fileUrl) {
            const lowerUrl = fileUrl.toLowerCase();
            const isImage = /\.(png|jpe?g|gif|bmp|webp)$/i.test(lowerUrl);
            const isText = /\.(txt|md|csv|json|js|mjs|ts|pdf)$/i.test(lowerUrl);

            if (chatModel === 'gpt-5') {
                // GPT-5 Responses API supports input_file
                const gpt5Input = [
                    {
                        role: 'user',
                        content: [
                            { type: 'input_text', text: prompt || 'Analyze the uploaded file and summarize key points.' },
                            { type: 'input_file', file_url: fileUrl }
                        ]
                    }
                ];
                const response = await openai.responses.create({ model: 'gpt-5', input: gpt5Input });
                return res.json({ response: response.output_text || 'No output from GPT-5.' });
            }

            if (chatModel === 'gpt-4o') {
                if (isImage) {
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
                    } catch (e) {
                        return res.status(500).json({ error: 'Failed to read uploaded file.' });
                    }
                } else {
                    return res.status(400).json({ error: 'Unsupported file type.' });
                }
            }
        }

        // ---------------- CHAT COMPLETION ----------------
        const messages = [{ role: 'system', content: system }, { role: 'user', content: userMessageContent }];
        const completion = await openai.chat.completions.create({ model: chatModel, messages });
        res.json({ response: completion.choices[0].message.content });

    } catch (err) {
        console.error('/ask failed:', err);
        res.status(500).json({ error: err.message });
    }
});

// ---------------- PING ENDPOINT ----------------
app.get('/ping', (req, res) => res.status(200).send('pong'));

app.listen(PORT, () => console.log(`AI server running on port ${PORT}`));
//
