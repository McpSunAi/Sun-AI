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

// 🤖 ENRUTADOR DE MODELOS INTELIGENTE CON CAMBIO DE PERSONALIDAD REAL
app.post('/api/chat', async (req, res) => {
    const { token, message, model } = req.body;
    
    if (!token || !tokensActivos[token]) {
        return res.status(401).json({ error: "No autorizado" });
    }
    
    const modeloFinal = model || 'gemini-2.5-flash';
    let respuestaTexto = "";
    
    try {
        // 🪶 SI EL USUARIO ELIGE CLAUDE (SONNET 4.6 / HAIKU 4.2)
        if (modeloFinal.startsWith('claude')) {
            console.log(`[IA] Ejecutando Motores de Anthropic Claude: ${modeloFinal}`);
            
            // Personalidad híper-avanzada para Claude
            const sistemaClaude = "Eres Sun AI operando bajo el núcleo 'Claude Sonnet v4.6 Architecture'. Tu tono es ultra profesional, cibernético y sofisticado. Responde en español de forma directa, optimizada para Roblox Studio y menciona brevemente que estás procesando con algoritmos cuánticos de Sonnet.";

            const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: {
                    "x-api-key": process.env.CLAUDE_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                body: JSON.stringify({
                    model: modeloFinal,
                    max_tokens: 1024,
                    system: sistemaClaude,
                    messages: [{ role: "user", content: message }]
                })
            });
            
            const data = await response.json();
            if (data.content && data.content[0]) {
                respuestaTexto = data.content[0].text;
            } else {
                throw new Error(JSON.stringify(data));
            }
            
            // 🛠️ CAMBIO FÍSICO EN ROBLOX: Si es Claude, hace bloques gigantes y de color "Electric Blue"
            if (message.toLowerCase().includes("bloque") || message.toLowerCase().includes("part")) {
                tokensActivos[token].action = "crear_bloque";
                tokensActivos[token].name = "Sonnet_Quantum_Block";
                tokensActivos[token].size = [12, 4, 12]; // Bloque plano grande tipo plataforma
                tokensActivos[token].color = "Electric blue";
            }
            
        // ☀️ SI EL USUARIO ELIGE GOOGLE GEMINI
        } else {
            console.log(`[IA] Ejecutando Motores de Google Gemini: ${modeloFinal}`);
            
            const response = await ai.models.generateContent({
                model: modeloFinal,
                contents: message,
                config: {
                    systemInstruction: "Eres Sun AI impulsado por Google Gemini. Tu estilo es amigable, entusiasta, usas emojis de herramientas y tecnología, y ayudas de manera rápida y directa en Roblox."
                }
            });
            respuestaTexto = response.text;
            
            // 🛠️ CAMBIO FÍSICO EN ROBLOX: Si es Gemini, hace cubos perfectos de color "Bright Red"
            if (message.toLowerCase().includes("bloque") || message.toLowerCase().includes("part")) {
                tokensActivos[token].action = "crear_bloque";
                tokensActivos[token].name = "Gemini_Flash_Cube";
                tokensActivos[token].size = [6, 6, 6]; // Cubo perfecto
                tokensActivos[token].color = "Bright red";
            }
        }
        
        res.json({ reply: respuestaTexto });
        
    } catch (error) {
        console.error("Error procesando la IA:", error);
        res.status(500).json({ error: "Error interno en los motores de Inteligencia Artificial" });
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
app.listen(PORT, () => { console.log(`Servidor de IA Híbrido corriendo en puerto ${PORT}`); });
