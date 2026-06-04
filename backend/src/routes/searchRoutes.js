import { Router } from 'express';
import { searchUsers } from '../controllers/SearchController.js';
import { searchByImage, searchByImageMiddleware } from '../controllers/SearchByImageController.js';
import optionalAuthMiddleware from '../middlewares/optionalAuthMiddleware.js';

const router = Router();

router.get('/', searchUsers);
router.post('/by-image', optionalAuthMiddleware, searchByImageMiddleware, searchByImage);

export default router;
