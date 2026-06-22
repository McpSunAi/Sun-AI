const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/chat', async (req, res) => {
    const { message, model } = req.body;

    try {
        // Usamos el modelo que venga del selector (gemini-2.5-flash o gemini-2.5-pro)
        const geminiModel = ai.getGenerativeModel({ model: model });
        const result = await geminiModel.generateContent(message);
        const response = await result.response;
        
        res.json({ reply: response.text() });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error en Gemini: " + error.message });
    }
});

app.listen(process.env.PORT || 3000, () => console.log('Sun AI Gemini está activo'));
