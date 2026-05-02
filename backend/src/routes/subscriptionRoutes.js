import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  subscribe,
  getSubscriptions,
  getSubscribers,
  checkSubscription,
} from '../controllers/SubscriptionController.js';

const router = Router();

router.use(authMiddleware);

router.post('/:targetId/toggle', subscribe);
router.get('/me', getSubscriptions);
router.get('/me/subscribers', getSubscribers);
router.get('/:targetId/check', checkSubscription);

export default router;
