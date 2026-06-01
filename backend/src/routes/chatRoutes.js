import { Router } from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  getMyChats,
  startChat,
  getChatMessages,
  getChatFile,
} from "../controllers/ChatController.js";

const router = Router();

router.get("/", authMiddleware, getMyChats);
router.post("/start", authMiddleware, startChat);
router.get("/:chatId/messages", authMiddleware, getChatMessages);
router.get("/files/:chatId/:filename", authMiddleware, getChatFile);

export default router;
