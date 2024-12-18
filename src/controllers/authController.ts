import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import UserOnboarding from '../models/UserOnboarding';

interface AuthRequest extends Request {
  user?: any;
}

export const authController = {
  async handleGoogleAuth(req: AuthRequest, res: Response) {
    try {
      const { email, displayName, photoURL, firebaseId } = req.body;
      const googleUser = req.user; // Info validada del token de Google

      let user = await UserOnboarding.findOne({ 
        $or: [
          { firebaseId },
          { email: googleUser.email }
        ]
      });

      if (user) {
        user.lastLogin = new Date();
        user.displayName = displayName || googleUser.name;
        user.photoURL = photoURL || googleUser.picture;
        await user.save();
      } else {
        user = await UserOnboarding.create({
          firebaseId,
          email: googleUser.email,
          displayName: displayName || googleUser.name,
          photoURL: photoURL || googleUser.picture,
          status: 'pending',
          currentPhase: 'onboarding'
        });
      }

      const token = jwt.sign(
        { 
          userId: user._id,
          email: user.email,
          firebaseId: user.firebaseId
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      res.status(200).json({
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          currentPhase: user.currentPhase,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        token
      });

    } catch (error) {
      console.error('Error en autenticación:', error);
      res.status(401).json({ error: 'Autenticación fallida' });
    }
  },

  async validateToken(req: AuthRequest, res: Response) {
    try {
      const user = req.user; // Usuario ya validado por el middleware

      res.status(200).json({
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          currentPhase: user.currentPhase,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });

    } catch (error) {
      res.status(401).json({ error: 'Token inválido' });
    }
  }
};