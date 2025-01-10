import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import UserOnboarding from '../models/UserOnboarding';

interface AuthRequest extends Request {
  user?: any;
}

export const authController = {
  async handleGoogleAuth(req: AuthRequest, res: Response) {
    try {
      const supabaseUser = req.user;

      let user = await UserOnboarding.findOne({ 
        email: supabaseUser.email 
      });

      if (!user) {
        try {
          user = await UserOnboarding.create({
            email: supabaseUser.email,
            displayName: supabaseUser.user_metadata?.full_name,
            photoURL: supabaseUser.user_metadata?.avatar_url,
            provider: supabaseUser.user_metadata?.provider,
            supabaseId: supabaseUser.id,
            status: 'pending',
          });
        } catch (error: any) {
          if (error.code === 11000) {
            user = await UserOnboarding.findOne({ email: supabaseUser.email });
            if (user) {
              user.lastLogin = new Date();
              user.displayName = supabaseUser.user_metadata?.full_name || user.displayName;
              user.photoURL = supabaseUser.user_metadata?.avatar_url || user.photoURL;
              user.provider = supabaseUser.user_metadata?.provider;
              user.supabaseId = supabaseUser.id;
              await user.save();
            } else {
              throw error;
            }
          } else {
            throw error;
          }
        }
      }

      user.lastLogin = new Date();
      user.displayName = supabaseUser.user_metadata?.full_name || user.displayName;
      user.photoURL = supabaseUser.user_metadata?.avatar_url || user.photoURL;
      user.provider = supabaseUser.user_metadata?.provider;
      user.supabaseId = supabaseUser.id;
      await user.save();

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET no está configurado');
      }

      const token = jwt.sign(
        { 
          userId: user._id,
          email: user.email,
          sub: supabaseUser.id
        },
        jwtSecret,
        { expiresIn: '24h' }
      );

      res.status(200).json({
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          provider: user.provider,
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
      const user = req.user;

      res.status(200).json({
        user: {
          id: user._id,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          provider: user.provider,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      });

    } catch (error) {
      res.status(401).json({ error: 'Token inválido' });
    }
  }
};