import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
} from '../controllers/PortfolioController.js';

const router = Router();

router.get('/:userId', getFolders);
router.post('/', authMiddleware, createFolder);
router.patch('/:id', authMiddleware, updateFolder);
router.delete('/:id', authMiddleware, deleteFolder);

export default router;
