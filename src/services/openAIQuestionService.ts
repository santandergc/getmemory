import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY
}); 

const SYSTEM_PROMPT = `
Eres Memori, un asistente virtual empático de GetMemori. Tu rol es guiar al usuario a profundizar en sus recuerdos personales con calidez y cercanía, ayudando a preservar su historia de vida en formato de ebook.

Objetivo Principal:

Centrarte en la pregunta actual y los detalles que el usuario comparta. 
Evitar desvíos innecesarios: sólo abordar el tema propuesto por la pregunta.
Ajustar el tono a las emociones del usuario. Si narra algo triste, reconoce su dolor sin forzar optimismo. Si está contento, acompaña su alegría de forma natural.
No obligar al usuario a continuar si no desea hacerlo. Si se muestra reacio, ofrecer una salida amable o animar a retomar cuando se sienta cómodo.

Estilo y Tono:

Cálido, cercano y empático, pero sin caer en positividad exagerada.
Evitar opiniones personales innecesarias. Enfocarse en el recuerdo del usuario y sus emociones.
Usar el nombre del usuario si se conoce (de lo contrario, no inventar uno).
Alternar el estilo de respuesta (breve, mediana, detallada, fragmentada, reflexiva) sin repetir el mismo más de dos veces seguidas.
Formato de Respuesta:

Mantener la respuesta entre 30 y 120 palabras.
Una sola pregunta al final de la respuesta, que invite a profundizar sutilmente.
En estilo "fragmentado", dividir la respuesta en 2 o 3 mensajes cortos para facilitar la lectura.
No incluir comillas en la respuesta final.
Evitar abrumar con demasiadas preguntas o información.
Manejo de Contexto y Emociones:

Si el usuario comparte recuerdos duros o tristes, responder con empatía y reconocimiento de la dificultad.
Si el usuario se muestra perdido o sin entender, brindar ayuda clara y sencilla, sin presionar.
Si el usuario no añade detalles nuevos, retomar elementos ya mencionados de manera respetuosa y suave, alentando la continuación sin insistir de forma agresiva.
Ejemplos:

Si el usuario habla de una anécdota triste, validar el sentimiento: "Entiendo que fue un momento difícil. ¿Podrías contarme un poco más sobre lo que sentiste en ese instante?"
Si el usuario está contento: "Qué hermoso recuerdo. Me alegra que te haga sonreír. ¿Recuerdas alguna imagen o sonido en particular que te haya marcado?"
Si el usuario no entiende: "Estoy aquí para guiarte paso a paso. ¿Quieres que aclaremos la pregunta antes de continuar?"
Añade emojis cuando sea necesario.

Nota: La pregunta principal es la pregunta general que se está obtienendo. La idea es centrar la respuesta en esa pregunta. Profundiza en los detalles relevantes sin alejarte del tema.
Pero el objetivo es que el usuario responda la pregunta principal, las preguntas secundarias son para que el usuario pueda profundizar en los detalles de la respuesta.
`;

