const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const app = express();

app.use(express.json());
app.use(cors());

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

let tokensActivos = {};

app.post('/api/registrar-token', (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({
            error: "Falta el token"
        });
    }

    tokensActivos[token] = {
        action: "ninguna",
        name: "",
        size: [1, 1, 1],
        color: "Bright blue",
        robloxUser: null,
        robloxId: null
    };

    console.log(`[SEGURIDAD] Token registrado: ${token}`);

    res.json({
        status: "registrado",
        token
    });
});

app.post('/api/verificar-token', (req, res) => {
    const { token, user, id } = req.body;

    if (!tokensActivos[token]) {
        return res.status(401).json({
            error: "Token inválido"
        });
    }

    tokensActivos[token].robloxUser = user;
    tokensActivos[token].robloxId = id;

    console.log(`[SEGURIDAD] Plugin enlazado: ${token} por ${user}`);

    res.json({
        status: "enlazado_ok"
    });
});

app.post('/api/chat', async (req, res) => {
    const { token, message, model } = req.body;

    if (!token || !tokensActivos[token]) {
        return res.status(401).json({
            error: "No autorizado"
        });
    }

    const modeloFinal = model || "gemini-2.5-flash";

    console.log(`[IA] Ejecutando modelo: ${modeloFinal}`);

    try {
        const response = await ai.models.generateContent({
            model: modeloFinal,
            contents: message,
            config: {
                systemInstruction:
                    "Eres Sun AI, un asistente experto para Roblox Studio. Responde de forma concisa y amigable."
            }
        });

        const respuestaTexto = response.text || "Sin respuesta";

        if (
            message.toLowerCase().includes("bloque") ||
            message.toLowerCase().includes("part")
        ) {
            tokensActivos[token].action = "crear_bloque";
            tokensActivos[token].name = "Bloque_Generado_IA";
            tokensActivos[token].size = [5, 5, 5];
            tokensActivos[token].color = "Bright red";
        }

        res.json({
            reply: respuestaTexto
        });

    } catch (error) {

        console.error("ERROR GEMINI:", error);

        res.status(500).json({
            reply: error.message || "Error en el motor de la IA"
        });
    }
});

app.get('/api/obtener-comando', (req, res) => {

    const token = req.headers['authorization'];

    if (!token || !tokensActivos[token]) {
        return res.status(401).json({
            error: "No autorizado"
        });
    }

    const info = tokensActivos[token];

    res.setHeader('Roblox-User', info.robloxUser || "");
    res.setHeader('Roblox-Id', info.robloxId || "");
    res.setHeader(
        'Access-Control-Expose-Headers',
        'Roblox-User, Roblox-Id'
    );

    res.json({
        action: info.action,
        name: info.name,
        size: info.size,
        color: info.color
    });

    info.action = "ninguna";
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor multimodelo en puerto ${PORT}`);
});
