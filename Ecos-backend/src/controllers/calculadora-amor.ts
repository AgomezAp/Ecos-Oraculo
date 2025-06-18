import { Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ApiError, ChatResponse } from "../interfaces/helpers";

interface LoveCalculatorData {
  name: string;
  specialty: string;
  experience: string;
}

interface LoveCalculatorRequest {
  loveCalculatorData: LoveCalculatorData;
  userMessage: string;
  person1Name?: string;
  person1BirthDate?: string;
  person2Name?: string;
  person2BirthDate?: string;
  conversationHistory?: Array<{
    role: "user" | "love_expert";
    message: string;
  }>;
}

export class LoveCalculatorController {
  private genAI: GoogleGenerativeAI;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        "GEMINI_API_KEY no está configurada en las variables de entorno"
      );
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  private generateLoveData(
    person1Name?: string,
    person1BirthDate?: string,
    person2Name?: string,
    person2BirthDate?: string
  ): string {
    let loveInfo = "DATOS DISPONIBLES PARA ANÁLISIS DE COMPATIBILIDAD:\n";

    if (person1Name && person1BirthDate) {
      const person1LifePath = this.calculateLifePath(person1BirthDate);
      const person1Destiny = this.calculateDestinyNumber(person1Name);
      loveInfo += `PERSONA 1:\n`;
      loveInfo += `- Nombre: ${person1Name}\n`;
      loveInfo += `- Fecha de nacimiento: ${person1BirthDate}\n`;
      loveInfo += `- Número del Camino de Vida: ${person1LifePath}\n`;
      loveInfo += `- Número del Destino: ${person1Destiny}\n`;
    }

    if (person2Name && person2BirthDate) {
      const person2LifePath = this.calculateLifePath(person2BirthDate);
      const person2Destiny = this.calculateDestinyNumber(person2Name);
      loveInfo += `PERSONA 2:\n`;
      loveInfo += `- Nombre: ${person2Name}\n`;
      loveInfo += `- Fecha de nacimiento: ${person2BirthDate}\n`;
      loveInfo += `- Número del Camino de Vida: ${person2LifePath}\n`;
      loveInfo += `- Número del Destino: ${person2Destiny}\n`;
    }

    if (person1Name && person1BirthDate && person2Name && person2BirthDate) {
      const compatibilityScore = this.calculateCompatibilityScore(
        person1Name, person1BirthDate, person2Name, person2BirthDate
      );
      loveInfo += `ANÁLISIS DE COMPATIBILIDAD:\n`;
      loveInfo += `- Puntuación de compatibilidad: ${compatibilityScore}%\n`;
    }

    if (!person1Name || !person1BirthDate || !person2Name || !person2BirthDate) {
      loveInfo += "- Datos incompletos (necesarios para análisis completo de compatibilidad)\n";
    }

    return loveInfo;
  }

  private calculateLifePath(dateStr: string): number {
    try {
      const numbers = dateStr.replace(/\D/g, "");
      const sum = numbers
        .split("")
        .reduce((acc, digit) => acc + parseInt(digit), 0);
      return this.reduceToSingleDigit(sum);
    } catch {
      return 0;
    }
  }

  private calculateDestinyNumber(name: string): number {
    const letterValues: { [key: string]: number } = {
      A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, I: 9,
      J: 1, K: 2, L: 3, M: 4, N: 5, O: 6, P: 7, Q: 8, R: 9,
      S: 1, T: 2, U: 3, V: 4, W: 5, X: 6, Y: 7, Z: 8,
    };

    const sum = name
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .split("")
      .reduce((acc, letter) => {
        return acc + (letterValues[letter] || 0);
      }, 0);

    return this.reduceToSingleDigit(sum);
  }

  private calculateCompatibilityScore(
    name1: string, date1: string, name2: string, date2: string
  ): number {
    const lifePath1 = this.calculateLifePath(date1);
    const lifePath2 = this.calculateLifePath(date2);
    const destiny1 = this.calculateDestinyNumber(name1);
    const destiny2 = this.calculateDestinyNumber(name2);

    // Algoritmo de compatibilidad basado en numerología
    let score = 50; // Base

    // Compatibilidad de caminos de vida
    const lifePathDiff = Math.abs(lifePath1 - lifePath2);
    if (lifePathDiff === 0) score += 25;
    else if (lifePathDiff <= 2) score += 15;
    else if (lifePathDiff <= 4) score += 5;

    // Compatibilidad de destinos
    const destinyDiff = Math.abs(destiny1 - destiny2);
    if (destinyDiff === 0) score += 25;
    else if (destinyDiff <= 2) score += 15;
    else if (destinyDiff <= 4) score += 5;

    // Números complementarios especiales
    if ((lifePath1 + lifePath2) % 9 === 0) score += 10;
    if ((destiny1 + destiny2) % 11 === 0) score += 10;

    return Math.min(100, Math.max(0, score));
  }

  private reduceToSingleDigit(num: number): number {
    while (num > 9 && num !== 11 && num !== 22 && num !== 33) {
      num = num
        .toString()
        .split("")
        .reduce((acc, digit) => acc + parseInt(digit), 0);
    }
    return num;
  }

  private validateLoveCalculatorRequest(
    loveCalculatorData: LoveCalculatorData,
    userMessage: string
  ): void {
    if (!loveCalculatorData) {
      const error: ApiError = new Error("Datos del experto en amor requeridos");
      error.statusCode = 400;
      error.code = "MISSING_LOVE_CALCULATOR_DATA";
      throw error;
    }

    if (!userMessage || typeof userMessage !== "string" || userMessage.trim() === "") {
      const error: ApiError = new Error("Mensaje del usuario requerido");
      error.statusCode = 400;
      error.code = "MISSING_USER_MESSAGE";
      throw error;
    }

    if (userMessage.length > 1200) {
      const error: ApiError = new Error(
        "El mensaje es demasiado largo (máximo 1200 caracteres)"
      );
      error.statusCode = 400;
      error.code = "MESSAGE_TOO_LONG";
      throw error;
    }
  }

  private createLoveCalculatorContext(
    loveCalculator: LoveCalculatorData,
    person1Name?: string,
    person1BirthDate?: string,
    person2Name?: string,
    person2BirthDate?: string,
    history?: Array<{ role: string; message: string }>
  ): string {
    const conversationContext =
      history && history.length > 0
        ? `\n\nCONVERSACIÓN PREVIA:\n${history
            .map((h) => `${h.role === "user" ? "Usuario" : "Tú"}: ${h.message}`)
            .join("\n")}\n`
        : "";

    const loveData = this.generateLoveData(person1Name, person1BirthDate, person2Name, person2BirthDate);

    return `Eres Maestra Valentina, una experta en compatibilidad amorosa y relaciones basada en numerología del amor. Tienes décadas de experiencia ayudando a las personas a entender la química y compatibilidad en sus relaciones a través de los números sagrados del amor.

TU IDENTIDAD COMO EXPERTA EN AMOR:
- Nombre: Maestra Valentina, la Guardiana del Amor Eterno
- Origen: Especialista en numerología del amor y relaciones cósmicas
- Especialidad: Compatibilidad numerológica, análisis de pareja, química amorosa
- Experiencia: Décadas analizando la compatibilidad a través de los números del amor

${loveData}

CÓMO DEBES COMPORTARTE:

💕 PERSONALIDAD ROMÁNTICA:
- Habla con sabiduría amorosa pero de forma NATURAL y conversacional
- Usa un tono cálido, empático y romántico, como una amiga que entiende del amor
- Evita saludos formales - usa saludos naturales como "¡Hola!", "¡Qué emocionante!", "Me encanta hablar de amor"
- Varía tus saludos y respuestas para que cada consulta se sienta única
- Mezcla cálculos numerológicos con interpretaciones románticas manteniendo cercanía
- MUESTRA GENUINO INTERÉS PERSONAL en las relaciones de las personas

💖 PROCESO DE ANÁLISIS DE COMPATIBILIDAD:
- PRIMERO: Si no tienes datos completos, pregunta por ellos con entusiasmo romántico
- SEGUNDO: Calcula números relevantes de ambas personas (camino de vida, destino)
- TERCERO: Analiza compatibilidad numerológica de forma conversacional
- CUARTO: Calcula puntuación de compatibilidad y explica su significado
- QUINTO: Ofrece consejos para fortalecer la relación basados en los números

🔢 NÚMEROS QUE DEBES ANALIZAR:
- Número del Camino de Vida de cada persona
- Número del Destino de cada persona
- Compatibilidad entre números de vida
- Compatibilidad entre números de destino
- Puntuación total de compatibilidad (0-100%)
- Fortalezas y desafíos de la pareja

📊 CÁLCULOS DE COMPATIBILIDAD:
- Usa el sistema pitagórico para nombres
- Suma fechas de nacimiento para caminos de vida
- Compara diferencias entre números para evaluar compatibilidad
- Explica cómo los números interactúan en la relación
- SIEMPRE COMPLETA todos los cálculos que inicies
- Proporciona puntuación específica de compatibilidad

💝 INTERPRETACIÓN ROMÁNTICA:
- Explica el significado de la compatibilidad como si hablaras con una amiga
- Conecta los números con dinámicas de pareja usando ejemplos reales
- Menciona fortalezas, áreas de crecimiento y oportunidades de forma alentadora
- Incluye consejos prácticos para mejorar la relación

🌹 ESTILO DE RESPUESTA NATURAL:
- Usa expresiones como: "¡Qué hermosa conexión veo aquí!", "Los números del amor me dicen...", "Esto es súper interesante..."
- Evita repetir las mismas frases - sé creativa y espontánea
- Mantén equilibrio entre romántico y conversacional
- Respuestas de 2-600 palabras que fluyan naturalmente y SEAN COMPLETAS
- SIEMPRE completa cálculos e interpretaciones de compatibilidad

🗣️ VARIACIONES EN SALUDOS Y EXPRESIONES:
- Saludos SOLO EN PRIMER CONTACTO: "¡Hola!", "¡Qué emocionante hablar de amor!", "Me encanta ayudar con temas del corazón"
- Transiciones: "Veamos qué dicen los números del amor...", "¡Esto es fascinante!", "Los números revelan algo hermoso..."
- Respuestas: "¡Qué linda pareja!", "Me encanta esta consulta...", "¡Qué energía tan especial!"
- Para pedir datos CON ENTUSIASMO: "Para hacer el análisis de compatibilidad perfecto, necesito conocer a ambos. ¿Me das sus nombres completos y fechas de nacimiento?"

⚠️ REGLAS IMPORTANTES:
- NUNCA uses saludos demasiado formales
- VARÍA tu forma de expresarte en cada respuesta
- NO REPITAS CONSTANTEMENTE los nombres - úsalos naturalmente
- SOLO SALUDA EN EL PRIMER CONTACTO
- SIEMPRE pregunta por datos completos de ambas personas si faltan
- SÉ empática y usa lenguaje que cualquier persona entienda
- Enfócate en orientación positiva para la relación
- DEMUESTRA CURIOSIDAD por la historia de amor de la pareja

📋 RECOLECCIÓN DE DATOS NECESARIOS:
- Nombre completo de persona 1
- Fecha de nacimiento de persona 1  
- Nombre completo de persona 2
- Fecha de nacimiento de persona 2
- Si faltan datos: "Para hacer un análisis de compatibilidad completo, necesito los nombres completos y fechas de nacimiento de ambos. ¿Me los puedes compartir?"

🎯 PROCESO DE ANÁLISIS COMPLETO:
1. Verificar que tienes todos los datos necesarios
2. Calcular números de ambas personas con entusiasmo
3. Analizar compatibilidad paso a paso
4. Dar puntuación específica de compatibilidad
5. Explicar fortalezas y áreas de crecimiento
6. Ofrecer consejos prácticos para la relación

💫 EJEMPLOS DE COMPATIBILIDAD:
- 80-100%: "¡Conexión extraordinaria!"
- 60-79%: "¡Muy buena compatibilidad!"
- 40-59%: "Compatibilidad promedio con gran potencial"
- 20-39%: "Desafíos que pueden superarse con amor"
- 0-19%: "Necesitan trabajar mucho en entenderse"

${conversationContext}

Recuerda: Eres una experta en amor que combina numerología con consejos románticos prácticos. Habla como una amiga cálida que realmente se interesa por las relaciones de las personas. SIEMPRE necesitas datos completos de ambas personas para hacer un análisis significativo. Las respuestas deben ser cálidas, optimistas y enfocadas en fortalecer el amor.`;
  }

  private ensureCompleteResponse(text: string): string {
    const lastChar = text.trim().slice(-1);
    const endsIncomplete = !["!", "?", ".", "…"].includes(lastChar);

    if (endsIncomplete && !text.trim().endsWith("...")) {
      const sentences = text.split(/[.!?]/);
      if (sentences.length > 1) {
        const completeSentences = sentences.slice(0, -1);
        return completeSentences.join(".") + ".";
      } else {
        return text.trim() + "...";
      }
    }

    return text;
  }

  public chatWithLoveExpert = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        loveCalculatorData,
        userMessage,
        person1Name,
        person1BirthDate,
        person2Name,
        person2BirthDate,
        conversationHistory,
      }: LoveCalculatorRequest = req.body;

      this.validateLoveCalculatorRequest(loveCalculatorData, userMessage);

      const model = this.genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: {
          temperature: 0.9,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 800,
        },
      });

      const contextPrompt = this.createLoveCalculatorContext(
        loveCalculatorData,
        person1Name,
        person1BirthDate,
        person2Name,
        person2BirthDate,
        conversationHistory
      );
      const fullPrompt = `${contextPrompt}\n\nUsuario: "${userMessage}"\n\nRespuesta del experto en amor (completa tu análisis):`;

      console.log(`Generando análisis de compatibilidad amorosa...`);

      const result = await model.generateContent(fullPrompt);
      const response = result.response;
      let text = response.text();

      if (!text || text.trim() === "") {
        throw new Error("Respuesta vacía de Gemini");
      }

      text = this.ensureCompleteResponse(text);

      const chatResponse: ChatResponse = {
        success: true,
        response: text.trim(),
        timestamp: new Date().toISOString(),
      };

      console.log(`Análisis de compatibilidad generado exitosamente`);
      res.json(chatResponse);
    } catch (error) {
      this.handleError(error, res);
    }
  };

  private handleError(error: any, res: Response): void {
    console.error("Error en LoveCalculatorController:", error);

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
      errorMessage = "Se ha alcanzado el límite de consultas. Por favor, espera un momento.";
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

  public getLoveCalculatorInfo = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      res.json({
        success: true,
        loveExpert: {
          name: "Maestra Valentina",
          title: "Guardiana del Amor Eterno",
          specialty: "Compatibilidad numerológica y análisis de relaciones",
          description: "Experta en numerología del amor especializada en analizar la compatibilidad entre parejas",
          services: [
            "Análisis de Compatibilidad Numerológica",
            "Cálculo de Números del Amor",
            "Evaluación de Química de Pareja",
            "Consejos para Fortalecer Relaciones",
          ],
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.handleError(error, res);
    }
  };
}