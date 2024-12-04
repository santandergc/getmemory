import express from 'express';
import { handleIncomingMessage } from '../controllers/stageController';
import { handleIncomingMessage as handleQuestionMessage } from '../controllers/whatsappQuestionController';

const router = express.Router();

router.post('/', async (req: express.Request, res: express.Response) => {
  await handleQuestionMessage(req, res);
});

export default router;  