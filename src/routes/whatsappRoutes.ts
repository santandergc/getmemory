import express from 'express';
import { handleIncomingMessage } from '../controllers/stageController';

const router = express.Router();

router.post('/', async (req: express.Request, res: express.Response) => {
  await handleIncomingMessage(req, res);
});

export default router;  