import User from '../models/UserQuestion';
import Question from '../models/Question';
import { filterGenerateQuestionResponse, generateQuestionMessage, generateQuestionResponse, summarizeConversationHistory, filterOnboardingIntent, generateOnboardingResponse } from './openAIQuestionService';
import { sendTemplateMessage, sendWhatsAppAudio, sendWhatsAppMessage, sendWhatsAppVideo } from './whatsappService';

export class QuestionService {
  /**
   * Inicializa un usuario nuevo con la configuración de la etapa de Onboarding.
   */
  static async initializeUser(whatsappNumber: string) {
    const questions = await Question.find().sort({ questionId: 1 }); // Asegura que estén en orden
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
      "¡Hola! Soy Memori 🥸\n\nEstoy aquí para ayudarte a transformar tus recuerdos en un legado lleno de emociones y momentos únicos 🌎. Crearemos juntos tu mini biografía a partir de preguntas interactivas sobre tu vida. \n\n ¿Te gustaría empezar este viaje juntos?";
    await sendWhatsAppMessage(whatsappNumber, welcomeMessage);

    return user;
  }

  /**
   * Maneja la lógica para cada etapa según la etapa actual del usuario.
   */
  static async handleStage(user: any, message: string): Promise<string> {
    console.log(message);
    switch (user.currentStage) {
      case 'new':
        return this.handleNew(user, message);
      case 'onboarding':
        return this.handleOnboarding(user, message);
      case 'questions':
        return this.handleQuestions(user, message); 
      default:
        return 'Lo siento, no reconozco esta etapa. Por favor, contacta con soporte.';
    }
  }

  static async handleOnboarding(user: any, message: string): Promise<string> {
    try {
      // Analizar la intención del usuario
      // obtener ultimos 3 mensajes del historial de onboarding

      if (user.onboarding.history.length === 0) {
        await sendWhatsAppAudio(user.whatsappNumber, 'https://drive.google.com/uc?id=1jFz2gB-mZqyg8po7nifXUdaFfKq6_oei');
        await new Promise(resolve => setTimeout(resolve, 8000)); // Esperar 8 segundos
        await sendWhatsAppMessage(user.whatsappNumber, 'Si tienes alguna pregunta, estoy aquí para ayudar. \n\n¿Vamos por el primer capítulo? 😊');
        user.onboarding.history.push({
          message,
          type: 'incoming',
          timestamp: new Date(),
        });
        user.onboarding.history.push({
          message: '¡Bienvenido a Memori! Mira este video para aprender cómo usar la plataforma 🎥\n\nMe puedes responder con texto ✍️ o enviar un audio 🎤. Lo que más te acomode.',
          type: 'outgoing',
          timestamp: new Date(),
        });
        return '';
      }
      const lastThreeMessages = user.onboarding.history.slice(-3);
      const intent = await filterOnboardingIntent(message, lastThreeMessages);
      
      // Generar una respuesta basada en la intención
      
      // Si el usuario está listo para comenzar
      if (intent === 'ready') {
        // Actualizar el estado del usuario
        user.currentStage = 'questions';
        user.currentQuestionId = 0;
        await user.save();
        
        // Enviar mensaje de transición
        const response = 'Genial, ahora vamos a empezar con el primer capítulo! \n\n🥁 *Redoble de tambores* 🥁 Prepárate para un viaje lleno de recuerdos especiales.\n\nMe puedes responder con texto ✍️ o enviar un audio 🎤. Lo que más te acomode.';
        await sendWhatsAppMessage(user.whatsappNumber, response);
        await this.handleQuestions(user, message);
        return '';
      }

      const response = await generateOnboardingResponse(message, lastThreeMessages);


      // Agregar el mensaje recibido al historial de onboarding
      user.onboarding.history.push({
        message,
        type: 'incoming',
        timestamp: new Date(),
      });

      user.onboarding.history.push({
        message: response,
        type: 'outgoing',
        timestamp: new Date(),
      });
      
      // Para cualquier otra intención, solo enviar la respuesta generada
      await sendWhatsAppMessage(user.whatsappNumber, response);
      return '';
    } catch (error) {
      console.error('Error en handleOnboarding:', error);
      return 'Lo siento, ha ocurrido un error. Por favor, contacta con soporte.';
    }
  }

  /**
   * Maneja el flujo de Onboarding.
   */
  static async handleNew(user: any, message: string): Promise<string> {
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
      await sendWhatsAppMessage(user.whatsappNumber, questions[currentQuestion]);
      return '';
    }

    // Si Onboarding está completo, transicionar a Infancia
    user.currentStage = 'questions';
    user.currentQuestion = 0;
    await user.save();
    
