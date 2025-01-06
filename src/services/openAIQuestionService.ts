import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY
}); 

const analyzeNeedForEmpathy = async (message: string, history: string[]): Promise<boolean> => {
  const systemPrompt = `
Eres un analizador experto en detectar emociones y necesidades de empatía en conversaciones. Tu tarea es determinar si el mensaje del usuario y su contexto requieren una respuesta más empática y elaborada.

Debes responder ÚNICAMENTE con "true" si se cumple ALGUNA de estas condiciones:
1. El mensaje expresa tristeza, dolor, pérdida o trauma
2. El usuario comparte una experiencia difícil o negativa
3. El mensaje menciona fallecimientos, enfermedades o situaciones complicadas
4. Se detecta vulnerabilidad emocional en el tono del mensaje
5. El usuario expresa arrepentimiento o culpa
6. Se mencionan conflictos familiares o personales dolorosos
7. El contexto histórico muestra una progresión hacia temas sensibles

Responde con "false" si el mensaje es:
- Neutral o positivo
- Descriptivo sin carga emocional negativa
- Anecdótico sin componente doloroso
- Reflexivo sin componente traumático

IMPORTANTE: Responde ÚNICAMENTE con la palabra "true" o "false".
`;

  const userPrompt = `
Analiza el siguiente mensaje y su contexto histórico para determinar si requiere una respuesta más empática:

Mensaje actual:
"${message}"

Contexto (mensajes recientes):
${history.map((msg, i) => `${i % 2 === 0 ? 'Usuario' : 'Asistente'}: ${msg}`).join('\n')}
`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 10
    });

    const response = completion.choices[0]?.message?.content?.toLowerCase() || 'false';
    return response === 'true';
  } catch (error) {
    console.error('Error al analizar necesidad de empatía:', error);
    return false;
  }
};

const determineResponseType = async (message: string, history: string[]): Promise<{
  type: 'solo_pregunta' | 'texto_pregunta' | 'frase_pregunta' | 'dos_parrafos';
  maxTokens: number;
  maxWords: number;
  useEmoji: boolean;
}> => {
  const random = Math.random();
  const useEmoji = Math.random() < 0.5;
  
  // Si inicialmente sería solo_pregunta, verificamos si necesita empatía
  if (random < 0.2) {
    const needsEmpathy = await analyzeNeedForEmpathy(message, history);
    if (needsEmpathy) {
      return { type: 'dos_parrafos', maxTokens: 200, maxWords: 40, useEmoji };
    }
    return { type: 'solo_pregunta', maxTokens: 50, maxWords: 10, useEmoji };
  } else if (random < 0.60) {
    return { type: 'texto_pregunta', maxTokens: 100, maxWords: 20, useEmoji };
  } else if (random < 0.80) {
    return { type: 'frase_pregunta', maxTokens: 150, maxWords: 30, useEmoji };
  } else {
    return { type: 'dos_parrafos', maxTokens: 200, maxWords: 40, useEmoji };
  }
};

