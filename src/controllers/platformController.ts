import { Request, Response } from 'express';
import Question from '../models/Question';
import { activateUser, addMetadataToUser } from '../services/platformService';
import UserOnboarding from '../models/UserOnboarding';
import UserQuestion from '../models/UserQuestion';
import { ObjectId } from 'mongoose';
import TemplateQuestion from '../models/TemplateQuestion';
import { sendTemplateMessageOnboardingGift, sendTemplateMessageOnboardingPersonal, sendTemplateMessageReminder } from '../services/whatsappService';
import { generateChapters, generateQuestions } from '../services/openAIQuestionService';

interface OnboardingRequest extends Request {
  user?: any;
}

export const platformController = {
  async handleUserInfo(req: OnboardingRequest, res: Response) {
    try {
      const userId = req.params.userId;
      const user = await UserQuestion.findById(userId);
      res.status(200).json(user);
    } catch (error) {
      console.error('Error getting user info:', error);
      res.status(500).json({ error: 'Error al obtener la información del usuario' });
    }
  },

  async handleInfo(req: OnboardingRequest, res: Response) {
    try {
      const { 
        id,
        fullName,
        gender,
        birthDate,
        phone,
        country,
        timeZone,
        isGift
      } = req.body;

      const userId = req.user._id;

      // Buscar y actualizar el usuario
      const user = await UserOnboarding.findById(userId);

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Asegurarse de que el array users tenga el índice necesario
      while (user.users.length <= id) {
        user.users.push({
          completed: false,
          state: {
            info: false,
            questions: false,
            reminder: false
          },
          info: {
            fullName: '',
            birthDate: '',
            gender: 'male',
            phone: '',
            country: '',
            timeZone: ''
          },
          questions: [],
          reminder: {
            recurrency: '',
            time: '',
            timeZone: '',
            active: true,
            mails: []
          },
          biographyInfo: '',
          isGift: true
        });
      }
      await user.save();

      // Actualizar la información del usuario en el índice específico
      user.users[id].state.info = true;
      user.users[id].info.fullName = fullName;
      user.users[id].info.gender = gender;
      user.users[id].info.birthDate = birthDate; 
      user.users[id].info.phone = phone;
      user.users[id].info.country = country;
      user.users[id].info.timeZone = timeZone;
      user.users[id].isGift = isGift;

      await user.save();

      res.status(200).json({
        message: 'Onboarding completado exitosamente',
        user: {
          id: user._id,
          email: user.email,
          status: user.status
        }
      });

    } catch (error) {
      console.error('Error en onboarding:', error);
      res.status(500).json({ error: 'Error al procesar el onboarding' });
    }
  },

  async handleInfoById(req: OnboardingRequest, res: Response) {
    try {
      const userId = req.params.userId;
      const user = await UserQuestion.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      res.status(200).json(user);
    } catch (error) {
      console.error('Error getting info:', error);
      res.status(500).json({ error: 'Error al obtener la información' });
    }
  },

  async handleInfoOnboarding(req: OnboardingRequest, res: Response) {
    try {
      const userId = req.user._id;
      const id = Number(req.params.id);
      const user = await UserOnboarding.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      const userInfo = user.users[id].info;
      if (!userInfo) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      res.status(200).json(userInfo);
    } catch (error) {
      console.error('Error getting info:', error);
      res.status(500).json({ error: 'Error al obtener la información' });
    }
  },

  async handleDashboard(req: OnboardingRequest, res: Response) {
    try {
      const userId = req.user._id;
      
      // Find user in database
      const user = await UserOnboarding.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      let nextUserIndex = 0;

      if (user.users.length === 0) {
        nextUserIndex = 0;
      } else {
        // Buscar el primer usuario no completado
        const incompleteUserIndex = user.users.findIndex(user => !user.completed);
        
        if (incompleteUserIndex >= 0) {
          // Si hay un usuario incompleto, usar su índice
          nextUserIndex = incompleteUserIndex;
        } else if (user.availableUsers > 0) {
          // Si todos están completos y hay usuarios disponibles, usar el siguiente índice
          nextUserIndex = user.users.length;
        } else {
          // Si no hay usuarios disponibles y todos están completos, mantener 0
          nextUserIndex = 0;
        }
      }

      // Encuentra el primer usuario no completado
      const firstUserNotCompleted = user.users.find(user => !user.completed);

      res.status(200).json({
        usersAvailable: user.availableUsers > 0,
        nextUserIndex: nextUserIndex,
        firstUserNotCompleted: firstUserNotCompleted || null,
        users: user.users,
      });
      
    } catch (error) {
      console.error('Error getting dashboard information:', error);
      res.status(500).json({ error: 'Error al obtener la información del dashboard' });
    }
  },

  async handleBiographies(req: OnboardingRequest, res: Response) {
    try {
      const userId = req.user._id;
      const user = await UserOnboarding.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Obtener los usuarios relacionados con sus preguntas
      const userBiographies = await Promise.all(
        user.usersIds.map(async (id) => {
          const userQuestion = await UserQuestion.findOne({ _id: id });
          if (!userQuestion) return null;

          return {
            id: userQuestion._id,
            fullName: userQuestion.fullName,
            totalChapters: userQuestion.questions.length,
            completedChapters: userQuestion.questions.filter(q => q.isCompleted).length,
            idFirstQuestion: userQuestion.questions[0]._id,
            started: userQuestion.started,
            chapterStarted: userQuestion.onboarding.chapterStarted
          };
        })
      );

      // Filtrar los nulls y enviar solo las biografías válidas
      const validBiographies = userBiographies.filter(bio => bio !== null);

      res.status(200).json(validBiographies);

    } catch (error) {
      console.error('Error getting biographies:', error);
      res.status(500).json({ error: 'Error al obtener las biografías' });
    }
  },

  async handleStartBiography(req: OnboardingRequest, res: Response) {
    try {
      const id = req.params.id;
      const userId = req.user._id;
      const user = await UserQuestion.findById(id);
      const userOnboarding = await UserOnboarding.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      user.started = true;

      const firstNameUser = user.fullName.split(' ')[0].charAt(0).toUpperCase() + user.fullName.split(' ')[0].slice(1).toLowerCase();
      const firstNameOnboarding = userOnboarding?.displayName ? userOnboarding.displayName.split(' ')[0].charAt(0).toUpperCase() + userOnboarding.displayName.split(' ')[0].slice(1).toLowerCase() : '';

      if (user.isGift) {
        await sendTemplateMessageOnboardingGift(user.whatsappNumber, firstNameUser, firstNameOnboarding);
      } else {        
        await sendTemplateMessageOnboardingPersonal(user.whatsappNumber, firstNameUser);
      }

      addMetadataToUser(user);

      await user.save();
      res.status(200).json({ message: 'Biografía iniciada exitosamente' });
    } catch (error) {
      console.error('Error starting biography:', error);
      res.status(500).json({ error: 'Error al iniciar la biografía' });
    }
  },

  async handleReminderBiography(req: OnboardingRequest, res: Response) {
    try {
      const userId = req.params.id;
      const buyerId = req.user._id;
      const buyer = await UserOnboarding.findById(buyerId);
      const user = await UserQuestion.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      const userFirstName = user.fullName.split(' ')[0].charAt(0).toUpperCase() + user.fullName.split(' ')[0].slice(1).toLowerCase();
      const buyerFirstName = buyer?.displayName ? buyer.displayName.split(' ')[0].charAt(0).toUpperCase() + buyer.displayName.split(' ')[0].slice(1).toLowerCase() : '';
      await sendTemplateMessageReminder(user.whatsappNumber, userFirstName, buyerFirstName);
      res.status(200).json({ message: 'Reminder enviado exitosamente' });
    } catch (error) {
      console.error('Error getting questions:', error);
      res.status(500).json({ error: 'Error al obtener las preguntas' });
    }
  },

  async handleQuestions(req: OnboardingRequest, res: Response) {
    try {
      const userId = Number(req.params.userId);
      const user = await UserOnboarding.findById(req.user._id);
      let questions = user?.users[userId].questions || [];
      if (questions.length === 0) {
        const templateQuestions = await TemplateQuestion.findOne({ name: 'Life Questions Template' });
        questions = templateQuestions?.questions || [];
      }
      res.status(200).json(questions);
    } catch (error) {
      console.error('Error getting questions:', error);
      res.status(500).json({ error: 'Error al obtener las preguntas' });
    }
  },

  async handleQuestionsTemplates(req: OnboardingRequest, res: Response) {
    try {
      const templateQuestions = await TemplateQuestion.find();
      res.status(200).json(templateQuestions);
    } catch (error) {
      console.error('Error getting questions templates:', error);
      res.status(500).json({ error: 'Error al obtener las preguntas' });
    }
  },

  async handleQuestionsById(req: OnboardingRequest, res: Response) {
    try {
      const userId = req.params.userId;
      const user = await UserOnboarding.findById(req.user._id);
      if (user && user.usersIds.map(id => id.toString()).includes(userId)) {
        const userQuestion = await UserQuestion.findOne({ _id: userId });
        if (!userQuestion) {
          return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.status(200).json(userQuestion.questions);
      } else {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
    } catch (error) {
      console.error('Error getting questions:', error);
      res.status(500).json({ error: 'Error al obtener las preguntas' });
    }
  },

  async handleUpdateQuestions(req: OnboardingRequest, res: Response) {
    try {
      const userId = req.user._id;
      const id = req.params.userId;
      const { questions: newQuestions } = req.body;
      
      const user = await UserOnboarding.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      const userQuestion = await UserQuestion.findOne({ _id: id });
      if (!userQuestion) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      // Primero identificamos los IDs de preguntas intocables
      const untouchableQuestionIds = new Set(
        userQuestion.questions
          .filter(q => q.isCompleted || q.wordCount > 0)
          .map(q => q.questionId)
      );

      // Filtramos las nuevas preguntas para excluir las que tienen IDs intocables
      const filteredNewQuestions = newQuestions.filter(
        (q: { questionId: number }) => !untouchableQuestionIds.has(q.questionId)
      );

      const updatedQuestions = [];

      // Primero agregamos todas las preguntas intocables
      for (const question of userQuestion.questions) {
        if (question.isCompleted || question.wordCount > 0) {
          updatedQuestions.push(question);
        }
      }   

      // Luego agregamos las nuevas preguntas filtradas
      for (const newQuestion of filteredNewQuestions) {
        updatedQuestions.push({
          questionId: newQuestion.questionId,
          text: newQuestion.text,
          summary: '',
          conversationHistory: [],
          wordCount: 0,
          minWords: newQuestion.minWords,
          isCompleted: false,
          completedCountMessages: 0,
          messageCounter: 0,
          textResult: '',
          chapter: newQuestion.chapter,
          metadata: ''
        });
      }

      userQuestion.questions = updatedQuestions;
      userQuestion.onboarding.chapterStarted = true;
      await userQuestion.save();
      
      res.status(200).json({ message: 'Preguntas actualizadas exitosamente' });
    } catch (error) {
      console.error('Error updating questions:', error);
      res.status(500).json({ error: 'Error al actualizar las preguntas' });
    }
  },

  async handleUpdateQuestion(req: OnboardingRequest, res: Response) {
    try {
      const userId = req.params.userId;
      const questionId = req.params.questionId;
      const { textResult, images } = req.body;

      const user = await UserQuestion.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const question = user.questions.find(q => q._id?.toString() === questionId);
      if (!question) {
        return res.status(404).json({ error: 'Pregunta no encontrada' });
      }

      question.textResult = textResult;
      question.images = images;
      await user.save();

      res.status(200).json({ message: 'Pregunta actualizada exitosamente' });
    } catch (error) {
      console.error('Error updating question:', error);
      res.status(500).json({ error: 'Error al actualizar la pregunta' });
    }
  },

  async handleCreateQuestionsOnboarding(req: OnboardingRequest, res: Response) {
    try {
      const userId = req.user._id;
      const id = Number(req.params.id);
      const user = await UserOnboarding.findById(userId);

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      // Guardar las preguntas seleccionadas en el usuario
      user.users[id].state.questions = true;
      user.users[id].questions = req.body.questions;
      await user.save();

      res.status(200).json({ message: 'Preguntas creadas exitosamente' });
    } catch (error) {
      console.error('Error creating questions:', error);
      res.status(500).json({ error: 'Error al crear las preguntas' });
    }
  },

  async handleReminderOnboarding(req: OnboardingRequest, res: Response) {
    try {
      const userId = req.user._id;
      const user = await UserOnboarding.findById(userId);
      const id = Number(req.params.id);
      const { reminder } = req.body;

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const timeZone = user.users[id].info.timeZone;

      user.users[id].state.reminder = true;
      user.users[id].reminder = {
        recurrency: reminder.recurrency,
        time: reminder.time,
        timeZone: timeZone,
        active: reminder.active,
        mails: reminder.mails,
      };
      user.users[id].completed = true;

      // ACTIVAR EL USUARIO, ES DECIR, CREAR EL USUARIO EN LA BASE DE DATOS DE WHATSAPP
      
      const newUser = await activateUser(user.users[id], user._id as ObjectId);

      user.availableUsers -= 1;
      user.usersIds.push(newUser._id as ObjectId); 
      await user.save();
            
      res.status(200).json({ message: 'Configuración completada exitosamente' });
    } catch (error) {
      console.error('Error creating configuration:', error);
      res.status(500).json({ error: 'Error al crear la configuración' });
    }
  },

  async handleBiographyInfo(req: OnboardingRequest, res: Response) {
    try {
      const userId = req.user._id;
      const user = await UserOnboarding.findById(userId);
      const id = Number(req.params.id);
      const { biographyInfo } = req.body;
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      const templateQuestions = await TemplateQuestion.findOne({ name: 'Life Questions Template' });
      const questions = templateQuestions?.questions || [];
      user.users[id].state.questions = true;
      user.users[id].biographyInfo = biographyInfo;
      user.users[id].questions = questions;
      await user.save();
      res.status(200).json({ message: 'Información de la biografía actualizada exitosamente' });
    } catch (error) {
      console.error('Error creating configuration:', error);
      res.status(500).json({ error: 'Error al crear la configuración' });
    }
  },

  async handleGenerateChapters(req: OnboardingRequest, res: Response) {
    try {
      const { milestones } = req.body;

      // Validar que se recibió el milestone
      if (!milestones) {
        const templateQuestions = await TemplateQuestion.findOne({ name: 'Life Questions Template' });
        const questions = templateQuestions?.questions || [];
        return res.status(200).json(questions);
      }

      // Llamar a OpenAI para generar capítulos y preguntas
      const chaptersResponse = await generateChapters(milestones);
      
      try {
        // Parsear la respuesta JSON
        const parsedResponse = JSON.parse(chaptersResponse) as { chapters: Record<string, string[]> };
        
        // Validar que la respuesta tenga el formato esperado
        if (!parsedResponse.chapters) {
          throw new Error('Formato de respuesta inválido');
        }

        // Transformar la estructura en el formato requerido
        let questionId = 1;
        const questions = [];

        // Iterar sobre cada capítulo y sus preguntas
        for (const [chapter, chapterQuestions] of Object.entries(parsedResponse.chapters)) {
          for (const question of chapterQuestions) {
            questions.push({
              questionId,
              text: question,
              minWords: 300,
              chapter,
              completed: false
            });
            questionId++;
          }
        }

        // Devolver el array de preguntas formateado
        res.status(200).json(questions);

      } catch (parseError) {
        console.error('Error parsing chapters response:', parseError);
        res.status(500).json({ error: 'Error al procesar la respuesta de los capítulos' });
      }

    } catch (error) {
      console.error('Error generating chapters:', error);
      res.status(500).json({ error: 'Error al generar los capítulos' });
    }
  },

  async handleGenerateQuestions(req: OnboardingRequest, res: Response) {
    try {
      const { chapter, instructions, startQuestionId, chapterQuestions } = req.body;

      if (!chapter) {
        return res.status(400).json({ error: 'Se requiere especificar el capítulo' });
      }

      // Obtener las preguntas de OpenAI, pasando las preguntas actuales como contexto
      const questionsArray = await generateQuestions(
        chapter, 
        instructions || '', 
        chapterQuestions || []
      );
      
      // Transformar el array de strings en el formato requerido
      const questions = questionsArray.map((questionText, index) => ({
        questionId: (startQuestionId || 1) + index,
        text: questionText,
        minWords: 300,
        chapter: chapter,
        completed: false
      }));

      res.status(200).json(questions);
    } catch (error) {
      console.error('Error generating questions:', error);
      res.status(500).json({ error: 'Error al generar las preguntas' });
    }
  }
};
