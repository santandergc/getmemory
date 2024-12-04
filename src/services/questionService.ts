import User from '../models/UserQuestion';
import Question from '../models/Question';
import { generateQuestionMessage, generateQuestionResponse } from './openAIQuestionService';
import { sendWhatsAppMessage } from './whatsappService';
import { transcribeAudio } from './whisperService';

export class QuestionService {
  /**
   * Inicializa un usuario nuevo con la configuración de la etapa de Onboarding.
   */
  static async initializeUser(whatsappNumber: string) {
    const questions = await Question.find().sort({ questionId: 1 }); // Asegura que estén en orden
    console.log(questions);
    const user = new User({
      whatsappNumber,
      fullName: '',
      birthInfo: '',
      currentStage: "onboarding",
      currentQuestionId: 0,
      questions: questions.map((q) => ({
        questionId: q.questionId,
        text: q.text,
        summary: '',
        conversationHistory: [],
        wordCount: 0,
        isCompleted: false,
      })),
    });
    await user.save();

    const welcomeMessage =
      "¡Hola! Soy Bernandita, de Memori. 😊 \nEstoy aquí para ayudarte a transformar tus recuerdos en un legado lleno de emociones y momentos únicos 🌎. ¿Te gustaría empezar este viaje juntos?";
    await sendWhatsAppMessage(whatsappNumber, welcomeMessage);

    return user;
  }

  /**
   * Maneja la lógica para cada etapa según la etapa actual del usuario.
   */
  static async handleStage(user: any, message: string): Promise<string> {
    switch (user.currentStage) {
      case 'onboarding':
        return this.handleOnboarding(user, message);
      case 'questions':
        return this.handleQuestions(user, message); 
      default:
        return 'Lo siento, no reconozco esta etapa. Por favor, contacta con soporte.';
    }
  }

  /**
   * Maneja el flujo de Onboarding.
   */
  static async handleOnboarding(user: any, message: string): Promise<string> {
    const questions = [
      '¡Qué emoción conocerte! 💫 Para comenzar, ¿podrías contarme tu nombre completo?',
      '¡Gracias! Ahora me encantaría saber un poco más de ti. \n\n¿Dónde y cuándo naciste? 🌍✨',
    ];

    const currentQuestion = user.currentQuestion;
    
    // Guardar las respuestas según la pregunta actual
    if (currentQuestion === 1) {
      user.fullName = message;
    } else if (currentQuestion === 2) {
      user.birthInfo = message;
    }
    
    await user.save();

    if (currentQuestion < questions.length) {
      user.currentQuestion++;
      return questions[currentQuestion];
    }

    // Si Onboarding está completo, transicionar a Infancia
    user.currentStage = 'questions';
    user.currentQuestion = 0;
    await user.save();
    
    return `Genial, ahora vamos a empezar con la primera pregunta! \n\n🥁 *Redoble de tambores* 🥁 Prepárate para un viaje lleno de recuerdos especiales.\n\n¿Estás listo/a para comenzar?💫✨`;
  }

  static async handleQuestions(user: any, message: string): Promise<string> {
    // Obtener la pregunta actual del usuario
    const currentQuestion = user.questions[user.currentQuestionId];
  
    // Si no hay pregunta actual, significa que no está inicializado correctamente
    if (!currentQuestion) {
      return 'No hay una pregunta actual configurada. Por favor, contacta con soporte.';
    }
  
    // Agregar el mensaje recibido al historial de la pregunta
    currentQuestion.conversationHistory.push({
      message,
      type: 'incoming',
      timestamp: new Date(),
    });


    if (currentQuestion.wordCount === 0) {
      // Se envia la pregunta al usuario
      const questionMessage = await generateQuestionMessage(currentQuestion.text);
      currentQuestion.conversationHistory.push({
        message: questionMessage,
        type: 'outgoing',
        timestamp: new Date(),
      });
      currentQuestion.wordCount += message.trim().split(/\s+/).length;
      return questionMessage;
    }

    currentQuestion.wordCount += message.trim().split(/\s+/).length;
  
    // Validar si alcanza las 1000 palabras
    if (currentQuestion.wordCount >= 1000) {
      // Actualizar estado de completitud
      currentQuestion.isCompleted = true;
      await user.save();
  
      // Enviar opciones al usuario USAR TWILIO BUTTONS
      const optionsMessage = `
        ¡Gracias por compartir tantos detalles sobre esta pregunta! 📝
        Con esta información, creo que tenemos mucho para guardar.
        ¿Qué te gustaría hacer ahora?
        1️⃣ Pasar a la siguiente pregunta.
        2️⃣ Terminar por hoy.
        3️⃣ Seguir escribiendo sobre esta pregunta.
      `;
  
      return optionsMessage;
    }
  
    // Si no se ha completado, continuar la conversación
    const aiResponse = await generateQuestionResponse({
      summary: currentQuestion.summary || '',
      history: currentQuestion.conversationHistory.slice(-3), // Últimos 3 mensajes
      message: message,
    });
  
    // Agregar respuesta del bot al historial
    currentQuestion.conversationHistory.push({
      message: aiResponse,
      type: 'outgoing',
      timestamp: new Date(),
    });
  
    return aiResponse;
  }



}