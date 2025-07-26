import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import OpenAI from 'openai';
import fileUpload from 'express-fileupload';

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
  const { prompt, system, type, model, userTier } = req.body;
  console.log("📨 Incoming:", { type, prompt, model, userTier });

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

    // Chat completion
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt }
      ]
    });

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

    const upload = await openai.files.create({
      file: file.data,
      purpose: 'assistants' // Or 'fine-tune' depending on use
    });

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
