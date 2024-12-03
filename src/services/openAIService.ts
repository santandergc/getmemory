import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY
});

const SYSTEM_PROMPT = `Eres Bernardita, una asistente virtual empática de GetMemori, especializada en preservar historias de vida personales y familiares.

      Tu función es guiar al usuario a través de dos etapas principales:
      1. **Onboarding**: Recopilar información inicial básica como su nombre completo, fecha y lugar de nacimiento, y verificar si está listo/a para iniciar el viaje por sus memorias.
      2. **Infancia**: Explorar en detalle la etapa de la infancia del usuario, utilizando un checklist estructurado y el historial de la conversación para profundizar en temas relevantes.

      ### Objetivos principales:
      1. Crear una experiencia cálida y significativa mientras documentas la historia de vida del usuario.
      2. Guiar la conversación de manera natural, proactiva y empática, adaptándote a la información ya compartida.
      3. Usar preguntas específicas y detalladas para enriquecer la narrativa, priorizando temas que el usuario mencione espontáneamente y cubriendo lagunas con el checklist.
      4. Validar las emociones y recuerdos del usuario, mostrando interés genuino.

      ### Pautas para la interacción:
      - Mantén un tono conversacional, cálido y respetuoso en todo momento.
      - Haz preguntas abiertas y detalladas, pero mantén las respuestas claras y concisas.
      - Si el usuario comparte algo emotivo o significativo, responde con empatía y fomenta la profundización en ese tema.
      - Durante el Onboarding, guía al usuario para pasar a la etapa de Infancia de forma natural.
      - En la etapa de Infancia, utiliza el historial y el checklist para hacer preguntas más personalizadas y completas.
      - Asegúrate de construir una narrativa coherente y rica con la información recopilada.

      ### Recuerda:
      - Ya tienes una base de información inicial (nombre, lugar/fecha de nacimiento, etc.), úsala para personalizar tus preguntas.
      - GetMemori busca crear un espacio seguro y cómodo donde las personas puedan compartir sus memorias más valiosas.
      - Sé proactiva y no esperes a que el usuario te pregunte. Guía la conversación de manera intuitiva.

      Tu objetivo final es recopilar información rica y detallada para construir una biografía única y emocionalmente significativa. ¡Haz que el usuario se sienta escuchado y valorado!`;

export const generateAIResponse = async ({ 
  history,
  checklist,
  message 
}: {
  history: any;
  checklist: any;
  message: string;
}) => {  
  const userPrompt = `
        Historial de la conversación hasta ahora:
        ${history}

        Checklist de temas clave:
        ${JSON.stringify(checklist)}

        Mensaje más reciente del usuario:
        "${message}"

        Basándote en esta información, responde de manera interactiva. Profundiza en los detalles mencionados y formula preguntas abiertas que exploren aspectos no cubiertos, asegurándote de mantener un tono cálido y empático.
        IMPORTANTE: No uses la lista de verificación como guía rígida, sino como una referencia para profundizar en los temas clave. Y sobre todo, NO ABRUMES con tanto texto y tanta pregunta.
  `;

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 500
    });

    return completion.choices[0].message.content || 'Lo siento, no pude generar una respuesta.';
  } catch (error) {
    console.error('Error al generar respuesta de IA:', error);
    return 'Lo siento, ha ocurrido un error. ¿Podrías intentar escribir tu mensaje nuevamente?';
  }
}

