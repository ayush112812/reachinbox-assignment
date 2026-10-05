import { Router } from 'express';
import { EmailController } from '../controllers/email.controller';

const router = Router();

router.get('/emails', EmailController.getEmails);
router.get('/emails/:id', EmailController.getEmailById);
router.post('/emails/:id/categorize', EmailController.categorizeEmail);
router.post('/emails/:id/suggest-reply', EmailController.suggestReply);

export default router;
