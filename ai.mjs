import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import fileUpload from 'express-fileupload';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // project: "your-project-id-if-needed"
});

app.use(cors({
  origin: ['https://www.timelypro.online', 'http://127.0.0.1:5500', 'https://staklabs.github.io'],
  methods: ['GET', 'POST']
}));

app.use(express.json());
app.use(fileUpload());

// Simple health check
app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// Upload endpoint
app.post('/upload', async (req, res) => {
  try {
    const file = req.files?.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded.' });

    const tempPath = path.join('/tmp', file.name);

    // Save file temporarily
    await fs.promises.writeFile(tempPath, file.data);

    // Upload to OpenAI
    const upload = await openai.files.create({
      file: fs.createReadStream(tempPath),
      filename: file.name,
      purpose: 'assistants' // or 'fine-tune' depending on use case
    });

    // Delete temp file ASAP
    await fs.promises.unlink(tempPath);

    console.log('📁 File uploaded:', upload.id);
    res.json({ success: true, file: upload });
  } catch (error) {
    console.error('❌ File upload failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Your existing /ask endpoint goes here (no changes needed for this fix)

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🔥 AI server running on port ${PORT}`));
