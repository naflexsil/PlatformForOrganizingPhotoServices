import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import optionalAuthMiddleware from '../middlewares/optionalAuthMiddleware.js';
import {
  getAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  toggleLike,
  toggleFavorite,
  getFavoritePosts,
  pinPost,
} from '../controllers/PostController.js';

const router = Router();

router.get('/favorites', authMiddleware, getFavoritePosts);
router.get('/', optionalAuthMiddleware, getAllPosts);
router.get('/:id', optionalAuthMiddleware, getPostById);
router.post('/', authMiddleware, createPost);
router.put('/:id', authMiddleware, updatePost);
router.delete('/:id', authMiddleware, deletePost);
router.post('/:id/like', authMiddleware, toggleLike);
router.post('/:id/favorite', authMiddleware, toggleFavorite);
router.patch('/:id/pin', authMiddleware, pinPost);

export default router;
