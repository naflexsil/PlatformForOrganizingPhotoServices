import { Router } from 'express';
import {
  initiateVkLogin,
  handleVkCallback,
  loginWithVk,
} from '../controllers/AuthController.js';

const router = Router();

router.get('/login', initiateVkLogin);
router.get('/callback', handleVkCallback);
router.post('/vk', loginWithVk);

export default router;
