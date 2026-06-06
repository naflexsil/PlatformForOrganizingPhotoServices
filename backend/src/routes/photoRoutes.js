import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import optionalAuthMiddleware from '../middlewares/optionalAuthMiddleware.js';
import {
  getPhotos,
  getFavoritePhotos,
  updatePhoto,
  deletePortfolioPhoto,
  togglePhotoLike,
  togglePhotoFavorite,
} from '../controllers/PhotoController.js';

const router = Router();

router.get('/favorites', authMiddleware, getFavoritePhotos);
router.get('/', optionalAuthMiddleware, getPhotos);
router.patch('/:id', authMiddleware, updatePhoto);
router.delete('/:id', authMiddleware, deletePortfolioPhoto);
router.post('/:id/like', authMiddleware, togglePhotoLike);
router.post('/:id/favorite', authMiddleware, togglePhotoFavorite);

export default router;
