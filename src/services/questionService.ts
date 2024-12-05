import User from '../models/UserQuestion';
import Question from '../models/Question';
import { generateQuestionMessage, generateQuestionResponse } from './openAIQuestionService';
import { sendTemplateMessage, sendWhatsAppMessage } from './whatsappService';
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

    if (message === 'Seguir escribiendo') {
      // Continuar con la misma pregunta y flujo de generación de respuesta
      await sendWhatsAppMessage(user.whatsappNumber, '¡Genial! Sigamos 💭✨');
      return '';
    } else if (message === 'Siguiente pregunta') {
      user.currentQuestionId++;
      await user.save();
      await sendWhatsAppMessage(user.whatsappNumber, '¡Excelente! Ahora vamos a la siguiente pregunta. \n\n¿Estás listo/a para continuar?💫✨');
      return '';
    } else if (message === 'Terminar por hoy') {
      // aca enviamos el template de agradecimiento y despedida. y que nos vemos en la siguiente sesión
      await sendWhatsAppMessage(user.whatsappNumber, '¡Gracias por tu tiempo! Nos vemos en la próxima sesión. \n\n¡Que tengas un excelente día!😊');
      return '';
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
  
    let sendTemplate = false;
    // Validar si alcanza las 1000 palabras
    if (currentQuestion.wordCount >= 500 && !currentQuestion.isCompleted) {
     // Actualizar estado de completitud
     currentQuestion.isCompleted = true;
     sendTemplate = true;
     currentQuestion.completedCountMessages++;
      await user.save();
    }
    
    // Si no se ha completado, continuar la conversación
    const aiResponse = await generateQuestionResponse({
      summary: currentQuestion.summary || '',
      history: currentQuestion.conversationHistory.slice(-3), // Últimos 3 mensajes
      message: message,
      sendTemplate: sendTemplate,
    });
  
    // Agregar respuesta del bot al historial
    currentQuestion.conversationHistory.push({
      message: aiResponse,
      type: 'outgoing',
      timestamp: new Date(),
    });


    

    if (aiResponse) await sendWhatsAppMessage(user.whatsappNumber, aiResponse);


    if (currentQuestion.isCompleted && currentQuestion.completedCountMessages % 5 === 0) {
      sendTemplate = true;
    }

    if (currentQuestion.isCompleted) currentQuestion.completedCountMessages++;

    if (sendTemplate) await sendTemplateMessage(user.whatsappNumber);

    await user.save();

    return aiResponse;
  }



}