import prisma from "../config/db.js";
import { getChatFileStream } from "../services/fileService.js";

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  tag: true,
  avatarUrl: true,
  role: true,
  isOnline: true,
  lastSeenAt: true,
};

const getOrderedUserIds = (currentUserId, companionId) => {
  return currentUserId < companionId
    ? { user1Id: currentUserId, user2Id: companionId }
    : { user1Id: companionId, user2Id: currentUserId };
};

const formatChat = (chat, currentUserId) => {
  const companion = chat.user1Id === currentUserId ? chat.user2 : chat.user1;

  return {
    id: chat.id,
    companion,
    lastMessage: chat.messages?.[0] || null,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
  };
};

export const getMyChats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const chats = await prisma.chat.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        messages: { some: {} },
      },
      include: {
        user1: { select: userSelect },
        user2: { select: userSelect },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            chatId: true,
            senderId: true,
            text: true,
            attachmentUrl: true,
            attachmentType: true,
            isRead: true,
            createdAt: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return res.json({
      status: "success",
      data: chats.map((chat) => formatChat(chat, userId)),
    });
  } catch (err) {
    return next(err);
  }
};

export const startChat = async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const { companionId } = req.body;

    if (!companionId) {
      return res.status(400).json({
        status: "error",
        message: "Не передан companionId",
      });
    }

    if (companionId === currentUserId) {
      return res.status(400).json({
        status: "error",
        message: "Нельзя создать чат с самим собой",
      });
    }

    const companion = await prisma.user.findFirst({
      where: {
        id: companionId,
        isDeleted: false,
      },
      select: userSelect,
    });

    if (!companion) {
      return res.status(404).json({
        status: "error",
        message: "Пользователь не найден",
      });
    }

    const { user1Id, user2Id } = getOrderedUserIds(currentUserId, companionId);

    const chat = await prisma.chat.upsert({
      where: {
        user1Id_user2Id: {
          user1Id,
          user2Id,
        },
      },
      update: {},
      create: {
        user1Id,
        user2Id,
      },
      include: {
        user1: { select: userSelect },
        user2: { select: userSelect },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            chatId: true,
            senderId: true,
            text: true,
            attachmentUrl: true,
            attachmentType: true,
            isRead: true,
            createdAt: true,
          },
        },
      },
    });

    return res.status(200).json({
      status: "success",
      data: formatChat(chat, currentUserId),
    });
  } catch (err) {
    return next(err);
  }
};

export const getChatFile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { chatId, filename } = req.params;

    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
    });

    if (!chat) {
      return res.status(403).json({ status: "error", message: "Нет доступа" });
    }

    const s3Response = await getChatFileStream(chatId, filename);

    res.setHeader("Content-Type", s3Response.ContentType || "application/octet-stream");
    res.setHeader("Cache-Control", "private, max-age=3600");

    // Для архивов — предлагать скачивание с оригинальным именем
    if (
      s3Response.ContentType &&
      !s3Response.ContentType.startsWith("image/")
    ) {
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
    }

    s3Response.Body.pipe(res);
  } catch (err) {
    if (err.name === "NoSuchKey") {
      return res.status(404).json({ status: "error", message: "Файл не найден" });
    }
    return next(err);
  }
};

export const getChatMessages = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;

    const chat = await prisma.chat.findFirst({
      where: {
        id: chatId,
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
    });

    if (!chat) {
      return res.status(404).json({
        status: "error",
        message: "Чат не найден",
      });
    }

    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          select: userSelect,
        },
      },
    });

    return res.json({
      status: "success",
      data: messages,
    });
  } catch (err) {
    return next(err);
  }
};
