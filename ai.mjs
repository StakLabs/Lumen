import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(fileUpload());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post('/ask', async (req, res) => {
  try {
    const userInput = req.body.input;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: userInput }]
    });

    const response = completion.choices[0].message.content;
    res.json({ response });
  } catch (err) {
    console.error('❌ /ask error:', err);
    res.status(500).json({ error: err.message });
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

app.listen(3000, () => {
  console.log('Lumen AI server running on :3000');
});
