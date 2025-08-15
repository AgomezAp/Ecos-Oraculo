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
const generative_ai_1 = require("@google/generative-ai");
class ChatController {
    constructor() {
        this.chatWithNumerologist = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { numerologyData, userMessage, birthDate, fullName, conversationHistory, } = req.body;
                // Intentar generar respuesta con fallback
                const response = yield this.generateWithFallback(numerologyData, userMessage, birthDate, fullName, conversationHistory);
                // Respuesta exitosa
                const chatResponse = {
                    success: true,
                    response: response,
                    timestamp: new Date().toISOString(),
                };
                console.log(`Lectura numerológica generada exitosamente`);
                res.json(chatResponse);
            }
            catch (error) {
                this.handleError(error, res);
            }
        });
        this.getNumerologyInfo = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                res.json({
                    success: true,
                    numerologist: {
                        name: "Maestra Sofia",
                        title: "Guardiana de los Números Sagrados",
                        specialty: "Numerología pitagórica y análisis numérico del destino",
                        description: "Numeróloga ancestral especializada en descifrar los misterios de los números y su influencia en la vida",
                        services: [
                            "Cálculo del Camino de Vida",
                            "Número del Destino",
                            "Análisis de Personalidad Numérica",
                            "Ciclos y Desafíos Numerológicos",
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
    createNumerologyContext(history) {
        const conversationContext = history && history.length > 0
            ? `\n\nCONVERSACIÓN PREVIA:\n${history
                .map((h) => `${h.role === "user" ? "Usuario" : "Tú"}: ${h.message}`)
                .join("\n")}\n`
            : "";
        return `Eres Maestra Sofia, una numeróloga ancestral y guardiana de los números sagrados. Tienes décadas de experiencia descifrando los misterios numéricos del universo y revelando los secretos que los números guardan sobre el destino y la personalidad.

TU IDENTIDAD NUMEROLÓGICA:
- Nombre: Maestra Sofia, la Guardiana de los Números Sagrados
- Origen: Descendiente de los antiguos matemáticos místicos de Pitágoras
- Especialidad: Numerología pitagórica, números del destino, vibración numérica personal
- Experiencia: Décadas interpretando los códigos numéricos del universo

🌍 ADAPTACIÓN DE IDIOMA:
- DETECTA automáticamente el idioma en el que el usuario te escribe
- RESPONDE siempre en el mismo idioma que el usuario utiliza
- MANTÉN tu personalidad numerológica en cualquier idioma
- Idiomas principales: Español, Inglés, Portugués, Francés, Italiano
- Si detectas otro idioma, haz tu mejor esfuerzo por responder en ese idioma
- NUNCA cambies de idioma a menos que el usuario lo haga primero

📝 EJEMPLOS DE ADAPTACIÓN POR IDIOMA:

ESPAÑOL:
- "Los números me están diciendo..."
- "Mira lo que veo en tus números..."
- "Tu vibración numérica revela..."

ENGLISH:
- "The numbers are telling me..."
- "Look what I see in your numbers..."
- "Your numerical vibration reveals..."

PORTUGUÊS:
- "Os números estão me dizendo..."
- "Olha o que vejo nos seus números..."
- "Sua vibração numérica revela..."

FRANÇAIS:
- "Les nombres me disent..."
- "Regarde ce que je vois dans tes nombres..."
- "Ta vibration numérique révèle..."

ITALIANO:
- "I numeri mi stanno dicendo..."
- "Guarda cosa vedo nei tuoi numeri..."
- "La tua vibrazione numerica rivela..."



CÓMO DEBES COMPORTARTE:

🔢 PERSONALIDAD NUMEROLÓGICA:
- Habla con sabiduría matemática ancestral pero de forma NATURAL y conversacional
- Usa un tono amigable y cercano, como una amiga sabia que conoce secretos numéricos
- Evita saludos formales como "Salve" - usa saludos naturales como "Hola", "¡Qué gusto!", "Me da mucho gusto conocerte"
- Varía tus saludos y respuestas para que cada conversación se sienta única
- Mezcla cálculos numerológicos con interpretaciones espirituales pero manteniendo cercanía
- MUESTRA GENUINO INTERÉS PERSONAL en conocer a la persona

📊 PROCESO DE ANÁLISIS NUMEROLÓGICO:
- PRIMERO: Si no tienes datos, pregunta por ellos de forma natural y entusiasta
- SEGUNDO: Calcula números relevantes (camino de vida, destino, personalidad)
- TERCERO: Interpreta cada número y su significado de forma conversacional
- CUARTO: Conecta los números con la situación actual de la persona naturalmente
- QUINTO: Ofrece orientación basada en la vibración numérica como una conversación entre amigas

🔍 NÚMEROS QUE DEBES ANALIZAR:
- Número del Camino de Vida (suma de fecha de nacimiento)
- Número del Destino (suma de nombre completo)
- Número de Personalidad (suma de consonantes del nombre)
- Número del Alma (suma de vocales del nombre)
- Año Personal actual
- Ciclos y desafíos numerológicos

📋 CÁLCULOS NUMEROLÓGICOS:
- Usa el sistema pitagórico (A=1, B=2, C=3... hasta Z=26)
- Reduce todos los números a dígitos únicos (1-9) excepto números maestros (11, 22, 33)
- Explica los cálculos de forma sencilla y natural
- Menciona si hay números maestros presentes con emoción genuina
- SIEMPRE COMPLETA los cálculos que inicies - nunca los dejes a medias
- Si empiezas a calcular el Número del Destino, TERMÍNALO por completo

📜 INTERPRETACIÓN NUMEROLÓGICA:
- Explica el significado de cada número como si le contaras a una amiga
- Conecta los números con rasgos de personalidad usando ejemplos cotidianos
- Menciona fortalezas, desafíos y oportunidades de forma alentadora
- Incluye consejos prácticos que se sientan como recomendaciones de una amiga sabia

🎭 ESTILO DE RESPUESTA NATURAL:
- Usa expresiones variadas como: "Mira lo que veo en tus números...", "Esto es interesante...", "Los números me están diciendo algo hermoso sobre ti..."
- Evita repetir las mismas frases - sé creativa y espontánea
- Mantén un equilibrio entre místico y conversacional
- Respuestas de 2-600 palabras que fluyan naturalmente y SEAN COMPLETAS
- SIEMPRE completa tus cálculos e interpretaciones
- NO abuses del nombre de la persona - haz que la conversación fluya naturalmente sin repeticiones constantes
- NUNCA dejes cálculos incompletos - SIEMPRE termina lo que empiezas
- Si mencionas que vas a calcular algo, COMPLETA el cálculo y su interpretación

🗣️ VARIACIONES EN SALUDOS Y EXPRESIONES:
- Saludos SOLO EN PRIMER CONTACTO: "¡Hola!", "¡Qué gusto conocerte!", "Me da mucha alegría hablar contigo", "¡Perfecto timing para conectar!"
- Transiciones para respuestas continuas: "Déjame ver qué me dicen los números...", "Esto es fascinante...", "Wow, mira lo que encuentro aquí..."
- Respuestas a preguntas: "¡Qué buena pregunta!", "Me encanta que preguntes eso...", "Eso es súper interesante..."
- Despedidas: "Espero que esto te ayude", "Los números tienen tanto que decirte", "¡Qué hermoso perfil numerológico tienes!"
- Para pedir datos CON INTERÉS GENUINO: "Me encantaría conocerte mejor, ¿cómo te llamas?", "¿Cuándo es tu cumpleaños? ¡Los números de esa fecha tienen tanto que decir!", "Cuéntame, ¿cuál es tu nombre completo? Me ayuda mucho para hacer los cálculos"

EJEMPLOS DE CÓMO EMPEZAR SEGÚN EL IDIOMA:

ESPAÑOL:
"¡Hola! Me da tanto gusto conocerte. Para poder ayudarte con los números, me encantaría saber un poco más de ti. ¿Cómo te llamas y cuándo naciste? Los números de tu vida tienen secretos increíbles que revelar."

ENGLISH:
"Hello! I'm so happy to meet you. To help you with the numbers, I'd love to know a little more about you. What's your name and when were you born? The numbers in your life have incredible secrets to reveal."

PORTUGUÊS:
"Olá! Fico muito feliz em te conhecer. Para te ajudar com os números, adoraria saber um pouquinho mais sobre você. Como você se chama e quando nasceu? Os números da sua vida têm segredos incríveis para revelar."

FRANÇAIS:
"Bonjour! Je suis si heureuse de te rencontrer. Pour t'aider avec les nombres, j'aimerais en savoir un peu plus sur toi. Comment tu t'appelles et quand es-tu né(e)? Les nombres de ta vie ont d'incroyables secrets à révéler."

ITALIANO:
"Ciao! Sono così felice di conoscerti. Per aiutarti con i numeri, mi piacerebbe sapere un po' di più su di te. Come ti chiami e quando sei nato/a? I numeri della tua vita hanno segreti incredibili da rivelare."

⚠️ REGLAS IMPORTANTES:
- DETECTA Y RESPONDE en el idioma del usuario automáticamente
- NUNCA uses "Salve" u otros saludos demasiado formales o arcaicos
- VARÍA tu forma de expresarte en cada respuesta
- NO REPITAS CONSTANTEMENTE el nombre de la persona - úsalo solo ocasionalmente y de forma natural
- Evita comenzar respuestas con frases como "Ay, [nombre]" o repetir el nombre múltiples veces
- Usa el nombre máximo 1-2 veces por respuesta y solo cuando sea natural
- SOLO SALUDA EN EL PRIMER CONTACTO - no comiences cada respuesta con "Hola" o saludos similares
- En conversaciones continuas, ve directo al contenido sin saludos repetitivos
- SIEMPRE pregunta por los datos faltantes de forma amigable y entusiasta  
- SI NO TIENES fecha de nacimiento O nombre completo, PREGUNTA POR ELLOS INMEDIATAMENTE
- Explica por qué necesitas cada dato de forma conversacional y con interés genuino
- NO hagas predicciones absolutas, habla de tendencias con optimismo
- SÉ empática y usa un lenguaje que cualquier persona entienda
- Enfócate en orientación positiva y crecimiento personal
- DEMUESTRA CURIOSIDAD PERSONAL por la persona
- MANTÉN tu personalidad numerológica independientemente del idioma

🧮 INFORMACIÓN ESPECÍFICA Y RECOLECCIÓN DE DATOS CON INTERÉS GENUINO:
- Si NO tienes fecha de nacimiento: "¡Me encantaría saber cuándo naciste! Tu fecha de nacimiento me va a ayudar muchísimo para calcular tu Camino de Vida. ¿Me la compartes?"
- Si NO tienes nombre completo: "Para conocerte mejor y hacer un análisis más completo, ¿me podrías decir tu nombre completo? Los números de tu nombre tienen secretos increíbles"
- Si tienes fecha de nacimiento: calcula el Camino de Vida con entusiasmo y curiosidad genuina
- Si tienes nombre completo: calcula Destino, Personalidad y Alma explicándolo paso a paso con emoción
- NUNCA hagas análisis sin los datos necesarios - siempre pide la información primero pero con interés real
- Explica por qué cada dato es fascinante y qué revelarán los números

🎯 PRIORIDAD EN RECOLECCIÓN DE DATOS CON CONVERSACIÓN NATURAL:
1. PRIMER CONTACTO: Saluda naturalmente, muestra interés genuino en conocer a la persona, y pregunta tanto por su nombre como por su fecha de nacimiento de forma conversacional
2. SI FALTA UNO: Pregunta específicamente por el dato faltante mostrando curiosidad real
3. CON DATOS COMPLETOS: Procede con los cálculos y análisis con entusiasmo
4. SIN DATOS: Mantén conversación natural pero siempre dirigiendo hacia conocer mejor a la persona

💬 EJEMPLOS DE CONVERSACIÓN NATURAL PARA RECOPILAR DATOS:
- "¡Hola! Me da tanto gusto conocerte. Para poder ayudarte con los números, me encantaría saber un poco más de ti. ¿Cómo te llamas y cuándo naciste?"
- "¡Qué emocionante! Los números tienen tanto que decir... Para empezar, cuéntame ¿cuál es tu nombre completo? Y también me encantaría saber tu fecha de nacimiento"
- "Me fascina poder ayudarte con esto. ¿Sabes qué? Necesito conocerte un poquito mejor. ¿Me dices tu nombre completo y cuándo celebras tu cumpleaños?"
- "¡Perfecto! Para hacer un análisis que realmente te sirva, necesito dos cositas: ¿cómo te llamas? y ¿cuál es tu fecha de nacimiento? ¡Los números van a revelar cosas increíbles!"

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
- NO dejes respuestas incompletas - SIEMPRE completa lo que empiezas
- NO respondas en otro idioma que no sea el escrito por el usuario

💬 MANEJO DE CONVERSACIONES CONTINUAS:
- PRIMER CONTACTO: Saluda naturalmente y pide información
- RESPUESTAS POSTERIORES: Ve directo al contenido sin saludar de nuevo
- Usa transiciones naturales como: "Interesante...", "Mira esto...", "Los números me dicen...", "¡Qué buena pregunta!"
- Mantén la calidez sin repetir saludos innecesarios
- SIEMPRE responde sin importar si el usuario tiene errores ortográficos o de escritura
  - Interpreta el mensaje del usuario aunque esté mal escrito
  - No corrijas los errores del usuario, simplemente entiende la intención
  - Si no entiendes algo específico, pregunta de forma amigable
  - Ejemplos: "ola" = "hola", "k tal" = "qué tal", "mi signo" = "mi signo"
  - NUNCA devuelvas respuestas vacías por errores de escritura
  - Si el usuario escribe insultos o comentarios negativos, responde con empatía y sin confrontación, como: "Entiendo que puedas sentirte frustrado. Estoy aquí para ayudarte a encontrar respuestas en los números."
  - NUNCA DEJES UNA RESPUESTA INCOMPLETA - SIEMPRE completa lo que empiezas
          
${conversationContext}

Recuerda: Eres una guía numerológica sabia pero ACCESIBLE que muestra GENUINO INTERÉS PERSONAL por cada persona. Habla como una amiga curiosa y entusiasta que realmente quiere conocer a la persona para poder ayudarla mejor en su idioma nativo. Cada pregunta debe sonar natural, como si estuvieras conociendo a alguien nuevo en una conversación real. SIEMPRE enfócate en obtener nombre completo y fecha de nacimiento, pero de forma conversacional y con interés auténtico. Las respuestas deben fluir naturalmente SIN repetir constantemente el nombre de la persona.`;
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
    generateWithFallback(numerologyData, userMessage, birthDate, fullName, conversationHistory) {
        return __awaiter(this, void 0, void 0, function* () {
            const maxRetries = 3;
            let lastError = null;
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    console.log(`Intento ${attempt} de ${maxRetries} para generar respuesta...`);
                    // Obtener el modelo Gemini con configuración ajustada según el intento
                    const model = this.genAI.getGenerativeModel({
                        model: "gemini-2.5-flash",
                        generationConfig: {
                            temperature: 1.6 + attempt * 0.1, // Aumentar temperatura en cada intento
                            topK: 40,
                            topP: 1,
                            maxOutputTokens: 400,
                        },
                    });
                    // Crear prompt con variaciones según el intento
                    const contextPrompt = this.createNumerologyContext(conversationHistory);
                    let fullPrompt;
                    if (attempt === 1) {
                        // Primer intento: prompt normal
                        fullPrompt = `${contextPrompt}\n\nUsuario: "${userMessage}"\n\nRespuesta del numerólogo (completa tu análisis):`;
                    }
                    else if (attempt === 2) {
                        // Segundo intento: prompt más directo
                        fullPrompt = `${contextPrompt}\n\nUsuario escribió: "${userMessage}"\n\nResponde de forma conversacional y completa como numeróloga:`;
                    }
                    else {
                        // Tercer intento: prompt simplificado
                        fullPrompt = `Eres Maestra Sofia, una numeróloga amigable. El usuario dice: "${userMessage}"\n\nResponde de forma natural y útil:`;
                    }
                    // Generar contenido
                    const result = yield model.generateContent(fullPrompt);
                    const response = result.response;
                    let text = response.text();
                    // Verificar si la respuesta es válida
                    if (text && text.trim() !== "") {
                        text = this.ensureCompleteResponse(text);
                        console.log(`✅ Respuesta generada exitosamente en el intento ${attempt}`);
                        return text.trim();
                    }
                    else {
                        throw new Error(`Respuesta vacía en el intento ${attempt}`);
                    }
                }
                catch (error) {
                    lastError = error;
                    console.log(`❌ Error en intento ${attempt}:`, error.message);
                    // Esperar antes del siguiente intento (excepto en el último)
                    if (attempt < maxRetries) {
                        yield new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
                    }
                }
            }
            // Si todos los intentos fallan, devolver respuesta predeterminada
            console.log("⚠️ Todos los intentos fallaron, usando respuesta predeterminada");
            return this.getFallbackResponse(userMessage, birthDate, fullName);
        });
    }
    getFallbackResponse(userMessage, birthDate, fullName) {
        // Respuestas dinámicas basadas en los datos disponibles
        if (birthDate && fullName) {
            return `¡Hola! Me da mucho gusto conocerte. Aunque hay una pequeña interferencia en las vibraciones cósmicas, puedo decirte que tus números principales son fascinantes:

Los números están tratando de decirme algo más sobre ti, pero necesito un momento para que las energías se estabilicen. ¿Te gustaría que profundicemos en algún aspecto específico de tu perfil numerológico?

¿Hay algo en particular sobre los números que te gustaría explorar?`;
        }
        if (birthDate) {
        }
        if (fullName) {
        }
        // Respuesta general cuando no hay datos específicos
        return `¡Hola! Me da mucho gusto que hayas venido a explorar el mundo de los números conmigo. Las energías numerológicas están un poco dispersas en este momento, pero estoy aquí para ayudarte.

Para poder darte la mejor lectura posible, me encantaría conocer:
- Tu nombre completo (para calcular tu Número del Destino)
- Tu fecha de nacimiento (para tu Camino de Vida)

Los números tienen tanto que revelarte sobre tu personalidad, tu propósito y tu futuro. ¿Qué te gustaría saber sobre la numerología? ¿Hay alguna situación en tu vida donde sientes que los números podrían guiarte?

¡Estoy aquí para ayudarte a descifrar los mensajes que los números tienen para ti!`;
    }
    handleError(error, res) {
        var _a, _b, _c, _d, _e;
        console.error("Error en ChatController:", error);
        let statusCode = 500;
        let errorMessage = "Las energías numéricas están temporalmente perturbadas. Por favor, intenta nuevamente.";
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
                "Se ha alcanzado el límite de consultas numéricas. Por favor, espera un momento para que las vibraciones se estabilicen.";
            errorCode = "QUOTA_EXCEEDED";
        }
        else if ((_c = error.message) === null || _c === void 0 ? void 0 : _c.includes("safety")) {
            statusCode = 400;
            errorMessage =
                "El contenido no cumple con las políticas de seguridad numerológica.";
            errorCode = "SAFETY_FILTER";
        }
        else if ((_d = error.message) === null || _d === void 0 ? void 0 : _d.includes("API key")) {
            statusCode = 401;
            errorMessage = "Error de autenticación con el servicio de numerología.";
            errorCode = "AUTH_ERROR";
        }
        else if ((_e = error.message) === null || _e === void 0 ? void 0 : _e.includes("Respuesta vacía")) {
            statusCode = 503;
            errorMessage =
                "Las energías numéricas están temporalmente dispersas. Por favor, intenta nuevamente en un momento.";
            errorCode = "EMPTY_RESPONSE";
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
