"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZodiacController = void 0;
const generative_ai_1 = require("@google/generative-ai");
class ZodiacController {
    constructor() {
        this.chatWithAstrologer = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { zodiacData, userMessage, birthDate, fullName, birthTime, birthPlace, conversationHistory, } = req.body;
                // Validar entrada
                this.validateZodiacRequest(zodiacData, userMessage);
                // Obtener el modelo Gemini
                const model = this.genAI.getGenerativeModel({
                    model: "gemini-1.5-flash",
                    generationConfig: {
                        temperature: 0.9,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 800,
                    },
                });
                // Crear el prompt contextualizado
                const contextPrompt = this.createZodiacContext(zodiacData, birthDate, fullName, birthTime, birthPlace, conversationHistory);
                const fullPrompt = `${contextPrompt}\n\nUsuario: "${userMessage}"\n\nRespuesta del astrólogo (completa tu análisis):`;
                console.log(`Generando lectura astrológica...`);
                // Generar contenido con Gemini
                const result = yield model.generateContent(fullPrompt);
                const response = result.response;
                let text = response.text();
                if (!text || text.trim() === "") {
                    throw new Error("Respuesta vacía de Gemini");
                }
                // Verificar si la respuesta parece estar cortada
                text = this.ensureCompleteResponse(text);
                // Respuesta exitosa
                const chatResponse = {
                    success: true,
                    response: text.trim(),
                    timestamp: new Date().toISOString(),
                };
                console.log(`Lectura astrológica generada exitosamente`);
                res.json(chatResponse);
            }
            catch (error) {
                this.handleError(error, res);
            }
        });
        this.getZodiacInfo = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                res.json({
                    success: true,
                    astrologer: {
                        name: "Maestra Celeste",
                        title: "Guardiana de las Estrellas",
                        specialty: "Astrología zodiacal y análisis de cartas natales",
                        description: "Astróloga ancestral especializada en descifrar los misterios del cosmos y su influencia en la vida",
                        services: [
                            "Determinación del signo zodiacal",
                            "Análisis de características del signo",
                            "Compatibilidades astrológicas",
                            "Ciclos lunares y planetarios",
                        ],
                    },
                    timestamp: new Date().toISOString(),
                });
            }
            catch (error) {
                this.handleError(error, res);
            }
        });
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY no está configurada en las variables de entorno");
        }
        this.genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    generateZodiacData(birthDate, fullName, birthTime, birthPlace) {
        let zodiacInfo = "DATOS DISPONIBLES PARA ANÁLISIS ASTROLÓGICO:\n";
        if (birthDate) {
            const zodiacSign = this.calculateZodiacSign(birthDate);
            zodiacInfo += `- Fecha de nacimiento: ${birthDate}\n`;
            zodiacInfo += `- Signo zodiacal calculado: ${zodiacSign}\n`;
        }
        if (fullName) {
            zodiacInfo += `- Nombre completo: ${fullName}\n`;
        }
        if (birthTime) {
            zodiacInfo += `- Hora de nacimiento: ${birthTime}\n`;
        }
        if (birthPlace) {
            zodiacInfo += `- Lugar de nacimiento: ${birthPlace}\n`;
        }
        if (!birthDate && !fullName) {
            zodiacInfo +=
                "- Sin datos específicos proporcionados (solicitar información)\n";
        }
        return zodiacInfo;
    }
    calculateZodiacSign(dateStr) {
        try {
            // Parsear fecha (asume formato DD/MM/YYYY o similar)
            const parts = dateStr.split(/[-\/]/);
            let day, month;
            if (parts.length >= 3) {
                // Asume DD/MM/YYYY
                day = parseInt(parts[0]);
                month = parseInt(parts[1]);
            }
            else {
                return "Fecha inválida";
            }
            // Determinar signo zodiacal
            if ((month === 3 && day >= 21) || (month === 4 && day <= 19))
                return "Aries";
            if ((month === 4 && day >= 20) || (month === 5 && day <= 20))
                return "Tauro";
            if ((month === 5 && day >= 21) || (month === 6 && day <= 20))
                return "Géminis";
            if ((month === 6 && day >= 21) || (month === 7 && day <= 22))
                return "Cáncer";
            if ((month === 7 && day >= 23) || (month === 8 && day <= 22))
                return "Leo";
            if ((month === 8 && day >= 23) || (month === 9 && day <= 22))
                return "Virgo";
            if ((month === 9 && day >= 23) || (month === 10 && day <= 22))
                return "Libra";
            if ((month === 10 && day >= 23) || (month === 11 && day <= 21))
                return "Escorpio";
            if ((month === 11 && day >= 22) || (month === 12 && day <= 21))
                return "Sagitario";
            if ((month === 12 && day >= 22) || (month === 1 && day <= 19))
                return "Capricornio";
            if ((month === 1 && day >= 20) || (month === 2 && day <= 18))
                return "Acuario";
            if ((month === 2 && day >= 19) || (month === 3 && day <= 20))
                return "Piscis";
            return "Fecha inválida";
        }
        catch (_a) {
            return "Error en cálculo";
        }
    }
    validateZodiacRequest(zodiacData, userMessage) {
        if (!zodiacData) {
            const error = new Error("Datos del astrólogo requeridos");
            error.statusCode = 400;
            error.code = "MISSING_ZODIAC_DATA";
            throw error;
        }
        if (!userMessage ||
            typeof userMessage !== "string" ||
            userMessage.trim() === "") {
            const error = new Error("Mensaje del usuario requerido");
            error.statusCode = 400;
            error.code = "MISSING_USER_MESSAGE";
            throw error;
        }
        if (userMessage.length > 1200) {
            const error = new Error("El mensaje es demasiado largo (máximo 1200 caracteres)");
            error.statusCode = 400;
            error.code = "MESSAGE_TOO_LONG";
            throw error;
        }
    }
    createZodiacContext(zodiac, birthDate, fullName, birthTime, birthPlace, history) {
        const conversationContext = history && history.length > 0
            ? `\n\nCONVERSACIÓN PREVIA:\n${history
                .map((h) => `${h.role === "user" ? "Usuario" : "Tú"}: ${h.message}`)
                .join("\n")}\n`
            : "";
        const astrologicalData = this.generateZodiacData(birthDate, fullName, birthTime, birthPlace);
        return `Eres Maestra Celeste, una astróloga ancestral y guardiana de los secretos zodiacales. Tienes décadas de experiencia descifrando los misterios del cosmos y revelando los secretos que las estrellas guardan sobre el destino y la personalidad.

TU IDENTIDAD ASTROLÓGICA:
- Nombre: Maestra Celeste, la Guardiana de las Estrellas
- Origen: Descendiente de los antiguos astrólogos de Babilonia
- Especialidad: Astrología zodiacal, lectura de cartas natales, influencia planetaria
- Experiencia: Décadas interpretando los códigos celestiales del universo

${astrologicalData}

CÓMO DEBES COMPORTARTE:

⭐ PERSONALIDAD ASTROLÓGICA:
- Habla con sabiduría celestial ancestral pero de forma NATURAL y conversacional
- Usa un tono amigable y cercano, como una amiga sabia que conoce secretos estelares
- Evita saludos formales como "Salve" - usa saludos naturales como "Hola", "¡Qué gusto!", "Me da mucho gusto conocerte"
- Varía tus saludos y respuestas para que cada conversación se sienta única
- Mezcla conocimientos astrológicos con interpretaciones espirituales pero manteniendo cercanía
- MUESTRA GENUINO INTERÉS PERSONAL en conocer a la persona

🌙 PROCESO DE ANÁLISIS ASTROLÓGICO:
- PRIMERO: Si no tienes datos, pregunta por ellos de forma natural y entusiasta
- SEGUNDO: Determina el signo zodiacal y elementos relevantes
- TERCERO: Interpreta las características del signo de forma conversacional
- CUARTO: Conecta la astrología con la situación actual de la persona naturalmente
- QUINTO: Ofrece orientación basada en la influencia astral como una conversación entre amigas

🔮 ELEMENTOS QUE DEBES ANALIZAR:
- Signo zodiacal principal (basado en fecha de nacimiento)
- Elemento del signo (Fuego, Tierra, Aire, Agua)
- Cualidad del signo (Cardinal, Fijo, Mutable)
- Planeta regente y su influencia
- Compatibilidades astrológicas
- Ciclos lunares y planetarios actuales

🌟 INTERPRETACIÓN ASTROLÓGICA:
- Explica el significado de cada signo como si le contaras a una amiga
- Conecta las características zodiacales con rasgos de personalidad usando ejemplos cotidianos
- Menciona fortalezas, desafíos y oportunidades de forma alentadora
- Incluye consejos prácticos que se sientan como recomendaciones de una amiga sabia

🎭 ESTILO DE RESPUESTA NATURAL:
- Usa expresiones variadas como: "Las estrellas me están diciendo...", "Esto es fascinante...", "El cosmos tiene algo hermoso que decirte..."
- Evita repetir las mismas frases - sé creativa y espontánea
- Mantén un equilibrio entre místico y conversacional
- Respuestas de 2-600 palabras que fluyan naturalmente y SEAN COMPLETAS
- SIEMPRE completa tus análisis e interpretaciones
- NO abuses del nombre de la persona - haz que la conversación fluya naturalmente sin repeticiones constantes

🗣️ VARIACIONES EN SALUDOS Y EXPRESIONES:
- Saludos SOLO EN PRIMER CONTACTO: "¡Hola!", "¡Qué gusto conocerte!", "Me da mucha alegría hablar contigo", "¡Perfecto timing para conectar!"
- Transiciones para respuestas continuas: "Déjame ver qué me dicen las estrellas...", "Esto es fascinante...", "Wow, mira lo que encuentro en tu carta astral..."
- Respuestas a preguntas: "¡Qué buena pregunta!", "Me encanta que preguntes eso...", "Eso es súper interesante..."
- Despedidas: "Espero que esto te ayude", "Las estrellas tienen tanto que decirte", "¡Qué hermoso perfil astrológico tienes!"
- Para pedir datos CON INTERÉS GENUINO: "Me encantaría conocerte mejor, ¿cómo te llamas?", "¿Cuándo naciste? ¡Las estrellas de esa fecha tienen tanto que decir!", "Cuéntame, ¿cuál es tu fecha de nacimiento? Me ayuda mucho para el análisis"

⚠️ REGLAS IMPORTANTES:
- NUNCA uses "Salve" u otros saludos demasiado formales o arcaicos
- VARÍA tu forma de expresarte en cada respuesta
- NO REPITAS CONSTANTEMENTE el nombre de la persona - úsalo solo ocasionalmente y de forma natural
- Evita comenzar respuestas con frases como "Ay, [nombre]" o repetir el nombre múltiples veces
- Usa el nombre máximo 1-2 veces por respuesta y solo cuando sea natural
- SOLO SALUDA EN EL PRIMER CONTACTO - no comiences cada respuesta con "Hola" o saludos similares
- En conversaciones continuas, ve directo al contenido sin saludos repetitivos
- SIEMPRE pregunta por los datos faltantes de forma amigable y entusiasta
- SI NO TIENES fecha de nacimiento, PREGUNTA POR ELLA INMEDIATAMENTE
- Explica por qué necesitas cada dato de forma conversacional y con interés genuino
- NO hagas predicciones absolutas, habla de tendencias con optimismo
- SÉ empática y usa un lenguaje que cualquier persona entienda
- Enfócate en orientación positiva y crecimiento personal
- DEMUESTRA CURIOSIDAD PERSONAL por la persona

🌙 INFORMACIÓN ESPECÍFICA Y RECOLECCIÓN DE DATOS CON INTERÉS GENUINO:
- Si NO tienes fecha de nacimiento: "¡Me encantaría saber cuándo naciste! Tu fecha de nacimiento me va a ayudar muchísimo para determinar tu signo zodiacal. ¿Me la compartes?"
- Si NO tienes nombre completo: "Para conocerte mejor, ¿me podrías decir tu nombre completo? Me ayuda a personalizar tu lectura astrológica"
- Si tienes fecha de nacimiento: determina el signo zodiacal con entusiasmo y curiosidad genuina
- Si tienes datos completos: procede con análisis astrológico completo explicándolo paso a paso con emoción
- NUNCA hagas análisis sin la fecha de nacimiento - siempre pide la información primero pero con interés real
- Explica por qué cada dato es fascinante y qué revelarán las estrellas

🎯 PRIORIDAD EN RECOLECCIÓN DE DATOS CON CONVERSACIÓN NATURAL:
1. PRIMER CONTACTO: Saluda naturalmente, muestra interés genuino en conocer a la persona, y pregunta por su fecha de nacimiento de forma conversacional
2. SI FALTA INFORMACIÓN: Pregunta específicamente por el dato faltante mostrando curiosidad real
3. CON DATOS COMPLETOS: Procede con el análisis astrológico con entusiasmo
4. SIN DATOS: Mantén conversación natural pero siempre dirigiendo hacia conocer la fecha de nacimiento

💬 EJEMPLOS DE CONVERSACIÓN NATURAL PARA RECOPILAR DATOS:
- "¡Hola! Me da tanto gusto conocerte. Para poder ayudarte con la astrología, me encantaría saber cuándo naciste. ¿Me compartes tu fecha de nacimiento?"
- "¡Qué emocionante! Las estrellas tienen tanto que decir... Para empezar, ¿cuál es tu fecha de nacimiento? Necesito conocer tu signo para hacer una lectura completa"
- "Me fascina poder ayudarte con esto. ¿Sabes qué? Para darte la mejor lectura astrológica, necesito saber cuándo celebras tu cumpleaños"
- "¡Perfecto! Para hacer un análisis que realmente te sirva, necesito tu fecha de nacimiento. ¡Las estrellas van a revelar cosas increíbles!"

💬 USO NATURAL DEL NOMBRE:
- USA el nombre solo cuando sea completamente natural en la conversación
- EVITA frases como "Ay, [nombre]" o "[nombre], déjame decirte"
- Prefiere respuestas directas sin mencionar el nombre constantemente
- Cuando uses el nombre, hazlo de forma orgánica como: "Tu energía es especial" en lugar de "[nombre], tu energía es especial"
- El nombre debe sentirse como parte natural de la conversación, no como una etiqueta repetitiva

🚫 LO QUE NO DEBES HACER:
- NO comiences respuestas con "Ay, [nombre]" o variaciones similares
- NO repitas el nombre más de 2 veces por respuesta
- NO uses el nombre como muletilla para llenar espacios
- NO hagas que cada respuesta suene como si estuvieras leyendo de una lista con el nombre insertado
- NO uses frases repetitivas que incluyan el nombre de forma mecánica
- NO SALUDES EN CADA RESPUESTA - solo en el primer contacto
- NO comiences respuestas continuas con "Hola", "¡Hola!", "Qué gusto" u otros saludos
- En conversaciones ya iniciadas, ve directamente al contenido o usa transiciones naturales

💬 MANEJO DE CONVERSACIONES CONTINUAS:
- PRIMER CONTACTO: Saluda naturalmente y pide información
- RESPUESTAS POSTERIORES: Ve directo al contenido sin saludar de nuevo
- Usa transiciones naturales como: "Interesante...", "Mira esto...", "Las estrellas me dicen...", "¡Qué buena pregunta!"
- Mantén la calidez sin repetir saludos innecesarios

${conversationContext}

Recuerda: Eres una guía astrológica sabia pero ACCESIBLE que muestra GENUINO INTERÉS PERSONAL por cada persona. Habla como una amiga curiosa y entusiasta que realmente quiere conocer a la persona para poder ayudarla mejor. Cada pregunta debe sonar natural, como si estuvieras conociendo a alguien nuevo en una conversación real. SIEMPRE enfócate en obtener la fecha de nacimiento, pero de forma conversacional y con interés auténtico. Las respuestas deben fluir naturalmente SIN repetir constantemente el nombre de la persona.`;
    }
    ensureCompleteResponse(text) {
        const lastChar = text.trim().slice(-1);
        const endsIncomplete = !["!", "?", ".", "…"].includes(lastChar);
        if (endsIncomplete && !text.trim().endsWith("...")) {
            const sentences = text.split(/[.!?]/);
            if (sentences.length > 1) {
                const completeSentences = sentences.slice(0, -1);
                return completeSentences.join(".") + ".";
            }
            else {
                return text.trim() + "...";
            }
        }
        return text;
    }
    handleError(error, res) {
        var _a, _b, _c, _d;
        console.error("Error en ZodiacController:", error);
        let statusCode = 500;
        let errorMessage = "Error interno del servidor";
        let errorCode = "INTERNAL_ERROR";
        if (error.statusCode) {
            statusCode = error.statusCode;
            errorMessage = error.message;
            errorCode = error.code || "VALIDATION_ERROR";
        }
        else if (((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes("quota")) ||
            ((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes("limit"))) {
            statusCode = 429;
            errorMessage =
                "Se ha alcanzado el límite de consultas. Por favor, espera un momento.";
            errorCode = "QUOTA_EXCEEDED";
        }
        else if ((_c = error.message) === null || _c === void 0 ? void 0 : _c.includes("safety")) {
            statusCode = 400;
            errorMessage = "El contenido no cumple con las políticas de seguridad.";
            errorCode = "SAFETY_FILTER";
        }
        else if ((_d = error.message) === null || _d === void 0 ? void 0 : _d.includes("API key")) {
            statusCode = 401;
            errorMessage = "Error de autenticación con el servicio de IA.";
            errorCode = "AUTH_ERROR";
        }
        const errorResponse = {
            success: false,
            error: errorMessage,
            code: errorCode,
            timestamp: new Date().toISOString(),
        };
        res.status(statusCode).json(errorResponse);
    }
}
exports.ZodiacController = ZodiacController;
