import { Router } from 'express';
import prisma from '../config/db.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import optionalAuthMiddleware from '../middlewares/optionalAuthMiddleware.js';
import {
  checkTag,
  deleteAccount,
  restoreAccount,
  updateMe,
  updatePhotographerData,
} from '../controllers/UserController.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({ where: { isDeleted: false } });
    res.json({ status: 'success', data: users });
  } catch {
    res.status(500).json({ status: 'error', message: 'Ошибка при получении пользователей' });
  }
});

router.get('/check-tag', optionalAuthMiddleware, checkTag);
router.patch('/me', authMiddleware, updateMe);
router.patch('/me/photographer', authMiddleware, updatePhotographerData);
router.delete('/me', authMiddleware, deleteAccount);
router.patch('/me/restore', authMiddleware, restoreAccount);

export default router;
