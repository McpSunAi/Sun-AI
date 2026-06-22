const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Configuración de Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/chat', async (req, res) => {
    const { message, model } = req.body;

    // 1. SI ES MODELO DE GROQ
    if (model.includes('llama')) {
        try {
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
            
            if (data.choices && data.choices[0]) {
                return res.json({ reply: data.choices[0].message.content });
            } else {
                return res.json({ error: "Groq no respondió correctamente: " + JSON.stringify(data) });
            }
        } catch (error) {
            return res.json({ error: "Error de conexión con Groq" });
        }
    } 
    
    // 2. SI ES MODELO DE GEMINI
    else {
        try {
            const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await geminiModel.generateContent(message);
            const response = await result.response;
            return res.json({ reply: response.text() });
        } catch (error) {
            return res.json({ error: "Error con Gemini: " + error.message });
        }
    }
});

app.listen(process.env.PORT || 3000, () => console.log('Sun AI listo y configurado'));
