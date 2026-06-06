import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { getContentStats, getDealStats } from '../controllers/StatsController.js';

const router = Router();

router.use(authMiddleware);
router.get('/content', getContentStats);
router.get('/deals', getDealStats);

export default router;
