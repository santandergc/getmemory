import express from 'express';
import { handleIncomingMessage as handleQuestionMessage } from '../controllers/whatsappQuestionController';
import { authController } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';
import { platformController } from '../controllers/platformController';

const router = express.Router();

// Ruta pública para WhatsApp
router.post('/whatsapp', async (req: express.Request, res: express.Response) => {
  await handleQuestionMessage(req, res);
});

// Rutas de autenticación
router.post('/auth/google', 
  authMiddleware.validateFirebaseToken,
  async (req: express.Request, res: express.Response) => {
    await authController.handleGoogleAuth(req, res);
  }
);

// Rutas protegidas que requieren JWT
router.get('/auth/validate', 
  authMiddleware.validateToken,
  async (req: express.Request, res: express.Response) => {
    await authController.validateToken(req, res);
  }
);

router.post('/onboarding', authMiddleware.validateToken, async (req: express.Request, res: express.Response) => {
  await platformController.handleOnboarding(req, res);
});

router.get('/dashboard', authMiddleware.validateToken, async (req: express.Request, res: express.Response) => {
  await platformController.handleDashboard(req, res);
});

router.get('/questions', authMiddleware.validateToken, async (req: express.Request, res: express.Response) => {
  await platformController.handleQuestions(req, res);
});

router.post('/questions', authMiddleware.validateToken, async (req: express.Request, res: express.Response) => {
  await platformController.handleCreateQuestions(req, res);
});

router.post('/configuration', authMiddleware.validateToken, async (req: express.Request, res: express.Response) => {
  await platformController.handleConfiguration(req, res);
});

export default router;  