import { ObjectId } from "mongoose";
import UserQuestions from "../models/UserQuestion";

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
      messageCounter: 0
    })),
    started: false,
   }

   const userQuestions = new UserQuestions(data);
   await userQuestions.save();

   return userQuestions;
}