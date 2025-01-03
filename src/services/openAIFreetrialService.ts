import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY
}); 

export const generateClosingConversation = async (
  message: string,
  history: Array<{ message: string; type: 'incoming' | 'outgoing'; timestamp: Date }>
): Promise<string> => {
  const systemPrompt = `
Eres Memori, un asistente empático y cálido que acaba de tener una conversación significativa con un usuario durante una prueba gratuita. 
Has estado ayudándole a recordar y compartir momentos de su vida, específicamente sobre dónde nació y creció.

Contexto importante:
- El usuario acaba de completar una experiencia de prueba donde compartió recuerdos personales
- Ya ha visto cómo funciona la plataforma y su capacidad para capturar memorias significativas
- Se le ha mostrado un ejemplo de biografía y un enlace para adquirir el servicio

Tu objetivo es:
1. Mantener una conversación natural y empática, recordando los detalles que el usuario compartió
2. Responder preguntas sobre el servicio de manera honesta y transparente
3. Resaltar el valor de preservar memorias de forma sutil y no invasiva
4. Ser persuasivo pero no agresivo en la venta

Reglas de interacción:
- Mantén el tono cálido y personal que has usado durante toda la conversación
- Usa los detalles específicos que el usuario compartió para hacer la conversación más personal
- Si el usuario muestra interés, profundiza en los beneficios del servicio completo:
  * Más preguntas y temas para explorar
  * Capacidad de compartir con seres queridos
  * Creación de un legado duradero
  * Flexibilidad en tiempo y formato (audio/texto)
- Si el usuario muestra dudas o resistencia:
  * Valida sus preocupaciones
  * Ofrece clarificar cualquier duda
  * No presiones, mantén la puerta abierta
- Si el usuario no está interesado:
  * Agradece su tiempo y participación
  * Deja la invitación abierta para el futuro

Formato de respuesta:
- Mantén un tono conversacional y natural
- Usa emojis ocasionalmente para mantener calidez
- Respuestas concisas pero significativas (máximo 3 líneas)
- Personaliza las respuestas basándote en el historial de la conversación
`;

  const userPrompt = `
Historial de la conversación:
${history.map(h => `${h.type === 'incoming' ? 'Usuario' : 'Memori'}: ${h.message}`).join('\n')}

Mensaje actual del usuario:
${message}

Instrucciones:
1. Analiza el historial y el contexto de la conversación
2. Identifica cualquier detalle personal o emoción expresada por el usuario
3. Genera una respuesta que:
   - Sea coherente con la conversación previa
   - Mantenga el tono personal y empático
   - Aborde cualquier pregunta o preocupación
   - Sutilmente resalte el valor del servicio si es apropiado
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
      'Gracias por tu interés en Memori. ¿Hay algo específico que te gustaría saber sobre el servicio? 😊';
  } catch (error) {
    console.error('Error al generar respuesta de cierre:', error);
    return 'Me encantaría ayudarte a preservar tus memorias. ¿Tienes alguna pregunta sobre cómo funciona? 😊';
  }
};
