import UserQuestions from "../models/UserQuestion";
import UserOnboarding from "../models/UserOnboarding";

export const activateUser = async (user: any) => {
    // crear usuario en tabla UserQuestions
   const data = {
    whatsappNumber: user.userInfo.phone,
    fullName: user.userInfo.fullName,
    birthInfo: user.userInfo.birthDate,
    sex: user.userInfo.sex,
    currentQuestion: 0,
    currentQuestionId: 0,
    currentStage: "onboarding",
    schedule: user.schedule,
    questions: user.selectedQuestions,
    started: false,
   }

   const userQuestions = new UserQuestions(data);
   await userQuestions.save();

   return userQuestions;
}