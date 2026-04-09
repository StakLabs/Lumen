import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fetch from 'node-fetch';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const upload = multer({ storage: multer.memoryStorage() });

const corsOptions = {
  origin: (origin, callback) => {
    // This allows any origin by reflecting it back to the requester
    // If there's no origin (like a mobile app or curl), it also allows it
    callback(null, true);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
// The {*splat} syntax tells Express 5 to match everything, including the root path
app.options('/{*splat}', cors(corsOptions));
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

let sessionHistory = [];

const LUMEN_PING_URL = 'https://lumen-ai.onrender.com/ping';
setInterval(() => {
  fetch(LUMEN_PING_URL).catch(() => {});
}, 10 * 60 * 1000);

function createUserContent(parts) {
  return { role: 'user', parts };
}

// RESTORED: Your original switch logic
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
    case 'mp3': return 'audio/mp3';
    case 'mp4': return 'video/mp4';
    case 'txt': return 'text/plain';
    case 'csv': return 'text/csv';
    case 'json': return 'application/json';
    default: return 'application/octet-stream';
  }
}

// RESTORED: Your original model mappings
function findModel(model) {
  const modelMap = {
    'Lumen VI': 'gemini-1.5-pro',
    'Lumen V': 'gpt-5',
    'Lumen o3': 'gpt-4o',
    'Lumen 4.1': 'gpt-4.1-mini',
    'Lumen 4.1 Pro': 'gpt-4.1',
    'Lumen 3.5': 'gpt-3.5-turbo',
    'gpt-5': 'gpt-5',
    'gpt-4o': 'gpt-4o',
    'gpt-4.1-mini': 'gpt-4.1-mini',
    'gpt-4.1': 'gpt-4.1',
    'gpt-3.5-turbo': 'gpt-3.5-turbo',
  };
  if (model && (model.startsWith('gemini-2.5-') || model === 'Lumen VI')) return 'gemini-1.5-pro';
  return modelMap[model] || 'gpt-3.5-turbo';
}

app.post('/ask', upload.single('file'), async (req, res) => {
  try {
    const { prompt = '', system = '', model, userTier = 'free', type } = req.body;
    if (!model) return res.status(400).json({ error: 'Model not specified.' });
    const modelToUse = findModel(model);

    // Gemini logic
    if (modelToUse.includes('gemini') && type !== 'image' && type !== 'video') {
      const contentsArray = [];
      if (prompt) contentsArray.push({ text: prompt });
      if (req.file) {
        const mimeType = getMimeType(req.file.originalname, req.file.mimetype);
        contentsArray.push({
          inlineData: {
            data: req.file.buffer.toString('base64'),
            mimeType,
          },
        });
      }
      if (contentsArray.length === 0) {
        return res.status(400).json({ error: 'Please provide a prompt or a file for Gemini.' });
      }

      const userMessageContent = createUserContent(contentsArray);
      const history = sessionHistory.slice(-10);
      
      const genModel = ai.getGenerativeModel({ model: modelToUse });
      const result = await genModel.generateContent({
        contents: [...history, userMessageContent],
      });
      
      const response = await result.response;
      const replyText = response.text() || 'Gemini generated no text.';
      
      sessionHistory.push(userMessageContent, { role: 'model', parts: [{ text: replyText }] });
      return res.json({ response: replyText });
    }

    // Video/Image Tier Checks
    if (modelToUse.includes('gemini') && type === 'video') {
      if (userTier !== 'loyal') return res.status(403).json({ error: 'Veo generation is exclusive to the Loyal Tier.' });
      return res.json({ message: "Veo 2.0 placeholder active." });
    }

    if (modelToUse.includes('gemini') && type === 'image') {
      if (userTier !== 'loyal') return res.status(403).json({ error: 'Imagen generation is exclusive to the Loyal Tier.' });
      return res.json({ message: "Imagen 3.0 placeholder active." });
    }

    // DALL-E Logic
    if (type === 'image') {
      if (!['premium', 'ultra'].includes(userTier)) {
        return res.status(403).json({ error: 'Image generation only for premium users.' });
      }
      const dalleModel = ['Lumen o3', 'Lumen V'].includes(model) ? 'dall-e-3' : 'dall-e-2';
      const dalleSize = ['Lumen o3', 'Lumen V'].includes(model) ? '1024x1024' : '512x512';
      const response = await openai.images.generate({ model: dalleModel, prompt, n: 1, size: dalleSize });
      return res.json(response);
    }

    // OpenAI Chat Logic
    let userMessageContent = prompt;
    if (req.file) {
      const filename = req.file.originalname.toLowerCase();
      if (/\.(txt|md|csv|json|js|mjs|ts)$/i.test(filename)) {
        userMessageContent = `${prompt}\n\n----- FILE CONTENT (${req.file.originalname}) -----\n${req.file.buffer.toString('utf-8')}`;
      } else {
        userMessageContent = `${prompt}\n\n[Attached file: ${req.file.originalname}]`;
      }
    }

    // FIXED: Changed openai.responses.create to openai.chat.completions.create
    const messagesArray = [];
    if (system && system.trim()) messagesArray.push({ role: 'system', content: system });
    messagesArray.push({ role: 'user', content: userMessageContent });

    const completion = await openai.chat.completions.create({
      model: modelToUse,
      messages: messagesArray
    });

    return res.json({ response: completion.choices[0].message.content });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/reset', (req, res) => {
  sessionHistory = [];
  res.json({ message: 'Gemini session reset.' });
});

app.get('/ping', (req, res) => res.status(200).send('pong'));

// FIXED: Removed the extra trailing } that was causing the Render crash
app.listen(PORT, () => console.log(`AI server running on port ${PORT}`));
