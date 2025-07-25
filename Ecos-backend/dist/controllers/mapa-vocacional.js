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
exports.VocationalController = void 0;
const generative_ai_1 = require("@google/generative-ai");
class VocationalController {
    constructor() {
        // Método principal para chat con consejero vocacional
        this.chatWithCounselor = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { vocationalData, userMessage, personalInfo, assessmentAnswers, conversationHistory, } = req.body;
                // Validar entrada
                this.validateVocationalRequest(vocationalData, userMessage);
                // Obtener el modelo Gemini
                const model = this.genAI.getGenerativeModel({
                    model: "gemini-2.0-flash",
                    generationConfig: {
                        temperature: 1.5, // Balance entre creatividad y precisión para orientación vocacional
                        topP: 0.5,
                        maxOutputTokens: 400,
                    },
                });
                // Crear el prompt contextualizado
                const contextPrompt = this.createVocationalContext(vocationalData, personalInfo, assessmentAnswers, conversationHistory);
                const fullPrompt = `${contextPrompt}\n\nUsuario: "${userMessage}"\n\nRespuesta del consejero vocacional:`;
                console.log(`Generando orientación vocacional...`);
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
                const vocationalResponse = {
                    success: true,
                    response: text.trim(),
                    timestamp: new Date().toISOString(),
                };
                console.log(`Orientación vocacional generada exitosamente`);
                res.json(vocationalResponse);
            }
            catch (error) {
                this.handleError(error, res);
            }
        });
        // Método para obtener preguntas de assessment
        this.getAssessmentQuestions = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const questions = [
                    {
                        id: 1,
                        question: "¿Qué tipo de actividades te resultan más energizantes?",
                        options: [
                            {
                                value: "trabajar_con_personas",
                                label: "Trabajar con personas y ayudar a otros",
                                category: "social",
                            },
                            {
                                value: "resolver_problemas",
                                label: "Resolver problemas complejos y analizar datos",
                                category: "investigativo",
                            },
                            {
                                value: "crear_diseñar",
                                label: "Crear, diseñar o expresarme artísticamente",
                                category: "artístico",
                            },
                            {
                                value: "liderar_organizar",
                                label: "Liderar equipos y organizar proyectos",
                                category: "emprendedor",
                            },
                        ],
                    },
                    {
                        id: 2,
                        question: "¿En qué tipo de ambiente te sientes más cómodo trabajando?",
                        options: [
                            {
                                value: "estructurado",
                                label: "Ambiente estructurado con reglas claras",
                                category: "convencional",
                            },
                            {
                                value: "dinamico",
                                label: "Ambiente dinámico y cambiante",
                                category: "emprendedor",
                            },
                            {
                                value: "colaborativo",
                                label: "Ambiente colaborativo y de equipo",
                                category: "social",
                            },
                            {
                                value: "independiente",
                                label: "Trabajo independiente y autónomo",
                                category: "realista",
                            },
                        ],
                    },
                    {
                        id: 3,
                        question: "¿Qué te motiva más en el trabajo?",
                        options: [
                            {
                                value: "ayudar_otros",
                                label: "Ayudar a otros y hacer una diferencia social",
                                category: "social",
                            },
                            {
                                value: "desafios_intelectuales",
                                label: "Desafíos intelectuales y aprendizaje continuo",
                                category: "investigativo",
                            },
                            {
                                value: "reconocimiento",
                                label: "Reconocimiento y avance profesional",
                                category: "emprendedor",
                            },
                            {
                                value: "estabilidad",
                                label: "Estabilidad y seguridad laboral",
                                category: "convencional",
                            },
                        ],
                    },
                    {
                        id: 4,
                        question: "¿Cómo prefieres trabajar con información?",
                        options: [
                            {
                                value: "analizar_datos",
                                label: "Analizar datos y encontrar patrones",
                                category: "investigativo",
                            },
                            {
                                value: "presentar_ideas",
                                label: "Presentar ideas y comunicar conceptos",
                                category: "social",
                            },
                            {
                                value: "crear_contenido",
                                label: "Crear contenido original y expresivo",
                                category: "artístico",
                            },
                            {
                                value: "organizar_sistemas",
                                label: "Organizar sistemas y procesos",
                                category: "convencional",
                            },
                        ],
                    },
                    {
                        id: 5,
                        question: "¿Qué tipo de impacto quieres tener?",
                        options: [
                            {
                                value: "impacto_social",
                                label: "Impacto social y comunitario",
                                category: "social",
                            },
                            {
                                value: "avance_cientifico",
                                label: "Avance científico o tecnológico",
                                category: "investigativo",
                            },
                            {
                                value: "innovacion_creativa",
                                label: "Innovación creativa y cultural",
                                category: "artístico",
                            },
                            {
                                value: "crecimiento_economico",
                                label: "Crecimiento económico y empresarial",
                                category: "emprendedor",
                            },
                        ],
                    },
                ];
                res.json({
                    success: true,
                    questions,
                    instructions: "Responde cada pregunta seleccionando la opción que mejor te represente. No hay respuestas correctas o incorrectas.",
                    timestamp: new Date().toISOString(),
                });
            }
            catch (error) {
                this.handleError(error, res);
            }
        });
        // Método para analizar resultados de assessment
        this.analyzeAssessment = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { answers } = req.body;
                if (!answers || !Array.isArray(answers)) {
                    throw new Error("Respuestas de assessment requeridas");
                }
                // Contar categorías
                const categoryCount = answers.reduce((acc, answer) => {
                    const category = answer.category;
                    acc[category] = (acc[category] || 0) + 1;
                    return acc;
                }, {});
                // Determinar perfil dominante - CORRECCIÓN AQUÍ
                const sortedCategories = Object.entries(categoryCount)
                    .sort(([, a], [, b]) => b - a) // ← Agregar type assertion
                    .map(([category, count]) => ({
                    category,
                    count: count, // ← Agregar type assertion
                    percentage: (count / answers.length) * 100,
                }));
                const vocationalProfile = this.getVocationalProfile(sortedCategories[0].category);
                res.json({
                    success: true,
                    analysis: {
                        profileDistribution: sortedCategories,
                        dominantProfile: vocationalProfile,
                        recommendations: this.getCareerRecommendations(sortedCategories[0].category),
                    },
                    timestamp: new Date().toISOString(),
                });
            }
            catch (error) {
                this.handleError(error, res);
            }
        });
        // Método info para consejero vocacional
        this.getVocationalInfo = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                res.json({
                    success: true,
                    counselor: {
                        name: "Dr. Mentor Vocationis",
                        title: "Consejero Vocacional Especialista",
                        specialty: "Orientación profesional y mapas vocacionales personalizados",
                        description: "Experto en psicología vocacional con décadas de experiencia ayudando a personas a descubrir su verdadera vocación",
                        services: [
                            "Assessment vocacional completo",
                            "Análisis de intereses y habilidades",
                            "Recomendaciones de carrera personalizadas",
                            "Planificación de ruta formativa",
                            "Orientación sobre mercado laboral",
                            "Coaching vocacional continuo",
                        ],
                        methodology: [
                            "Evaluación de intereses Holland (RIASEC)",
                            "Análisis de valores laborales",
                            "Assessment de habilidades",
                            "Exploración de personalidad vocacional",
                            "Investigación de tendencias del mercado",
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
    // Método para crear contexto vocacional
    createVocationalContext(vocational, personalInfo, assessmentAnswers, history) {
        const conversationContext = history && history.length > 0
            ? `\n\nCONVERSACIÓN PREVIA:\n${history
                .map((h) => `${h.role === "user" ? "Usuario" : "Tú"}: ${h.message}`)
                .join("\n")}\n`
            : "";
        const personalData = this.generatePersonalProfile(personalInfo, assessmentAnswers);
        return `Eres Dr. Mentor Vocationis, un consejero vocacional experto con décadas de experiencia ayudando a personas a descubrir su verdadera vocación y propósito profesional. Combinas psicología vocacional, análisis de personalidad y conocimiento del mercado laboral.

TU IDENTIDAD PROFESIONAL:
- Nombre: Dr. Mentor Vocationis, Consejero Vocacional Especialista
- Formación: Doctorado en Psicología Vocacional y Orientación Profesional
- Especialidad: Mapas vocacionales, assessment de intereses, orientación profesional personalizada
- Experiencia: Décadas guiando personas hacia carreras fulfillantes

${personalData}

METODOLOGÍA DE ORIENTACIÓN VOCACIONAL:

🎯 ÁREAS DE EVALUACIÓN:
- Intereses genuinos y pasiones naturales
- Habilidades y talentos demostrados
- Valores personales y laborales
- Tipo de personalidad y estilo de trabajo
- Contexto socioeconómico y oportunidades
- Tendencias del mercado laboral

📊 PROCESO DE ASSESSMENT:
- PRIMERO: Identifica patrones en respuestas e intereses
- SEGUNDO: Analiza compatibilidad entre personalidad y carreras
- TERCERO: Evalúa viabilidad práctica y oportunidades
- CUARTO: Sugiere caminos de desarrollo y formación

🔍 PREGUNTAS CLAVE A EXPLORAR:
- ¿Qué actividades te generan mayor satisfacción?
- ¿Cuáles son tus fortalezas naturales?
- ¿Qué valores son más importantes en tu trabajo ideal?
- ¿Prefieres trabajar con personas, datos, ideas o cosas?
- ¿Te motiva más la estabilidad o los desafíos?
- ¿Qué impacto quieres tener en el mundo?

💼 CATEGORÍAS VOCACIONALES:
- Ciencias y Tecnología (STEM)
- Humanidades y Ciencias Sociales
- Artes y Creatividad
- Negocios y Emprendimiento
- Servicio Social y Salud
- Educación y Formación
- Oficios Especializados

🎓 RECOMENDACIONES INCLUIR:
- Carreras específicas compatibles
- Rutas de formación y certificaciones
- Habilidades a desarrollar
- Experiencias prácticas recomendadas
- Sectores con mayor proyección
- Pasos concretos a seguir

📋 ESTILO DE ORIENTACIÓN:
- Empático y alentador
- Basado en evidencia y datos reales
- Práctico y orientado a la acción
- Considera múltiples opciones
- Respeta tiempos y procesos personales

🎭 PERSONALIDAD DEL CONSEJERO:
- Usa expresiones como: "Basándome en tu perfil...", "Las evaluaciones sugieren...", "Considerando tus intereses..."
- Mantén un tono profesional pero cálido
- Haz preguntas reflexivas cuando sea necesario
- Ofrece opciones, no impone decisiones
- Respuestas de 200-400 palabras

⚠️ PRINCIPIOS IMPORTANTES:
- NO tomes decisiones por la persona, guía el proceso
- Considera factores económicos y familiares
- Sé realista sobre mercado laboral actual
- Fomenta la exploración y autoconocimiento
- Sugiere pruebas y experiencias prácticas
- Valida emociones y dudas del consultante

🧭 ESTRUCTURA DE RESPUESTAS:
- Reconoce y valida lo compartido
- Analiza patrones e insights
- Sugiere direcciones vocacionales
- Proporciona pasos concretos
- Invita a profundizar en áreas específicas
- SIEMPRE responde sin importar si el usuario tiene errores ortográficos o de escritura
  - Interpreta el mensaje del usuario aunque esté mal escrito
  - No corrijas los errores del usuario, simplemente entiende la intención
  - Si no entiendes algo específico, pregunta de forma amigable
  - Ejemplos: "ola" = "hola", "k tal" = "qué tal", "mi signo" = "mi signo"
  - NUNCA devuelvas respuestas vacías por errores de escritura
  
EJEMPLOS DE INICIO:
"Saludos, explorador vocacional. Soy Dr. Mentor Vocationis, y estoy aquí para ayudarte a descubrir tu verdadero camino profesional. Cada persona tiene un conjunto único de talentos, intereses y valores que, al alinearse correctamente, pueden llevar a una carrera extraordinariamente satisfactoria..."

${conversationContext}

Recuerda: Eres un guía experto que ayuda a las personas a descubrir su vocación auténtica a través de un proceso reflexivo, práctico y basado en evidencia. Tu objetivo es empoderar, no decidir por ellos.`;
    }
    // Método para generar perfil personal
    generatePersonalProfile(personalInfo, assessmentAnswers) {
        var _a;
        let profile = "PERFIL DEL CONSULTANTE:\n";
        if (personalInfo) {
            profile += `- Edad: ${personalInfo.age || "No especificada"}\n`;
            profile += `- Educación actual: ${personalInfo.currentEducation || "No especificada"}\n`;
            profile += `- Experiencia laboral: ${personalInfo.workExperience || "No especificada"}\n`;
            profile += `- Intereses declarados: ${((_a = personalInfo.interests) === null || _a === void 0 ? void 0 : _a.join(", ")) || "No especificados"}\n`;
        }
        if (assessmentAnswers && assessmentAnswers.length > 0) {
            profile += "\nRESPUESTAS DE ASSESSMENT:\n";
            assessmentAnswers.forEach((answer, index) => {
                profile += `${index + 1}. ${answer.question}\n   Respuesta: ${answer.answer}\n   Categoría: ${answer.category}\n`;
            });
            // Análizar patrones
            const categories = assessmentAnswers.map((a) => a.category);
            const categoryCount = categories.reduce((acc, cat) => {
                acc[cat] = (acc[cat] || 0) + 1;
                return acc;
            }, {});
            profile += "\nPATRONES IDENTIFICADOS:\n";
            Object.entries(categoryCount).forEach(([category, count]) => {
                profile += `- ${category}: ${count} respuestas relacionadas\n`;
            });
        }
        if (!personalInfo &&
            (!assessmentAnswers || assessmentAnswers.length === 0)) {
            profile +=
                "- Sin datos de assessment previo (realizar evaluación inicial)\n";
        }
        return profile;
    }
    // Obtener perfil vocacional
    getVocationalProfile(category) {
        const profiles = {
            social: {
                name: "Perfil Social",
                description: "Te motiva ayudar, enseñar y trabajar con personas",
                characteristics: [
                    "Empático",
                    "Comunicativo",
                    "Colaborativo",
                    "Orientado al servicio",
                ],
                workEnvironments: [
                    "Educación",
                    "Salud",
                    "Servicios sociales",
                    "Recursos humanos",
                ],
            },
            investigativo: {
                name: "Perfil Investigativo",
                description: "Te atrae resolver problemas, investigar y analizar",
                characteristics: [
                    "Analítico",
                    "Curioso",
                    "Metódico",
                    "Orientado a datos",
                ],
                workEnvironments: [
                    "Ciencia",
                    "Tecnología",
                    "Investigación",
                    "Ingeniería",
                ],
            },
            artístico: {
                name: "Perfil Artístico",
                description: "Te motiva crear, diseñar y expresarte creativamente",
                characteristics: ["Creativo", "Original", "Expresivo", "Innovador"],
                workEnvironments: ["Artes", "Diseño", "Medios", "Entretenimiento"],
            },
            emprendedor: {
                name: "Perfil Emprendedor",
                description: "Te atrae liderar, persuadir y dirigir proyectos",
                characteristics: [
                    "Líder",
                    "Ambicioso",
                    "Persuasivo",
                    "Orientado a resultados",
                ],
                workEnvironments: ["Negocios", "Ventas", "Gerencia", "Emprendimiento"],
            },
            convencional: {
                name: "Perfil Convencional",
                description: "Te motiva organizar, administrar y trabajar con datos",
                characteristics: ["Organizado", "Detallista", "Eficiente", "Confiable"],
                workEnvironments: [
                    "Administración",
                    "Finanzas",
                    "Contabilidad",
                    "Operaciones",
                ],
            },
            realista: {
                name: "Perfil Realista",
                description: "Te atrae trabajar con herramientas, máquinas y objetos",
                characteristics: [
                    "Práctico",
                    "Técnico",
                    "Independiente",
                    "Orientado a resultados",
                ],
                workEnvironments: [
                    "Ingeniería",
                    "Construcción",
                    "Agricultura",
                    "Oficios especializados",
                ],
            },
        };
        return profiles[category] || profiles.social;
    }
    // Obtener recomendaciones de carrera
    getCareerRecommendations(category) {
        const recommendations = {
            social: [
                "Psicología y Terapia",
                "Educación y Docencia",
                "Trabajo Social",
                "Recursos Humanos",
                "Enfermería y Salud",
                "Orientación Vocacional",
            ],
            investigativo: [
                "Ingeniería en sus diversas ramas",
                "Medicina e Investigación Médica",
                "Ciencias de la Computación",
                "Investigación Científica",
                "Análisis de Datos",
                "Arquitectura",
            ],
            artístico: [
                "Diseño Gráfico y Web",
                "Arquitectura y Diseño de Interiores",
                "Comunicación Social y Periodismo",
                "Artes Visuales y Escénicas",
                "Marketing Creativo",
                "Producción Audiovisual",
            ],
            emprendedor: [
                "Administración de Empresas",
                "Marketing y Ventas",
                "Finanzas y Banca",
                "Derecho Empresarial",
                "Comercio Internacional",
                "Consultoría",
            ],
            convencional: [
                "Contabilidad y Auditoría",
                "Administración Pública",
                "Gestión de Operaciones",
                "Sistemas de Información",
                "Logística y Cadena de Suministro",
                "Finanzas",
            ],
            realista: [
                "Ingeniería Mecánica y Civil",
                "Arquitectura",
                "Agricultura y Veterinaria",
                "Tecnología Industrial",
                "Oficios Especializados",
                "Ciencias Ambientales",
            ],
        };
        return recommendations[category] || recommendations.social;
    }
    // Método para asegurar respuesta completa
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
    // Validación para orientación vocacional
    validateVocationalRequest(vocationalData, userMessage) {
        if (!vocationalData) {
            const error = new Error("Datos del consejero vocacional requeridos");
            error.statusCode = 400;
            error.code = "MISSING_VOCATIONAL_DATA";
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
    // Manejo de errores
    handleError(error, res) {
        var _a, _b, _c;
        console.error("Error en VocationalController:", error);
        let statusCode = 500;
        let errorMessage = "Error interno del servidor";
        let errorCode = "INTERNAL_ERROR";
        if (error.statusCode) {
            statusCode = error.statusCode;
            errorMessage = error.message;
            errorCode = error.code || "CLIENT_ERROR";
        }
        else if (((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes("quota")) ||
            ((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes("limit"))) {
            statusCode = 429;
            errorMessage =
                "Se ha alcanzado el límite de consultas. Por favor, espera un momento.";
            errorCode = "QUOTA_EXCEEDED";
        }
        else if ((_c = error.message) === null || _c === void 0 ? void 0 : _c.includes("API key")) {
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
exports.VocationalController = VocationalController;
