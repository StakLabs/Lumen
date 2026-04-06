import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fetch from 'node-fetch';
import { GoogleGenAI, createUserContent } from '@google/genai';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const upload = multer({ storage: multer.memoryStorage() });

const allowlist = [
  'https://www.timelypro.online',
  'https://staklabs.github.io',
  'http://127.0.0.1:5501',
  'http://localhost:5501'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowlist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

let sessionHistory = [];

const LUMEN_PING_URL = 'https://lumen-ai.onrender.com/ping';
setInterval(() => {
  fetch(LUMEN_PING_URL).catch(() => {});
}, 10 * 60 * 1000);

function getMimeType(fileName, detectedMimeType) {
  if (detectedMimeType) return String(detectedMimeType);
  const ext = fileName.split('.').pop().toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    case 'pdf': return 'application/pdf';
    case 'txt': return 'text/plain';
    default: return 'application/octet-stream';
  }
}

function findModel(model) {
  const modelMap = {
    'Lumen VI': 'gemini-2.5-pro',
    'Lumen V': 'gpt-5',
    'Lumen o3': 'gpt-4o',
    'Lumen 4.1': 'gpt-4.1-mini'
  };
  return modelMap[model] || 'gpt-3.5-turbo';
}

app.post('/ask', upload.single('file'), async (req, res) => {
  try {
    const { prompt = '', model, type } = req.body;
    if (!model) return res.status(400).json({ error: 'Model not specified.' });
    const modelToUse = findModel(model);

    if (modelToUse.includes('gemini-2.5')) {
      const contentsArray = [];
      if (prompt) contentsArray.push({ text: prompt });
      if (req.file) {
        contentsArray.push({
          inlineData: {
            data: req.file.buffer.toString('base64'),
            mimeType: getMimeType(req.file.originalname, req.file.mimetype),
          },
        });
      }
      const response = await ai.models.generateContent({
        model: modelToUse,
        contents: [...sessionHistory.slice(-10), createUserContent(contentsArray)],
      });
      const replyText = response?.text || 'No response.';
      return res.json({ response: replyText });
    }

    const messagesArray = [{ role: 'user', content: prompt }];
    const completion = await openai.chat.completions.create({ model: modelToUse, messages: messagesArray });
    return res.json({ response: completion.choices[0].message.content });
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/ping', (req, res) => res.status(200).send('pong'));
app.listen(PORT, () => console.log(`AI server running on port ${PORT}`));
