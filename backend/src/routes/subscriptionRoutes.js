import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import optionalAuthMiddleware from '../middlewares/optionalAuthMiddleware.js';
import {
  subscribe,
  getSubscriptions,
  getSubscribers,
  checkSubscription,
  getUserSubscribers,
  getUserSubscriptions,
} from '../controllers/SubscriptionController.js';

const router = Router();

router.post('/:targetId/toggle', authMiddleware, subscribe);
router.get('/me', authMiddleware, getSubscriptions);
router.get('/me/subscribers', authMiddleware, getSubscribers);
router.get('/:targetId/check', authMiddleware, checkSubscription);
router.get('/:userId/subscribers', optionalAuthMiddleware, getUserSubscribers);
router.get('/:userId/subscriptions', optionalAuthMiddleware, getUserSubscriptions);

export default router;
