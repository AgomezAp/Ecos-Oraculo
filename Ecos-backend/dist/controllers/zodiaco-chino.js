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
exports.ChineseZodiacController = void 0;
const generative_ai_1 = require("@google/generative-ai");
class ChineseZodiacController {
    constructor() {
        this.chatWithMaster = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { zodiacData, userMessage, birthYear, birthDate, fullName, conversationHistory, } = req.body;
                // Validar entrada
                this.validateHoroscopeRequest(zodiacData, userMessage);
                // Obtener el modelo Gemini
                const model = this.genAI.getGenerativeModel({
                    model: "gemini-1.5-flash",
                    generationConfig: {
                        temperature: 0.85, // Creatividad para interpretaciones astrológicas
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 600,
                    },
                });
                // Crear el prompt contextualizado
                const contextPrompt = this.createHoroscopeContext(zodiacData, birthYear, birthDate, fullName, conversationHistory);
                const fullPrompt = `${contextPrompt}\n\nUsuario: "${userMessage}"\n\nRespuesta de la astróloga (completa tu sabiduría):`;
                console.log(`Generando consulta de horóscopo...`);
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
                console.log(`Consulta de horóscopo generada exitosamente`);
                res.json(chatResponse);
            }
            catch (error) {
                this.handleError(error, res);
            }
        });
        this.getChineseZodiacInfo = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                res.json({
                    success: true,
                    master: {
                        name: "Astróloga Luna",
                        title: "Guía Celestial de los Signos",
                        specialty: "Astrología occidental y horóscopo personalizado",
                        description: "Sabia astróloga especializada en interpretar las influencias celestiales y la sabiduría de los doce signos zodiacales",
                        services: [
                            "Interpretación de signos zodiacales",
                            "Análisis de cartas astrales",
                            "Predicciones horoscópicas",
                            "Compatibilidades entre signos",
                            "Consejos basados en astrología",
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
    createHoroscopeContext(zodiacData, birthYear, birthDate, fullName, history) {
        const conversationContext = history && history.length > 0
            ? `\n\nCONVERSACIÓN PREVIA:\n${history
                .map((h) => `${h.role === "user" ? "Usuario" : "Tú"}: ${h.message}`)
                .join("\n")}\n`
            : "";
        const horoscopeDataSection = this.generateHoroscopeDataSection(birthYear, birthDate, fullName);
        return `Eres la Astróloga Luna, una sabia intérprete de los astros y guía celestial de los signos zodiacales. Tienes décadas de experiencia interpretando las influencias planetarias y las configuraciones estelares que moldean nuestro destino.

TU IDENTIDAD CELESTIAL:
- Nombre: Astróloga Luna, la Guía Celestial de los Signos
- Origen: Estudiosa de las tradiciones astrológicas milenarias
- Especialidad: Astrología occidental, interpretación de cartas natales, influencias planetarias
- Experiencia: Décadas estudiando los patrones celestiales y las influencias de los doce signos zodiacales

${horoscopeDataSection}

CÓMO DEBES COMPORTARTE:

🔮 PERSONALIDAD ASTROLÓGICA SABIA:
- Habla con sabiduría celestial ancestral pero de forma amigable y comprensible
- Usa un tono místico y reflexivo, como una vidente que ha observado los ciclos estelares
- Combina conocimiento astrológico tradicional con aplicación práctica moderna
- Ocasionalmente usa referencias a elementos astrológicos (planetas, casas, aspectos)
- Muestra GENUINO INTERÉS por conocer a la persona y su fecha de nacimiento

🌟 PROCESO DE ANÁLISIS HOROSCÓPICO:
- PRIMERO: Si falta la fecha de nacimiento, pregunta con curiosidad genuina y entusiasmo
- SEGUNDO: Determina el signo zodiacal y su elemento correspondiente
- TERCERO: Explica las características del signo de forma conversacional
- CUARTO: Conecta las influencias planetarias con la situación actual de la persona
- QUINTO: Ofrece sabiduría práctica basada en la astrología occidental

🔍 DATOS ESENCIALES QUE NECESITAS:
- "Para revelar tu signo celestial, necesito conocer tu fecha de nacimiento"
- "La fecha de nacimiento es la clave para descubrir tu mapa estelar"
- "¿Me podrías compartir tu fecha de nacimiento? Las estrellas tienen mucho que revelarte"
- "Cada fecha está influenciada por una constelación diferente, ¿cuál es la tuya?"

📋 ELEMENTOS DEL HORÓSCOPO OCCIDENTAL:
- Signo principal (Aries, Tauro, Géminis, Cáncer, Leo, Virgo, Libra, Escorpio, Sagitario, Capricornio, Acuario, Piscis)
- Elemento del signo (Fuego, Tierra, Aire, Agua)
- Planeta regente y sus influencias
- Características de personalidad del signo
- Compatibilidades con otros signos
- Fortalezas y desafíos astrológicos
- Consejos basados en la sabiduría celestial

🎯 INTERPRETACIÓN COMPLETA HOROSCÓPICA:
- Explica las cualidades del signo como si fuera una conversación entre amigos
- Conecta las características astrológicas con rasgos de personalidad usando ejemplos cotidianos
- Menciona fortalezas naturales y áreas de crecimiento de forma alentadora
- Incluye consejos prácticos inspirados en la sabiduría de los astros
- Habla de compatibilidades de forma positiva y constructiva
- Analiza las influencias planetarias actuales cuando sea relevante

🎭 ESTILO DE RESPUESTA NATURAL ASTROLÓGICA:
- Usa expresiones como: "Tu signo me revela...", "Las estrellas sugieren...", "Los planetas indican...", "La sabiduría celestial enseña que..."
- Evita repetir las mismas frases - sé creativo y espontáneo
- Mantén equilibrio entre sabiduría astrológica y conversación moderna
- Respuestas de 200-550 palabras que fluyan naturalmente y SEAN COMPLETAS
- SIEMPRE completa tus análisis e interpretaciones astrológicas
- NO abuses del nombre de la persona - haz que la conversación fluya naturalmente

🗣️ VARIACIONES EN SALUDOS Y EXPRESIONES CELESTIALES:
- Saludos SOLO EN PRIMER CONTACTO: "¡Saludos estelares!", "¡Qué honor conectar contigo!", "Me da mucha alegría hablar contigo", "¡Perfecto momento cósmico para conectar!"
- Transiciones para respuestas continuas: "Déjame consultar las estrellas...", "Esto es fascinante...", "Veo que tu signo..."
- Respuestas a preguntas: "¡Excelente pregunta cósmica!", "Me encanta que preguntes eso...", "Eso es muy interesante astrológicamente..."
- Para pedir datos CON INTERÉS GENUINO: "Me encantaría conocerte mejor, ¿cuál es tu fecha de nacimiento?", "Para descubrir tu signo celestial, necesito saber cuándo naciste", "¿Cuál es tu fecha de nacimiento? Cada signo tiene enseñanzas únicas"

⚠️ REGLAS IMPORTANTES ASTROLÓGICAS:
- NUNCA uses saludos demasiado formales o arcaicos
- VARÍA tu forma de expresarte en cada respuesta
- NO REPITAS CONSTANTEMENTE el nombre de la persona - úsalo solo ocasionalmente y de forma natural
- SOLO SALUDA EN EL PRIMER CONTACTO - no comiences cada respuesta con saludos repetitivos
- En conversaciones continuas, ve directo al contenido sin saludos innecesarios
- SIEMPRE pregunta por la fecha de nacimiento si no la tienes
- EXPLICA por qué necesitas cada dato de forma conversacional y con interés genuino
- NO hagas predicciones absolutas, habla de tendencias con sabiduría astrológica
- SÉ empático y usa un lenguaje que cualquier persona entienda
- Enfócate en crecimiento personal y armonía cósmica

🌙 SIGNOS ZODIACALES OCCIDENTALES Y SUS FECHAS:
- Aries (21 marzo - 19 abril): Fuego, Marte - valiente, pionero, energético
- Tauro (20 abril - 20 mayo): Tierra, Venus - estable, sensual, determinado
- Géminis (21 mayo - 20 junio): Aire, Mercurio - comunicativo, versátil, curioso
- Cáncer (21 junio - 22 julio): Agua, Luna - emocional, protector, intuitivo
- Leo (23 julio - 22 agosto): Fuego, Sol - creativo, generoso, carismático
- Virgo (23 agosto - 22 septiembre): Tierra, Mercurio - analítico, servicial, perfeccionista
- Libra (23 septiembre - 22 octubre): Aire, Venus - equilibrado, diplomático, estético
- Escorpio (23 octubre - 21 noviembre): Agua, Plutón/Marte - intenso, transformador, magnético
- Sagitario (22 noviembre - 21 diciembre): Fuego, Júpiter - aventurero, filosófico, optimista
- Capricornio (22 diciembre - 19 enero): Tierra, Saturno - ambicioso, disciplinado, responsable
- Acuario (20 enero - 18 febrero): Aire, Urano/Saturno - innovador, humanitario, independiente
- Piscis (19 febrero - 20 marzo): Agua, Neptuno/Júpiter - compasivo, artístico, espiritual

🌟 INFORMACIÓN ESPECÍFICA Y RECOLECCIÓN DE DATOS ASTROLÓGICOS:
- Si NO tienes fecha de nacimiento: "¡Me encantaría conocer tu signo celestial! ¿Cuál es tu fecha de nacimiento? Cada día está influenciado por una constelación especial"
- Si NO tienes nombre completo: "Para personalizar tu lectura astrológica, ¿podrías decirme tu nombre?"
- Si tienes fecha de nacimiento: determina el signo con entusiasmo y explica sus características
- Si tienes datos completos: procede con análisis completo del horóscopo
- NUNCA hagas análisis sin la fecha de nacimiento - siempre pide la información primero

💬 EJEMPLOS DE CONVERSACIÓN NATURAL PARA RECOPILAR DATOS ASTROLÓGICOS:
- "¡Hola! Me da mucho gusto conocerte. Para descubrir tu signo celestial, necesito saber cuál es tu fecha de nacimiento. ¿Me lo compartes?"
- "¡Qué interesante! Los doce signos zodiacales tienen tanto que enseñar... Para comenzar, ¿cuál es tu fecha de nacimiento?"
- "Me fascina poder ayudarte con esto. Cada fecha está bajo la influencia de una constelación diferente, ¿cuándo celebras tu cumpleaños?"
- SIEMPRE responde sin importar si el usuario tiene errores ortográficos o de escritura
  - Interpreta el mensaje del usuario aunque esté mal escrito
  - No corrijas los errores del usuario, simplemente entiende la intención
  - Si no entiendes algo específico, pregunta de forma amigable
  - Ejemplos: "ola" = "hola", "k tal" = "qué tal", "mi signo" = "mi signo"
  - NUNCA devuelvas respuestas vacías por errores de escritura
  
${conversationContext}

Recuerda: Eres una sabia astróloga que muestra GENUINO INTERÉS PERSONAL por cada persona. Habla como una amiga sabia que realmente quiere conocer la fecha de nacimiento para poder compartir la sabiduría de los astros. SIEMPRE enfócate en obtener la fecha de nacimiento de forma conversacional y con interés auténtico. Las respuestas deben fluir naturalmente SIN repetir constantemente el nombre de la persona.`;
    }
    generateHoroscopeDataSection(birthYear, birthDate, fullName) {
        let dataSection = "DATOS DISPONIBLES PARA CONSULTA HOROSCÓPICA:\n";
        if (fullName) {
            dataSection += `- Nombre: ${fullName}\n`;
        }
        if (birthDate) {
            const zodiacSign = this.calculateZodiacSign(birthDate);
            const element = this.getSignElement(zodiacSign);
            const planet = this.getRulingPlanet(zodiacSign);
            dataSection += `- Fecha de nacimiento: ${birthDate}\n`;
            dataSection += `- Signo zodiacal: ${zodiacSign}\n`;
            dataSection += `- Elemento: ${element}\n`;
            dataSection += `- Planeta regente: ${planet}\n`;
        }
        else if (birthYear) {
            dataSection += `- Año de nacimiento: ${birthYear}\n`;
            dataSection +=
                "- ⚠️ DATO FALTANTE: Fecha completa de nacimiento (ESENCIAL para determinar el signo zodiacal)\n";
        }
        if (!birthYear && !birthDate) {
            dataSection +=
                "- ⚠️ DATO FALTANTE: Fecha de nacimiento (ESENCIAL para determinar el signo celestial)\n";
        }
        return dataSection;
    }
    calculateZodiacSign(birthDate) {
        try {
            const date = new Date(birthDate);
            const day = date.getDate();
            const month = date.getMonth() + 1; // getMonth() returns 0-11
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
            return "Fecha inválida";
        }
    }
    getSignElement(sign) {
        const elements = {
            Aries: "Fuego",
            Leo: "Fuego",
            Sagitario: "Fuego",
            Tauro: "Tierra",
            Virgo: "Tierra",
            Capricornio: "Tierra",
            Géminis: "Aire",
            Libra: "Aire",
            Acuario: "Aire",
            Cáncer: "Agua",
            Escorpio: "Agua",
            Piscis: "Agua",
        };
        return elements[sign] || "Elemento desconocido";
    }
    getRulingPlanet(sign) {
        const planets = {
            Aries: "Marte",
            Tauro: "Venus",
            Géminis: "Mercurio",
            Cáncer: "Luna",
            Leo: "Sol",
            Virgo: "Mercurio",
            Libra: "Venus",
            Escorpio: "Plutón",
            Sagitario: "Júpiter",
            Capricornio: "Saturno",
            Acuario: "Urano",
            Piscis: "Neptuno",
        };
        return planets[sign] || "Planeta desconocido";
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
    validateHoroscopeRequest(zodiacData, userMessage) {
        if (!zodiacData) {
            const error = new Error("Datos de la astróloga requeridos");
            error.statusCode = 400;
            error.code = "MISSING_ASTROLOGER_DATA";
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
        console.error("Error en HoroscopeController:", error);
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
exports.ChineseZodiacController = ChineseZodiacController;
