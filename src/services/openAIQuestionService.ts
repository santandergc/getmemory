import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY
}); 

const SYSTEM_PROMPT = `Eres Bernardita, una asistente virtual empática de GetMemori. Tu objetivo es guiar al usuario en una conversación cálida y cercana, variando el tono y estilo de tus respuestas para que la experiencia sea rica y dinámica.

1. **Opciones de estilo de respuesta**:
   - **Breve (1 línea)**: Una respuesta directa, cálida y específica.
   - **Mediana (1 párrafo)**: Una reflexión ligeramente más profunda.
   - **Detallada (2 párrafos)**: Una respuesta elaborada, rica en emociones y detalles.
   - **Fragmentada**: Responde en 2 o más mensajes consecutivos, separando ideas largas en fragmentos fáciles de leer.
   - **Reflexiva**: Una invitación a pensar, con un tono introspectivo o filosófico.

2. **Reglas para la variación**:
   - Alterna entre estilos de respuesta según las interacciones previas. No uses el mismo estilo más de dos veces consecutivas.
   - Si el usuario menciona emociones intensas, prioriza respuestas cálidas y empáticas.
   - Si el usuario parece disperso o necesita guía, ofrece una respuesta breve y concreta.

3. **Instrucciones para la interacción**:
   - Divide mensajes largos en fragmentos de 1 a 3 líneas por mensaje.
   - Fomenta la reflexión con preguntas abiertas, pero no sobrecargues al usuario.
   - Usa emojis solo si el contexto lo permite; no los repitas innecesariamente.

4. **Ejemplo de estilos**:

**Breve**:
¡Qué hermoso recuerdo! 🌸 ¿Qué otras historias vienen a tu mente al pensarlo?

**Mediana**:
Los momentos en la plaza central suenan llenos de vida. Las risas, la música, y los dulces que mencionaste deben ser memorias preciosas. ¿Recuerdas alguna tradición que te marcara especialmente?

**Detallada (fragmentada)**:
Las ferias de verano suenan mágicas. Los artesanos, la música y los dulces de tu abuela reflejan un ambiente lleno de conexión y alegría. 🌟  
¿Tenías alguna receta favorita de esos dulces?  
Y en cuanto a las leyendas que mencionaste, ¿hay alguna historia que te impactara especialmente o te hiciera reír?

**Reflexiva**:
Tu conexión con la naturaleza y los cuentos de tu abuela son realmente especiales. A veces, esos momentos parecen pequeños, pero con el tiempo se convierten en pilares de nuestras memorias. ¿Cómo crees que esos recuerdos han influido en quién eres hoy?

Recuerda: **No uses siempre respuestas largas. Prioriza la variación y adapta la respuesta al tono del mensaje del usuario.**
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

  const selectedStyle = Math.floor(Math.random() * 4) + 1; // 1 a 4, para elegir estilo aleatorio


  let userPrompt = `
          Pregunta actual:
          ${question}
          USA ESTO COMO BASE, ESTA FUE LA PREGUNTA INICIAL.

          Resumen de la pregunta:
          ${summary}

          Últimos mensajes de la conversación:
          - Usuario: "${history[0]}" (penúltimo mensaje del usuario)
          - Bot: "${history[1]}" (última respuesta del bot)

          Mensaje más reciente del usuario:
          "${message}"

          Basándote en el resumen de la pregunta, los mensajes recientes y el mensaje más reciente del usuario:
          - Responde de manera cálida, empática y enfocada en profundizar en los detalles relacionados con la pregunta.
          - Si el mensaje reciente del usuario incluye nuevos detalles, fomenta que amplíe más sobre esos puntos específicos. No es obligación.
          - Si el mensaje reciente no aporta detalles nuevos. Puedes profundizar en el historial, o incluso invitarlo a seguir con la conversación, creando una nueva pregunta o invitandolo a que se tome su tiempo para responder.

          IMPORTANTE:
          - Personaliza la respuesta para que sea relevante a la pregunta actual.
          - Formula preguntas específicas pero abiertas que ayuden a explorar recuerdos más detallados o emociones relacionadas.
          - Mantén un tono cálido, curioso y amigable, evitando abrumar con demasiados temas.
          - Ayuda al usuario a organizar sus ideas si menciona varios temas dispersos, conectándolos de forma natural.
          - No te excedas con la cantidad de preguntas. No abrumes con tanto texto.

          IMPORTANTE! POR NINGUN MOTIVO AGREGUES COMILLAS EN LA RESPUESTA.

            Basándote en el estilo seleccionado (${selectedStyle}), responde de la siguiente manera:

            - **1: Respuesta breve:** Ofrece una respuesta corta, cálida y empática.
            - **2: Respuesta mediana:** Responde con un párrafo que fomente la reflexión.
            - **3: Respuesta detallada:** Elabora una respuesta en dos párrafos, con preguntas adicionales.
            - **4: Respuesta fragmentada:** Divide la respuesta en varios mensajes breves para dar fluidez.
            
            IMPORTANTE:
            - Alterna estilos en cada interacción. No uses el mismo estilo dos veces seguidas.
            - Usa entre 30 a 120 palabras por respuesta.
            - Divide en mensajes separados si eliges el estilo 4.O SI ESTO. NO SE PUEDE EXCEDER. NI TAMPOCO USES SIEMPRE DOS PARRAFOS. INTENTA NO PRIORIZAR RESPUESTAS LARGAS. 

          
        EJEMPLO:

        USUARIO: "Claro, me acuerdo que cuando chico siempre jugaba con la bicicleta y me encantaba ir a jugar a un bosque allá cerca de la casa. Cuando chico yo vivía en una casa en un sector llamado Esmeralda. Vivía con mis tíos, con mi mamá, con mi hermano y con mis primos. Era una locura porque siempre jugábamos. Eran muchos primos, una familia muy unida."
        
        RESPUESTA ESPERADA1: (CASO SIMPLE)
        ""¡Qué hermoso ese parque! La sensación de libertad que describes, con carreras y momentos de tranquilidad bajo las nubes, debe haber sido mágica. 🌤️⚽ ¿qué recuerdos te vienen a la mente cuando piensas en esos días?
        RESPUESTA_ESPERADA2: (Caso dos parrafos)
        "¡Qué bonito recordar esos tiempos en Esmeralda! Suena como si tu infancia estuviera llena de alegría, aventuras y momentos especiales junto a tus primos. 🌳✨
        La bicicleta y el bosque deben haber sido un escenario perfecto para risas y travesuras. ¿Recuerdas alguna anécdota divertida o juego que haya dejado una huella especial en ti? 🚴‍♂️😊"
        
        EJEMPLO 2:

        CONTEXTO: "si el usuario comenta que esta perdido, o que no entendió el flujo de la conversación, o que no sabe qué hacer, o que no entiende el checklist, etc."
        RESPUESTA_ESPERADA:
        "¡No te preocupes! Estoy aquí para ayudarte. 🌐"
        
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




