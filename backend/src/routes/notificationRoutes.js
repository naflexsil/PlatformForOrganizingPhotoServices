import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { getNotifications, getUnreadCount, markAllRead, markOneRead } from '../controllers/NotificationController.js';

const router = Router();

router.use(authMiddleware);

router.get('/',              getNotifications);
router.get('/unread-count',  getUnreadCount);
router.patch('/read-all',    markAllRead);
router.patch('/:id/read',    markOneRead);

export default router;
