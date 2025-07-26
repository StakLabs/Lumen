import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
app.use(cors({
  origin: ['https://www.timelypro.online', 'http://127.0.0.1:5500', 'https://staklabs.github.io'],
  methods: ['GET', 'POST']
}));
app.use(express.json());
app.use(fileUpload());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post('/ask', async (req, res) => {
  const { prompt, system, type, model, userTier, file } = req.body;

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

    // Build messages array
    const messages = [
      { role: "system", content: system },
      file ? { role: "user", content: prompt, file_ids: [file] } : { role: "user", content: prompt }
    ];

    const completion = await openai.chat.completions.create({
      model,
      messages
    });

    res.json({ reply: completion.choices?.[0]?.message?.content || "No reply" });

  } catch (error) {
    console.error('❌ OpenAI request failed:', error);
    res.status(500).json({ error: 'Failed to contact OpenAI', detail: error.message });
  }
});

app.post('/upload', async (req, res) => {
  try {
    const file = req.files?.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded.' });
    if (file.size > 100 * 1024 * 1024)
      return res.status(400).json({ error: 'Max file size is 100MB.' });

    const tempPath = path.join('/tmp', file.name);
    await fs.promises.writeFile(tempPath, file.data);

    let upload;
    try {
      upload = await openai.files.create({
        file: fs.createReadStream(tempPath),
        purpose: 'assistants'
      });
    } catch (err) {
      console.error('❌ Upload to OpenAI failed:', err);
      return res.status(500).json({ error: 'Upload failed', detail: err.message });
    }

    try {
      await fs.promises.unlink(tempPath);
    } catch (err) {
      console.warn('⚠️ Could not delete temp file:', err.message);
    }

    res.json({ success: true, file: upload });
  } catch (err) {
    console.error('🔥 /upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

const LUMEN_PING_URL = 'https://lumen-ai.onrender.com/ping';
setInterval(() => {
  fetch(LUMEN_PING_URL)
    .then(() => console.log('🔁 Keeping Lumen alive'))
    .catch(err => console.error('💀 Keep-alive ping failed:', err.message));
}, 5 * 60 * 1000);

app.listen(3000, () => {
  console.log('🔥 AI server lit on port 3000');
});
