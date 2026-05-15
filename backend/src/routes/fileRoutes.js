import { Router } from 'express';
import { serveFile } from '../controllers/FileController.js';

const router = Router();

router.get('/:bucket/:key', serveFile);

export default router;
