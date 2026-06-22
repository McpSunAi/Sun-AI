const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Configuración de Gemini
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/chat', async (req, res) => {
    const { model, message } = req.body;
    const messages = [{ role: "user", content: message }];

    try {
        if (model === 'gemini') {
            const geminiModel = ai.getGenerativeModel({ model: "gemini-pro" });
            const result = await geminiModel.generateContent(message);
            res.json({ response: result.response.text() });
        } 
        else if (model === 'groq') {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: messages
                })
            });
            const data = await response.json();
            res.json({ response: data.choices[0].message.content });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error con la IA" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Sun AI listo'));
