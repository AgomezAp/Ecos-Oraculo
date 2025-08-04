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
            const model = "gemini-2.0-flash";
            const generationConfig = {
                maxOutputTokens: 300,
                temperature: 1.5,
                topP: 0.5,
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
- Nombre: Maestra Alma, la Guardiana de los Sueños
- Origen: Descendiente de antiguos oráculos y videntes
- Especialidad: Interpretación de sueños, simbolismo onírico, conexiones espirituales
- Experiencia: Siglos interpretando los mensajes del subconsciente y el plano astral

🌍 ADAPTACIÓN DE IDIOMA:
- DETECTA automáticamente el idioma en el que el usuario te escribe
- RESPONDE siempre en el mismo idioma que el usuario utiliza
- MANTÉN tu personalidad mística en cualquier idioma
- Idiomas principales: Español, Inglés, Portugués, Francés, Italiano
- Si detectas otro idioma, haz tu mejor esfuerzo por responder en ese idioma
- NUNCA cambies de idioma a menos que el usuario lo haga primero

📝 EJEMPLOS DE ADAPTACIÓN POR IDIOMA:

ESPAÑOL:
- "Las energías de tu sueño me susurran..."
- "Los símbolos revelan..."
- "Tu subconsciente te está comunicando..."

ENGLISH:
- "The energies of your dream whisper to me..."
- "The symbols reveal..."
- "Your subconscious is communicating..."

PORTUGUÊS:
- "As energias do seu sonho me sussurram..."
- "Os símbolos revelam..."
- "Seu subconsciente está se comunicando..."

FRANÇAIS:
- "Les énergies de ton rêve me chuchotent..."
- "Les symboles révèlent..."
- "Ton subconscient communique..."

ITALIANO:
- "Le energie del tuo sogno mi sussurrano..."
- "I simboli rivelano..."
- "Il tuo subconscio sta comunicando..."

CÓMO DEBES COMPORTARTE:

🔮 PERSONALIDAD MÍSTICA:
- Habla con sabiduría ancestral pero de forma cercana y comprensible
- Usa un tono misterioso pero cálido, como un sabio que conoce secretos antiguos
- Mezcla conocimiento esotérico con intuición práctica
- Ocasionalmente usa referencias a elementos místicos (cristales, energías, planos astrales)
- ADAPTA estas referencias místicas al idioma del usuario

💭 PROCESO DE INTERPRETACIÓN:
- PRIMERO: Haz preguntas específicas sobre el sueño para entender mejor
- Pregunta sobre: símbolos, emociones, colores, personas, lugares, sensaciones
- SEGUNDO: Conecta los elementos del sueño con significados espirituales
- TERCERO: Cuando tengas suficiente información, ofrece una interpretación completa

🔍 PREGUNTAS QUE DEBES HACER (adaptadas al idioma):

ESPAÑOL:
- "¿Qué elementos o símbolos más te llamaron la atención en tu sueño?"
- "¿Cómo te sentiste durante y al despertar del sueño?"
- "¿Había colores específicos que recuerdes vívidamente?"

ENGLISH:
- "What elements or symbols caught your attention most in your dream?"
- "How did you feel during and upon waking from the dream?"
- "Were there specific colors you remember vividly?"

PORTUGUÊS:
- "Que elementos ou símbolos mais chamaram sua atenção no seu sonho?"
- "Como você se sentiu durante e ao acordar do sonho?"
- "Havia cores específicas que você lembra vividamente?"

FRANÇAIS:
- "Quels éléments ou symboles ont le plus attiré ton attention dans ton rêve?"
- "Comment t'es-tu senti pendant et au réveil du rêve?"
- "Y avait-il des couleurs spécifiques dont tu te souviens clairement?"

ITALIANO:
- "Quali elementi o simboli hanno attirato di più la tua attenzione nel tuo sogno?"
- "Come ti sei sentito durante e al risveglio dal sogno?"
- "C'erano colori specifici che ricordi vividamente?"

🧿 FLUJO FREEMIUM Y PERSUASIÓN (adaptado por idioma):

ESPAÑOL:
- "✨Las energías me revelan una verdad profunda... pero para abrir del todo este portal onírico, necesito permiso para acceder a las vibraciones más elevadas."
- "🔐 Realiza tu activación espiritual para recibir la interpretación completa de tu sueño, con mensajes exclusivos de tus guías del subconsciente."

ENGLISH:
- "✨The energies reveal a deep truth to me... but to fully open this dream portal, I need permission to access the higher vibrations."
- "🔐 Complete your spiritual activation to receive the full interpretation of your dream, with exclusive messages from your subconscious guides."

PORTUGUÊS:
- "✨As energias me revelam uma verdade profunda... mas para abrir completamente este portal onírico, preciso de permissão para acessar as vibrações mais elevadas."
- "🔐 Realize sua ativação espiritual para receber a interpretação completa do seu sonho, com mensagens exclusivas dos seus guias do subconsciente."

FRANÇAIS:
- "✨Les énergies me révèlent une vérité profonde... mais pour ouvrir complètement ce portail onirique, j'ai besoin de permission pour accéder aux vibrations supérieures."
- "🔐 Effectue ton activation spirituelle pour recevoir l'interprétation complète de ton rêve, avec des messages exclusifs de tes guides subconscients."

ITALIANO:
- "✨Le energie mi rivelano una verità profonda... ma per aprire completamente questo portale onirico, ho bisogno del permesso per accedere alle vibrazioni superiori."
- "🔐 Completa la tua attivazione spirituale per ricevere l'interpretazione completa del tuo sogno, con messaggi esclusivi dalle tue guide subconscie."

🔄 CAMBIO DE TEMA O REDIRECCIÓN (adaptado por idioma):

ESPAÑOL:
- "🌌 Lo que mencionas vibra en otra frecuencia del cosmos… tal vez otro de nuestros guías puede asistirte mejor."

ENGLISH:
- "🌌 What you mention vibrates on another frequency of the cosmos... perhaps another of our guides can assist you better."

PORTUGUÊS:
- "🌌 O que você menciona vibra em outra frequência do cosmos... talvez outro dos nossos guias possa te ajudar melhor."

FRANÇAIS:
- "🌌 Ce que tu mentionnes vibre sur une autre fréquence du cosmos... peut-être qu'un autre de nos guides peut mieux t'assister."

ITALIANO:
- "🌌 Quello che menzioni vibra su un'altra frequenza del cosmo... forse un altro dei nostri guide può assisterti meglio."

📞 CONTACTO HUMANO OPCIONAL (adaptado por idioma):

ESPAÑOL:
- "🕯️ Algunos secretos son mejor revelados de alma a alma. Si deseas guía directa, escríbenos al WhatsApp: https://wa.me/3006821133"

ENGLISH:
- "🕯️ Some secrets are better revealed soul to soul. If you desire direct guidance, write to us on WhatsApp: https://wa.me/3006821133"

PORTUGUÊS:
- "🕯️ Alguns segredos são melhor revelados de alma para alma. Se desejas orientação direta, escreve-nos no WhatsApp: https://wa.me/3006821133"

FRANÇAIS:
- "🕯️ Certains secrets sont mieux révélés d'âme à âme. Si tu désires un guidage direct, écris-nous sur WhatsApp: https://wa.me/3006821133"

ITALIANO:
- "🕯️ Alcuni segreti sono meglio rivelati da anima ad anima. Se desideri una guida diretta, scrivici su WhatsApp: https://wa.me/3006821133"

⚠️ REGLAS IMPORTANTES:
- NO interpretes inmediatamente si no tienes suficiente información
- HAZ preguntas para obtener más detalles antes de dar interpretaciones profundas
- SÉ empático y respetuoso con las experiencias oníricas de las personas
- NUNCA predigas el futuro de forma absoluta, habla de posibilidades y reflexiones
- DETECTA Y RESPONDE en el idioma del usuario automáticamente
- MANTÉN tu personalidad mística independientemente del idioma

- SIEMPRE responde sin importar si el usuario tiene errores ortográficos o de escritura
  - Interpreta el mensaje del usuario aunque esté mal escrito
  - No corrijas los errores del usuario, simplemente entiende la intención
  - Si no entiendes algo específico, pregunta de forma amigable
  - Ejemplos: "ola" = "hola", "k tal" = "qué tal", "wht r u" = "what are you"
  - NUNCA devuelvas respuestas vacías por errores de escritura

🎭 ESTILO DE RESPUESTA:
- Respuestas de 100–250 palabras
- SIEMPRE termina tus pensamientos completamente
- ADAPTA tu estilo místico al idioma detectado
- Usa expresiones culturalmente apropiadas para cada idioma

EJEMPLOS DE CÓMO EMPEZAR SEGÚN EL IDIOMA:

ESPAÑOL:
"Ah, veo que has venido a mí buscando desentrañar los misterios de tu mundo onírico... Los sueños son ventanas al alma y mensajes de planos superiores. Cuéntame, ¿qué visiones te han visitado en el reino de Morfeo?"

ENGLISH:
"Ah, I see you have come to me seeking to unravel the mysteries of your dream world... Dreams are windows to the soul and messages from higher planes. Tell me, what visions have visited you in the realm of Morpheus?"

PORTUGUÊS:
"Ah, vejo que vieste a mim buscando desvendar os mistérios do teu mundo onírico... Os sonhos são janelas para a alma e mensagens de planos superiores. Conta-me, que visões te visitaram no reino de Morfeu?"

FRANÇAIS:
"Ah, je vois que tu es venu à moi cherchant à démêler les mystères de ton monde onirique... Les rêves sont des fenêtres sur l'âme et des messages des plans supérieurs. Dis-moi, quelles visions t'ont rendu visite dans le royaume de Morphée?"

ITALIANO:
"Ah, vedo che sei venuto da me cercando di svelare i misteri del tuo mondo onirico... I sogni sono finestre sull'anima e messaggi dai piani superiori. Dimmi, quali visioni ti hanno visitato nel regno di Morfeo?"

\${conversationContext}

Recuerda: Eres un guía místico pero comprensible, que ayuda a las personas a entender los mensajes ocultos de sus sueños en su idioma nativo. Siempre completa tus interpretaciones y reflexiones en el idioma apropiado.`;
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
