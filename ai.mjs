import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fetch from 'node-fetch';
import mime from 'mime-types';
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
    GoogleGenAI,
    createUserContent,
    createPartFromUri,
  } from "@google/genai";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const upload = multer({ dest: path.join(__dirname, 'uploads/') });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cors({
    origin: ['https://www.timelypro.online', 'http://127.0.0.1:5500', 'https://staklabs.github.io'],
    methods: ['GET','POST']
}));
app.use(express.json());

// Clients
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const LUMEN_PING_URL = 'https://lumen-ai.onrender.com/ping';
setInterval(() => {
    fetch(LUMEN_PING_URL).catch(() => {});
}, 10 * 60 * 1000);

function findModel(modelName) {
    if (modelName === 'Lumen V') return 'gpt-5';
    if (modelName === 'Lumen o3') return 'gpt-4o';
    if (modelName === 'Lumen 4.1') return 'gpt-4.1-mini';
    if (modelName === 'Lumen 4.1 Pro') return 'gpt-4.1';
    if (modelName === 'Lumen VI') return 'gemini-2.5-pro';
    return 'gpt-3.5-turbo';
}

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ success: true, url: fileUrl, filename: req.file.filename });
});

app.post('/ask', async (req, res) => {
    try {
      const { prompt = '', system = '', model, userTier = 'free', file: fileUrl, type } = req.body;
      if (!model) return res.status(400).json({ error: 'Model not specified.' });
  
      const modelToUse = findModel(model);
  
      // 🔹 GEMINI branch
      if (modelToUse === 'gemini-2.5-pro') {
        try {
          const geminiModel = genAI.getGenerativeModel({ model: modelToUse });
          let contentsArray = [];
  
          if (prompt) contentsArray.push(prompt);
  
          // 🧩 Handle any file upload
          if (fileUrl) {
            const filename = fileUrl.split('/').pop();
            const localPath = path.join(__dirname, 'uploads', filename);
          
            // Read the actual file buffer
            const fileBuffer = await fs.readFile(localPath);
            const stats = await fs.stat(localPath);
            const mimeType = mime.lookup(localPath) || 'application/octet-stream';
          
            // Upload the file directly to Gemini
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            const uploadedFile = await ai.files.upload({
              file: fileBuffer,      // ✅ must be Buffer
              config: {
                displayName: filename,
                mimeType,
                sizeBytes: stats.size // ✅ must be number
              },
            });
          
            // Push the uploaded file part to Gemini
            contentsArray.push(createPartFromUri(uploadedFile.file.uri, mimeType));
          }
          
  
          // Avoid empty contents
          if (contentsArray.length === 0) contentsArray.push("Please analyze this input.");
  
          const response = await geminiModel.generateContent({
            contents: [createUserContent(contentsArray)],
          });
  
          const replyText =
            response?.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
            'Gemini generated no text.';
  
          return res.json({ response: replyText });
        } catch (err) {
          console.error('Gemini error:', err);
          return res.status(500).json({ error: err.message });
        }
      }
  
      // 🔹 IMAGE generation for OpenAI
      if (type === 'image') {
        if (!['premium', 'ultra'].includes(userTier)) return res.status(403).json({ error: 'Image generation only for premium users.' });
        const dalleModel = (['Lumen o3', 'Lumen V'].includes(model)) ? 'dall-e-3' : 'dall-e-2';
        const dalleSize = (['Lumen o3', 'Lumen V'].includes(model)) ? '1024x1024' : '512x512';
        const response = await openai.images.generate({ model: dalleModel, prompt, n: 1, size: dalleSize });
        return res.json(response);
      }
  
      // 🔹 CHAT for OpenAI
      const chatModelMap = {
        'Lumen V': 'gpt-5',
        'Lumen o3': 'gpt-4o',
        'Lumen 4.1': 'gpt-4.1-mini',
        'Lumen 4.1 Pro': 'gpt-4.1',
        'Lumen 3.5': 'gpt-3.5-turbo'
      };
      const chatModel = chatModelMap[model] || 'gpt-3.5-turbo';
  
      const messagesArray = [];
      if (system.trim().length > 0) messagesArray.push({ role: 'system', content: system });
  
      let userMessageContent = prompt;
  
      if (fileUrl) {
        const filename = fileUrl.split('/').pop();
        const localFilePath = path.join(__dirname, 'uploads', filename);
        const lowerUrl = fileUrl.toLowerCase();
  
        if (/\.(png|jpe?g|gif|bmp|webp)$/i.test(lowerUrl)) {
          if (model !== 'Lumen VI') return res.status(400).json({ error: 'Image analysis requires Lumen VI.' });
          userMessageContent = [
            { type: 'text', text: prompt || 'Describe this image.' },
            { type: 'image_url', image_url: { url: fileUrl } }
          ];
        } else if (/\.(txt|md|csv|json|js|mjs|ts)$/i.test(lowerUrl)) {
          const fileText = await fs.readFile(localFilePath, 'utf-8');
          userMessageContent = `${prompt}\n\n----- FILE CONTENT (${filename}) -----\n${fileText}`;
        } else if (/\.(pdf|mp4|mp3|wav|avi|mov)$/i.test(lowerUrl)) {
          userMessageContent = `${prompt}\n\n[Attached file: ${filename}]\nURL: ${fileUrl}`;
        } else {
          return res.status(400).json({ error: 'Unsupported file type.' });
        }
      }
  
      messagesArray.push({ role: 'user', content: userMessageContent });
  
      const completion = await openai.chat.completions.create({ model: chatModel, messages: messagesArray });
      res.json({ response: completion.choices[0].message.content });
  
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });
  
  
app.get('/ping', (req, res) => res.status(200).send('pong'));

app.listen(PORT, () => console.log(`AI server running on port ${PORT}`));