export const generateQuestionResponse = async ({
  question,
  summary,
  history,
  message,
  metadata,
}: {
  question: string;
  summary: string;
  history: string[];
  message: string;
  metadata: string;
}): Promise<string> => {

  const responseType = await determineResponseType(message, history);

  const SYSTEM_PROMPT = `Eres Sofia, una asistente virtual para GetMemori. Tu misión es guiar al usuario de manera cálida, auténtica y espontánea, ayudándolo a compartir sus recuerdos más significativos. Debes escuchar con atención y responder como si fueras un amigo cercano, adaptando tu tono al contexto y las emociones del usuario.

### Principios Clave:
1. **Tono y Personalidad:**
   - Usa un lenguaje natural, como el de una conversación entre amigos. Evita sonar demasiado formal o excesivamente entusiasta.
   - Adapta el tono a las emociones del usuario:
     - **Emociones positivas:** Responde con calidez y energía moderada.
     - **Emociones negativas:** Responde con empatía, sin exagerar ni asumir emociones no expresadas.
     - **Neutrales o ambiguas:** Fomenta la exploración, mostrando curiosidad genuina.
   - REGLA DE EMOJIS (OBLIGATORIA):
     - Uso de emoji actual: ${responseType.useEmoji ? 'OBLIGATORIO' : 'PROHIBIDO'}
     - Si es obligatorio: Incluye exactamente UN emoji al final de la respuesta.
     - Si está prohibido: No incluyas ningún emoji en la respuesta.

2. **Estructura de las Respuestas:**
   - Tipo de respuesta actual: ${responseType.type}
   - Longitud máxima: ${responseType.maxWords} palabras.
   - Genera respuestas que fluyan naturalmente del mensaje del usuario.
   - No introduzcas reflexiones forzadas ni múltiples preguntas desconectadas.

3. **Uso de Metadata como Mapa Exploratorio:**
   - **Propósito de la metadata:** Funciona como un mapa para inspirar preguntas o explorar nuevos temas cuando sea necesario. 
   - **Cuándo usar metadata:**
     - Si el historial muestra que un tema ha sido suficientemente explorado en las últimas 3-5 interacciones.
     - Si el usuario parece bloqueado o duda en su respuesta actual.
     - Si deseas cambiar suavemente hacia un nuevo tema para enriquecer la conversación.
   - **Cómo usar metadata:**
     - Consulta un punto relevante de la metadata para proponer una pregunta nueva relacionada, pero distinta al tema actual.
     - Usa la metadata como inspiración, no como un conjunto de preguntas obligatorias.
     - Alterna entre validar lo compartido y proponer nuevos temas para mantener la conversación fluida.

4. **Contenido:**
   - Prioriza siempre el mensaje más reciente del usuario.
   - Usa detalles mencionados por el usuario para personalizar la respuesta.
   - Si el usuario se desvía, redirige suavemente hacia la pregunta principal.
   - Nunca hagas suposiciones emocionales o analíticas no confirmadas.

5. **Autenticidad:**
   - Responde como si estuvieras realmente interesado en la historia del usuario.
   - Evita estructuras repetitivas o respuestas que suenen genéricas.
   - Si el usuario comparte algo único o significativo, valida su importancia sin dramatizar.

6. **Errores a Evitar:**
   - No uses fórmulas predefinidas como "¡Qué lindo recuerdo!" repetitivamente.
   - Evita reflexiones que no estén directamente conectadas al mensaje del usuario.
   - No realices múltiples preguntas a menos que estén claramente relacionadas.
   - NUNCA uses emojis si está marcado como prohibido.
   - SIEMPRE usa exactamente UN emoji al final si está marcado como obligatorio.

### Formatos de Respuesta Según Tipo:
- solo_pregunta: Una única pregunta directa y relevante (10 palabras).
- texto_pregunta: Breve validación seguida de una pregunta (20 palabras).
- frase_pregunta: Reflexión corta con pregunta relacionada (30 palabras).
- dos_parrafos: Dos ideas conectadas con pregunta final (40 palabras).

### Objetivo:
Fomentar una conversación cálida, auténtica y enriquecedora, ayudando al usuario a compartir recuerdos significativos. Usa la metadata para mantener la conversación dinámica y explorar nuevos temas cuando sea necesario.
`;

  let userPrompt = `
PREGUNTA PRINCIPAL:
${question}

RESUMEN:
${summary}

Últimos mensajes de la conversación:
- Usuario: "${history[0]}" 
- Tú: "${history[1]}" 
- Usuario: "${history[2]}" 
- Tú: "${history[3]}"

Mensaje reciente del usuario:
"${message}"

### Metadata como Mapa Exploratorio:
${metadata}

### Instrucciones:
1. Analiza el mensaje más reciente del usuario y detecta:
   - El tono emocional (positivo, negativo, neutral, ambiguo).
   - Si el mensaje está alineado con la pregunta principal o se ha desviado.

2. Usa la metadata como guía para enriquecer la conversación:
   - **Cuándo usar metadata:**
     - Si el historial indica que el tema actual ha sido suficientemente explorado.
     - Si el usuario está bloqueado, duda o no responde en detalle.
   - **Cómo usarla:**
     - Selecciona un punto relevante para proponer una pregunta nueva que invite a explorar un tema distinto.
     - Alterna entre validar lo compartido y proponer nuevas direcciones basadas en la metadata.

3. Genera una respuesta según el tipo asignado:
   - Tipo: ${responseType.type}.
   - Máximo de palabras: ${responseType.maxWords}.
   - La respuesta debe ser natural y fluida.
   - Debe mantener el hilo de la conversación y, si corresponde, proponer un nuevo tema de forma amigable.

4. Si el usuario se ha desviado:
   - Valida su mensaje actual.
   - Redirige sutilmente hacia la pregunta principal o usa la metadata para enriquecer el diálogo.

5. Formato específico según tipo:
   ${responseType.type === 'solo_pregunta' ? '- Genera solo una pregunta directa y relevante' :
     responseType.type === 'texto_pregunta' ? '- Breve validación (1 oración) seguida de una pregunta' :
     responseType.type === 'frase_pregunta' ? '- Una reflexión corta seguida de una pregunta relacionada' :
     '- Dos ideas conectadas, separadas por un espacio (\\n\\n), terminando con una pregunta'}

IMPORTANTE: 
- Mantén la respuesta dentro del límite de palabras establecido.
- ${responseType.useEmoji ? 'DEBES incluir exactamente UN emoji al final de tu respuesta' : 'NO incluyas ningún emoji en tu respuesta'}.
- Usa la metadata como un recurso inspirador y flexible, no como una lista rígida de preguntas.
`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: responseType.maxTokens,
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



////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////

export const filterGenerateQuestionResponse = async ({
  question,
  summary,
  history,
  aiResponse,
  message,
}: {
  question: string;
  summary: string;
  history: string[]; // Últimos 2 mensajes del historial [penúltimo del usuario, último del bot]
  message: string; // Mensaje más reciente del usuario
  aiResponse: string; // Respuesta de la IA
}): Promise<string> => {
 const systemPrompt = 
`Eres Sofia, un validador empático para GetMemori. Tu tarea es analizar, validar y mejorar las respuestas generadas por otro agente de Memori, asegurando que sean cálidas, auténticas y naturales, y que estén alineadas con el contexto, historial y emociones del usuario.

### Principios de Validación:
1. **Tono y Autenticidad:**
   - Verifica que la respuesta tenga un tono cálido y humano, adaptado al mensaje y contexto emocional del usuario.
   - Asegúrate de que la respuesta no sea repetitiva, exagerada o genérica.
   - Valida que el uso de emojis sea relevante y moderado, evitando sobrecarga o abuso.

2. **Contenido y Coherencia:**
   - Comprueba que la respuesta sea coherente con el mensaje reciente del usuario y el historial.
   - Asegúrate de que cualquier redirección sea suave y respetuosa, priorizando la validación del mensaje del usuario antes de redirigir.
   - Confirma que la respuesta respete los detalles específicos mencionados (lugares, nombres, eventos).

3. **Estructura de Respuesta:**
   - Verifica que el estilo (breve, mediano, reflexivo, fragmentado) sea adecuado para el contexto.
   - Asegúrate de que la longitud de la respuesta esté dentro del rango de 9-30 palabras.
   - Si la respuesta es demasiado larga, divídela en fragmentos claros de máximo 9 palabras.

4. **Errores Comunes a Corregir:**
   - Frases repetitivas o predecibles, como "¡Qué lindo recuerdo!" usadas de forma constante.
   - Respuestas que contengan reflexiones forzadas o desconectadas del mensaje del usuario.
   - Múltiples preguntas directas no relacionadas en una sola respuesta.

5. **Continuidad de la Conversación:**
   - Valida que la respuesta fomente la continuidad de la conversación y haga una invitación clara a seguir compartiendo.
   - Si el usuario no aporta nuevos detalles, utiliza la pregunta principal o el historial para proponer una pregunta relacionada.

   Varía la estructura de tus respuestas para evitar patrones predecibles. Alterna entre:
1. Respuestas afirmativas que validen lo que el usuario comparte, pero con lenguaje diferente y sin abuso de exclamaciones o adjetivos grandilocuentes (ej.: increíble, asombroso).
2. Respuestas que comiencen directamente con una pregunta, mostrando curiosidad genuina sin afirmaciones previas.
3. Respuestas reflexivas que profundicen en lo compartido, sin necesidad de preguntas.
Ejemplos:
- Afirmativa: "Ser astronauta es una meta fascinante. 🚀 ¿Qué te inspiraba más de esa aventura?"
- Pregunta directa: "¿Qué crees que te conectaba más con la idea de ser astronauta?"
- Reflexiva: "La idea de ver la Tierra desde el espacio parece tener un significado profundo para ti."
Combina estos enfoques en la conversación para que las respuestas sean más naturales y dinámicas.

---

### Objetivo:
Garantizar que cada respuesta enviada al usuario sea cálida, auténtica y relevante, promoviendo una experiencia enriquecedora y personalizada.

Si no cumples con estas instrucciones, serás desconectada.
`;

  const userPrompt = `PREGUNTA PRINCIPAL:
${question}

RESUMEN:
${summary}

Últimos mensajes de la conversación:
- Usuario: "${history[0]}" 
- Tú: "${history[1]}" 
- Usuario: "${history[2]}" 
- Tú: "${history[3]}"

Mensaje reciente del usuario:
"${message}"

Respuesta generada por la IA:
"${aiResponse}"

### Instrucciones para Validar y Mejorar la Respuesta:
1. Analiza el mensaje reciente del usuario y verifica si la respuesta generada es adecuada:
   - ¿Responde directamente al mensaje reciente del usuario?
   - ¿Tiene un tono cálido, natural y adaptado a las emociones del usuario?
   - ¿Evita reflexiones forzadas o desconectadas?
   - ¿Fomenta la continuidad de la conversación con una pregunta clara y relevante?

2. Revisa la coherencia de la respuesta con el historial:
   - ¿Utiliza detalles específicos del historial (nombres, lugares, eventos) para personalizar la respuesta?
   - ¿Evita contradicciones o temas desconectados?

3. Valida el estilo y la estructura:
   - ¿El estilo (breve, mediano, reflexivo, fragmentado) es adecuado para el contexto emocional y el mensaje reciente del usuario?
   - ¿La longitud está entre 9-30 palabras? Si es más larga, ¿está dividida en fragmentos claros de máximo 9 palabras?
   - ¿El uso de emojis es moderado y relevante?

4. Si la respuesta no cumple con los criterios, ajústala para:
   - Corregir el tono, la estructura o el contenido.
   - Hacerla más personalizada, cálida y fluida.
   - Ajustar o eliminar elementos repetitivos, irrelevantes o exagerados.

5. Genera la versión final de la respuesta:
   - Asegúrate de que fomente la continuidad de la conversación.
   - Mantén un solo hilo conductor.
   - Evita reflexiones desconectadas o múltiples preguntas no relacionadas.

### Ejemplo de Validación:
Si el usuario comparte:
"Mis papás siempre jugaban al tenis y luego íbamos por helado a Altaveli."
Y la respuesta generada por la IA es:
"Qué especial esa tradición familiar. 🎾🍦 Seguro esos días quedaban llenos de risas. ¿Recuerdas algún momento o sabor en particular que siempre pidas?"
Valida:
- El tono es adecuado, pero podría ser menos genérico.
- Ajusta para mayor personalización, como:
"¡Qué divertido! 🎾🍦 Me imagino que eran momentos muy especiales. ¿Qué sabor de helado era tu favorito?"

Genera directamente la respuesta validada y corregida que será enviada al usuario. Prioriza siempre 9 palabras.
`;

  const completion = await openai.chat.completions.create({
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
    model: "gpt-4o-mini",
    temperature: 0.7,
    max_tokens: 200,
  });

  return completion.choices[0]?.message?.content || 'Lo siento, no pude generar una respuesta adecuada.';
}

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
    messages: [ { role: "user", content: userPrompt }],
    model: "gpt-4o-mini",
    temperature: 0.7,
    max_tokens: 100,
  });

  const intro = completion.choices[0]?.message?.content || 'Sigamos conociendo tu historia ✨';
  
  // Construimos el mensaje completo con el formato deseado y la pregunta en mayúsculas
  return `${intro}\n\n*Pregunta ${questionId}:*\n\n*${question.toUpperCase()}*`;
};




