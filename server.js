const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(cors());

// 🔑 CAMBIA ESTO POR TU NUEVA API KEY DE GOOGLE AI STUDIO
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const sesiones = {};

// 1. Generar token único para enlazar la web con Roblox
app.post('/api/token', (req, res) => {
    const nuevoToken = "SUNAI-" + crypto.randomBytes(4).toString('hex').toUpperCase();
    sesiones[nuevoToken] = { comandoEnCola: null, ultimoAccesoStudio: 0 };
    res.json({ token: nuevoToken });
});

// 2. Procesar mensaje de la web y llamar a la API de Gemini
app.post('/api/chat', async (req, res) => {
    const { token, message, model } = req.body;

    if (!token || !sesiones[token]) {
        return res.status(400).json({ error: "Token inválido o expirado." });
    }

    try {
        const promptSistema = `Eres Sun AI, un asistente de creación experto para Roblox Studio.
        Tu misión es traducir la petición del usuario en instrucciones JSON precisas para construir objetos.
        Debes responder ÚNICAMENTE con un objeto JSON plano, sin formato markdown ni comillas (\`\`\`), con esta estructura exacta:
        {
            "action": "crear_bloque",
            "color": "Bright yellow",
            "size": [10, 10, 10],
            "name": "ObjetoIA"
        }`;

        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents: message,
            config: {
                systemInstruction: promptSistema,
                responseMimeType: "application/json"
            }
        });

        const comandoJson = JSON.parse(response.text);
        sesiones[token].comandoEnCola = comandoJson;

        const conectado = (Date.now() - sesiones[token].ultimoAccesoStudio) < 10000;
        res.json({ 
            reply: `¡Entendido! Enviando comando para crear "${comandoJson.name || 'objeto'}" en tu mapa de Roblox.`,
            studioConnected: conectado
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Fallo de comunicación con Gemini." });
    }
});

// 3. Endpoint que revisa tu plugin de Roblox Studio
app.get('/api/obtener-comando', (req, res) => {
    const token = req.headers['authorization'];

    if (!token || !sesiones[token]) {
        return res.status(401).json({ action: "ninguna" });
    }

    sesiones[token].ultimoAccesoStudio = Date.now();

    const comando = sesiones[token].comandoEnCola;
    if (comando) {
        sesiones[token].comandoEnCola = null; 
        res.json(comando);
    } else {
        res.json({ action: "ninguna" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor de Sun AI activo en puerto ${PORT}`));