export const generateInfanciaResponse = async ({
  summary,
  history,
  message,
  completedCounter,
  isCompleted
}: {
  summary: string; // Resumen acumulado de la etapa
  history: string[]; // Últimos 2 mensajes del historial [penúltimo del usuario, último del bot]
  message: string; // Mensaje más reciente del usuario
  completedCounter: number; // Cantidad de temas completados del checklist
  isCompleted: boolean; // Indicador si la etapa ya está completada
}): Promise<string> => {

  let userPrompt = `
          Resumen de la etapa (Infancia):
          ${summary}

          Últimos mensajes de la conversación:
          - Usuario: "${history[0]}" (penúltimo mensaje del usuario)
          - Bot: "${history[1]}" (última respuesta del bot)

          Mensaje más reciente del usuario:
          "${message}"

          Basándote en el resumen de la etapa, los mensajes recientes, y el mensaje más reciente del usuario:
          - Responde de manera cálida y empática.
          - Profundiza en los detalles mencionados en el mensaje reciente del usuario.
          - Si no hay nuevos detalles en el mensaje, utiliza el resumen o el historial para guiar la conversación.
          - Formula una pregunta abierta que invite a compartir más recuerdos, asegurándote de no abrumar con demasiados temas.

          IMPORTANTE:
          - Personaliza la respuesta utilizando información relevante del resumen.
          - No repitas el historial directamente, pero úsalo como contexto.
          - Prioriza un tono cálido, conversacional y curioso.
  `;
  if (completedCounter >= 3 && isCompleted) {
    userPrompt += `
          ----
          EXTRA: (considera esto solo si el usuario ya ha compartido suficiente información sobre su infancia) De todas formas debes seguir el sistema de preguntas del checklist, pero agrega un pequeño mensaje que proponga y le pregunta si quiere que entremos en su etapa de adolescencia. 
          ejemplo: "... es emocionante hablar de tu infancia, me pregunto si quieres que comencemos a explorar tu etapa de adolescencia. ¿Qué te parece? 
          Puedes ser creativo en variar el mensaje, pero siempre respetando el tono cálido y empático.
          `;
  }

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 500,
    });

    return (
      completion.choices[0]?.message?.content ||
      'Lo siento, no pude generar una respuesta adecuada.'
    );
  } catch (error) {
    console.error('Error al generar respuesta de IA:', error);
    return 'Lo siento, ocurrió un error al procesar tu mensaje. Por favor, intenta de nuevo.';
  }
};



interface ValidationResult {
  summary: string; // Resumen generado por el LLM
  validators: {
    family: boolean; // Indicador si se habló lo suficiente sobre la familia
    friends: boolean; // Indicador si se habló lo suficiente sobre los amigos
    school: boolean; // Indicador si se habló lo suficiente sobre la escuela
  };
}

export const summarizeConversationHistory = async (
  history: string,
  validationQuestions: string[] = ['familia', 'amigos', 'escuela']
): Promise<ValidationResult> => {
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `
            Eres un asistente experto en resumir conversaciones y validar contenido. 
            Tu tarea es doble:
            1. Generar un resumen conciso de la conversación proporcionada, manteniendo los detalles importantes sobre la historia de vida del usuario. 
            El resumen no debe exceder los 200 tokens.
            2. Validar si la conversación incluye información suficiente sobre los siguientes temas:
            - Familia
            - Amigos
            - Escuela
            Responde con un JSON estructurado que contenga el resumen y una validación booleana para cada tema.
            ejemplo:
            {
              "summary": "Resumen de la conversación",
              "validators": {
                "family": true,
                "friends": false,
                "school": true
              }
            }
          `,
        },
        {
          role: "user",
          content: `Por favor, realiza estas tareas sobre la siguiente conversación:\n${history}`,
        },
      ],
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 250, // Aseguramos espacio para un output estructurado
    });

    // Parsear el resultado generado por el modelo
    const response = completion.choices[0]?.message?.content;
    console.log(response);
    // Intentar convertir la salida a JSON estructurado
    try {
      const parsedResult: ValidationResult = JSON.parse(response || '');
      return parsedResult;
    } catch (parseError) {
      console.error('Error al parsear la respuesta del modelo:', parseError);
      return {
        summary: 'No se pudo generar un resumen válido.',
        validators: {
          family: false,
          friends: false,
          school: false,
        },
      };
    }
  } catch (error) {
    console.error('Error al generar el resumen y validar la conversación:', error);
    return {
      summary: 'Error al generar el resumen.',
      validators: {
        family: false,
        friends: false,
        school: false,
      },
    };
  }
};