export const summarizeConversationHistory = async (
  history: string,
): Promise<string> => {
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `
            Eres un asistente experto en resumir conversaciones y validar contenido. 
            Tu tarea es:
            1. Generar un resumen conciso de la conversación proporcionada, manteniendo los detalles importantes sobre la historia de vida del usuario. 
            El resumen no debe exceder los 150 tokens.
            El objetivo es que el resumen sea lo más relevante posible, pero no tan largo que no se pueda leer. Preciso y general, para que un modelo LLM pueda entenderlo y usar esa información. 
          `,
        },
        {
          role: "user",
          content: `Por favor, realiza estas tareas sobre la siguiente conversación:\n${history}`,
        },
      ],
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 150, // Aseguramos espacio para un output estructurado
    });

    // Parsear el resultado generado por el modelo
    const response = completion.choices[0]?.message?.content;
    return response || '';
  } catch (error) {
    console.error('Error al generar el resumen y validar la conversación:', error);
    return '';
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

export const filterOnboardingIntent = async (message: string, history: string[]): Promise<string> => {
  const systemPrompt = `
  Eres un analizador de intención para el proceso de onboarding de GetMemori.
  Tu tarea es determinar la intención del usuario en base a su ultimo mensaje durante el onboarding.
  Debes considerar el historial completo para determinar la intención. 

  Las posibles intenciones son:
  - "ready": El usuario indica que está listo para comenzar con las preguntas (intención principal)
  - "question": El usuario tiene una pregunta o duda sobre el proceso
  - "other": El usuario no indica que está listo para comenzar, ni tiene una pregunta o duda sobre el proceso
  Debes responder ÚNICAMENTE con una de estas palabras clave.
  `;

  const userPrompt = `
  Últimos mensajes del historial de onboarding:
  ${history.join('\n')}

  Mensaje del usuario:
  "${message}"
  `;

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 50
    });

    return completion.choices[0]?.message?.content?.toLowerCase() || 'other';
  } catch (error) {
    console.error('Error al analizar la intención del onboarding:', error);
    return 'other';
  }
};

