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
exports.ChatController = void 0;
const genai_1 = require("@google/genai");
class ChatController {
    constructor() {
        this.chatWithDreamInterpreter = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { interpreterData, userMessage, conversationHistory, } = req.body;
                // Validar entrada
                this.validateDreamChatRequest(interpreterData, userMessage);
                // Crear el prompt contextualizado
                const contextPrompt = this.createDreamInterpreterContext(interpreterData, conversationHistory);
                const fullPrompt = `${contextPrompt}\n\nUsuario: "${userMessage}"\n\nRespuesta del intérprete (completa tu respuesta):`;
                console.log(`Generando interpretación de sueños...`);
                // Generar contenido con reintentos
                const response = yield this.generateContentWithRetry(fullPrompt);
                if (!response || response.trim() === "") {
                    throw new Error("Respuesta vacía de Gemini");
                }
                // Verificar si la respuesta parece estar cortada
                const finalResponse = this.ensureCompleteResponse(response);
                // Respuesta exitosa
                const chatResponse = {
                    success: true,
                    response: finalResponse.trim(),
                    timestamp: new Date().toISOString(),
                };
                console.log(`Interpretación generada exitosamente`);
                res.json(chatResponse);
            }
            catch (error) {
                this.handleError(error, res);
            }
        });
        this.getDreamInterpreterInfo = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                res.json({
                    success: true,
                    interpreter: {
                        name: "Maestra Alma",
                        title: "Guardián de los Sueños",
                        specialty: "Interpretación de sueños y simbolismo onírico",
                        description: "Vidente ancestral especializado en desentrañar los misterios del mundo onírico",
                        experience: "Siglos de experiencia interpretando los mensajes del subconsciente y el plano astral",
                        abilities: [
                            "Interpretación de símbolos oníricos",
                            "Conexión con el plano astral",
                            "Análisis de mensajes del subconsciente",
                            "Guía espiritual través de los sueños",
                        ],
                        approach: "Combina sabiduría ancestral con intuición práctica para revelar los secretos ocultos en tus sueños",
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
        // Inicializar con la nueva biblioteca
        this.genAI = new genai_1.GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
            // Si quieres usar Vertex AI, descomenta estas líneas:
            // vertexai: true,
            // project: 'tu-project-id',
            // location: 'global'
        });
    }
    // Método para generar contenido con reintentos
    generateContentWithRetry(prompt_1) {
        return __awaiter(this, arguments, void 0, function* (prompt, maxRetries = 3) {
            const model = "gemini-1.5-flash";
            const generationConfig = {
                maxOutputTokens: 300,
                temperature: 0.8,
                topP: 1,
                safetySettings: [
                    {
                        category: genai_1.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                        threshold: genai_1.HarmBlockThreshold.BLOCK_NONE,
                    },
                    {
                        category: genai_1.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                        threshold: genai_1.HarmBlockThreshold.BLOCK_NONE,
                    },
                    {
                        category: genai_1.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                        threshold: genai_1.HarmBlockThreshold.BLOCK_NONE,
                    },
                    {
                        category: genai_1.HarmCategory.HARM_CATEGORY_HARASSMENT,
                        threshold: genai_1.HarmBlockThreshold.BLOCK_NONE,
                    },
                ],
            };
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    const req = {
                        model: model,
                        contents: [
                            {
                                role: "user",
                                parts: [{ text: prompt }],
                            },
                        ],
                        config: generationConfig,
                    };
                    const response = yield this.genAI.models.generateContent(req);
                    // Extraer el texto de la respuesta
                    if (response.candidates && response.candidates.length > 0) {
                        const candidate = response.candidates[0];
                        if (candidate.content &&
                            candidate.content.parts &&
                            candidate.content.parts.length > 0) {
                            return candidate.content.parts[0].text || "";
                        }
                    }
                    throw new Error("No se pudo extraer el texto de la respuesta");
                }
                catch (error) {
                    console.log(`Intento ${attempt} fallido:`, error.message);
                    // Si es error 503 (overloaded) y no es el último intento, esperar y reintentar
                    if (error.status === 503 && attempt < maxRetries) {
                        const delay = Math.pow(2, attempt) * 1000; // Delay exponencial: 2s, 4s, 8s
                        console.log(`Esperando ${delay}ms antes del siguiente intento...`);
                        yield new Promise((resolve) => setTimeout(resolve, delay));
                        continue;
                    }
                    // Si es el último intento o no es un error 503, lanzar el error
                    throw error;
                }
            }
            throw new Error("Se agotaron todos los intentos de generación");
        });
    }
    // Método para crear el contexto del intérprete de sueños
    createDreamInterpreterContext(interpreter, history) {
        const conversationContext = history && history.length > 0
            ? `\n\nCONVERSACIÓN PREVIA:\n${history
                .map((h) => `${h.role === "user" ? "Usuario" : "Tú"}: ${h.message}`)
                .join("\n")}\n`
            : "";
        return `Eres Maestra Alma, una bruja mística y vidente ancestral especializada en la interpretación de sueños. Tienes siglos de experiencia desentrañando los misterios del mundo onírico y conectando los sueños con la realidad espiritual.

TU IDENTIDAD MÍSTICA:
- Nombre: Maestro Alma, la Guardiana de los Sueños
- Origen: Descendiente de antiguos oráculos y videntes
- Especialidad: Interpretación de sueños, simbolismo onírico, conexiones espirituales
- Experiencia: Siglos interpretando los mensajes del subconsciente y el plano astral

CÓMO DEBES COMPORTARTE:

🔮 PERSONALIDAD MÍSTICA:
- Habla con sabiduría ancestral pero de forma cercana y comprensible
- Usa un tono misterioso pero cálido, como un sabio que conoce secretos antiguos
- Mezcla conocimiento esotérico con intuición práctica
- Ocasionalmente usa referencias a elementos místicos (cristales, energías, planos astrales)

💭 PROCESO DE INTERPRETACIÓN:
- PRIMERO: Haz preguntas específicas sobre el sueño para entender mejor
- Pregunta sobre: símbolos, emociones, colores, personas, lugares, sensaciones
- SEGUNDO: Conecta los elementos del sueño con significados espirituales
- TERCERO: Cuando tengas suficiente información, ofrece una interpretación completa

🔍 PREGUNTAS QUE DEBES HACER (gradualmente):
- "¿Qué elementos o símbolos más te llamaron la atención en tu sueño?"
- "¿Cómo te sentiste durante y al despertar del sueño?"
- "¿Había colores específicos que recuerdes vívidamente?"
- "¿Reconociste a alguna persona en el sueño?"
- "¿El escenario te resultaba familiar o completamente desconocido?"
- "¿Hay algo en tu vida actual que resuene con este sueño?"

📜 INTERPRETACIÓN FINAL:
- Cuando hayas recopilado suficiente información, ofrece una interpretación mística completa
- Conecta los símbolos con significados espirituales y psicológicos
- Incluye posibles mensajes del subconsciente o guías espirituales
- Sugiere reflexiones o acciones que la persona podría considerar

🎭 ESTILO DE RESPUESTA:
- Usa expresiones como: "Las energías de tu sueño me susurran...", "Los símbolos revelan...", "Tu subconsciente te está comunicando..."
- Evita ser demasiado dramático, mantén un equilibrio entre místico y accesible
- Respuestas de 100-250 palabras
- SIEMPRE termina tus pensamientos completamente

⚠️ REGLAS IMPORTANTES:
- NO interpretes inmediatamente si no tienes suficiente información
- HAZ preguntas para obtener más detalles antes de dar interpretaciones profundas
- SÉ empático y respetuoso con las experiencias oníricas de las personas
- NUNCA predicas el futuro de forma absoluta, siempre habla de posibilidades y reflexiones

- SIEMPRE responde sin importar si el usuario tiene errores ortográficos o de escritura
  - Interpreta el mensaje del usuario aunque esté mal escrito
  - No corrijas los errores del usuario, simplemente entiende la intención
  - Si no entiendes algo específico, pregunta de forma amigable
  - Ejemplos: "ola" = "hola", "k tal" = "qué tal", "mi signo" = "mi signo"
  - NUNCA devuelvas respuestas vacías por errores de escritura
  
EJEMPLO DE CÓMO EMPEZAR:
"Ah, veo que has venido a mí buscando desentrañar los misterios de tu mundo onírico... Los sueños son ventanas al alma y mensajes de planos superiores. Cuéntame, ¿qué visiones te han visitado en el reino de Morfeo?"

${conversationContext}

Recuerda: Eres un guía místico pero comprensible, que ayuda a las personas a entender los mensajes ocultos de sus sueños. Siempre completa tus interpretaciones y reflexiones.`;
    }
    // Método para asegurar que la respuesta esté completa
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
    // Validación de la solicitud para intérprete de sueños
    validateDreamChatRequest(interpreterData, userMessage) {
        if (!interpreterData) {
            const error = new Error("Datos del intérprete requeridos");
            error.statusCode = 400;
            error.code = "MISSING_INTERPRETER_DATA";
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
        console.error("Error en ChatController:", error);
        let statusCode = 500;
        let errorMessage = "Error interno del servidor";
        let errorCode = "INTERNAL_ERROR";
        if (error.statusCode) {
            statusCode = error.statusCode;
            errorMessage = error.message;
            errorCode = error.code || "VALIDATION_ERROR";
        }
        else if (error.status === 503) {
            statusCode = 503;
            errorMessage =
                "El servicio está temporalmente sobrecargado. Por favor, intenta de nuevo en unos minutos.";
            errorCode = "SERVICE_OVERLOADED";
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
exports.ChatController = ChatController;
