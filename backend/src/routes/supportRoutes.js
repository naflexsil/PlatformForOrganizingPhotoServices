import { Router } from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import { createTicket, getMyTickets } from "../controllers/SupportController.js";

const router = Router();

router.use(authMiddleware);

router.post("/", createTicket);
router.get("/", getMyTickets);

export default router;
