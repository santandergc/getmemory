import cron from 'node-cron';
import moment from 'moment-timezone';
import User from '../models/UserQuestion'; // Modelo de usuarios
import { sendWhatsAppMessage, sendWhatsAppVideo } from './whatsappService'; // Servicio para enviar mensajes por WhatsApp
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
      'reminder.time': { $exists: true, $ne: '' },
      'reminder.recurrency': { $exists: true, $ne: '' },
      'reminder.timeZone': { $exists: true, $ne: '' },
      'reminder.active': true,
      whatsappNumber: { $exists: true, $ne: null },
    });

    for (const user of activeUsers) {
      try {
        const { time, recurrency, timeZone } = user.reminder;
        const userTime = now.clone().tz(timeZone).format('HH:mm');
        
        // Calculamos los días transcurridos desde la última actualización
        const lastUpdate = moment(user.updatedAt).tz(timeZone);
        const daysSinceLastUpdate = now.clone().tz(timeZone).diff(lastUpdate, 'days');
        
        // Verificamos si es hora de enviar el mensaje
        if (userTime === time) {
          const recurrencyDays = parseInt(recurrency);
          
          // Verificamos si han pasado múltiplos del período de recurrencia
          if (daysSinceLastUpdate >= recurrencyDays && daysSinceLastUpdate % recurrencyDays === 0) {
            console.log(`Enviando recordatorio a ${user.fullName}. Días sin actividad: ${daysSinceLastUpdate}`);
            await ScheduledMessageService.sendMessageReminder(user);
          }
        }
      } catch (error) {
        console.error(`Error procesando usuario ${user.whatsappNumber}:`, error);
      }
    }
  }

  private static async sendMessageReminder(user: any) {
    // Si el usuario está en onboarding, enviar mensaje de bienvenida
    // if (user.currentStage === 'onboarding' && !user.started) {
    //   await sendWhatsAppMessage(user.whatsappNumber, `¡Hola ${user.fullName}! \n\n Bienvenido a Memori 🥸. Tenemos una sorpresa para ti... Mira este video 🎥`);
    //   await sendWhatsAppVideo(user.whatsappNumber, 'https://drive.google.com/uc?id=1FQZJ8lgDF91d_pH4xKJ_gTf7I4GtzYyd');
    //   await new Promise(resolve => setTimeout(resolve, 12000)); // Esperar 8 segundos
    //   await sendWhatsAppMessage(user.whatsappNumber, 'Me puedes responder con texto ✍️ o enviar un audio 🎤. Lo que más te acomode. \n\n¿Comenzamos? 😊');
    //   user.started = true;
    //   await user.save();
    //   return;
    // }

    // Obtener la pregunta actual
    const currentQuestion = user.questions.find((q: any) => q.questionId === (user.currentQuestionId + 1));
    
    // Verificar si se encontró la pregunta
    if (!currentQuestion) {
        console.error(`No se encontró la pregunta actual para el usuario ${user.whatsappNumber}`);
        return;
    }

    const message = currentQuestion.wordCount !== 0 
      ? await generateContinueMessage(currentQuestion.text)
      : await generateNextQuestionMessage(currentQuestion.text);

    await sendWhatsAppMessage(user.whatsappNumber, message);
    console.log(`Mensaje de recordatorio enviado a ${user.fullName} (${user.whatsappNumber})`);
  }
}
