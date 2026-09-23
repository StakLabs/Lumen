import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

const allowedOrigins = [
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'https://staklabs.github.io',
  'https://sites.google.com',
  'https://ayaan-creator-web-2.github.io'
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options('/{*splat}', cors(corsOptions));
app.use(express.json());

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

let sessionHistory = [];

const LUMEN_PING_URL = 'https://lumen-ai.onrender.com/ping';
setInterval(() => {
  fetch(LUMEN_PING_URL).catch(() => {});
}, 10 * 60 * 1000);

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'jsonl', 'js', 'mjs', 'cjs',
  'ts', 'tsx', 'jsx', 'html', 'htm', 'css', 'scss', 'sass', 'less', 'xml',
  'yaml', 'yml', 'log', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'rb',
  'go', 'rs', 'php', 'sh', 'bash', 'bat', 'ps1', 'sql', 'env', 'ini', 'conf',
  'config', 'toml', 'vue', 'svelte', 'astro', 'graphql', 'gql', 'svg'
]);

const SUPPORTED_INLINE_MIME = /^(image\/(png|jpeg|jpg|webp|gif|heic|heif)|video\/(mp4|mpeg|mov|avi|webm|wmv|3gpp)|audio\/(wav|mp3|aiff|aac|ogg|flac|mpeg)|application\/pdf)$/i;

function getMimeType(fileName, detectedMimeType) {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    case 'heic': return 'image/heic';
    case 'heif': return 'image/heif';
    case 'pdf': return 'application/pdf';
    case 'mp3': return 'audio/mp3';
    case 'wav': return 'audio/wav';
    case 'ogg': return 'audio/ogg';
    case 'mp4': return 'video/mp4';
    case 'mov': return 'video/mov';
    case 'webm': return 'video/webm';
    case 'txt': return 'text/plain';
    case 'csv': return 'text/csv';
    case 'json': return 'application/json';
  }
  if (detectedMimeType && detectedMimeType !== 'application/octet-stream') {
    return String(detectedMimeType);
  }
  return 'application/octet-stream';
}

function findModel(model) {
  const modelMap = {
    'Lumen VI': 'gemini-2.5-flash',
    'Lumen V': 'gemini-2.5-flash',
    'Lumen o3': 'gemini-2.5-pro',
    'Lumen 4.1': 'gemini-2.5-flash',
    'Lumen 4.1 Pro': 'gemini-2.5-pro',
    'Lumen 3.5': 'gemini-2.5-flash',
    'Lumen 7': 'gemini-2.5-pro',
    'gpt-5': 'gemini-2.5-pro',
    'gpt-4o': 'gemini-2.5-flash',
    'gpt-4.1-mini': 'gemini-2.5-flash',
    'gpt-4.1': 'gemini-2.5-pro',
    'gpt-3.5-turbo': 'gemini-2.5-flash',
  };
  if (model && model.startsWith('gemini-')) return model;
  return modelMap[model] || 'gemini-2.5-flash';
}

async function generateWithGemini({ model, prompt, system, file, history }) {
  const parts = [];

  if (file) {
    const filename = file.originalname || 'file';
    const ext = filename.includes('.') ? filename.split('.').pop().toLowerCase() : '';
    const isTextLike =
      TEXT_EXTENSIONS.has(ext) ||
      (file.mimetype && file.mimetype.startsWith('text/')) ||
      file.mimetype === 'application/json';

    if (isTextLike && file.buffer.length <= 2 * 1024 * 1024) {
      let content;
      try {
        content = file.buffer.toString('utf-8');
      } catch {
        content = '';
      }
      parts.push({
        text: `----- FILE CONTENT (${filename}) -----\n${content}\n----- END FILE -----`
      });
    } else {
      const mimeType = getMimeType(filename, file.mimetype);
      if (SUPPORTED_INLINE_MIME.test(mimeType)) {
        if (file.buffer.length > 20 * 1024 * 1024) {
          throw new Error(`File "${filename}" is too large for inline processing (max ~20MB for this type).`);
        }
        parts.push({
          inlineData: {
            data: file.buffer.toString('base64'),
            mimeType
          }
        });
      } else {
        parts.push({
          text: `[Attached file: ${filename} (${mimeType}) — this file type cannot be read directly. Ask the user to convert it to text or an image.]`
        });
      }
    }
  }

  if (prompt) parts.push({ text: prompt });

  if (parts.length === 0) {
    throw new Error('Please provide a prompt or a file.');
  }

  const modelParams = { model };
  if (system && system.trim()) {
    modelParams.systemInstruction = system;
  }

  const genModel = ai.getGenerativeModel(modelParams);
  const userMessageContent = { role: 'user', parts };

  const result = await genModel.generateContent({
    contents: [...(history || []), userMessageContent]
  });

  const response = result.response;
  let replyText = '';
  try {
    replyText = response.text();
  } catch (e) {
    console.error('Failed to read Gemini response text:', e.message);
  }
  if (!replyText) replyText = 'Gemini generated no text.';

  return { replyText, parts };
}

app.post('/ask', upload.single('file'), async (req, res) => {
  try {
    const { prompt = '', system = '', model, userTier = 'free', type } = req.body || {};
    if (!model) return res.status(400).json({ error: 'Model not specified.' });
    const modelToUse = findModel(model);

    if (type === 'video') {
      if (!prompt) return res.status(400).json({ error: 'Please provide a prompt.' });
      if (userTier !== 'loyal') {
        return res.status(403).json({ error: 'Veo generation is exclusive to the Loyal Tier.' });
      }
      return res.json({ message: 'Veo 2.0 placeholder active.' });
    }

    if (type === 'image') {
  if (!prompt) return res.status(400).json({ error: 'Please provide a prompt.' });

  try {
    const imageModel = ai.getGenerativeModel({
      model: 'gemini-2.5-flash-image'
    });

    const imgResult = await imageModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const parts = imgResult.response?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(p => p.inlineData);

    if (!imagePart) {
      return res.status(500).json({ error: 'No image was returned by the model.' });
    }

    // Shape the response so the frontend's existing reader still works:
    //   data.predictions[0].bytesBase64Encoded  +  .mimeType
    return res.json({
      predictions: [{
        bytesBase64Encoded: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType || 'image/png'
      }]
    });
  } catch (err) {
    console.error('IMAGE GEN ERROR:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

    const { replyText, parts } = await generateWithGemini({
      model: modelToUse,
      prompt,
      system,
      file: req.file,
      history: sessionHistory.slice(-10)
    });

    sessionHistory.push(
      { role: 'user', parts },
      { role: 'model', parts: [{ text: replyText }] }
    );

    return res.json({ response: replyText });
  } catch (err) {
    console.error('INTERNAL SERVER ERROR:', err.message);
    const status = err.status || (err.message && err.message.includes('too large') ? 413 : 500);
    res.status(status).json({ error: err.message });
  }
});

app.post('/reset', (req, res) => {
  sessionHistory = [];
  res.json({ message: 'Gemini session reset.' });
});

app.get('/ping', (req, res) => res.status(200).send('pong'));

app.listen(PORT, () => console.log(`AI server running on port ${PORT}`));
