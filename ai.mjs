import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({ storage: multer.memoryStorage() });

const allowlist = [
  'https://www.timelypro.online',
  'https://staklabs.github.io',
  'http://127.0.0.1:5501',
  'http://localhost:5501'
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowlist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function findModel(model) {
  const modelMap = {
        'Lumen VI': 'gemini-2.5-pro',
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
  return modelMap[model] || 'gpt-4o-mini';
}

setInterval(() => {
  const timestamp = new Date().toISOString();
  console.log(`[PONG] Server Heartbeat: ${timestamp} - Status: Active`);
}, 10 * 60 * 1000);

app.post('/ask', upload.single('file'), async (req, res) => {
  try {
    const { prompt, model, history = [], workspaceContext = "" } = req.body;
    const modelToUse = findModel(model);
    
    const parsedHistory = typeof history === 'string' ? JSON.parse(history) : history;
    const systemInstruction = `You are Lumen, an AI assistant. Context from the user's workspace: ${workspaceContext}`;

    if (modelToUse.includes('gemini')) {
      const generativeModel = genAI.getGenerativeModel({ model: modelToUse });
      
      const chat = generativeModel.startChat({
        history: parsedHistory.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        })),
      });

      let contentPayload;
      if (req.file) {
        contentPayload = [
          prompt || "Analyze this file.",
          { 
            inlineData: { 
              data: req.file.buffer.toString('base64'), 
              mimeType: req.file.mimetype 
            } 
          }
        ];
      } else {
        contentPayload = `${systemInstruction}\n\nUser: ${prompt}`;
      }

      const result = await chat.sendMessage(contentPayload);
      return res.json({ response: result.response.text() });
    }

    const messages = [
      { role: "system", content: systemInstruction },
      ...parsedHistory,
      { role: "user", content: prompt }
    ];

    const completion = await openai.chat.completions.create({ model: modelToUse, messages });
    return res.json({ response: completion.choices[0].message.content });

  } catch (error) {
    console.error('[ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Initial PONG sequence started. Intervals: 10 minutes.`);
});
