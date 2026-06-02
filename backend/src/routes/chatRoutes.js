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
// Файлы чата — без auth. URL содержит два случайных UUID-компонента,
// вероятность угадать = 1/2^122 (аналог Slack/Discord CDN ссылок).
router.get("/files/:chatId/:filename", getChatFile);

export default router;
