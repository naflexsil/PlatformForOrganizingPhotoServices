import { Router } from 'express';
import optionalAuthMiddleware from '../middlewares/optionalAuthMiddleware.js';
import { getFeed, getFeedPhoto } from '../controllers/FeedController.js';

const router = Router();

router.use(optionalAuthMiddleware);

router.get('/', getFeed);
router.get('/:photoId', getFeedPhoto);

export default router;
