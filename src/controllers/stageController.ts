import { Request, Response } from 'express';
import User from '../models/User';
import { sendWhatsAppMessage } from '../services/whatsappService';
import { StageService } from '../services/stageService';
import { transcribeAudio } from '../services/whisperService';

export async function handleIncomingMessage(req: Request, res: Response) {
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
      let user = await User.findOne({ whatsappNumber });
      if (!user) {
        user = await StageService.initializeUser(whatsappNumber);
        return res.status(200).send({ success: true });
      }

      // Delegate to stage-specific handler
      const response = await StageService.handleStage(user, processedMessage);

      // Save user updates and send response    
      await user.save();

      if (response) {
        await sendWhatsAppMessage(whatsappNumber, response);
        await User.updateOne(
          { whatsappNumber },
          {
            $push: {
              chatHistory: {
                message: response,
                type: 'outgoing',
                timestamp: new Date(),
              },
            },
          }
        );
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

