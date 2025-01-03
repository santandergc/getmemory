import { Request, Response } from 'express';
import UserFreeTrial from '../models/UserFreeTrail';
import { sendWhatsAppAudio, sendWhatsAppMessage, sendWhatsAppVideo } from '../services/whatsappService';
import { transcribeAudio } from '../services/whisperService';
import { FreetrialService } from '../services/freetrialService';
import { generateClosingConversation } from '../services/openAIFreetrialService';
import { generateQuestionMessage, generateQuestionResponse, filterGenerateQuestionResponse } from '../services/openAIQuestionService';

const NUMBER = process.env.TWILIO_WHATSAPP_NUMBER_FREE_TRIAL;

export async function handleIncomingMessageFreeTrial(req: Request, res: Response) {
  try {
    const {
        From: from,
        Body: messageText,
        MediaUrl0: mediaUrl,
        MediaContentType0: mediaContentType,
        MessageStatus: messageStatus,
        NumMedia,
      } = req.body;

      // Ignore status updates
      if (messageStatus) {
        return res.status(200).send({
          success: true,
          message: 'Actualización de estado procesada',
        });
      }

      
      const whatsappNumber = from.replace('whatsapp:', '');
      const isAudioMessage = mediaContentType === 'audio/ogg' && NumMedia === '1';

      let processedMessage = messageText;

      // Handle audio transcription if applicable
      if (isAudioMessage && mediaUrl) {
        try {
          processedMessage = await transcribeAudio(mediaUrl);
        } catch (error) {
          console.error('Error transcribing audio:', error);
          await sendWhatsAppMessage(
            whatsappNumber,
            'Lo siento, tuve problemas para procesar el audio. ¿Podrías intentar enviarlo de nuevo?'
          );
          return res.status(200).send({ success: true });
        }
      }

      // Retrieve or initialize user
      let user = await UserFreeTrial.findOne({ whatsappNumber });
      if (!user) {
        user = await FreetrialService.createUser(whatsappNumber);
        await sendWhatsAppMessage(whatsappNumber, '¡Hola! Bienvenido a la prueba gratuita de Memori.\n\nEstas listo para empezar?');
        return;
      }

      user.history.push({
        message: processedMessage,
        type: 'incoming',
        timestamp: new Date(),
      });
      console.log(processedMessage);

      if (user.status === 0) {
        await sendWhatsAppVideo(
          user.whatsappNumber, 
          'https://drive.google.com/uc?id=1jFz2gB-mZqyg8po7nifXUdaFfKq6_oei', 
          NUMBER
        );
        await new Promise(resolve => setTimeout(resolve, 8000)); 
        await sendWhatsAppMessage(user.whatsappNumber, '¿Comenzamos?', NUMBER);
        user.status = 1;
        await user.save();
        res.status(200).send({ success: true, message: 'Usuario creado correctamente' });
        return;

      } else if (user.status === 1) {
        await sendWhatsAppMessage(
          user.whatsappNumber,
          `Genial 😊\n\nMe puedes responder con texto ✍️ o enviar un audio 🎤. Lo que más te acomode.\n\n¿Vamos por el primer capítulo?`,
          NUMBER
        );
        user.history.push({
          message: 'Genial 😊\n\nRecuerda que puedes enviarme un audio o un texto para responderte. No te preocupes si tus respuestas son muy largas, de hecho mucho mejor para nosotros.\n\n¿Vamos por el primer capítulo?',
          type: 'outgoing',
          timestamp: new Date(),
        });
        user.status = 2;
        await user.save();
        res.status(200).send({ success: true, message: 'Usuario creado correctamente' });
        return;

      } else if (user.status === 2) {
        await sendWhatsAppMessage(
          user.whatsappNumber,
          `Vamos a empezar con el primer capítulo! \n\n🥁 *Redoble de tambores* 🥁 Prepárate para un viaje lleno de recuerdos especiales.`,
          NUMBER
        );
        const questionMessage = await generateQuestionMessage('¿Dónde naciste y cómo era el lugar donde creciste?', 1);
        user.status = 3;
        user.history.push({
          message: questionMessage,
          type: 'incoming',
          timestamp: new Date(),
        });
        await sendWhatsAppMessage(user.whatsappNumber, questionMessage, NUMBER);
        await user.save();
        res.status(200).send({ success: true, message: 'Usuario creado correctamente' });
        return;

      } else if (user.status === 3 && user.freeMessages < 4) {
        const response = await generateQuestionResponse({
          question: '¿Dónde naciste y cómo era el lugar donde creciste?',
          summary: '',
          history: user.history.slice(-5).map(message => message.message), 
          message: processedMessage,
        });
        let aiResponse = await filterGenerateQuestionResponse({
          question: '¿Dónde naciste y cómo era el lugar donde creciste?',
          summary: '',
          history: user.history.slice(-5).map(message => message.message),
          message: processedMessage,
          aiResponse: response,
        });
        if (aiResponse.startsWith('"') && aiResponse.endsWith('"')) {
          aiResponse = aiResponse.slice(1, -1);
        }
        user.history.push({
          message: aiResponse,
          type: 'outgoing',
          timestamp: new Date(),
        });
        user.freeMessages++;
        await sendWhatsAppMessage(user.whatsappNumber, aiResponse, NUMBER);
        await user.save();
        res.status(200).send({ success: true, message: 'Usuario creado correctamente' });
        return;

      } else if (user.status === 3 && user.freeMessages === 4) {
        await sendWhatsAppMessage(
          user.whatsappNumber,
          'Qué te ha parecido la experiencia? Es muy simple, pero espero que te haya servido para recordar cosas importantes de tu infancia. \n\nAcá te dejo un link para que puedas ver las biografías que creamos 😊',
          NUMBER
        );
        await sendWhatsAppMessage(
          user.whatsappNumber,
          'https://getmemori.org/biography',
          NUMBER
        );
        await sendWhatsAppMessage(
          user.whatsappNumber,
          'Me encantaría que te unieras a Memori, para conmemor tu historia y la de tus seres queridos para siempre.\n\nEn el sigueinte link puedes acceder a la tuya 😍\n\n https://buy.stripe.com/test_7sI5ongqZaZfgMM288',
          NUMBER
        );
        user.history.push({
          message: 'Qué te ha parecido la experiencia? Es muy simple, pero espero que te haya servido para recordar cosas importantes de tu infancia. \n\nAcá te dejo un link para que puedas ver las biografías que creamos 😊\n\n https://getmemori.org/biography\n\n Me encantaría que te unieras a Memori, para conmemor tu historia y la de tus seres queridos para siempre.\n\nEn el sigueinte link puedes acceder a la tuya 😍\n\n https://buy.stripe.com/test_7sI5ongqZaZfgMM288',
          type: 'outgoing',
          timestamp: new Date(),
        });
        user.status = 4;
        await user.save();
        res.status(200).send({ success: true, message: 'Usuario creado correctamente' });
        return;

      } else if (user.status === 4) {
        const response = await generateClosingConversation(processedMessage, user.history);
        
        user.history.push({
          message: response,
          type: 'outgoing',
          timestamp: new Date(),
        });

        await sendWhatsAppMessage(user.whatsappNumber, response, NUMBER);
        await user.save();
      }

      res.status(200).send({ success: true, message: 'Mensaje procesado correctamente' });
    } catch (error) {
      console.error('Error procesando mensaje:', error);
      res.status(500).send({
        success: false,
        message: 'Error procesando el mensaje',
      });
  }
}

