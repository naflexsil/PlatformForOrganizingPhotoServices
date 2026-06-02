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
// Файлы чата — без auth (браузер не может отправить Bearer в <img>/<a>)
// URL содержит chatId+UUID и не является угадываемым
router.get("/files/:chatId/:filename", getChatFile);

export default router;
