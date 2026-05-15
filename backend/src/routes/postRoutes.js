import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  getAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  toggleLike,
  toggleFavorite,
  pinPost,
} from '../controllers/PostController.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getAllPosts);
router.get('/:id', getPostById);
router.post('/', createPost);
router.put('/:id', updatePost);
router.delete('/:id', deletePost);
router.post('/:id/like', toggleLike);
router.post('/:id/favorite', toggleFavorite);
router.patch('/:id/pin', pinPost);

export default router;
