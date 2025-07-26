import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import OpenAI from 'openai';
import fileUpload from 'express-fileupload';
import { Readable } from 'stream';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  project: "proj_77Gh1LgUKZgy3yon6dD2QKOg"
});

// CORS setup
app.use(cors({
  origin: ['https://www.timelypro.online', 'http://127.0.0.1:5500', 'https://staklabs.github.io'],
  methods: ['POST', 'GET']
}));

// File upload middleware (for multipart/form-data)
app.use(fileUpload());

// JSON middleware (for other endpoints like /ask)
app.use(express.json());

// Sanity check middleware
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (
    req.method === 'POST' &&
    !contentType.startsWith('application/json') &&
    !contentType.startsWith('multipart/form-data')
  ) {
    return res.status(400).json({ error: 'Unsupported content-type for POST' });
  }
  next();
});

// Health check
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Upload file to OpenAI
app.post('/upload', async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const file = req.files.file;
    const tempPath = path.join('/tmp', `${Date.now()}-${file.name}`);
    await fs.writeFile(tempPath, file.data); // Save to temp

    const upload = await openai.files.create({
      file: tempPath,
      purpose: 'assistants'
    });

    await fs.unlink(tempPath); // Clean up

    console.log('📁 File uploaded:', upload.id);
    res.json({ success: true, file: upload });
  } catch (error) {
    console.error('❌ File upload failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ask Lumen
app.post('/ask', async (req, res) => {
  const { prompt, system, type, model, userTier, file } = req.body;
  console.log("📨 Incoming:", { type, prompt, model, userTier, file });

  try {
    if (type === 'image') {
      if (userTier !== 'premium' && userTier !== 'ultra') {
        return res.status(403).json({ error: "Image generation is only for premium users." });
      }

      const dalleModel = model === 'Lumen o3' ? "dall-e-3" : "dall-e-2";
      const dalleSize = model === 'Lumen o3' ? "1024x1024" : "512x512";

      const response = await openai.images.generate({
        model: dalleModel,
        prompt,
        n: 1,
        size: dalleSize,
      });

      return res.json(response);
    }

    const gptModel = findModel(model);
    const messages = [
      { role: "system", content: system },
      file ? { role: "user", content: prompt, file_ids: [file] } : { role: "user", content: prompt }
    ];

    const completion = await openai.chat.completions.create({
      model: gptModel,
      messages
    });

    res.json({ reply: completion.choices?.[0]?.message?.content || "No reply" });
  } catch (error) {
    console.error('❌ OpenAI fetch failed:', error);
    res.status(500).json({ error: 'Failed to contact OpenAI', detail: error.message });
  }
});

// Model mapper
function findModel(m) {
  if (m === 'Lumen o3') return 'gpt-4o';
  if (m === 'Lumen 4.1') return 'gpt-4.1-mini';
  return 'gpt-3.5-turbo';
}

// Keep-alive pinger
const LUMEN_PING_URL = 'https://lumen-ai.onrender.com/ping';
const PING_INTERVAL = 1000 * 60 * 10;

function keepLumenAlive() {
  fetch(LUMEN_PING_URL)
    .then(res => {
      if (res.ok) console.log('[🌞] Lumen still vibin.');
      else console.warn('[😬] Weird response:', res.status);
    })
    .catch(err => console.error('[💤] Lumen may be snoozin:', err));
}

keepLumenAlive();
setInterval(keepLumenAlive, PING_INTERVAL);

// Start server
app.listen(PORT, () => console.log(`🔥 AI server is lit on port ${PORT}`));
