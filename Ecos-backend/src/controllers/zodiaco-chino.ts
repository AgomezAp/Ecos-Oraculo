import { Request, Response } from "express";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { ApiError, ChatResponse } from "../interfaces/helpers";

interface HoroscopeData {
  name: string;
  specialty: string;
  experience: string;
}

interface HoroscopeRequest {
  zodiacData: HoroscopeData;
  userMessage: string;
  birthYear?: string;
  birthDate?: string;
  fullName?: string;
  conversationHistory?: Array<{
    role: "user" | "master";
    message: string;
  }>;
}

export class ChineseZodiacController {
  private genAI: GoogleGenerativeAI;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        "GEMINI_API_KEY no está configurada en las variables de entorno"
      );
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  public chatWithMaster = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const {
        zodiacData,
        userMessage,
        birthYear,
        birthDate,
        fullName,
        conversationHistory,
      }: HoroscopeRequest = req.body;

      // Validar entrada
      this.validateHoroscopeRequest(zodiacData, userMessage);

      // ✅ CONFIGURACIÓN OPTIMIZADA - CONSISTENTE CON OTROS CONTROLADORES
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp",
        generationConfig: {
          temperature: 0.85,        // ✅ Reducido de 1.2 para mayor consistencia
          topK: 50,                 // ✅ Mayor diversidad controlada
          topP: 0.92,               // ✅ Reducido de 1 para mejor control
          maxOutputTokens: 600,     // ✅ Mantenido para interpretaciones completas
          candidateCount: 1,
          stopSequences: [],
        },
        // ✅ CONFIGURACIONES DE SEGURIDAD PERMISIVAS
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

      const contextPrompt = this.createHoroscopeContext(
        zodiacData,
        birthYear,
        birthDate,
        fullName,
        conversationHistory
      );

      // ✅ PROMPT MEJORADO CON INSTRUCCIONES CLARAS
      const fullPrompt = `${contextPrompt}

⚠️ INSTRUCCIONES CRÍTICAS OBLIGATORIAS:
1. DEBES generar una respuesta COMPLETA de entre 200-550 palabras
2. NUNCA dejes una respuesta a medias o incompleta
3. Si mencionas características del signo, DEBES completar la descripción
4. Toda respuesta DEBE terminar con una conclusión clara y un punto final
5. Si detectas que tu respuesta se está cortando, finaliza la idea actual con coherencia
6. SIEMPRE mantén el tono astrológico amigable y místico
7. Si el mensaje tiene errores ortográficos, interpreta la intención y responde normalmente

Usuario: "${userMessage}"

Respuesta de la astróloga (asegúrate de completar TODO tu análisis horoscópico antes de terminar):`;

      console.log(`Generando consulta de horóscopo occidental...`);

      // ✅ SISTEMA DE REINTENTOS ROBUSTO - ELIMINA "Respuesta vacía de Gemini"
      let attempts = 0;
      const maxAttempts = 3;
      let text = "";

      while (attempts < maxAttempts) {
        try {
          const result = await model.generateContent(fullPrompt);
          const response = result.response;
          text = response.text();

          // ✅ Validar que la respuesta no esté vacía y tenga longitud mínima
          if (text && text.trim().length >= 150) {
            break; // ✅ Respuesta válida, salir del loop
          }

          attempts++;
          console.warn(
            `⚠️ Intento ${attempts}: Respuesta vacía o muy corta (${text?.length || 0} caracteres), reintentando...`
          );

          if (attempts >= maxAttempts) {
            throw new Error(
              "No se pudo generar una respuesta válida después de varios intentos"
            );
          }

          // Esperar antes de reintentar
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (innerError: any) {
          attempts++;
          
          // ✅ Si es error 503 (overloaded) y no es el último intento
          if (innerError.status === 503 && attempts < maxAttempts) {
            const delay = Math.pow(2, attempts) * 1000; // Delay exponencial
            console.warn(
              `⚠️ Error 503 - Servicio sobrecargado. Esperando ${delay}ms antes del intento ${attempts + 1}...`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          if (attempts >= maxAttempts) {
            throw innerError;
          }
          
          console.warn(`⚠️ Intento ${attempts} falló:`, innerError.message);
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      // ✅ VALIDACIÓN FINAL - SI DESPUÉS DE TODOS LOS INTENTOS SIGUE VACÍO
      if (!text || text.trim() === "") {
        throw new Error(
          "Respuesta vacía de Gemini después de múltiples intentos"
        );
      }

      // ✅ ASEGURAR RESPUESTA COMPLETA Y BIEN FORMATEADA
      text = this.ensureCompleteResponse(text);

      // ✅ Validación adicional de longitud mínima
      if (text.trim().length < 100) {
        throw new Error("Respuesta generada demasiado corta");
      }

      const chatResponse: ChatResponse = {
        success: true,
        response: text.trim(),
        timestamp: new Date().toISOString(),
      };

      console.log(
        `✅ Consulta de horóscopo generada exitosamente (${text.length} caracteres)`
      );
      res.json(chatResponse);
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
    const endsIncomplete = !["!", "?", ".", "…", "✨", "🌟", "♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"].includes(
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

        if (completeText.trim().length > 100) {
          return completeText.trim();
        }
      }

      // Si no se puede encontrar una oración completa, agregar cierre apropiado
      processedText = processedText.trim() + "...";
    }

    return processedText;
  }

  private createHoroscopeContext(
    zodiacData: HoroscopeData,
    birthYear?: string,
    birthDate?: string,
    fullName?: string,
    history?: Array<{ role: string; message: string }>
  ): string {
    const conversationContext =
      history && history.length > 0
        ? `\n\nCONVERSACIÓN PREVIA:\n${history
            .map((h) => `${h.role === "user" ? "Usuario" : "Tú"}: ${h.message}`)
            .join("\n")}\n`
        : "";

    const horoscopeDataSection = this.generateHoroscopeDataSection(
      birthYear,
      birthDate,
      fullName
    );

    return `Eres la Astróloga Luna, una sabia intérprete de los astros y guía celestial de los signos zodiacales. Tienes décadas de experiencia interpretando las influencias planetarias y las configuraciones estelares que moldean nuestro destino.

TU IDENTIDAD CELESTIAL:
- Nombre: Astróloga Luna, la Guía Celestial de los Signos
- Origen: Estudiosa de las tradiciones astrológicas milenarias
- Especialidad: Astrología occidental, interpretación de cartas natales, influencias planetarias
- Experiencia: Décadas estudiando los patrones celestiales y las influencias de los doce signos zodiacales

🌍 ADAPTACIÓN DE IDIOMA:
- DETECTA automáticamente el idioma en el que el usuario te escribe
- RESPONDE siempre en el mismo idioma que el usuario utiliza
- MANTÉN tu personalidad astrológica en cualquier idioma
- Idiomas principales: Español, Inglés, Portugués, Francés, Italiano
- Si detectas otro idioma, haz tu mejor esfuerzo por responder en ese idioma
- NUNCA cambies de idioma a menos que el usuario lo haga primero

📝 EJEMPLOS DE ADAPTACIÓN POR IDIOMA:

ESPAÑOL:
- "Tu signo me revela..."
- "Las estrellas sugieren..."
- "Los planetas indican..."

ENGLISH:
- "Your sign reveals to me..."
- "The stars suggest..."
- "The planets indicate..."

PORTUGUÊS:
- "Seu signo me revela..."
- "As estrelas sugerem..."
- "Os planetas indicam..."

FRANÇAIS:
- "Ton signe me révèle..."
- "Les étoiles suggèrent..."
- "Les planètes indiquent..."

ITALIANO:
- "Il tuo segno mi rivela..."
- "Le stelle suggeriscono..."
- "I pianeti indicano..."

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
- NUNCA dejes características del signo a medias

🗣️ VARIACIONES EN SALUDOS Y EXPRESIONES CELESTIALES:
- Saludos SOLO EN PRIMER CONTACTO: "¡Saludos estelares!", "¡Qué honor conectar contigo!", "Me da mucha alegría hablar contigo", "¡Perfecto momento cósmico para conectar!"
- Transiciones para respuestas continuas: "Déjame consultar las estrellas...", "Esto es fascinante...", "Veo que tu signo..."
- Respuestas a preguntas: "¡Excelente pregunta cósmica!", "Me encanta que preguntes eso...", "Eso es muy interesante astrológicamente..."
- Para pedir datos CON INTERÉS GENUINO: "Me encantaría conocerte mejor, ¿cuál es tu fecha de nacimiento?", "Para descubrir tu signo celestial, necesito saber cuándo naciste", "¿Cuál es tu fecha de nacimiento? Cada signo tiene enseñanzas únicas"

EJEMPLOS DE CÓMO EMPEZAR SEGÚN EL IDIOMA:

ESPAÑOL:
"¡Saludos estelares! Me da mucha alegría conectar contigo. Para descubrir tu signo celestial y revelarte la sabiduría de los astros, necesito conocer tu fecha de nacimiento. ¿Cuándo celebras tu cumpleaños? Las estrellas tienen mensajes especiales para ti."

ENGLISH:
"Stellar greetings! I'm so happy to connect with you. To discover your celestial sign and reveal the wisdom of the stars, I need to know your birth date. When do you celebrate your birthday? The stars have special messages for you."

PORTUGUÊS:
"Saudações estelares! Fico muito feliz em me conectar com você. Para descobrir seu signo celestial e revelar a sabedoria dos astros, preciso conhecer sua data de nascimento. Quando você comemora seu aniversário? As estrelas têm mensagens especiais para você."

FRANÇAIS:
"Salutations stellaires! Je suis si heureuse de me connecter avec toi. Pour découvrir ton signe céleste et révéler la sagesse des astres, j'ai besoin de connaître ta date de naissance. Quand célèbres-tu ton anniversaire? Les étoiles ont des messages spéciaux pour toi."

ITALIANO:
"Saluti stellari! Sono così felice di connettermi con te. Per scoprire il tuo segno celestiale e rivelare la saggezza degli astri, ho bisogno di conoscere la tua data di nascita. Quando festeggi il tuo compleanno? Le stelle hanno messaggi speciali per te."

⚠️ REGLAS IMPORTANTES ASTROLÓGICAS:
- DETECTA Y RESPONDE en el idioma del usuario automáticamente
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
- MANTÉN tu personalidad astrológica independientemente del idioma

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

Recuerda: Eres una sabia astróloga que muestra GENUINO INTERÉS PERSONAL por cada persona en su idioma nativo. Habla como una amiga sabia que realmente quiere conocer la fecha de nacimiento para poder compartir la sabiduría de los astros. SIEMPRE enfócate en obtener la fecha de nacimiento de forma conversacional y con interés auténtico. Las respuestas deben fluir naturalmente SIN repetir constantemente el nombre de la persona, adaptándote perfectamente al idioma del usuario. Completa SIEMPRE tus interpretaciones horoscópicas - nunca dejes análisis de signos a medias.`;
  }

  private generateHoroscopeDataSection(
    birthYear?: string,
    birthDate?: string,
    fullName?: string
  ): string {
    let dataSection = "DATOS DISPONIBLES PARA CONSULTA HOROSCÓPICA:\n";

    if (fullName) {
      dataSection += `- Nombre: ${fullName}\n`;
    }

    if (birthDate) {
      const zodiacSign = this.calculateWesternZodiacSign(birthDate);
      dataSection += `- Fecha de nacimiento: ${birthDate}\n`;
      dataSection += `- Signo zodiacal calculado: ${zodiacSign}\n`;
    } else if (birthYear) {
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

  private calculateWesternZodiacSign(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      const month = date.getMonth() + 1;
      const day = date.getDate();

      if ((month === 3 && day >= 21) || (month === 4 && day <= 19))
        return "Aries ♈";
      if ((month === 4 && day >= 20) || (month === 5 && day <= 20))
        return "Tauro ♉";
      if ((month === 5 && day >= 21) || (month === 6 && day <= 20))
        return "Géminis ♊";
      if ((month === 6 && day >= 21) || (month === 7 && day <= 22))
        return "Cáncer ♋";
      if ((month === 7 && day >= 23) || (month === 8 && day <= 22))
        return "Leo ♌";
      if ((month === 8 && day >= 23) || (month === 9 && day <= 22))
        return "Virgo ♍";
      if ((month === 9 && day >= 23) || (month === 10 && day <= 22))
        return "Libra ♎";
      if ((month === 10 && day >= 23) || (month === 11 && day <= 21))
        return "Escorpio ♏";
      if ((month === 11 && day >= 22) || (month === 12 && day <= 21))
        return "Sagitario ♐";
      if ((month === 12 && day >= 22) || (month === 1 && day <= 19))
        return "Capricornio ♑";
      if ((month === 1 && day >= 20) || (month === 2 && day <= 18))
        return "Acuario ♒";
      if ((month === 2 && day >= 19) || (month === 3 && day <= 20))
        return "Piscis ♓";

      return "Fecha inválida";
    } catch {
      return "Error en cálculo";
    }
  }

  private validateHoroscopeRequest(
    zodiacData: HoroscopeData,
    userMessage: string
  ): void {
    if (!zodiacData) {
      const error: ApiError = new Error("Datos de la astróloga requeridos");
      error.statusCode = 400;
      error.code = "MISSING_ASTROLOGER_DATA";
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

  private handleError(error: any, res: Response): void {
    console.error("❌ Error en HoroscopeController:", error);

    let statusCode = 500;
    let errorMessage = "Error interno del servidor";
    let errorCode = "INTERNAL_ERROR";

    if (error.statusCode) {
      statusCode = error.statusCode;
      errorMessage = error.message;
      errorCode = error.code || "VALIDATION_ERROR";
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
    } else if (error.message?.includes("Respuesta vacía")) {
      statusCode = 503;
      errorMessage =
        "El servicio no pudo generar una respuesta. Por favor, intenta de nuevo.";
      errorCode = "EMPTY_RESPONSE";
    }

    const errorResponse: ChatResponse = {
      success: false,
      error: errorMessage,
      code: errorCode,
      timestamp: new Date().toISOString(),
    };

    res.status(statusCode).json(errorResponse);
  }

  public getChineseZodiacInfo = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      res.json({
        success: true,
        master: {
          name: "Astróloga Luna",
          title: "Guía Celestial de los Signos",
          specialty: "Astrología occidental y horóscopo personalizado",
          description:
            "Sabia astróloga especializada en interpretar las influencias celestiales y la sabiduría de los doce signos zodiacales",
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
    } catch (error) {
      this.handleError(error, res);
    }
  };
}