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

const allowlist = [
  'https://www.timelypro.online',
  'https://staklabs.github.io',
  'http://127.0.0.1:5501',
  'http://localhost:5501'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowlist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

let sessionHistory = [];

function getMimeType(originalname, mimetype) {
  return mimetype || 'application/octet-stream';
}

function findModel(model) {
  const modelMap = {
    'Lumen 4o': 'gpt-4o',
    'Lumen 4.1': 'gpt-4o-mini',
    'Lumen VI': 'gemini-1.5-flash'
  };
  return modelMap[model] || model || 'gpt-4o-mini';
}

app.post('/ask', upload.single('file'), async (req, res) => {
  try {
    const { prompt = '', model } = req.body;
    if (!model) return res.status(400).json({ error: 'Model not specified.' });
    
    const modelToUse = findModel(model);

    if (modelToUse.includes('gemini')) {
      const contentsArray = [];
      if (prompt) contentsArray.push({ text: prompt });
      
      if (req.file) {
        contentsArray.push({
          inlineData: {
            data: req.file.buffer.toString('base64'),
            mimeType: getMimeType(req.file.originalname, req.file.mimetype),
          },
        });
      }

      const generativeModel = genAI.getGenerativeModel({ model: modelToUse });
      const result = await generativeModel.generateContent({
        contents: [...sessionHistory.slice(-10), { role: 'user', parts: contentsArray }],
      });
      
      const response = await result.response;
      const replyText = response.text();
      return res.json({ response: replyText });
    }

    const messagesArray = [...sessionHistory.slice(-10), { role: 'user', content: prompt }];
    const completion = await openai.chat.completions.create({ 
      model: modelToUse, 
      messages: messagesArray 
    });
    
    return res.json({ response: completion.choices[0].message.content });
    
  } catch (error) {
    console.error('Error details:', error.message);
    res.status(500).json({ error: error.message || 'Internal server error.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
