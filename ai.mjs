app.post('/ask', async (req, res) => {
  try {
    const { prompt = '', system = '', model, userTier = 'free', file: fileUrl, type } = req.body;
    if (!model) return res.status(400).json({ error: 'Model not specified.' });

    const modelToUse = findModel(model);

    // 🔹 GEMINI branch
    if (modelToUse === 'gemini-2.5-pro') {
      try {
        const geminiModel = genAI.getGenerativeModel({ model: modelToUse });
        const contentsArray = [];

        if (prompt) contentsArray.push(prompt);

        if (fileUrl) {
          const filename = fileUrl.split('/').pop();
          const localPath = path.join(__dirname, 'uploads', filename);

          // Read the uploaded file as a Buffer
          const fileBuffer = await fs.readFile(localPath);
          const stats = await fs.stat(localPath);
          const mimeType = mime.lookup(localPath) || 'application/octet-stream';

          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          const uploadedFile = await ai.files.upload({
            file: fileBuffer,
            config: {
              displayName: filename,
              mimeType,
              sizeBytes: stats.size,
            },
          });

          contentsArray.push(createPartFromUri(uploadedFile.file.uri, mimeType));
        }

        if (contentsArray.length === 0) {
          return res.status(400).json({ error: 'Cannot generate content: empty input.' });
        }

        const response = await geminiModel.generateContent({
          contents: [createUserContent(contentsArray)],
        });

        const replyText =
          response?.response?.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') ||
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
      const dalleSize = (['Lumen o3', 'Lumen V'].includes
