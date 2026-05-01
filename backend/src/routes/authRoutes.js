import { Router } from 'express';
import {
  initiateVkLogin,
  handleVkCallback,
  loginWithVk,
  mockLogin,
  getMe,
  completeRegistration,
} from '../controllers/AuthController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/login', initiateVkLogin);
router.get('/callback', handleVkCallback);
router.post('/vk', loginWithVk);

router.get('/mock-login', mockLogin);
router.get('/me', authMiddleware, getMe);
router.post('/complete-registration', authMiddleware, completeRegistration);

export default router;
