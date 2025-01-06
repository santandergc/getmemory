import { Request, Response, NextFunction } from 'express';
import { auth as firebaseAuth } from 'firebase-admin';
import UserOnboarding from '../models/UserOnboarding';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
  user?: any;
  firebaseUser?: any;
}

interface DecodedToken {
  userId: string;
  email: string;
  firebaseId: string;
}

export const authMiddleware = {
  validateToken: async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'Token no proporcionado' });
      return;
    }

    try {
      // Primero intentamos verificar como JWT normal
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as DecodedToken;
      const user = await UserOnboarding.findById(decoded.userId);
      
      if (!user) {
        res.status(404).json({ error: 'Usuario no encontrado' });
        return;
      }
      
      req.user = user;
      next();
    } catch (jwtError) {
      // Si falla la verificación JWT, intentamos con Firebase
      try {
        const decodedFirebaseToken = await firebaseAuth().verifyIdToken(token);
        const user = await UserOnboarding.findOne({ firebaseId: decodedFirebaseToken.uid });
        
        if (!user) {
          res.status(404).json({ error: 'Usuario no encontrado' });
          return;
        }
        
        req.user = user;
        next();
      } catch (firebaseError) {
        console.error('Error validando token:', firebaseError);
        res.status(401).json({ error: 'Token inválido' });
      }
    }
  },

  validateFirebaseToken: (req: AuthRequest, res: Response, next: NextFunction): void => {
    const { idToken } = req.body;

    if (!idToken) {
      res.status(401).json({ error: 'Token no proporcionado' });
      return;
    }

    firebaseAuth()
      .verifyIdToken(idToken)
      .then(decodedToken => {
        req.user = {
          uid: decodedToken.uid,
          email: decodedToken.email,
          name: decodedToken.name,
          picture: decodedToken.picture
        };
        next();
      })
      .catch(error => {
        console.error('Error validando token de Firebase:', error);
        res.status(401).json({ error: 'Token inválido' });
      });
  }
}; 