import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import OpenAI from 'openai';

dotenv.config();

const app = express();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  project: "proj_77Gh1LgUKZgy3yon6dD2QKOg"
});

app.use(cors({
  origin: ['https://www.timelypro.online', 'http://127.0.0.1:5500', 'https://staklabs.github.io'],
  methods: ['POST']
}));
app.use(express.json());

// Optional: list available models on startup (for debugging)
async function listModels() {
  const models = await openai.models.list();
  models.data
    .forEach(m => console.log("Model found:", m.id));
}
listModels();

app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

app.post('/ask', async (req, res) => {
  const { prompt, system, type, model, userTier } = req.body; // userTier added here

  console.log("📨 Incoming:", { type, prompt, model, userTier });

  try {
    if (type === "image") {
      // Only allow image gen for premium or ultra users
      if (userTier !== 'premium' && userTier !== 'ultra') {
        return res.status(403).json({ error: "Image generation is only for premium users." });
      }

      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024"
      });
      const image_url = response.data[0].url;
      console.log("🖼️ Image generated:", image_url);
      return res.json({ image_url });
    }

    // Text chat handling
    let languageModel;

    switch (userTier) {
      case 'ultra':
        languageModel = 'lumen-o3'; // Your branding for GPT-4o
        break;
      case 'premium':
        languageModel = 'lumen-o3'; // Same as ultra but maybe with limits client side
        break;
      default:
        languageModel = 'lumen-o4-mini'; // Free tier fallback
    }

    // Override model param if provided explicitly (optional)
    if (model) {
      languageModel = model;
    }

    // Use official OpenAI chat completions endpoint with correct model
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: languageModel,
        messages: [
          { role: 'system', content: system || "You are a helpful assistant." },
          { role: 'user', content: prompt }
        ]
      })
    });

    const data = await openaiRes.json();
    console.log('🧠 Raw AI response:', data);
    res.json(data);

  } catch (error) {
    console.error('❌ OpenAI fetch failed:', error);
    res.status(500).json({ error: 'Failed to contact OpenAI' });
  }
});

app.listen(3000, () => console.log('🔥 AI server is lit on port 3000'));
