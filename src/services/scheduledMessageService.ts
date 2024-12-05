import cron from 'node-cron';
import moment from 'moment-timezone';
import User from '../models/UserQuestion'; // Modelo de usuarios
import { sendWhatsAppMessage } from './whatsappService'; // Servicio para enviar mensajes por WhatsApp
import { generateContinueMessage, generateNextQuestionMessage } from './openAIQuestionService';

export class ScheduledMessageService {
  // Inicializa el scheduler para ejecutar cada minuto
  static initScheduler() {
    cron.schedule('0 * * * *', async () => {
      try {
        console.log('Ejecutando verificación de mensajes programados...');
        await ScheduledMessageService.checkScheduledMessages();
      } catch (error) {
        console.error('Error en el scheduler:', error);
      }
    });
  }

  // Verifica y envía los mensajes programados según las preferencias del usuario
  private static async checkScheduledMessages() {
    const now = moment();

    const activeUsers = await User.find({
      'schedule.time': { $exists: true },
      'schedule.days': { $exists: true },
      'schedule.timezone': { $exists: true },
      whatsappNumber: { $exists: true, $ne: null },
    });

    for (const user of activeUsers) {
      const { time, days, timezone } = user.schedule;
      const userTime = now.clone().tz(timezone).format('HH:mm');
      const userDay = now.clone().tz(timezone).format('dddd');

      if (userTime === time && days.includes(userDay)) {
        try {
          await ScheduledMessageService.sendMessageReminder(user);
        } catch (error) {
          console.error(`Error enviando mensaje a ${user.whatsappNumber}:`, error);
        }
      }
    }
  }

  private static async sendMessageReminder(user: any) {
    // Usuario en onboarding
    // if (user.currentStage === 'onboarding') {
    //   message += '¡Bienvenido! Para comenzar, necesitamos algunos datos básicos. ¿Podrías proporcionarlos?';
    //   await sendWhatsAppMessage(user.whatsappNumber, message);
    //   return;
    // }

    // Obtener la pregunta actual
    const currentQuestion = user.questions.find((q: any) => q.questionId === user.currentQuestionId);

    let message = '';
    
    if (currentQuestion.wordCount !== 0) {
      message = await generateContinueMessage(currentQuestion.text);
    } else {
      message = await generateNextQuestionMessage(currentQuestion.text);
    }

    await sendWhatsAppMessage(user.whatsappNumber, message);
    console.log(`Mensaje de recordatorio enviado a ${user.fullName} (${user.whatsappNumber})`);
  }
}
