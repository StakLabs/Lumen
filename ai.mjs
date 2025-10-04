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

                // Add prompt or placeholder
                if (prompt && prompt.trim() !== '') {
                    contentsArray.push(prompt);
                } else {
                    contentsArray.push('Please analyze the file and describe its content.');
                }

                // Handle uploaded file (if exists)
                if (fileUrl) {
                    const filename = fileUrl.split('/').pop();
                    const localPath = path.join(__dirname, 'uploads', filename);

                    const fileBuffer = await fs.readFile(localPath);
                    const mimeType = mime.lookup(localPath) || 'application/octet-stream';

                    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
                    const uploadedFile = await ai.files.upload({
                        file: fileBuffer,
                        config: { mimeType, displayName: filename },
                    });

                    contentsArray.push(createPartFromUri(uploadedFile.file.uri, mimeType));
                }

                // Call Gemini safely
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
            if (!['premium', 'ultra'].includes(userTier)) 
                return res.status(403).json({ error: 'Image generation only for premium users.' });

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

            // Image analysis
            if (/\.(png|jpe?g|gif|bmp|webp)$/i.test(lowerUrl)) {
                if (model !== 'Lumen VI') 
                    return res.status(400).json({ error: 'Image analysis requires Lumen VI.' });

                userMessageContent = [
                    { type: 'text', text: prompt || 'Describe this image.' },
                    { type: 'image_url', image_url: { url: fileUrl } }
                ];
            } 
            // Text-based files
            else if (/\.(txt|md|csv|json|js|mjs|ts)$/i.test(lowerUrl)) {
                const fileText = await fs.readFile(localFilePath, 'utf-8');
                userMessageContent = `${prompt}\n\n----- FILE CONTENT (${filename}) -----\n${fileText}`;
            } 
            // Any other file type (video, audio, PDF, etc.)
            else {
                userMessageContent = prompt || 'Please analyze the file and describe its content.';
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
