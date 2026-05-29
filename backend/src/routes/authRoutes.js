import { Router } from 'express';
import {
  initiateVkLogin,
  handleVkCallback,
  loginWithVk,
  loginWithVkSdk,
  getMe,
  completeRegistration,
  cancelRegistration,
} from '../controllers/AuthController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/login', initiateVkLogin);
router.get('/callback', handleVkCallback);
router.post('/vk', loginWithVk);
router.post('/vk-sdk', loginWithVkSdk);

router.get('/me', authMiddleware, getMe);
router.post('/complete-registration', authMiddleware, completeRegistration);
router.delete('/cancel-registration', authMiddleware, cancelRegistration);

export default router;
