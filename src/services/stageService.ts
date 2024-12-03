import User from '../models/User';
import { generateAIResponse, generateInfanciaResponse, summarizeConversationHistory, analyzeStageTransitionIntent, generateAdolescenciaResponse } from './openAIService';
import { sendWhatsAppMessage } from './whatsappService';
import { transcribeAudio } from './whisperService';

export class StageService {
  /**
   * Inicializa un usuario nuevo con la configuración de la etapa de Onboarding.
   */
  static async initializeUser(whatsappNumber: string) {
    const user = new User({
      whatsappNumber,
      currentStage: "onboarding",
      currentQuestion: 0,
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
      case 'infancia':
        return this.handleInfancia(user, message); 
      case 'adolescencia':
        return this.handleAdolescencia(user, message);
      case 'adultez':
        return this.handleAdultez(user, message);
      case 'vejez':
        return this.handleVejez(user, message);
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
      '¡Gracias! Ahora me encantaría saber un poco más de ti. ¿Dónde y cuándo naciste? 🌍✨',
      '¡Genial! 🌟 Esto va a ser un viaje increíble por tus recuerdos. ¿Estás listo/a para comenzar?',
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
    user.currentStage = 'infancia';
    user.currentQuestion = 0;
    await user.save();
    
    return '¡Vamos! La infancia siempre está llena de momentos únicos y especiales. 🧸 ¿Por dónde te gustaría empezar a recordar? 😊';
  }

  /**
   * Maneja el flujo de Infancia.
   */
  static async handleInfancia(user: any, message: string): Promise<string> {
    const currentStage = user.stages.find((stage: any) => stage.name === 'infancia');

    if (!currentStage) {
      user.stages.push({
        name: 'infancia',
        chatHistory: [
          {
            message: user.fullName,
            type: 'incoming',
            timestamp: new Date()
          },
          {
            message: user.birthInfo,
            type: 'incoming', 
            timestamp: new Date()
          },
          {
            message: "¡Qué lindo! La infancia siempre está llena de momentos únicos y especiales. 🧸 ¿Por dónde te gustaría empezar a recordar? 😊",
            type: 'outgoing',
            timestamp: new Date()
          }
        ],
        summary: '',
        isCompleted: false,
        completedCounter: 0,
        messageCounter: 0,
      });
      await user.save();
    }

    const stage = user.stages.find((stage: any) => stage.name === 'infancia');
    stage.chatHistory.push({
      message,
      type: 'incoming',
      timestamp: new Date(),
    });
    stage.messageCounter++;
    

    // si la etapa está completa, y ademas el completedCounter es 3. Preguntar si quiere continuar con la siguiente etapa 
    if (stage.isCompleted) {
      const history = stage.chatHistory.slice(-3).map((msg: any) => msg.message);
      const intent = await analyzeStageTransitionIntent(message, history, 'adolescencia');
      console.log(intent);
      
      if (intent === 'afirmativa') {
        user.currentStage = 'adolescencia';
        stage.completedCounter = 0;
        await user.save();
        return this.handleAdolescencia(user, message);
      }
    }
    stage.completedCounter++;

    // Si se alcanza el contador de 5 mensajes, generar resumen y validar
    if (stage.messageCounter >= 5) {
      const lastFiveMessages = stage.chatHistory.slice(-5);

      // GENERAR RESUMEN
      const response = await summarizeConversationHistory(lastFiveMessages);

      // ACTUALIZAR VALIDATORS
      const validators = response.validators as { family: boolean; friends: boolean; school: boolean; };
      const currentValidators = user.stages.find((stage: any) => stage.name === 'infancia').validators || [];
      Object.entries(validators).forEach(([key, value]) => {
        if (value && !currentValidators.includes(key)) {
          currentValidators.push(key);
        }
      });
      user.stages.find((stage: any) => stage.name === 'infancia').validators = currentValidators;
      // SI SON TODOS TRUE, COMPLETAR LA ETAPA
      if (currentValidators.length === 3) {
        user.stages.find((stage: any) => stage.name === 'infancia').isCompleted = true;
      }
      // ACÁ DEBERIAMOS PREGUNTARLE AL USUARIO SI QUIERE CONTINUAR CON LA SIGUIENTE ETAPA (PENDIENTE)
      
      // ACTUALIZAR SUMMARY
      const summary = response.summary;
      stage.summary += `\n- ${summary}`;
      stage.messageCounter = 0;
    }

    // Obtener los últimos dos mensajes relevantes del historial (penúltimo y último)
    const history = stage.chatHistory.slice(-3).map((msg: any) => msg.message);

    // Generar respuesta del modelo
    const response = await generateInfanciaResponse({
      summary: currentStage.summary || '', // Resumen acumulado de la etapa
      history, // Últimos tres mensajes
      message, // Mensaje más reciente
      completedCounter: stage.completedCounter,
      isCompleted: stage.isCompleted,
    });

    // Agregar la respuesta generada al historial
    currentStage.chatHistory.push({
      message: response,
      type: 'outgoing',
      timestamp: new Date(),
    });

    return response;
  }

  static async handleAdolescencia(user: any, message: string): Promise<string> {
    const currentStage = user.stages.find((stage: any) => stage.name === 'adolescencia');

    if (!currentStage) {
      user.stages.push({
        name: 'adolescencia',
        chatHistory: [],
        summary: '',
        isCompleted: false,
        completedCounter: 0,
        messageCounter: 0,
        validators: [],
      });
      await user.save();
    }

    const stage = user.stages.find((stage: any) => stage.name === 'adolescencia');
    stage.chatHistory.push({
      message,
      type: 'incoming',
      timestamp: new Date(),
    });
    stage.messageCounter++;

    // Verificar si quiere pasar a la siguiente etapa
    if (stage.isCompleted) {
      const history = stage.chatHistory.slice(-3).map((msg: any) => msg.message);
      const intent = await analyzeStageTransitionIntent(message, history, 'adultez');
      
      if (intent === 'afirmativa') {
        user.currentStage = 'adultez';
        stage.completedCounter = 0;
        await user.save();
        return this.handleAdultez(user, message);
      }
    }
    stage.completedCounter++;

    // Generar resumen cada 5 mensajes
    if (stage.messageCounter >= 5) {
      const lastFiveMessages = stage.chatHistory.slice(-5);
      const response = await summarizeConversationHistory(lastFiveMessages);

      // Actualizar validadores
      const validators = response.validators as { family: boolean; friends: boolean; school: boolean; };
      const currentValidators = user.stages.find((stage: any) => stage.name === 'adolescencia').validators || [];
      Object.entries(validators).forEach(([key, value]) => {
        if (value && !currentValidators.includes(key)) {
          currentValidators.push(key);
        }
      });
      user.stages.find((stage: any) => stage.name === 'adolescencia').validators = currentValidators;

      if (currentValidators.length === 3) {
        user.stages.find((stage: any) => stage.name === 'adolescencia').isCompleted = true;
      }

      // Actualizar resumen
      const summary = response.summary;
      stage.summary += `\n- ${summary}`;
      stage.messageCounter = 0;
    }

    // Generar respuesta
    const history = stage.chatHistory.slice(-3).map((msg: any) => msg.message);
    const response = await generateAdolescenciaResponse({
      summary: currentStage.summary || '',
      history,
      message,
      completedCounter: stage.completedCounter,
      isCompleted: stage.isCompleted,
    });

    // Guardar respuesta en el historial
    currentStage.chatHistory.push({
      message: response,
      type: 'outgoing',
      timestamp: new Date(),
    });

    await user.save();
    return response;
  }

  static async handleAdultez(user: any, message: string): Promise<string> {
    return "Adultez";
  }

  static async handleVejez(user: any, message: string): Promise<string> {
    return "Vejez";
  }

  /**
   * Transcribe un mensaje de audio.
   */
  static async transcribeAudio(mediaUrl: string): Promise<string> {
    return transcribeAudio(mediaUrl);
  }
}
