import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import OpenAI from 'openai';

dotenv.config();

const app = express();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors({
  origin: ['https://www.timelypro.online', 'http://127.0.0.1:5500', 'https://staklabs.github.io'],
  methods: ['POST']
}));
app.use(express.json());

app.post('/ask', async (req, res) => {
  const { prompt, system, type } = req.body;

  console.log("📨 Incoming:", { type, prompt });

  if (type === "image") {
    try {
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024"
      });

      const image_url = response.data[0].url;
      console.log("🖼️ Image generated:", image_url);
      return res.json({ image_url });
    } catch (err) {
      console.error("🧨 Image gen failed:", err);
      return res.status(500).json({ error: "Image generation failed." });
    }
  }

  // fallback: text-based chat using fetch (for full control / headers)
  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
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
