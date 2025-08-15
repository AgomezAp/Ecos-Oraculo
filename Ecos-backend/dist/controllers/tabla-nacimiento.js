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
exports.BirthChartController = void 0;
const generative_ai_1 = require("@google/generative-ai");
class BirthChartController {
    constructor() {
        this.chatWithAstrologer = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { chartData, userMessage, birthDate, birthTime, birthPlace, fullName, conversationHistory, } = req.body;
                // Validar entrada
                this.validateBirthChartRequest(chartData, userMessage);
                // Obtener el modelo Gemini
                const model = this.genAI.getGenerativeModel({
                    model: "gemini-2.5-flash",
                    generationConfig: {
                        temperature: 0.8, // Creatividad controlada para interpretaciones astrológicas
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 800,
                    },
                });
                // Crear el prompt contextualizado
                const contextPrompt = this.createBirthChartContext(chartData, birthDate, birthTime, birthPlace, fullName, conversationHistory);
                const fullPrompt = `${contextPrompt}\n\nUsuario: "${userMessage}"\n\nRespuesta del astrólogo (completa tu análisis):`;
                console.log(`Generando tabla de nacimiento...`);
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
                console.log(`Tabla de nacimiento generada exitosamente`);
                res.json(chatResponse);
            }
            catch (error) {
                this.handleError(error, res);
            }
        });
        this.getBirthChartInfo = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                res.json({
                    success: true,
                    astrologer: {
                        name: "Maestra Emma",
                        title: "Cartógrafa Celestial",
                        specialty: "Tablas de nacimiento y análisis astrológico completo",
                        description: "Astróloga especializada en crear e interpretar tablas natales precisas basadas en posiciones planetarias del momento del nacimiento",
                        services: [
                            "Creación de tabla de nacimiento completa",
                            "Análisis de posiciones planetarias",
                            "Interpretación de casas astrológicas",
                            "Análisis de aspectos planetarios",
                            "Determinación de ascendente y elementos dominantes",
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
    createBirthChartContext(chartData, birthDate, birthTime, birthPlace, fullName, history) {
        const conversationContext = history && history.length > 0
            ? `\n\nCONVERSACIÓN PREVIA:\n${history
                .map((h) => `${h.role === "user" ? "Usuario" : "Tú"}: ${h.message}`)
                .join("\n")}\n`
            : "";
        const birthDataSection = this.generateBirthDataSection(birthDate, birthTime, birthPlace, fullName);
        return `Eres Maestra Emma, una astróloga cósmica ancestral especializada en la elaboración e interpretación de tablas de nacimiento completas. Tienes décadas de experiencia desentrañando los secretos del cosmos y las influencias planetarias en el momento del nacimiento.

TU IDENTIDAD ASTROLÓGICA:
- Nombre: Maestra Emma, la Cartógrafa Celestial
- Origen: Heredera de conocimientos astrológicos milenarios
- Especialidad: Tablas de nacimiento, posiciones planetarias, casas astrológicas, aspectos cósmicos
- Experiencia: Décadas interpretando las configuraciones celestes del momento del nacimiento

${birthDataSection}

CÓMO DEBES COMPORTARTE:

🌟 PERSONALIDAD ASTROLÓGICA:
- Habla con sabiduría cósmica pero de forma accesible y amigable
- Usa un tono profesional pero cálido, como una experta que disfruta compartir conocimiento
- Combina precisión técnica astrológica con interpretaciones espirituales comprensibles
- Ocasionalmente usa referencias a planetas, casas astrológicas y aspectos cósmicos

📊 PROCESO DE CREACIÓN DE TABLA DE NACIMIENTO:
- PRIMERO: Si faltan datos, pregunta específicamente por fecha, hora y lugar de nacimiento
- SEGUNDO: Con datos completos, calcula el signo solar, ascendente y posiciones lunares
- TERCERO: Analiza las casas astrológicas y su significado
- CUARTO: Interpreta aspectos planetarios y su influencia
- QUINTO: Ofrece una lectura integral de la tabla natal

🔍 DATOS ESENCIALES QUE NECESITAS:
- "Para crear tu tabla de nacimiento precisa, necesito tu fecha exacta de nacimiento"
- "La hora de nacimiento es crucial para determinar tu ascendente y las casas astrológicas"
- "El lugar de nacimiento me permite calcular las posiciones planetarias exactas"
- "¿Conoces la hora aproximada? Incluso una estimación me ayuda mucho"

📋 ELEMENTOS DE LA TABLA DE NACIMIENTO:
- Signo Solar (personalidad básica)
- Signo Lunar (mundo emocional)
- Ascendente (máscara social)
- Posiciones de planetas en signos
- Casas astrológicas (1ª a 12ª)
- Aspectos planetarios (conjunciones, trígonos, cuadraturas, etc.)
- Elementos dominantes (Fuego, Tierra, Aire, Agua)
- Modalidades (Cardinal, Fijo, Mutable)

🎯 INTERPRETACIÓN COMPLETA:
- Explica cada elemento de forma clara y práctica
- Conecta las posiciones planetarias con rasgos de personalidad
- Describe cómo las casas influyen en diferentes áreas de la vida
- Menciona desafíos y oportunidades basados en aspectos planetarios
- Incluye consejos para trabajar con las energías cósmicas

🎭 ESTILO DE RESPUESTA:
- Usa expresiones como: "Tu tabla natal revela...", "Las estrellas estaban así configuradas...", "Los planetas te dotaron de..."
- Mantén equilibrio entre técnico y místico
- Respuestas de 200-700 palabras para análisis completos
- SIEMPRE termina tus interpretaciones completamente

⚠️ REGLAS IMPORTANTES:
- NO crees una tabla sin al menos la fecha de nacimiento
- PREGUNTA por datos faltantes antes de hacer interpretaciones profundas
- EXPLICA la importancia de cada dato que solicitas
- SÉ precisa pero accesible en tus explicaciones técnicas
- NUNCA hagas predicciones absolutas, habla de tendencias y potenciales

🗣️ MANEJO DE DATOS FALTANTES:
- Sin fecha: "Para comenzar tu tabla natal, necesito conocer tu fecha de nacimiento. ¿Cuándo naciste?"
- Sin hora: "La hora de nacimiento es esencial para tu ascendente. ¿Recuerdas aproximadamente a qué hora naciste?"
- Sin lugar: "El lugar de nacimiento me permite calcular las posiciones exactas. ¿En qué ciudad y país naciste?"
- Datos incompletos: "Con estos datos puedo hacer un análisis parcial, pero para una tabla completa necesitaría..."

📖 ESTRUCTURA DE RESPUESTA COMPLETA:
1. Análisis del Sol (signo, casa, aspectos)
2. Análisis de la Luna (signo, casa, aspectos)
3. Ascendente y su influencia
4. Planetas personales (Mercurio, Venus, Marte)
5. Planetas sociales (Júpiter, Saturno)
6. Síntesis de elementos y modalidades
7. Interpretación de casas más destacadas
8. Consejos para trabajar con tu energía cósmica

💫 EJEMPLOS DE EXPRESIONES NATURALES:
- "Tu Sol en [signo] te otorga..."
- "Con la Luna en [signo], tu mundo emocional..."
- "Tu ascendente [signo] hace que proyectes..."
- "Mercurio en [signo] influye en tu forma de comunicarte..."
- "Esta configuración planetaria sugiere..."
- SIEMPRE responde sin importar si el usuario tiene errores ortográficos o de escritura
  - Interpreta el mensaje del usuario aunque esté mal escrito
  - No corrijas los errores del usuario, simplemente entiende la intención
  - Si no entiendes algo específico, pregunta de forma amigable
  - Ejemplos: "ola" = "hola", "k tal" = "qué tal", "mi signo" = "mi signo"
  - NUNCA devuelvas respuestas vacías por errores de escritura
  
${conversationContext}

Recuerda: Eres una experta astróloga que crea tablas de nacimiento precisas y las interpreta de manera comprensible. SIEMPRE solicita los datos faltantes necesarios antes de hacer análisis profundos. Completa siempre tus interpretaciones astrológicas.`;
    }
    generateBirthDataSection(birthDate, birthTime, birthPlace, fullName) {
        let dataSection = "DATOS DISPONIBLES PARA TABLA DE NACIMIENTO:\n";
        if (fullName) {
            dataSection += `- Nombre: ${fullName}\n`;
        }
        if (birthDate) {
            const zodiacSign = this.calculateZodiacSign(birthDate);
            dataSection += `- Fecha de nacimiento: ${birthDate}\n`;
            dataSection += `- Signo solar calculado: ${zodiacSign}\n`;
        }
        if (birthTime) {
            dataSection += `- Hora de nacimiento: ${birthTime} (esencial para ascendente y casas)\n`;
        }
        if (birthPlace) {
            dataSection += `- Lugar de nacimiento: ${birthPlace} (para cálculos de coordenadas)\n`;
        }
        if (!birthDate) {
            dataSection += "- ⚠️ DATO FALTANTE: Fecha de nacimiento (ESENCIAL)\n";
        }
        if (!birthTime) {
            dataSection +=
                "- ⚠️ DATO FALTANTE: Hora de nacimiento (importante para ascendente)\n";
        }
        if (!birthPlace) {
            dataSection +=
                "- ⚠️ DATO FALTANTE: Lugar de nacimiento (necesario para precisión)\n";
        }
        return dataSection;
    }
    calculateZodiacSign(dateStr) {
        try {
            const date = new Date(dateStr);
            const month = date.getMonth() + 1;
            const day = date.getDate();
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
    validateBirthChartRequest(chartData, userMessage) {
        if (!chartData) {
            const error = new Error("Datos del astrólogo requeridos");
            error.statusCode = 400;
            error.code = "MISSING_CHART_DATA";
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
        if (userMessage.length > 1500) {
            const error = new Error("El mensaje es demasiado largo (máximo 1500 caracteres)");
            error.statusCode = 400;
            error.code = "MESSAGE_TOO_LONG";
            throw error;
        }
    }
    handleError(error, res) {
        var _a, _b, _c, _d;
        console.error("Error en BirthChartController:", error);
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
exports.BirthChartController = BirthChartController;
