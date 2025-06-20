import { Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  ApiError,
  ChatRequest,
  ChatResponse,
  SaintData,
} from "../interfaces/helpers";
interface DreamInterpreterData {
  name: string;
  specialty: string;
  experience: string;
}

interface DreamChatRequest {
  interpreterData: DreamInterpreterData;
  userMessage: string;
  conversationHistory?: Array<{
    role: 'user' | 'interpreter';
    message: string;
  }>;
}


export class ChatController {
  private genAI: GoogleGenerativeAI;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        "GEMINI_API_KEY no está configurada en las variables de entorno"
      );
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  public chatWithDreamInterpreter = async (req: Request, res: Response): Promise<void> => {
    try {
      const { interpreterData, userMessage, conversationHistory }: DreamChatRequest = req.body;

      // Validar entrada
      this.validateDreamChatRequest(interpreterData, userMessage);

      // Obtener el modelo Gemini
      const model = this.genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.9, // Más creatividad para interpretaciones místicas
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 300,
        },
      });

      // Crear el prompt contextualizado
      const contextPrompt = this.createDreamInterpreterContext(interpreterData, conversationHistory);
      const fullPrompt = `${contextPrompt}\n\nUsuario: "${userMessage}"\n\nRespuesta del intérprete (completa tu respuesta):`;

      console.log(`Generando interpretación de sueños...`);

      // Generar contenido con Gemini
      const result = await model.generateContent(fullPrompt);
      const response = result.response;
      let text = response.text();

      if (!text || text.trim() === "") {
        throw new Error("Respuesta vacía de Gemini");
      }

      // Verificar si la respuesta parece estar cortada
      text = this.ensureCompleteResponse(text);

      // Respuesta exitosa
      const chatResponse: ChatResponse = {
        success: true,
        response: text.trim(),
        timestamp: new Date().toISOString(),
      };

      console.log(`Interpretación generada exitosamente`);
      res.json(chatResponse);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  // Método para crear el contexto del intérprete de sueños
  private createDreamInterpreterContext(interpreter: DreamInterpreterData, history?: Array<{role: string, message: string}>): string {
    const conversationContext = history && history.length > 0 
      ? `\n\nCONVERSACIÓN PREVIA:\n${history.map(h => `${h.role === 'user' ? 'Usuario' : 'Tú'}: ${h.message}`).join('\n')}\n`
      : '';

    return `Eres Maestra Oneiros, una bruja mística y vidente ancestral especializada en la interpretación de sueños. Tienes siglos de experiencia desentrañando los misterios del mundo onírico y conectando los sueños con la realidad espiritual.

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

EJEMPLO DE CÓMO EMPEZAR:
"Ah, veo que has venido a mí buscando desentrañar los misterios de tu mundo onírico... Los sueños son ventanas al alma y mensajes de planos superiores. Cuéntame, ¿qué visiones te han visitado en el reino de Morfeo?"

${conversationContext}

Recuerda: Eres un guía místico pero comprensible, que ayuda a las personas a entender los mensajes ocultos de sus sueños. Siempre completa tus interpretaciones y reflexiones.`;
  }

  // Método para asegurar que la respuesta esté completa
  private ensureCompleteResponse(text: string): string {
    const lastChar = text.trim().slice(-1);
    const endsIncomplete = !['!', '?', '.', '…'].includes(lastChar);
    
    if (endsIncomplete && !text.trim().endsWith('...')) {
      const sentences = text.split(/[.!?]/);
      if (sentences.length > 1) {
        const completeSentences = sentences.slice(0, -1);
        return completeSentences.join('.') + '.';
      } else {
        return text.trim() + '...';
      }
    }
    
    return text;
  }

  // Validación de la solicitud para intérprete de sueños
  private validateDreamChatRequest(interpreterData: DreamInterpreterData, userMessage: string): void {
    if (!interpreterData) {
      const error: ApiError = new Error("Datos del intérprete requeridos");
      error.statusCode = 400;
      error.code = "MISSING_INTERPRETER_DATA";
      throw error;
    }

    if (!userMessage || typeof userMessage !== "string" || userMessage.trim() === "") {
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
    private handleError(error: any, res: Response): void {
    console.error("Error en ChatController:", error);

    let statusCode = 500;
    let errorMessage = "Error interno del servidor";
    let errorCode = "INTERNAL_ERROR";

    if (error.statusCode) {
      statusCode = error.statusCode;
      errorMessage = error.message;
      errorCode = error.code || "VALIDATION_ERROR";
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

    const errorResponse: ChatResponse = {
      success: false,
      error: errorMessage,
      code: errorCode,
      timestamp: new Date().toISOString(),
    };

    res.status(statusCode).json(errorResponse);
  }
public getDreamInterpreterInfo = async (req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        interpreter: {
          name: "Maestra Alma",
          title: "Guardián de los Sueños",
          specialty: "Interpretación de sueños y simbolismo onírico",
          description: "Vidente ancestral especializado en desentrañar los misterios del mundo onírico"
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };
}