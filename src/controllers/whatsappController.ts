import { Request, Response } from 'express';
import { sendWhatsAppMessage } from '../services/whatsappService';
import User from '../models/User';
import { generateAIResponse } from '../services/openAIService';
import { transcribeAudio } from '../services/whisperService';

// Constants for stages and questions
const STAGES = {
  ONBOARDING: 'onboarding',
  INFANCIA: 'infancia',
};

const ONBOARDING_QUESTIONS = [
  '¿Cuál es tu nombre completo?',
  '¿Dónde y cuándo naciste?',
  '¿Estás lista para comenzar este emocionante viaje por tus memorias?',
];

const INFANCIA_CHECKLIST = [
  "Contexto familiar (padres, hermanos, hogar)",
  "Entorno y comunidad (barrio, tradiciones locales)",
  "Rutinas y vida cotidiana (juegos, responsabilidades)",
  "Relaciones y amigos (primeros amigos, anécdotas)",
  "Educación y escuela (experiencias escolares, maestros)",
  "Celebraciones y festividades (cumpleaños, tradiciones)",
  "Intereses y pasatiempos (hobbies, deportes, talentos)",
  "Comidas y costumbres alimenticias (platillos favoritos, recuerdos)",
  "Viajes y experiencias fuera de casa",
  "Salud y bienestar (enfermedades, atención médica)",
  "Influencia cultural y tecnológica (música, películas, juegos)",
  "Momentos de aprendizaje y crecimiento (retos, lecciones)",
  "Relación con la naturaleza (lugares, animales, fenómenos)",
  "Relatos y anécdotas familiares (historias contadas en la familia)",
  "Aspiraciones y sueños (metas o deseos de la infancia)",
];

// Functions to handle onboarding and infancia
async function handleOnboarding(user: any, message: string) {
  const { currentQuestion } = user;

  // Get the current question
  const question = ONBOARDING_QUESTIONS[currentQuestion];

  if (message) {
    // Save the answer
    user.currentQuestion = currentQuestion + 1;
  }

  // If onboarding is complete, transition to Infancia
  if (user.currentQuestion >= ONBOARDING_QUESTIONS.length) {
    user.stage = STAGES.INFANCIA;
    user.currentQuestion = 0; // Reset question index for Infancia
    return "¡Me alegra mucho que estés lista! 🌟 \n\nLa infancia siempre tiene momentos únicos y especiales. ¿Qué te parece si comenzamos hablando un poco sobre cómo fue tu infancia? 🧸";
  } else {
    // Ask the next question
    return question;
  }
}

async function handleInfancia(user: any, message: string, history: any) {
  // Generate response using AI with history and checklist
  const aiResponse = await generateAIResponse({
    history,
    checklist: INFANCIA_CHECKLIST,
    message,
  });

  return aiResponse;
}

// Main message handler
async function handleIncomingMessage(req: Request, res: Response) {
  try {
    const {
      From: from,
      Body: messageText,
      MediaUrl0: mediaUrl,
      MediaContentType0: mediaContentType,
      MessageStatus: messageStatus,
      NumMedia,
    } = req.body;

    // If it's a status update, ignore
    if (messageStatus) {
      return res.status(200).send({
        success: true,
        message: 'Actualización de estado procesada',
      });
    }

    const whatsappNumber = from.replace('whatsapp:', '');
    const isAudioMessage = mediaContentType === 'audio/ogg' && NumMedia === '1';

    let processedMessage = messageText;

    // Handle audio message transcription
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

    await User.updateOne(
      { whatsappNumber },
      {
        $push: {
          chatHistory: {
            message: processedMessage,
            type: 'incoming',
            timestamp: new Date(),
          },
        },
      }
    );

    // Fetch or create user
    let user = await User.findOne({ whatsappNumber });

    if (!user) {
      // Initialize user for Onboarding
      user = new User({
        whatsappNumber,
        stage: STAGES.ONBOARDING,
        currentQuestion: 0, 
      });
      await user.save();

      const welcomeMessage =
        "¡Hola! Soy Bernandita, de Memori. Estoy aquí para ayudarte a convertir tus recuerdos en un legado inolvidable. ¿Estás listo para empezar?";
      await sendWhatsAppMessage(whatsappNumber, welcomeMessage);
      return res.status(200).send({ success: true });
    }

    let response;

    if (user.currentStage === STAGES.ONBOARDING) {
      response = await handleOnboarding(user, processedMessage); 
    } else if (user.currentStage === STAGES.INFANCIA) {
      const chatHistory = user.stages.find(stage => stage.name === STAGES.INFANCIA)?.chatHistory || [];
      response = await handleInfancia(user, processedMessage, chatHistory);
    }

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

export default handleIncomingMessage;
