import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import { uploadMiddleware, uploadImage } from '../controllers/UploadController.js';

const router = Router();

router.post('/image', authMiddleware, uploadMiddleware, uploadImage);

export default router;
