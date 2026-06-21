const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(express.json());
app.use(cors());

// Inicializar la API de Google Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

let tokensActivos = {};

app.post('/api/registrar-token', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Falta el token" });
    tokensActivos[token] = { action: "ninguna", name: "", size: [1, 1, 1], color: "Bright blue", robloxUser: null, robloxId: null };
    res.json({ status: "registrado", token: token });
});

app.post('/api/verificar-token', (req, res) => {
    const { token, user, id } = req.body;
    if (!tokensActivos[token]) return res.status(401).json({ error: "Token inválido" });
    tokensActivos[token].robloxUser = user;
    tokensActivos[token].robloxId = id;
    res.json({ status: "enlazado_ok" });
});

app.post('/api/chat', async (req, res) => {
    const { token, message, model } = req.body;
    
    if (!token || !tokensActivos[token]) {
        return res.status(401).json({ error: "Token de Workspace no autorizado o expirado." });
    }
    
    const modeloFinal = model || 'gemini-2.5-flash';
    let respuestaTexto = "";
    
    try {
        // 🪶 SECCIÓN DE ANTHROPIC CLAUDE
        if (modeloFinal.startsWith('claude')) {
            if (!process.env.CLAUDE_API_KEY) {
                return res.status(500).json({ error: "La variable CLAUDE_API_KEY no está configurada en Render." });
            }

            const sistemaClaude = "Eres Sun AI operando bajo el núcleo 'Claude Sonnet v4.6 Architecture'. Tu tono es ultra profesional. Responde en español de forma directa.";
            
            const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "x-api-key": process.env.CLAUDE_API_KEY.trim(),
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                body: JSON.stringify({
                    model: "claude-3-5-sonnet-20241022",
                    max_tokens: 1024,
                    system: sistemaClaude,
                    messages: [{ role: "user", content: message }]
                })
            });
            
            const data = await response.json();
            
            if (data.error) {
                return res.status(500).json({ error: `Anthropic API dice: ${data.error.message} (${data.error.type})` });
            }
            
            if (data.content && data.content[0]) {
                respuestaTexto = data.content[0].text;
            } else {
                return res.status(500).json({ error: "Estructura de respuesta de Claude desconocida." });
            }
            
            if (message.toLowerCase().includes("bloque") || message.toLowerCase().includes("part")) {
                tokensActivos[token].action = "crear_bloque";
                tokensActivos[token].name = "Sonnet_Quantum_Block";
                tokensActivos[token].size = [12, 4, 12];
                tokensActivos[token].color = "Electric blue";
            }
            
        // ☀️ SECCIÓN DE GOOGLE GEMINI
        } else {
            if (!process.env.GEMINI_API_KEY) {
                return res.status(500).json({ error: "La variable GEMINI_API_KEY no está configurada en Render." });
            }

            const response = await ai.models.generateContent({
                model: modeloFinal,
                contents: message,
                config: {
                    systemInstruction: "Eres Sun AI impulsado por Google Gemini. Tu estilo es amigable y directo."
                }
            });
            
            if (response && response.text) {
                respuestaTexto = response.text;
            } else {
                return res.status(500).json({ error: "Gemini no devolvió texto. Revisa cuotas o restricciones del modelo." });
            }
            
            if (message.toLowerCase().includes("bloque") || message.toLowerCase().includes("part")) {
                tokensActivos[token].action = "crear_bloque";
                tokensActivos[token].name = "Gemini_Flash_Cube";
                tokensActivos[token].size = [6, 6, 6];
                tokensActivos[token].color = "Bright red";
            }
        }
        
        res.json({ reply: respuestaTexto });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: `Fallo crítico en el Servidor: ${error.message}` });
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
app.listen(PORT, () => { console.log(`Servidor de diagnóstico corriendo en puerto ${PORT}`); });
