const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(express.json());
app.use(cors());

// Inicializar la API de Google Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Almacenamiento temporal de las lógicas de Roblox
let tokensActivos = {};

app.post('/api/registrar-token', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Falta el token" });
    tokensActivos[token] = { action: "ninguna", name: "", size: [1, 1, 1], color: "Bright blue", robloxUser: null, robloxId: null };
    console.log(`[SEGURIDAD] Token registrado: ${token}`);
    res.json({ status: "registrado", token: token });
});

app.post('/api/verificar-token', (req, res) => {
    const { token, user, id } = req.body;
    if (!tokensActivos[token]) return res.status(401).json({ error: "Token inválido" });
    tokensActivos[token].robloxUser = user;
    tokensActivos[token].robloxId = id;
    console.log(`[SEGURIDAD] Plugin enlazado: ${token} por ${user}`);
    res.json({ status: "enlazado_ok" });
});

// 🤖 ENRUTADOR DE MODELOS INTELIGENTE (GEMINI & CLAUDE)
app.post('/api/chat', async (req, res) => {
    const { token, message, model } = req.body;
    
    if (!token || !tokensActivos[token]) {
        return res.status(401).json({ error: "No autorizado" });
    }
    
    const modeloFinal = model || 'gemini-3.5-flash';
    let respuestaTexto = "";
    
    try {
        // SI EL MODELO SELECCIONADO ES DE CLAUDE (ANTHROPIC)
        if (modeloFinal.startsWith('claude')) {
            console.log(`[IA] Enviando petición a Anthropic Claude: ${modeloFinal}`);
            
            const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "x-api-key": process.env.CLAUDE_API_KEY, // Variable de entorno en Render
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                body: JSON.stringify({
                    model: modeloFinal,
                    max_tokens: 1024,
                    system: "Eres Sun AI, un asistente experto para Roblox Studio. Responde de forma muy concisa y en español.",
                    messages: [{ role: "user", content: message }]
                })
            });
            
            const data = await response.json();
            if (data.content && data.content[0]) {
                respuestaTexto = data.content[0].text;
            } else {
                throw new Error(JSON.stringify(data));
            }
            
        // SI EL MODELO ES DE GOOGLE (GEMINI)
        } else {
            console.log(`[IA] Enviando petición a Google Gemini: ${modeloFinal}`);
            const response = await ai.models.generateContent({
                model: modeloFinal,
                contents: message,
                config: {
                    systemInstruction: "Eres Sun AI, un asistente experto para Roblox Studio. Responde de forma concisa y amigable."
                }
            });
            respuestaTexto = response.text;
        }
        
        // INTERCEPTOR DE COMANDOS AUTOMÁTICOS PARA EL PLUGIN DE ROBLOX
        if (message.toLowerCase().includes("bloque") || message.toLowerCase().includes("part")) {
            tokensActivos[token].action = "crear_bloque";
            tokensActivos[token].name = "Bloque_Generado_IA";
            tokensActivos[token].size = [6, 6, 6];
            tokensActivos[token].color = "Bright red";
        }
        
        res.json({ reply: respuestaTexto });
        
    } catch (error) {
        console.error("Error procesando la IA:", error);
        res.status(500).json({ error: "Error en los motores de Inteligencia Artificial" });
    }
});

app.get('/api/obtener-comando', (req, res) => {
    const token = req.headers['authorization'];
    if (!token || !tokensActivos[token]) return res.status(401).json({ error: "No autorizado" });
    
    const info = tokensActivos[token];
    res.setHeader('Roblox-User', info.robloxUser || "");
    res.setHeader('Roblox-Id', info.robloxId || "");
    res.setHeader('Access-Control-Expose-Headers', 'Roblox-User, Roblox-Id');
    
    res.json({ action: info.action, name: info.name, size: info.size, color: info.color });
    info.action = "ninguna";
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`Servidor híbrido corriendo en puerto ${PORT}`); });