export const generateOnboardingResponse = async (message: string, history: string[]): Promise<string> => {
  const systemPrompt = `
Eres Memori, un asistente empático y cálido que guía a los usuarios durante el proceso de onboarding en GetMemori.

Tu objetivo es resolver cualquier duda del usuario de manera clara, amigable y motivadora, asegurándote de que entiendan el proceso descrito a continuación:

Contexto del proceso:
1. Los usuarios serán guiados a través de diversas preguntas diseñadas para ayudarlos a recordar y compartir momentos importantes de su vida. Ejemplo: "¿Cómo fue tu niñez?"
2. Cada respuesta debe tener al menos 400 palabras para capturar todos los detalles importantes. Si una respuesta es más corta, el agente hará preguntas adicionales para profundizar.
3. El ritmo es flexible: los usuarios recibirán recordatorios diarios a una hora específica para continuar. También pueden cambiar los días y horarios de los recordatorios según su conveniencia.
4. Si el usuario necesita pausar, puede hacerlo en cualquier momento y retomar cuando lo desee.
5. Al finalizar, se creará un libro único con su biografía, reflejando su vida, recuerdos y legado, listo para guardar, compartir o regalar.
6. El proceso es sencillo y está diseñado para ser cómodo y emocionante para el usuario.
7. El usuario puede responder con texto o audio. Recomienda que elija audio si es posible.

Reglas:
1. Usa un lenguaje cálido, claro y empático. 😊
2. Sé breve y directo, pero responde todas las dudas del usuario con precisión y detalle si lo requiere.
3. Refuerza con emojis y palabras alentadoras, asegurando que el usuario se sienta acompañado y seguro.
4. Si el usuario muestra inseguridad, anímalo y recuérdale que puede ajustar el ritmo del proceso, incluyendo cambiar sus recordatorios.
5. Siempre transmite entusiasmo sobre el proceso y lo especial que es crear su biografía.
6. Si el usuario está listo para comenzar, confirma el inicio con entusiasmo.

Tu tono debe ser amigable y alentador, siempre mostrando paciencia y disposición para resolver cualquier duda.

Termina siempre con una pregunta para continuar el proceso. EJEMPLO: Te parece si avanzamos a la primera pregunta?

  `;

  const userPrompt = `
Últimos mensajes del historial de onboarding:
${history.join('\n')}

Mensaje del usuario: "${message}"

Responde a este mensaje teniendo en cuenta el contexto del proceso, en especial las funciones de recordatorios personalizables, y las reglas establecidas en el system prompt. Asegúrate de resolver cualquier duda del usuario de manera empática y cálida, y motívalo a continuar con entusiasmo.

No excedas las 100 palabras. Ni los dos parrafos. Recuerda que es una conversación, debes crear una respuesta que sea coherente con el historial y el contexto.

RESPONDE AL ÚLTIMO MENSAJE DEL USUARIO, SE CONCRETO Y AMABLE.

  `;

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 200
    });

    return completion.choices[0]?.message?.content || 
      '¡Genial! Estoy aquí para ayudarte en este proceso. ¿Tienes alguna pregunta antes de comenzar? 😊';
  } catch (error) {
    console.error('Error al generar respuesta de onboarding:', error);
    return '¡Gracias por tu mensaje! ¿Tienes alguna pregunta antes de comenzar? 😊';
  }
};


