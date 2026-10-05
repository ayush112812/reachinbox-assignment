import { Router } from 'express';
import { TestController } from '../controllers/test.controller';

const router = Router();

router.post('/test/webhook', TestController.testWebhook);

export default router;
