import { Request, Response, NextFunction } from 'express';
import UserOnboarding from '../models/UserOnboarding';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
  user?: any;
}

interface DecodedToken {
  userId: string;
  email: string;
  sub: string; // Supabase user ID
}

export const authMiddleware = {
  validateToken: async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'Token no proporcionado' });
      return;
    }

    try {
      // Asegurarnos de que JWT_SECRET existe
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET no está configurado');
      }

      const decoded = jwt.verify(token, jwtSecret) as DecodedToken;
      const user = await UserOnboarding.findById(decoded.userId);
      
      if (!user) {
        res.status(404).json({ error: 'Usuario no encontrado' });
        return;
      }
      
      req.user = user;
      next();
    } catch (error) {
      console.error('Error validando token:', error);
      res.status(401).json({ error: 'Token inválido' });
    }
  },

  validateSupabaseToken: async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const { email, name, avatar_url, supabase_uid } = req.body;

    if (!email || !supabase_uid) {
      res.status(401).json({ error: 'Datos de usuario incompletos' });
      return;
    }

    // Simplemente pasamos los datos del usuario al siguiente middleware
    req.user = {
      email,
      id: supabase_uid,
      user_metadata: {
        full_name: name,
        avatar_url,
      }
    };
    next();
  }
}; 