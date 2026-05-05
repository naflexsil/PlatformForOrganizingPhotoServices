import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { togglePhotoLike, togglePhotoFavorite } from '../controllers/PhotoController.js';

const router = Router();

router.use(authMiddleware);

router.post('/:id/like', togglePhotoLike);
router.post('/:id/favorite', togglePhotoFavorite);

export default router;
