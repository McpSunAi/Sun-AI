const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(cors());

// 🔑 CAMBIA ESTO POR TU NUEVA API KEY DE GOOGLE AI STUDIO SI ES NECESARIO
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Objeto en memoria para guardar las sesiones y los tokens válidos
let tokensActivos = {};

// 1. REGISTRAR TOKEN (Llamado por la Web al generar un código)
app.post('/api/registrar-token', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Falta el token" });
    
    // Registramos el token en el servidor en un estado limpio
    tokensActivos[token] = {
        action: "ninguna",
        name: "",
        size: [1, 1, 1],
        color: "Bright blue",
        robloxUser: null,
        robloxId: null
    };
    
    console.log(`[SEGURIDAD] Nuevo token registrado desde la web: ${token}`);
    res.json({ status: "registrado", token: token });
});

// 2. VERIFICAR TOKEN (Llamado por el Plugin de Roblox Studio)
app.post('/api/verificar-token', (req, res) => {
    const { token, user, id } = req.body;
    
    // Si el token NO existe en el mapa de memoria, ¡LO REBOTAMOS!
    if (!tokensActivos[token]) {
        console.log(`[ALERTA] Intento de vinculación RECHAZADO para el token falso: ${token}`);
        return res.status(401).json({ error: "Token inválido" });
    }
    
    // Si es real, guardamos quién se conectó
    tokensActivos[token].robloxUser = user;
    tokensActivos[token].robloxId = id;
    
    console.log(`[SEGURIDAD] Plugin enlazado con éxito. Token: ${token} -> Usuario Roblox: ${user}`);
    res.json({ status: "enlazado_ok" });
});

// 3. PROCESAR MENSAJE DE LA WEB Y LLAMAR A GEMINI
app.post('/api/chat', async (req, res) => {
    const { token, message, model } = req.body;
    
    if (!token || !tokensActivos[token]) {
        return res.status(401).json({ error: "No autorizado o token vencido" });
    }
    
    try {
        // Llamada real a la API de Gemini usando tu configuración
        const response = await ai.models.generateContent({
            model: model || 'gemini-2.5-flash',
            contents: message,
            // Aquí puedes meterle el systemInstruction para que responda en formato JSON de bloques si quieres
        });
        
        const respuestaTexto = response.text;
        console.log("Respuesta de Gemini:", respuestaTexto);
        
        // Lógica para guardar la acción en el token si Gemini decide crear un bloque
        // (Por ahora simulado para pruebas rápidos):
        if (message.toLowerCase().includes("bloque") || message.toLowerCase().includes("part")) {
            tokensActivos[token].action = "crear_bloque";
            tokensActivos[token].name = "Bloque_Gemini";
            tokensActivos[token].size = [4, 4, 4];
            tokensActivos[token].color = "Bright red";
        }
        
        res.json({ reply: respuestaTexto });
    } catch (error) {
        console.error("Error con Gemini:", error);
        res.status(500).json({ error: "Error al procesar con la IA" });
    }
});

// 4. OBTENER COMANDO (El bucle de Roblox Studio)
app.get('/api/obtener-comando', (req, res) => {
    const token = req.headers['authorization'];
    
    if (!token || !tokensActivos[token]) {
        return res.status(401).json({ error: "No autorizado" });
    }
    
    const info = tokensActivos[token];
    
    // Pasar datos del usuario de Roblox en las cabeceras para la web
    res.setHeader('Roblox-User', info.robloxUser || "");
    res.setHeader('Roblox-Id', info.robloxId || "");
    res.setHeader('Access-Control-Expose-Headers', 'Roblox-User, Roblox-Id');
    
    res.json({
        action: info.action,
        name: info.name,
        size: info.size,
        color: info.color
    });
    
    // Limpiamos la acción para que no se repita en loop en Roblox
    info.action = "ninguna";
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor Sun AI seguro en puerto ${PORT}`);
});
