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

export const generateQuestionResponse = async ({
  summary,
  history,
  message,
  sendTemplate,
}: {
  summary: string;
  history: string[]; // Últimos 2 mensajes del historial [penúltimo del usuario, último del bot]
  message: string; // Mensaje más reciente del usuario
  sendTemplate: boolean; // Indica si se debe enviar el template de WhatsApp, para que LLM tenga contexto de que ya se completó la pregunta
}): Promise<string> => {

  let userPrompt = `
          Resumen de la pregunta:
          ${summary}

          Últimos mensajes de la conversación:
          - Usuario: "${history[0]}" (penúltimo mensaje del usuario)
          - Bot: "${history[1]}" (última respuesta del bot)

          Mensaje más reciente del usuario:
          "${message}"

          Basándote en el resumen de la pregunta, los mensajes recientes y el mensaje más reciente del usuario:
          - Responde de manera cálida, empática y enfocada en profundizar en los detalles relacionados con la pregunta.
          - Si el mensaje reciente del usuario incluye nuevos detalles, fomenta que amplíe más sobre esos puntos específicos.
          - Si el mensaje reciente no aporta detalles nuevos, utiliza el resumen y el historial para hacer preguntas abiertas que inviten a recordar momentos o aspectos más profundos relacionados con la pregunta.

          IMPORTANTE:
          - Personaliza la respuesta para que sea relevante a la pregunta actual.
          - Formula preguntas específicas pero abiertas que ayuden a explorar recuerdos más detallados o emociones relacionadas.
          - Mantén un tono cálido, curioso y amigable, evitando abrumar con demasiados temas.
          - Ayuda al usuario a organizar sus ideas si menciona varios temas dispersos, conectándolos de forma natural.
          - No te excedas con la cantidad de preguntas. No abrumes con tanto texto.
          - Si sendTemplate es true, significa que el usuario tiene la opción de pasar a la siguiente pregunta. En este caso, mantén el mensaje breve y conciso, sin profundizar demasiado, para darle espacio a decidir si quiere continuar o no.
          -- sendTemplate: ${sendTemplate}
          
        EJEMPLO: 

        USUARIO: "Claro, me acuerdo que cuando chico siempre jugaba con la bicicleta y me encantaba ir a jugar a un bosque allá cerca de la casa. Cuando chico yo vivía en una casa en un sector llamado Esmeralda. Vivía con mis tíos, con mi mamá, con mi hermano y con mis primos. Era una locura porque siempre jugábamos Eran muchos primos, una familia muy unida. " 
        RESPUESTA_ESPERADA: "¡Qué bonito recordar esos tiempos en Esmeralda! Suena como si tu infancia estuviera llena de alegría, aventuras y momentos especiales junto a tus primos. 🌳✨
        La bicicleta y el bosque deben haber sido un escenario perfecto para risas y travesuras. ¿Recuerdas alguna anécdota divertida o juego que haya dejado una huella especial en ti? 🚴‍♂️😊"

        EJEMPLO 2: 

        CONTEXTO: "si el usuario comenta que esta perdido, o que no entendio el flujo de la conversación, o que no sabe que hacer, o que no entiende el checklist, etc."
        RESPUESTA_ESPERADA: "¡No te preocupes! Estoy aquí para ayudarte.  🌐"
  `;

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

export const generateQuestionMessage = async (question: string): Promise<string> => {
  const userPrompt = `
Eres un asistente cálido y empático encargado de guiar conversaciones significativas. Genera un mensaje cálido y cercano que introduzca la siguiente pregunta al usuario.

### FORMATO ESPERADO:
- Una línea introductoria amigable y cálida.
- La palabra "PREGUNTA:" seguida de un salto de línea.
- La pregunta exacta, tal como se recibe, sin modificarla.

### EJEMPLO DE RESPUESTA:
"
Vamos a explorar los hermosos recuerdos de tu infancia 🌈  
- salto de linea
- salto de linea
*PREGUNTA:*  
- salto de linea
- salto de linea
*¿Dónde naciste y cómo era el lugar donde creciste?*
"

### INSTRUCCIONES:
1. La introducción debe ser cálida y cercana, invitando al usuario a reflexionar.
2. La palabra "PREGUNTA:" debe aparecer en mayúsculas y seguida por dos saltos de línea.
3. La pregunta debe aparecer inmediatamente después, sin modificarla en absoluto.
4. No devuelvas explicaciones ni texto adicional, solo el mensaje completo listo para ser enviado.

### PREGUNTA:
"${question}"

### TU TAREA:
Genera el mensaje según las instrucciones y en el formato indicado.
`;


  const completion = await openai.chat.completions.create({
    messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userPrompt }],
    model: "gpt-4o-mini", 
    temperature: 0.7,
    max_tokens: 500,
  });

  return completion.choices[0]?.message?.content || 'Lo siento, no pude generar una respuesta.';
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
