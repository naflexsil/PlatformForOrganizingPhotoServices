import { Router } from 'express';
import {
  initiateVkLogin,
  handleVkCallback,
  loginWithVk,
  mockLogin,
  getMe,
} from '../controllers/AuthController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/login', initiateVkLogin);
router.get('/callback', handleVkCallback);
router.post('/vk', loginWithVk);

router.get('/mock-login', mockLogin);
router.get('/me', authMiddleware, getMe);

export default router;
