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

      const dalleModel = model === 'Lumen o3' ? "dall-e-3" : "dall-e-2";
      const dalleSize = model === 'Lumen o3' ? "1024x1024" : "256x256";

      const response = await openai.images.generate({
        model: dalleModel,
        prompt,
        n: 1,
        size: dalleSize,
      });

      // ✅ RETURN HERE!!!
      return res.json(response); 
    }
  } catch (error) {
        console.error('❌ OpenAI fetch failed:', error);
        res.status(500).json({ error: 'Failed to contact OpenAI' });
      }
    });

const LUMEN_PING_URL = 'https://lumen-ai.onrender.com/ping';
const PING_INTERVAL = 1000 * 60 * 10; // 10 minutes

function keepLumenAlive() {
  fetch(LUMEN_PING_URL)
    .then(res => {
      if (res.ok) console.log('[🌞] Lumen still vibin.');
      else console.warn('[😬] Weird response:', res.status);
    })
    .catch(err => console.error('[💤] Lumen may be snoozin:', err));
}

keepLumenAlive(); // instant ping
setInterval(keepLumenAlive, PING_INTERVAL); // repeat every 10 mins

app.listen(3000, () => console.log('🔥 AI server is lit on port 3000'));
