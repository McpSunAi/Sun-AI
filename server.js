const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/chat', async (req, res) => {
    const { message, model } = req.body;
    try {
        if (model.includes('llama')) {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{ role: "user", content: message }]
                })
            });
            const data = await response.json();
            return res.json({ reply: data.choices[0].message.content });
        } else {
            const geminiModel = ai.getGenerativeModel({ model: "gemini-pro" });
            const result = await geminiModel.generateContent(message);
            return res.json({ reply: result.response.text() });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

app.listen(process.env.PORT || 3000, () => console.log('Sun AI listo'));
