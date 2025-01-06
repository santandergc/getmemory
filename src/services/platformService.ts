import { ObjectId } from "mongoose";
import User from '../models/UserQuestion';
import { generateChapterMetadata, generateTextFromConversation } from './openAIQuestionService';

export const activateUser = async (user: any, fatherId: ObjectId) => {
    // crear usuario en tabla UserQuestions
   const data = {
    whatsappNumber: user.info.phone,
    fullName: user.info.fullName,
    birthInfo: user.info.birthDate,
    sex: user.info.gender,
    currentQuestion: 0,
    currentQuestionId: 0,
    currentStage: "onboarding",
    fatherId: fatherId,
    reminder: {
      time: user.reminder.time,
      recurrency: user.reminder.recurrency,
      timeZone: user.reminder.timeZone,
      active: user.reminder.active,
      mails: user.reminder.mails
    },
    questions: user.questions.map((q: any) => ({
      questionId: q.questionId,
      text: q.text,
      isCompleted: false,
      summary: '',
      conversationHistory: [],
      wordCount: 0,
      minWords: q.minWords,
      completedCountMessages: 0,
      messageCounter: 0,
      chapter: q.chapter,
      metadata: ''
    })),
    started: false,
    isGift: user.isGift
   }

   const userQuestions = new User(data);
   await userQuestions.save();

   return userQuestions;

}

export const addMetadataToUser = async (user: any): Promise<void> => {
  try {
    // Obtener las preguntas del usuario
    const questions = user.questions;

    // Separar las preguntas por capítulos
    const chapters = questions.reduce((acc: any, q: any) => {
      if (!acc[q.chapter]) {
        acc[q.chapter] = [];
      }
      acc[q.chapter].push({
        questionId: q.questionId,
        text: q.text
      });
      return acc;
    }, {});

    // Procesar cada capítulo
    for (const [chapter, chapterQuestions] of Object.entries(chapters)) {
      
      // Generar metadata para el capítulo actual
      const metadata = await generateChapterMetadata(
        chapter,
        chapterQuestions as Array<{ questionId: number; text: string }>
      );

      // Actualizar la metadata de cada pregunta en el usuario
      metadata.forEach(({ questionId, metadata: points }) => {
        const questionIndex = questions.findIndex((q: any) => q.questionId === questionId);
        if (questionIndex !== -1) {
          // Asegurarnos de que points sea un string
          const metadataString = typeof points === 'string' ? points : points.join('\n');
          questions[questionIndex].metadata = metadataString;
        }
      });
    }

    // Actualizar el documento completo
    const result = await User.findByIdAndUpdate(
      user._id,
      { $set: { questions: questions } },
      { new: true }
    );

    if (!result) {
      throw new Error('No se pudo actualizar el usuario');
    }

    console.log('Metadata actualizada exitosamente');

  } catch (error) {
    console.error('Error al agregar metadata al usuario:', error);
    throw error;
  }
};

export const addTextToQuestionAI = async (user: any, currentQuestionId: number) => {
  try {
    const text = await generateTextFromConversation(user.questions[currentQuestionId].text, user.questions[currentQuestionId].conversationHistory);
    
    // Usar findOneAndUpdate para actualizar de manera atómica
    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id },
      { $set: { [`questions.${currentQuestionId}.textResult`]: text } },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      throw new Error('No se pudo actualizar el usuario');
    }

    // Actualizar el objeto user en memoria con los nuevos datos
    user.questions[currentQuestionId].textResult = text;
    
  } catch (error) {
    console.error('Error al actualizar el texto de la pregunta:', error);
    throw error;
  }
}