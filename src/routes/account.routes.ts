import { Router } from 'express';
import { AccountController } from '../controllers/account.controller';

const router = Router();

router.get('/accounts', AccountController.getAccounts);
router.get('/accounts/:id', AccountController.getAccountById);
router.post('/accounts/:id/sync', AccountController.triggerSync);

export default router;