    await sendWhatsAppMessage(user.whatsappNumber, `Genial, ahora vamos a empezar con el primer capítulo! \n\n🥁 *Redoble de tambores* 🥁 Prepárate para un viaje lleno de recuerdos especiales.\n\nMe puedes responder con texto ✍️ o enviar un audio 🎤. Lo que más te acomode.`);
    await sendWhatsAppMessage(user.whatsappNumber, `¿Comencémos? 💫✨`);
    return '';
  }

  static async handleQuestions(user: any, message: string): Promise<string> {
    // Obtener la pregunta actual del usuario
    const currentQuestion = user.questions[user.currentQuestionId];
  
    // Si no hay pregunta actual, significa que no está inicializado correctamente
    if (!currentQuestion) {
      await sendWhatsAppMessage(user.whatsappNumber, 'No hay capítulo actual configurado. Por favor, contacta con soporte.');
      return '';
    }

    if (message === 'Seguir escribiendo') {
      // Continuar con la misma pregunta y flujo de generación de respuesta
      await sendWhatsAppMessage(user.whatsappNumber, '¡Genial! Sigamos 💭✨');
      return '';
    } else if (message === 'Siguiente capítulo') {
      user.currentQuestionId++;
      await user.save();
      const totalQuestions = user.questions.length;
      const currentQuestionNumber = user.currentQuestionId + 1;
      const text = `¡Excelente! Ahora vamos al siguiente capítulo. \n\nLlevas ${currentQuestionNumber} de ${totalQuestions} capítulos. 🙌\n\n¿Continuamos? 💫✨`;
      await sendWhatsAppMessage(user.whatsappNumber, text);
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


    currentQuestion.messageCounter++;
    // Si se alcanza el contador de 5 mensajes, generar resumen y validar
    if (currentQuestion.messageCounter >= 5) {
      console.log('join')
      const lastFiveMessages = currentQuestion.conversationHistory.slice(-5);
      console.log(lastFiveMessages)

      // GENERAR RESUMEN
      if (lastFiveMessages.length > 0) {
        const response = await summarizeConversationHistory(lastFiveMessages);
        console.log('rsp',response)
        // ACTUALIZAR SUMMARY
        currentQuestion.summary += `\n- ${response}`;
        currentQuestion.messageCounter = 0;
      }
    }
    console.log('join2')


    if (currentQuestion.wordCount === 0) {
      // Se envia la pregunta al usuario
      const questionMessage = await generateQuestionMessage(currentQuestion.text, currentQuestion.questionId);
      currentQuestion.conversationHistory.push({
        message: questionMessage,
        type: 'outgoing',
        timestamp: new Date(),
      });
      currentQuestion.wordCount += message.trim().split(/\s+/).length;
      await sendWhatsAppMessage(user.whatsappNumber, questionMessage);
      return '';
    }
    console.log('1')
    currentQuestion.wordCount += message.trim().split(/\s+/).length;
  
    let sendTemplate = false;
    // Validar si alcanza las 1000 palabras
    if (currentQuestion.wordCount >= 250 && !currentQuestion.isCompleted) {
     // Actualizar estado de completitud
     currentQuestion.isCompleted = true;
     sendTemplate = true;
     currentQuestion.completedCountMessages++;
      await user.save();
    }
    
    console.log('2')
    const response = await generateQuestionResponse({
      question: currentQuestion.text,
      summary: currentQuestion.summary || '',
      history: currentQuestion.conversationHistory.slice(-5), 
      message: message,
    });
    console.log(response);
    let aiResponse = await filterGenerateQuestionResponse({
      question: currentQuestion.text,
      summary: currentQuestion.summary || '',
      history: currentQuestion.conversationHistory.slice(-5),
      message: message,
      aiResponse: response,
    });
    if (aiResponse.startsWith('"') && aiResponse.endsWith('"')) {
      aiResponse = aiResponse.slice(1, -1);
    }
    console.log(aiResponse);
  
    // Agregar respuesta del bot al historial
    currentQuestion.conversationHistory.push({
      message: aiResponse,
      type: 'outgoing',
      timestamp: new Date(),
    });


    

    if (aiResponse) await sendWhatsAppMessage(user.whatsappNumber, aiResponse);

    console.log(currentQuestion.isCompleted)
    console.log(currentQuestion.completedCountMessages % 5 === 0)

    if (currentQuestion.isCompleted && currentQuestion.completedCountMessages % 5 === 0) {
      sendTemplate = true;
    }

    if (currentQuestion.isCompleted) currentQuestion.completedCountMessages++;

    if (sendTemplate) await sendTemplateMessage(user.whatsappNumber);

    await user.save();

    return aiResponse;
  }



}