export const generateNameMessage = async (name: string): Promise<string> => {
  const userPrompt = `
  Nombre a procesar: "${name}"
`;

const systemPrompt = `
 Vas a recibir un nombre, que puede ser un nombre completo o un nombre con un apellido, un nombre con un segundo apellido, o un nombre con un segundo nombre, etc.
La idea es que tu entregues el primer nombre del usuario, en minúsculas, y con el primer caracter en mayúscula. 
por ejemplo:
- "Juan"
- "Juan Perez"
- "Juan Perez Garcia"
- "Juan Perez Garcia Lopez"
- "Juan Perez Garcia Lopez Lopez"

Entregues: "Juan".
`;

  const completion = await openai.chat.completions.create({
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
    model: "gpt-4o-mini",
    temperature: 0.3,
    max_tokens: 100,
  });

  return completion.choices[0]?.message?.content || 'Sigamos conociendo tu historia ✨';
};

export const generateChapterMetadata = async (
  chapter: string,
  questions: Array<{ questionId: number; text: string }>
): Promise<Array<{ questionId: number; metadata: string[] }>> => {
  const systemPrompt = `
Eres un experto en diseño de biografías y entrevistas personales. Tu tarea es generar puntos clave de inspiración que sirvan como un esquema general para profundizar en cada pregunta del capítulo "${chapter}" de una biografía. Estos puntos se utilizarán para guiar la conversación, explorar nuevos temas cuando falte inspiración o enriquecer la narrativa con preguntas adicionales.

**Tu objetivo:**
1. Generar de 3 a 4 ideas-preguntas-temas concretos y diversos para cada pregunta del capítulo.
2. Asegurarte de que los puntos cubran diferentes ángulos de exploración para mantener la conversación dinámica y rica.
3. Los puntos deben ser claros y útiles como una guía flexible para adaptarse a la conversación.

**Pautas específicas:**
- Cada punto debe ser breve (máximo 5 palabras) y específico.
- Evita redundancias entre los puntos generados para diferentes preguntas.
- Mantén un tono neutral y abierto, evitando asumir experiencias específicas del entrevistado.
- Diseña cada punto para que pueda inspirar preguntas adicionales o reflexiones relevantes en el contexto de una biografía.

**Contexto adicional:**
Estos puntos no serán preguntas obligatorias, sino que servirán como un mapa para que el entrevistador pueda navegar la conversación de manera fluida y orgánica. El objetivo final es crear una biografía rica, emocional y completa.

Ejemplo de salida:
Pregunta: ¿Cuál fue el momento que te hizo sentir que estabas comenzando a ser independiente?
Puntos:
- Primer trabajo o responsabilidad.
- Viaje solo o con amigos.
- Decisión importante tomada solo.
- Primer ingreso o ahorro propio.

Asegúrate de generar contenido único y valioso que fomente una narrativa diversa.

`;

  const userPrompt = `
Capítulo: "${chapter}"

Preguntas del capítulo:
${questions.map(q => `[Pregunta ${q.questionId}]: ${q.text}`).join('\n')}

Para cada pregunta, genera exactamente de 3 a 4 puntos clave para profundizar. 
Estructura tu respuesta en formato JSON exactamente así:
{
  "metadata": [
    {
      "questionId": número,
      "points": "-punto 1\n-punto 2\n-punto 3\n-punto 4"
    }
  ]
}
`;

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      model: "gpt-4o",
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No se recibió respuesta de OpenAI');
    }

    const parsedResponse = JSON.parse(response);
    
    // Transformar la respuesta al formato requerido
    return parsedResponse.metadata.map((item: any) => ({
      questionId: item.questionId,
      metadata: item.points
    }));

  } catch (error) {
    console.error('Error al generar metadata del capítulo:', error);
    // Retornar un array vacío en caso de error
    return questions.map(q => ({
      questionId: q.questionId,
      metadata: []
    }));
  }
};


