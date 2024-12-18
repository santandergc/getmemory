import { Request, Response } from 'express';
import UserOnboarding from '../models/UserOnboarding';
import Question from '../models/Question';

interface OnboardingRequest extends Request {
  user?: any;
}

export const platformController = {
  async handleOnboarding(req: OnboardingRequest, res: Response) {
    try {
      const { 
        name,
        sex,
        birthDate,
        phone,
        country,
      } = req.body;
      console.log(req.body);

      const userId = req.user._id;

      // Buscar y actualizar el usuario
      const user = await UserOnboarding.findById(userId);

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Actualizar los campos del onboarding
      if (name) user.userInfo.fullName = name;
      if (sex) user.userInfo.sex = sex;
      if (birthDate) user.userInfo.birthDate = birthDate;
      if (phone) user.userInfo.phone = phone;
      if (country) user.userInfo.country = country;

      // Actualizar estado y fase
      user.status = 'active';
      user.currentPhase = {
        ...user.currentPhase,
        onboarding: true,
      };

      await user.save();

      res.status(200).json({
        message: 'Onboarding completado exitosamente',
        user: {
          id: user._id,
          email: user.email,
          currentPhase: user.currentPhase,
          status: user.status
        }
      });

    } catch (error) {
      console.error('Error en onboarding:', error);
      res.status(500).json({ error: 'Error al procesar el onboarding' });
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

      // Prepare response with user information
      const dashboardInfo = {
        onboarding: user.currentPhase.onboarding,
        questions: user.currentPhase.question,
        configuration: user.currentPhase.configuration,
        edition: user.currentPhase.edition
      };

      res.status(200).json(dashboardInfo);
      
    } catch (error) {
      console.error('Error getting dashboard information:', error);
      res.status(500).json({ error: 'Error al obtener la información del dashboard' });
    }
  },

  async handleQuestions(req: OnboardingRequest, res: Response) {
    try {
      const questions = await Question.find();
      res.status(200).json(questions);
    } catch (error) {
      console.error('Error getting questions:', error);
      res.status(500).json({ error: 'Error al obtener las preguntas' });
    }
  },
  async handleCreateQuestions(req: OnboardingRequest, res: Response) {
    try {
      const userId = req.user._id;
      const user = await UserOnboarding.findById(userId);

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      // Guardar las preguntas seleccionadas en el usuario
      console.log(req.body);
      user.selectedQuestions = req.body.questions;
      user.currentPhase.question = true;
      await user.save();

      res.status(200).json({ message: 'Preguntas creadas exitosamente' });
    } catch (error) {
      console.error('Error creating questions:', error);
      res.status(500).json({ error: 'Error al crear las preguntas' });
    }
  },

  async handleConfiguration(req: OnboardingRequest, res: Response) {
    try {
      const userId = req.user._id;
      const user = await UserOnboarding.findById(userId);

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      user.currentPhase.configuration = true;
      await user.save();

      res.status(200).json({ message: 'Configuración completada exitosamente' });
    } catch (error) {
      console.error('Error creating configuration:', error);
      res.status(500).json({ error: 'Error al crear la configuración' });
    }
  }
};
