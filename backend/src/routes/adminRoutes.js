import { Router } from 'express';
import adminAuthMiddleware from '../middlewares/adminAuthMiddleware.js';
import { getTickets, replyToTicket } from '../controllers/AdminController.js';

const router = Router();

router.use(adminAuthMiddleware);

router.get('/tickets',           getTickets);
router.post('/tickets/:id/reply', replyToTicket);

export default router;
