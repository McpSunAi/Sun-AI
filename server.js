const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(express.json());
app.use(cors());

// Conexión segura con Gemini mediante variable de entorno
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Almacenamiento temporal de tokens en memoria
let tokensActivos = {};

// 1. REGISTRAR TOKEN (Llamado por la Web)
app.post('/api/registrar-token', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Falta el token" });
    
    tokensActivos[token] = {
        action: "ninguna",
        name: "",
        size: [1, 1, 1],
        color: "Bright blue",
        robloxUser: null,
        robloxId: null
    };
    
    console.log(`[SEGURIDAD] Token registrado: ${token}`);
    res.json({ status: "registrado", token: token });
});

// 2. VERIFICAR TOKEN (Llamado por el Plugin de Studio)
app.post('/api/verificar-token', (req, res) => {
    const { token, user, id } = req.body;
    
    if (!tokensActivos[token]) {
        console.log(`[ALERTA] Intento de conexión inválido para token: ${token}`);
        return res.status(401).json({ error: "Token inválido" });
    }
    
    tokensActivos[token].robloxUser = user;
    tokensActivos[token].robloxId = id;
    
    console.log(`[SEGURIDAD] Plugin enlazado con éxito al token: ${token} por ${user}`);
    res.json({ status: "enlazado_ok" });
});

// 3. PROCESAR MENSAJE DE LA WEB (Llamada dinámica a Gemini)
app.post('/api/chat', async (req, res) => {
    const { token, message, model } = req.body;
    
    if (!token || !tokensActivos[token]) {
        return res.status(401).json({ error: "No autorizado o token vencido" });
    }
    
    // Si la web no envía modelo por algún motivo, usamos por defecto gemini-2.5-flash
    const modeloFinal = model || 'gemini-2.5-flash';
    console.log(`[IA] Procesando consulta con el modelo: ${modeloFinal}`);
    
    try {
        const response = await ai.models.generateContent({
            model: modeloFinal, // <--- ¡AQUÍ ENTRA EL MODELO ELEGIDO POR EL JUGADOR!
            contents: message,
        });
        
        const respuestaTexto = response.text;
        console.log("Respuesta obtenida de Gemini:", respuestaTexto);
        
        // Simulación básica de acciones en Roblox Studio
        if (message.toLowerCase().includes("bloque") || message.toLowerCase().includes("part")) {
            tokensActivos[token].action = "crear_bloque";
            tokensActivos[token].name = "Bloque_Gemini";
            tokensActivos[token].size = [4, 4, 4];
            tokensActivos[token].color = "Bright red";
        }
        
        res.json({ reply: respuestaTexto });
    } catch (error) {
        console.error("Error con la API de Gemini:", error);
        res.status(500).json({ error: "Error al procesar con la IA" });
    }
});

// 4. OBTENER COMANDO (Bucle de consultas de Roblox Studio)
app.get('/api/obtener-comando', (req, res) => {
    const token = req.headers['authorization'];
    
    if (!token || !tokensActivos[token]) {
        return res.status(401).json({ error: "No autorizado" });
    }
    
    const info = tokensActivos[token];
    
    res.setHeader('Roblox-User', info.robloxUser || "");
    res.setHeader('Roblox-Id', info.robloxId || "");
    res.setHeader('Access-Control-Expose-Headers', 'Roblox-User, Roblox-Id');
    
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
    console.log(`Servidor Sun AI multinivel corriendo en puerto ${PORT}`);
});
