import { Router } from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  proposeDeal,
  acceptDeal,
  rejectDeal,
  cancelDeal,
  confirmPaid,
  confirmPaymentReceived,
  completeWork,
  approveDeal,
  requestRevision,
  rateDeal,
  getDeals,
  getDealById,
} from "../controllers/DealController.js";

const router = Router();

router.use(authMiddleware);

router.get("/", getDeals);
router.get("/:id", getDealById);
router.post("/", proposeDeal);
router.patch("/:id/accept", acceptDeal);
router.patch("/:id/reject", rejectDeal);
router.patch("/:id/cancel", cancelDeal);
router.patch("/:id/paid", confirmPaid);
router.patch("/:id/payment-received", confirmPaymentReceived);
router.patch("/:id/complete", completeWork);
router.patch("/:id/approve", approveDeal);
router.patch("/:id/revision", requestRevision);
router.post("/:id/rating", rateDeal);

export default router;
