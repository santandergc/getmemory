import express from 'express';
import { handleIncomingMessage as handleQuestionMessage } from '../controllers/whatsappQuestionController';
import { handleIncomingMessageFreeTrial } from '../controllers/whatsappFreetrialController';
import { authController } from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';
import { platformController } from '../controllers/platformController';
import { stripeController } from '../controllers/stripeController';
import { upload } from '../middleware/uploadMiddleware';
import { uploadImageToFirebase } from '../services/firebaseStorageService';

const router = express.Router();

// Ruta pública para WhatsApp
router.post('/whatsapp', async (req: express.Request, res: express.Response) => {
  await handleQuestionMessage(req, res);
});

router.post('/free-trial', async (req: express.Request, res: express.Response) => {
  await handleIncomingMessageFreeTrial(req, res);
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

router.get('/user/:userId', authMiddleware.validateToken, async (req: express.Request, res: express.Response) => {
  await platformController.handleUserInfo(req, res);
});

router.post('/info', authMiddleware.validateToken, async (req: express.Request, res: express.Response) => {
  await platformController.handleInfo(req, res);
});

router.get('/info/user/:userId', authMiddleware.validateToken, async (req: express.Request, res: express.Response) => {
  await platformController.handleInfoById(req, res);
});

router.get('/info/onboarding/:id', authMiddleware.validateToken, async (req: express.Request, res: express.Response) => {
  await platformController.handleInfoOnboarding(req, res);
});

router.get('/dashboard', authMiddleware.validateToken, async (req: express.Request, res: express.Response) => {
  await platformController.handleDashboard(req, res);
});
router.get('/biographies', authMiddleware.validateToken, async (req: express.Request, res: express.Response) => {
  await platformController.handleBiographies(req, res);
});

router.post(`/biographies/:id/start`, authMiddleware.validateToken, async (req: express.Request, res: express.Response) => {
  await platformController.handleStartBiography(req, res);
});

router.post('/biographies/:id/reminder', authMiddleware.validateToken, async (req: express.Request, res: express.Response) => {
  await platformController.handleReminderBiography(req, res);
});

router.get('/questions/templates', authMiddleware.validateToken, async (req: express.Request, res: express.Response) => {
  await platformController.handleQuestionsTemplates(req, res);
});


// Ruta para obtener todas las preguntas disponibles
router.get('/questions/default/:userId', authMiddleware.validateToken, async (req: express.Request, res: express.Response) => {
  await platformController.handleQuestions(req, res);
});

// Ruta para obtener preguntas de un usuario específico
router.get('/questions/user/:userId', authMiddleware.validateToken, async (req: express.Request, res: express.Response) => {
  await platformController.handleQuestionsById(req, res);
});

router.post('/questions/user/:userId', authMiddleware.validateToken, async (req: express.Request, res: express.Response) => {
  await platformController.handleUpdateQuestions(req, res);
});

router.post('/questions/generate-chapters', authMiddleware.validateToken, async (req: express.Request, res: express.Response) => {
  await platformController.handleGenerateChapters(req, res);
});

router.post('/questions/generate-questions', authMiddleware.validateToken, async (req: express.Request, res: express.Response) => {
  await platformController.handleGenerateQuestions(req, res);
});


// Ruta para actualizar una pregunta específica
router.put('/questions/:userId/:questionId', authMiddleware.validateToken, async (req: express.Request, res: express.Response) => {
  await platformController.handleUpdateQuestion(req, res);
});

router.post('/questions/onboarding/:id', authMiddleware.validateToken, async (req: express.Request, res: express.Response) => {
  await platformController.handleCreateQuestionsOnboarding(req, res);
});

router.post('/reminder/onboarding/:id', authMiddleware.validateToken, async (req: express.Request, res: express.Response) => {
  await platformController.handleReminderOnboarding(req, res);
});

router.post('/biography-info/:id', authMiddleware.validateToken, async (req: express.Request, res: express.Response) => {
  await platformController.handleBiographyInfo(req, res);
});

// Ruta para subir imágenes
router.post('/upload-image/:userId/:questionId', 
  authMiddleware.validateToken, 
  upload.single('image'), 
  async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No se proporcionó ninguna imagen' });
        return;
      }

      const imageUrl = await uploadImageToFirebase(req.file);
      res.status(200).json({ imageUrl });
    } catch (error) {
      console.error('Error al subir la imagen:', error);
      res.status(500).json({ error: 'Error al procesar la imagen' });
    }
  }
);

export default router;  