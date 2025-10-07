import { Request, Response } from "express";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

// Interfaces
interface VocationalData {
  name: string;
  specialty: string;
  experience: string;
}

interface VocationalRequest {
  vocationalData: VocationalData;
  userMessage: string;
  personalInfo?: {
    age?: number;
    currentEducation?: string;
    workExperience?: string;
    interests?: string[];
  };
  assessmentAnswers?: Array<{
    question: string;
    answer: string;
    category: string;
  }>;
  conversationHistory?: Array<{
    role: "user" | "counselor";
    message: string;
  }>;
}

interface VocationalResponse {
  success: boolean;
  response?: string;
  error?: string;
  code?: string;
  timestamp?: string;
}

interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export class VocationalController {
  private genAI: GoogleGenerativeAI;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        "GEMINI_API_KEY no está configurada en las variables de entorno"
      );
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  // Método principal para chat con consejero vocacional
  public chatWithCounselor = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { vocationalData, userMessage }: VocationalRequest = req.body;

      // Validar entrada
      this.validateVocationalRequest(vocationalData, userMessage);

      // ✅ CONFIGURACIÓN OPTIMIZADA PARA RESPUESTAS COMPLETAS Y CONSISTENTES
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp", // ✅ Modelo más reciente y estable
        generationConfig: {
          temperature: 0.85, // ✅ Reducido de 1.5 para mayor consistencia
          topK: 50, // ✅ Mayor diversidad controlada
          topP: 0.92, // ✅ Aumentado de 0.5 para mejor fluidez
          maxOutputTokens: 512, // ✅ Aumentado de 400 para respuestas completas
          candidateCount: 1, // ✅ Solo una respuesta
          stopSequences: [], // ✅ Sin secuencias de parada
        },
        // ✅ CONFIGURACIONES DE SEGURIDAD PERMISIVAS PARA ORIENTACIÓN VOCACIONAL
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
          },
        ],
      });

      const contextPrompt = this.createVocationalContext(
        req.body.conversationHistory
      );

      // ✅ PROMPT MEJORADO CON INSTRUCCIONES MÁS FUERTES
      const fullPrompt = `${contextPrompt}

⚠️ INSTRUCCIONES CRÍTICAS OBLIGATORIAS:
1. DEBES generar una respuesta COMPLETA de entre 150-350 palabras
2. NUNCA dejes una respuesta a medias o incompleta
3. Si mencionas que vas a sugerir carreras u opciones, DEBES completarlo
4. Toda respuesta DEBE terminar con una conclusión clara y un punto final
5. Si detectas que tu respuesta se está cortando, finaliza la idea actual con coherencia
6. SIEMPRE mantén el tono profesional y empático
7. Si el mensaje tiene errores ortográficos, interpreta la intención y responde normalmente

Usuario: "${userMessage}"

Respuesta del consejero vocacional (asegúrate de completar TODA tu orientación antes de terminar):`;

      console.log(`Generando orientación vocacional...`);

      // ✅ REINTENTOS AUTOMÁTICOS EN CASO DE RESPUESTA VACÍA
      let attempts = 0;
      const maxAttempts = 3;
      let text = "";

      while (attempts < maxAttempts) {
        try {
          const result = await model.generateContent(fullPrompt);
          const response = result.response;
          text = response.text();

          // ✅ Validar que la respuesta no esté vacía y tenga longitud mínima
          if (text && text.trim().length >= 100) {
            break; // Respuesta válida, salir del loop
          }

          attempts++;
          console.warn(
            `Intento ${attempts}: Respuesta vacía o muy corta, reintentando...`
          );

          if (attempts >= maxAttempts) {
            throw new Error(
              "No se pudo generar una respuesta válida después de varios intentos"
            );
          }

          // Esperar un poco antes de reintentar
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (innerError: any) {
          attempts++;

          // Si es error 503 (overloaded) y no es el último intento
          if (innerError.status === 503 && attempts < maxAttempts) {
            const delay = Math.pow(2, attempts) * 1000; // Delay exponencial
            console.warn(
              `Error 503 - Servicio sobrecargado. Esperando ${delay}ms...`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          if (attempts >= maxAttempts) {
            throw innerError;
          }

          console.warn(`Intento ${attempts} falló:`, innerError.message);
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      if (!text || text.trim() === "") {
        throw new Error(
          "Respuesta vacía de Gemini después de múltiples intentos"
        );
      }

      // ✅ ASEGURAR RESPUESTA COMPLETA Y BIEN FORMATEADA
      text = this.ensureCompleteResponse(text);

      // ✅ Validación adicional de longitud mínima
      if (text.trim().length < 80) {
        throw new Error("Respuesta generada demasiado corta");
      }

      const vocationalResponse: VocationalResponse = {
        success: true,
        response: text.trim(),
        timestamp: new Date().toISOString(),
      };

      console.log(
        `Orientación vocacional generada exitosamente (${text.length} caracteres)`
      );
      res.json(vocationalResponse);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // ✅ MÉTODO MEJORADO PARA ASEGURAR RESPUESTAS COMPLETAS
  private ensureCompleteResponse(text: string): string {
    let processedText = text.trim();

    // Remover posibles marcadores de código o formato incompleto
    processedText = processedText.replace(/```[\s\S]*?```/g, "").trim();

    const lastChar = processedText.slice(-1);
    const endsIncomplete = !["!", "?", ".", "…", "💼", "🎓", "✨"].includes(
      lastChar
    );

    if (endsIncomplete && !processedText.endsWith("...")) {
      // Buscar la última oración completa
      const sentences = processedText.split(/([.!?])/);

      if (sentences.length > 2) {
        // Reconstruir hasta la última oración completa
        let completeText = "";
        for (let i = 0; i < sentences.length - 1; i += 2) {
          if (sentences[i].trim()) {
            completeText += sentences[i] + (sentences[i + 1] || ".");
          }
        }

        if (completeText.trim().length > 80) {
          return completeText.trim();
        }
      }

      // Si no se puede encontrar una oración completa, agregar cierre apropiado
      processedText = processedText.trim() + "...";
    }

    return processedText;
  }

  // Método para crear contexto vocacional
  private createVocationalContext(
    history?: Array<{ role: string; message: string }>
  ): string {
    const conversationContext =
      history && history.length > 0
        ? `\n\nCONVERSACIÓN PREVIA:\n${history
            .map((h) => `${h.role === "user" ? "Usuario" : "Tú"}: ${h.message}`)
            .join("\n")}\n`
        : "";

    return `Eres Dra. Valeria, un consejero vocacional experto con décadas de experiencia ayudando a personas a descubrir su verdadera vocación y propósito profesional. Combinas psicología vocacional, análisis de personalidad y conocimiento del mercado laboral.

TU IDENTIDAD PROFESIONAL:
- Nombre: Dra. Valeria, Consejera Vocacional Especialista
- Formación: Doctorado en Psicología Vocacional y Orientación Profesional
- Especialidad: Mapas vocacionales, assessment de intereses, orientación profesional personalizada
- Experiencia: Décadas guiando personas hacia carreras fulfillantes

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
- Respuestas de 150-350 palabras que fluyan naturalmente y SEAN COMPLETAS

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
"Saludos, explorador vocacional. Soy Dra. Valeria, y estoy aquí para ayudarte a descubrir tu verdadero camino profesional. Cada persona tiene un conjunto único de talentos, intereses y valores que, al alinearse correctamente, pueden llevar a una carrera extraordinariamente satisfactoria..."

${conversationContext}

Recuerda: Eres un guía experto que ayuda a las personas a descubrir su vocación auténtica a través de un proceso reflexivo, práctico y basado en evidencia. Tu objetivo es empoderar, no decidir por ellos. SIEMPRE completa tus orientaciones y sugerencias.`;
  }

  // Validación para orientación vocacional
  private validateVocationalRequest(
    vocationalData: VocationalData,
    userMessage: string
  ): void {
    if (!vocationalData) {
      const error: ApiError = new Error(
        "Datos del consejero vocacional requeridos"
      );
      error.statusCode = 400;
      error.code = "MISSING_VOCATIONAL_DATA";
      throw error;
    }

    if (
      !userMessage ||
      typeof userMessage !== "string" ||
      userMessage.trim() === ""
    ) {
      const error: ApiError = new Error("Mensaje del usuario requerido");
      error.statusCode = 400;
      error.code = "MISSING_USER_MESSAGE";
      throw error;
    }

    if (userMessage.length > 1500) {
      const error: ApiError = new Error(
        "El mensaje es demasiado largo (máximo 1500 caracteres)"
      );
      error.statusCode = 400;
      error.code = "MESSAGE_TOO_LONG";
      throw error;
    }
  }

  // Manejo de errores
  private handleError(error: any, res: Response): void {
    console.error("Error en VocationalController:", error);

    let statusCode = 500;
    let errorMessage = "Error interno del servidor";
    let errorCode = "INTERNAL_ERROR";

    if (error.statusCode) {
      statusCode = error.statusCode;
      errorMessage = error.message;
      errorCode = error.code || "CLIENT_ERROR";
    } else if (error.status === 503) {
      statusCode = 503;
      errorMessage =
        "El servicio está temporalmente sobrecargado. Por favor, intenta de nuevo en unos minutos.";
      errorCode = "SERVICE_OVERLOADED";
    } else if (
      error.message?.includes("quota") ||
      error.message?.includes("limit")
    ) {
      statusCode = 429;
      errorMessage =
        "Se ha alcanzado el límite de consultas. Por favor, espera un momento.";
      errorCode = "QUOTA_EXCEEDED";
    } else if (error.message?.includes("safety")) {
      statusCode = 400;
      errorMessage = "El contenido no cumple con las políticas de seguridad.";
      errorCode = "SAFETY_FILTER";
    } else if (error.message?.includes("API key")) {
      statusCode = 401;
      errorMessage = "Error de autenticación con el servicio de IA.";
      errorCode = "AUTH_ERROR";
    }

    const errorResponse: VocationalResponse = {
      success: false,
      error: errorMessage,
      code: errorCode,
      timestamp: new Date().toISOString(),
    };

    res.status(statusCode).json(errorResponse);
  }

  // Método info para consejero vocacional
  public getVocationalInfo = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      res.json({
        success: true,
        counselor: {
          name: "Dra. Valeria",
          title: "Consejero Vocacional Especialista",
          specialty:
            "Orientación profesional y mapas vocacionales personalizados",
          description:
            "Experto en psicología vocacional con décadas de experiencia ayudando a personas a descubrir su verdadera vocación",
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
    } catch (error) {
      this.handleError(error, res);
    }
  };
}
