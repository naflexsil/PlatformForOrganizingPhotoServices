import { Router } from 'express';
import optionalAuthMiddleware from '../middlewares/optionalAuthMiddleware.js';
import { getInspirationFeed } from '../controllers/InspirationController.js';

const router = Router();

router.get('/', optionalAuthMiddleware, getInspirationFeed);

export default router;