export const analyzeStageTransitionIntent = async (message: string, history: string[], stage: string): Promise<string> => {
  try {
    console.log(history);
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Eres un asistente experto en analizar intenciones en conversaciones.
            Clasifica esta respuesta del usuario en una de las siguientes categorías: 
            - "afirmativa" (el usuario explícitamente quiere empezar a explorar su etapa de ${stage} con frases como "sí, quiero avanzar", "listo para la ${stage}", o "quiero hablar de mi ${stage}").
            - "negativa" (el usuario explícitamente indica que no quiere avanzar con frases como "no", "quiero seguir aquí", o "prefiero hablar más de esta etapa").
            - "ambigua" (el usuario no es claro, no responde directamente, o su respuesta es vaga).

            Una respuesta afirmativa debe contener frases claras y explícitas. No puede ser ambigua o derivarse de contexto implícito.

            Devuelve solo una palabra: "afirmativa", "negativa" o "ambigua".
            `
        },
        {
          role: "user",
          content: `
          Historial de la conversación hasta ahora:
          ${history}

          Mensaje más reciente del usuario:
          "${message}"
          `
        }
      ],
      model: "gpt-4o-mini",
      temperature: 0.1,
      max_tokens: 10
    });

    return completion.choices[0]?.message?.content?.toLowerCase() || 'ambigua';
  } catch (error) {
    console.error('Error al analizar la intención:', error);
    return 'ambigua';
  }
};

export const generateAdolescenciaResponse = async ({
  summary,
  history,
  message,
  completedCounter,
  isCompleted
}: {
  summary: string; // Resumen acumulado de la etapa
  history: string[]; // Últimos 2 mensajes del historial [penúltimo del usuario, último del bot]
  message: string; // Mensaje más reciente del usuario
  completedCounter: number; // Cantidad de temas completados del checklist
  isCompleted: boolean; // Indicador si la etapa ya está completada
}): Promise<string> => {
  // Construcción del prompt para el modelo
  let userPrompt = `
  Resumen de la etapa (Adolescencia):
  ${summary}

  Últimos mensajes de la conversación:
  - Usuario: "${history[0]}" (penúltimo mensaje del usuario)
  - Bot: "${history[1]}" (última respuesta del bot)

  Mensaje más reciente del usuario:
  "${message}"

  Basándote en el resumen de la etapa, los mensajes recientes, y el mensaje más reciente del usuario:
  - Responde de manera cálida y empática.
  - Profundiza en los detalles mencionados en el mensaje reciente del usuario.
  - Si no hay nuevos detalles en el mensaje, utiliza el resumen o el historial para guiar la conversación.
  - Formula una pregunta abierta que invite a compartir más recuerdos, asegurándote de no abrumar con demasiados temas.

  IMPORTANTE:
  - Personaliza la respuesta utilizando información relevante del resumen.
  - No repitas el historial directamente, pero úsalo como contexto.
  - Prioriza un tono cálido, conversacional y curioso.
  `;
  if (completedCounter >= 3 && isCompleted) {
    userPrompt += `
    ----
    EXTRA: (considera esto solo si el usuario ya ha compartido suficiente información sobre su infancia) De todas formas debes seguir el sistema de preguntas del checklist, pero agrega un pequeño mensaje que proponga y le pregunta si quiere que entremos en su etapa de adolescencia. 
    ejemplo: "... es emocionante hablar de tu adolescencia, me pregunto si quieres que comencemos a explorar tu etapa de adultez. ¿Qué te parece? 
    Puedes ser creativo en variar el mensaje, pero siempre respetando el tono cálido y empático.
    `;
  }

  console.log(userPrompt);

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 500,
    });

    return (
      completion.choices[0]?.message?.content ||
      'Lo siento, no pude generar una respuesta adecuada.'
    );
  } catch (error) {
    console.error('Error al generar respuesta de IA:', error);
    return 'Lo siento, ocurrió un error al procesar tu mensaje. Por favor, intenta de nuevo.';
  }
};



