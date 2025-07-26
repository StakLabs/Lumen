import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import OpenAI from 'openai';
import fileUpload from 'express-fileupload';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  project: "proj_77Gh1LgUKZgy3yon6dD2QKOg" // optional, remove if not needed
});

// CORS for frontend access
app.use(cors({
  origin: ['https://www.timelypro.online', 'http://127.0.0.1:5500', 'https://staklabs.github.io'],
  methods: ['GET', 'POST']
}));

// JSON + File Upload Middleware
app.use(express.json());
app.use(fileUpload());

// 🟢 Health check
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// 🧠 Ask endpoint (chat + image generation)
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

    // Chat completion (w/ optional file)
    const messages = [
      { role: "system", content: system },
      { role: "user", content: prompt }
    ];

    const payload = {
      model,
      messages
    };

    if (file) {
      payload.file_ids = [file]; // Correct place for file IDs
    }

    const completion = await openai.chat.completions.create(payload);

    res.json({ reply: completion.choices?.[0]?.message?.content || "No reply" });

  } catch (error) {
    console.error('❌ OpenAI fetch failed:', error);
    res.status(500).json({ error: 'Failed to contact OpenAI' });
  }
});

// 📁 Upload file to OpenAI
app.post('/upload', async (req, res) => {
  try {
    const file = req.files?.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    if (file.size > 100 * 1024 * 1024) {
      return res.status(400).json({ error: "Max file size is 100MB." });
    }

    const tempPath = path.join('/tmp', file.name);
    await fs.promises.writeFile(tempPath, file.data);

    const upload = await openai.files.create({
      file: fs.createReadStream(tempPath),
      filename: file.name,
      purpose: 'assistants'
    });

    await fs.promises.unlink(tempPath);

    console.log('📁 File uploaded:', upload.id);
    res.json({ success: true, file: upload });
  } catch (error) {
    console.error('❌ File upload failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🌞 Keep Render app awake
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

// 🚀 Start server
app.listen(3000, () => console.log('🔥 AI server is lit on port 3000'));
