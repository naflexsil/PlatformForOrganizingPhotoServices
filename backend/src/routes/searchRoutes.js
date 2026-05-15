import { Router } from 'express';
import { searchUsers } from '../controllers/SearchController.js';

const router = Router();

router.get('/', searchUsers);

export default router;
