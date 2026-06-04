import { Router } from 'express';
import { searchAll, getCities } from '../controllers/SearchController.js';
import { searchByImage, searchByImageMiddleware } from '../controllers/SearchByImageController.js';
import optionalAuthMiddleware from '../middlewares/optionalAuthMiddleware.js';

const router = Router();

router.get('/cities', getCities);
router.get('/',       searchAll);
router.post('/by-image', optionalAuthMiddleware, searchByImageMiddleware, searchByImage);

export default router;
