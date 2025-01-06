import User from '../models/UserQuestion';
import Question from '../models/Question';
import { filterGenerateQuestionResponse, generateQuestionMessage, generateQuestionResponse, summarizeConversationHistory, filterOnboardingIntent, generateOnboardingResponse } from './openAIQuestionService';
import { sendTemplateMessageNextQuestion, sendWhatsAppAudio, sendWhatsAppMessage, sendWhatsAppVideo } from './whatsappService';

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
        await sendWhatsAppMessage(user.whatsappNumber, 'Buenísimo! Te invito a que veas este video para conocernos y para explicarte como funciona Memori');
        await sendWhatsAppVideo(user.whatsappNumber, 'https://drive.google.com/uc?id=1FumCpfu2W0nIdio41WqWrf8xg_pthyFu');
        await new Promise(resolve => setTimeout(resolve, 15000)); 
        await sendWhatsAppMessage(user.whatsappNumber, 'Si tienes alguna pregunta, estoy aquí para ayudar. \n\n¿Vamos por el primer capítulo? 😊');
        user.onboarding.history.push({
          message,
          type: 'incoming',
          timestamp: new Date(),
        });
        user.onboarding.history.push({
          message: '¡Bienvenido a Memori! Mira este video para conocernos y para explicarte como funciona Memori. [VIDEO]',
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
        // const response = 'Genial, ahora vamos a empezar con el primer capítulo! \n\nPrepárate para un viaje lleno de recuerdos especiales 🙌\n\nMe puedes responder con texto ✍️ o enviar un audio 🎤. Lo que más te acomode.';
        // await sendWhatsAppMessage(user.whatsappNumber, response);
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
    } else if (message === 'Siguiente pregunta') {

      // comparemos si la pregunta actual tiene el mismo chapter que la siguiente pregunta
      if (user.questions[user.currentQuestionId].chapter !== user.questions[user.currentQuestionId + 1].chapter) {
        const nextChapter = user.questions[user.currentQuestionId + 1].chapter;
        
        // Obtener todas las preguntas del siguiente capítulo
        const nextChapterQuestions = user.questions.filter(
          (q: any) => q.chapter === nextChapter
        );

        // Calcular cantidad de capítulos únicos
        const uniqueChapters = [...new Set(user.questions.map((q: any) => q.chapter))];
        
        // Obtener la posición del capítulo actual
        const currentChapterIndex = uniqueChapters.indexOf(nextChapter);
        
        // Convertir la posición a texto ordinal
        const ordinalNumbers = ['primer', 'segundo', 'tercer', 'cuarto', 'quinto', 'sexto', 'séptimo', 'octavo', 'noveno', 'décimo'];
        const chapterText = ordinalNumbers[currentChapterIndex];

        // Simulamos la generación del mensaje introductorio
        const chapterIntro = generateChapterIntro(nextChapter, chapterText);
        const questionsList = generateQuestionsPreview(nextChapterQuestions);

        // Enviamos los mensajes
        await sendWhatsAppMessage(user.whatsappNumber, chapterIntro);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Pequeña pausa entre mensajes
        await sendWhatsAppMessage(user.whatsappNumber, questionsList);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await sendWhatsAppMessage(user.whatsappNumber, "¿Comenzamos con la primera pregunta? 😊");
      } else {
        // Obtener el capítulo actual
        const currentQuestion = user.questions[user.currentQuestionId];
        const currentChapter = currentQuestion.chapter;
        
        // Obtener todas las preguntas del capítulo actual
        const questionsInChapter = user.questions.filter((q: any) => q.chapter === currentChapter);
        const totalQuestionsChapter = questionsInChapter.length;
        
        // Obtener el número de la pregunta actual dentro del capítulo
        const currentQuestionNumberChapter = questionsInChapter.findIndex((q: any) => q.questionId === currentQuestion.questionId) + 1;

        const nextChapter = user.questions[user.currentQuestionId + 1].chapter;
        await sendWhatsAppMessage(
          user.whatsappNumber, 
          `¡Excelente! Ahora vamos a la siguiente pregunta del capítulo "*${nextChapter}*". \n\nLlevas ${currentQuestionNumberChapter} de ${totalQuestionsChapter} preguntas. 🙌\n\n¿Continuamos?`
        );
      }
      currentQuestion.isCompleted = true;
      user.currentQuestionId++;
      await user.save();
      return '';
    } else if (message === 'Terminar por hoy') {
      // aca enviamos el template de agradecimiento y despedida. y que nos vemos en la siguiente sesión
      await sendWhatsAppMessage(user.whatsappNumber, '¡Gracias por tu tiempo! Nos vemos en la próxima sesión. \n\n¡Que tengas un excelente día!😊');
      return '';
    }


    if (currentQuestion.wordCount === 0 && user.currentQuestionId === 0 && currentQuestion.conversationHistory.length === 0) {
      const chapter = user.questions[user.currentQuestionId].chapter;
        
      // Obtener todas las preguntas del siguiente capítulo
      const chapterQuestions = user.questions.filter(
        (q: any) => q.chapter === chapter
      );

      // Simulamos la generación del mensaje introductorio
      const chapterIntro = generateChapterIntroFirst(chapter, chapterQuestions);
      const questionsList = generateQuestionsPreview(chapterQuestions);

      // Enviamos los mensajes
      await sendWhatsAppMessage(user.whatsappNumber, chapterIntro);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Pequeña pausa entre mensajes
      await sendWhatsAppMessage(user.whatsappNumber, questionsList);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await sendWhatsAppMessage(user.whatsappNumber, "¿Comenzamos con la primera pregunta? 😊");
      currentQuestion.conversationHistory.push({
        message: chapterIntro,
        type: 'outgoing',
        timestamp: new Date(),
      });
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
      const lastFiveMessages = currentQuestion.conversationHistory.slice(-5);

      // GENERAR RESUMEN
      if (lastFiveMessages.length > 0) {
        const response = await summarizeConversationHistory(lastFiveMessages);
        // ACTUALIZAR SUMMARY
        currentQuestion.summary += `\n- ${response}`;
        currentQuestion.messageCounter = 0;
      }
    }


    if (currentQuestion.wordCount === 0) {
      // Se envia la pregunta al usuario
      // si es el primer capitulo, vamos a enviar un mensaje introductorio (title and description)
      // y tambien enviaremos un mensaje con las preguntas del capitulo 
      // finalizando con un mensaje de, comenzamos con la primera pregunta? 


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
    currentQuestion.wordCount += message.trim().split(/\s+/).length;
  
    let sendTemplate = false;
    // Validar si alcanza las 1000 palabras
    if (currentQuestion.wordCount >= (currentQuestion.minWords || 250) && !currentQuestion.isCompleted) {
     // Actualizar estado de completitud
     currentQuestion.isCompleted = true;
     sendTemplate = true;
     currentQuestion.completedCountMessages++;
      await user.save();
    }
    
    const aiResponse = await generateQuestionResponse({
      question: currentQuestion.text,
      summary: currentQuestion.summary || '',
      history: currentQuestion.conversationHistory.slice(-5), 
      message: message,
      metadata: currentQuestion.metadata || '',
    });

    // let aiResponse = await filterGenerateQuestionResponse({
    //   question: currentQuestion.text,
    //   summary: currentQuestion.summary || '',
    //   history: currentQuestion.conversationHistory.slice(-5),
    //   message: message,
    //   aiResponse: response,
    // });
    // if (aiResponse.startsWith('"') && aiResponse.endsWith('"')) {
    //   aiResponse = aiResponse.slice(1, -1);
    // }

    // Modificaciones al texto con 50% de probabilidad cada una
    let modifiedResponse = aiResponse;

    // Quitar "¿" - 50% probabilidad
    if (Math.random() < 0.5) {
      modifiedResponse = modifiedResponse.replace(/¿/g, '');
    }

    // Quitar "¡" - 50% probabilidad
    if (Math.random() < 0.5) {
      modifiedResponse = modifiedResponse.replace(/¡/g, '');
    }

    // Primera mayúscula a minúscula - 50% probabilidad
    if (Math.random() < 0.5) {
      const firstUpperCase = modifiedResponse.match(/[A-ZÁ-Ú]/);
      if (firstUpperCase) {
        const index = modifiedResponse.indexOf(firstUpperCase[0]);
        modifiedResponse = 
          modifiedResponse.substring(0, index) + 
          firstUpperCase[0].toLowerCase() + 
          modifiedResponse.substring(index + 1);
      }
    }

    // Agregar respuesta del bot al historial
    currentQuestion.conversationHistory.push({
      message: modifiedResponse,
      type: 'outgoing',
      timestamp: new Date(),
    });

    if (modifiedResponse) await sendWhatsAppMessage(user.whatsappNumber, modifiedResponse);

    if (currentQuestion.isCompleted && currentQuestion.completedCountMessages % 5 === 0) {
      sendTemplate = true;
    }

    if (currentQuestion.isCompleted) currentQuestion.completedCountMessages++;

    if (sendTemplate) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const nextQuestion = user.questions[user.currentQuestionId + 1];
      const q = nextQuestion.text.replace(/^["¿"]|["?"]$/g, '');
      await sendTemplateMessageNextQuestion(user.whatsappNumber, 'HX4908b086136bdac6969c32a2aafaf2bb', q);
    }
    await user.save();

    return aiResponse;
  }



}

  function generateChapterIntro(chapter: string, chapterText: string): string {
    return `Terminamos el ${chapterText} capítulo, ahora vamos a explorar una nueva etapa de tu vida...\n\nCAPÍTULO: *${chapter.toUpperCase()}*`;
  }

  function generateChapterIntroFirst(chapter: string, questions: any[]): string {
    return `Empecemos con el primer capítulo de tu vida... 🌎\n\nCAPÍTULO: *${chapter.toUpperCase()}*`;
  }

function generateQuestionsPreview(questions: any[]): string {
  const questionsList = questions
    .map((q, index) => `${index + 1}. ${q.text}`)
    .join('\n');
  
  return `En este capítulo responderemos las siguientes preguntas:\n\n${questionsList}`;
}