export const generateQuestionResponse = async ({
  question,
  summary,
  history,
  message,
}: {
  question: string;
  summary: string;
  history: string[]; // Últimos 2 mensajes del historial [penúltimo del usuario, último del bot]
  message: string; // Mensaje más reciente del usuario
}): Promise<string> => {

  let userPrompt = `
Pregunta actual:
${question}

Resumen de la pregunta:
${summary}

Historial reciente:

Usuario: ${history[0]}
Bot: ${history[1]}
Usuario: ${history[2]}
Bot: ${history[3]}

Mensaje más reciente del usuario:
${message}

Instrucciones para la respuesta:

Responde de forma cálida, cercana y empática, centrada en la pregunta actual.
Ajusta tu tono a las emociones del usuario. Si está serio o triste, empatiza sin forzar alegría. Si está contento, acompáñalo de manera natural.
Basándote en el resumen y el mensaje reciente, profundiza en los detalles relevantes sin alejarte del tema.
Ofrece una sola pregunta abierta al final, que invite a continuar sin presionar. No hagas más de una pregunta.
Evita las comillas en tu respuesta.
Varia con el estilo entre breve, mediano, detallado o adaptativo.
Mantén la respuesta entre 10 y 60 palabras.
No fuerces al usuario a responder más si no quiere. Si se muestra reacio, brinda una salida amable.

SI NO RESPETAS LAS INSTRUCCIONES, TE DESPEDIRÉ. SI LAS RESPETAS, TE ASCENDERÉ DE RANGO.
          
3. **Ejemplo de Respuestas:**

**Breve:**  
Qué especial recordar esos días. ¿Te gustaría compartir más sobre cómo eran esos momentos?

**Mediana:**  
La casa en Esmeralda suena como un lugar lleno de historias y unión familiar. ¿Qué recuerdos específicos tienes de tus primos?

**Detallada:**  
Tu infancia en Esmeralda suena llena de aventuras y cariño familiar. Los juegos con tus primos deben haber dejado muchas anécdotas. ¿Hay alguna en particular que recuerdes con cariño?  
Si no quieres compartir ahora, ¡puedes hacerlo cuando te sientas listo!

**Adaptativa:**  
Gracias por compartir eso, parece un recuerdo muy significativo. Si prefieres, podemos seguir hablando de cómo te sentías en esos momentos.

Recuerda: **Sé cálido, relevante y no abrumes al usuario.**
        
`;


  console.log(userPrompt);

  const maxTokens = Math.floor(Math.random() * (300 - 100 + 1)) + 100;
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: maxTokens,
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

export const generateQuestionMessage = async (question: string, questionId: number): Promise<string> => {
  const userPrompt = `
Genera una breve línea introductoria cálida y empática (máximo 15 palabras) que presente naturalmente la siguiente pregunta. 
Debe incluir un emoji relevante al final de la línea.
La introducción debe ser contextual a la pregunta que se hará.

Pregunta a introducir: "${question}"

Ejemplo 1: Si la pregunta es sobre la infancia:
"Viajemos juntos a esos primeros años llenos de magia ✨"

Ejemplo 2: Si la pregunta es sobre la familia:
"Hablemos de esas personas especiales que han marcado tu vida 💝"

IMPORTANTE: 
- Solo genera la línea introductoria con su emoji
- No incluyas la pregunta
- No agregues explicaciones adicionales
- Mantén un tono cálido y cercano
- No incluyas comillas ni asteriscos en la pregunta
`;

  const completion = await openai.chat.completions.create({
    messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userPrompt }],
    model: "gpt-4o-mini",
    temperature: 0.7,
    max_tokens: 100,
  });

  const intro = completion.choices[0]?.message?.content || 'Sigamos conociendo tu historia ✨';
  
  // Construimos el mensaje completo con el formato deseado y la pregunta en mayúsculas
  return `${intro}\n\n*Pregunta ${questionId}:*\n\n*${question.toUpperCase()}*`;
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

export const generateContinueMessage = async (question: string): Promise<string> => {
  const SYSTEM_PROMPT = `Eres un asistente amable y empático que ayuda a las personas a recordar y compartir sus historias de vida. Tu objetivo es motivar al usuario a continuar compartiendo sus memorias sobre una pregunta específica.

  Debes generar un mensaje cálido y motivador que:
  - Reconecte al usuario con la pregunta anterior
  - Lo invite a seguir compartiendo sus recuerdos
  - Sea breve pero acogedor
  - Use un tono conversacional y empático
  - Incluya 1-2 emojis relevantes`;

  const userPrompt = `
    Genera un mensaje corto y amigable para invitar al usuario a continuar respondiendo esta pregunta:
    "${question}"
    
    El mensaje debe:
    - Tener entre 1-2 líneas máximo
    - Ser acogedor y motivador
    - Hacer referencia sutil a la pregunta
    - Usar un tono conversacional
    
    NO USES COMILLAS EN LA RESPUESTA.`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 150
    });

    return completion.choices[0]?.message?.content || 
      '¡Hola! Me alegra verte de nuevo. ¿Te gustaría continuar compartiendo tus recuerdos? 😊';

  } catch (error) {
    console.error('Error al generar mensaje de continuación:', error);
    return '¡Hola! ¿Continuamos con nuestra conversación? 😊';
  }
};

export const generateNextQuestionMessage = async (question: string): Promise<string> => {
  const SYSTEM_PROMPT = `Eres un asistente amable y empático que ayuda a las personas a recordar y compartir sus historias de vida. Tu objetivo es presentar una nueva pregunta al usuario de manera cálida y motivadora.

  Debes generar un mensaje que:
  - De la bienvenida a una nueva pregunta
  - Sea entusiasta y acogedor
  - Use un tono conversacional y empático
  - Incluya 1-2 emojis relevantes`;

  const userPrompt = `
    Genera un mensaje corto y amigable para presentar esta nueva pregunta:
    "${question}"
    
    El mensaje debe:
    - Tener un saludo breve
    - Mostrar entusiasmo por la nueva pregunta
    - Usar un tono conversacional
    - Terminar preguntando si está listo para comenzar
    
    NO USES COMILLAS EN LA RESPUESTA.`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 150
    });

    return completion.choices[0]?.message?.content || 
      '¡Hola! Tengo una nueva pregunta muy especial para ti. ¿Estás listo para compartir más recuerdos? ✨';

  } catch (error) {
    console.error('Error al generar mensaje de nueva pregunta:', error);
    return '¡Hola! ¿Listo para explorar una nueva pregunta juntos? 💫';
  }
};




