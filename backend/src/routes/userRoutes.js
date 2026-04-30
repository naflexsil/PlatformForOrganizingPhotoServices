import express from 'express';
import prisma from '../config/db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch {
    res.status(500).json({ error: 'Ошибка при получении пользователей' });
  }
});

export default router;