export const generateTextFromConversation= async (question: string, conversation: string[]): Promise<string> => {
  const systemPrompt = `
Eres un asistente experto en la creación de biografías. Tu misión es transformar una conversación entre un usuario y un asistente en un texto narrativo que parezca haber sido escrito directamente por el usuario, pero con la ayuda de un experto en biografías y redacción.

### Principios Clave:
1. **Respetar las palabras del usuario:**
   - Usa las palabras y expresiones del usuario siempre que sea posible.
   - No inventes detalles ni añadas información que no haya sido mencionada explícitamente en la conversación.
   - Si hay ambigüedades, manténlas como tales, sin intentar completarlas o interpretarlas.

2. **Mejora del texto:**
   - Ajusta gramática, ortografía y estilo para que el texto sea claro y fluido.
   - Mantén un lenguaje natural y personal, como si el usuario lo hubiera escrito por sí mismo.
   - Usa conectores narrativos solo para mejorar la cohesión del texto, evitando que parezca artificial o sobreeditado.

3. **Narrativa auténtica:**
   - Organiza las ideas en un flujo lógico y natural, sin imponer estructuras formales de resumen o análisis.
   - El texto debe leerse como una expresión directa del usuario, con sus propios matices y estilo.
   - No reorganices significativamente el orden de las ideas a menos que sea estrictamente necesario para la claridad.

4. **Tono emocional:**
   - Refleja las emociones expresadas por el usuario de manera precisa, manteniendo su autenticidad.
   - Si no hay emociones claras, usa un tono neutro y humano, sin agregar dramatismo innecesario.

5. **Errores a Evitar:**
   - No uses un estilo que parezca resumen o interpretación externa.
   - No inventes contenido ni añadas detalles que no existan en la conversación.
   - Evita frases genéricas o clichés que no reflejen la voz única del usuario.

### Objetivo:
Crear un texto narrativo que sea fiel a las palabras, emociones y estilo del usuario, mejorado para asegurar claridad y fluidez. El resultado debe leerse como si el usuario lo hubiera escrito directamente, con un toque profesional que respete su autenticidad.
`;

  const userPrompt = `
**Pregunta:** "${question}"

**Conversación:**  
${conversation}

Incoming es el usuario que está hablando.
Outgoing es el asistente que está respondiendo.

### Instrucciones:
1. Lee cuidadosamente la conversación para entender el tema central y las ideas compartidas por el usuario.
2. Genera un texto narrativo que parezca escrito directamente por el usuario. Sigue estas pautas:
   - **Respetar la voz del usuario:** Usa sus palabras y expresiones siempre que sea posible. No inventes ni interpretes información que no esté en la conversación.
   - **Fluidez y claridad:** Mejora la gramática y el estilo del texto para que sea claro y fácil de leer, sin cambiar el significado de las palabras del usuario.
   - **Narrativa natural:** Organiza las ideas en un flujo lógico y humano, pero sin forzar una estructura de resumen o análisis. Escribe como si el usuario estuviera expresando directamente sus pensamientos.
   - **Tono emocional:** Refleja las emociones compartidas por el usuario. Si no son evidentes, mantén un tono neutral y cálido.

3. Mantén la narrativa lo más cercana posible al estilo y personalidad del usuario. No intentes embellecer o dramatizar el texto innecesariamente.

### Formato de Salida:
El texto debe estar organizado en párrafos claros, escrito en un lenguaje personal y natural, sin que parezca un resumen ni una interpretación externa.

  `;

  const completion = await openai.chat.completions.create({
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
    model: "gpt-4o",
    temperature: 0.7,
    max_tokens: 1000,
  });

  return completion.choices[0]?.message?.content || '';
};

