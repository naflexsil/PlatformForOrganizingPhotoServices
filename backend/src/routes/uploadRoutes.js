import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import {
  uploadMiddleware, uploadImage,
  avatarMiddleware, uploadAvatar,
  searchPhotoMiddleware, uploadSearchPhoto,
  deleteSearchPhoto,
  uploadPhoto,
  chatAttachmentMiddleware, uploadChatAttachment,
} from '../controllers/UploadController.js';

const router = Router();

router.use(authMiddleware);

router.post('/photo', uploadMiddleware, uploadPhoto);
router.post('/image', uploadMiddleware, uploadImage);
router.post('/avatar', avatarMiddleware, uploadAvatar);
router.post('/search-photo', searchPhotoMiddleware, uploadSearchPhoto);
router.delete('/search-photo', deleteSearchPhoto);
router.post('/chat-attachment', chatAttachmentMiddleware, uploadChatAttachment);

export default router;
