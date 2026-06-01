import { Server } from "socket.io";
import { verifyAccessToken } from "../utils/jwt.js";
import prisma from "../config/db.js";

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  tag: true,
  avatarUrl: true,
  role: true,
};

// userId → Set<socketId>  (multiple tabs / devices per user)
const onlineUsers = new Map();

// socketId → { count, resetAt }
const msgRateLimits = new Map();

function checkRateLimit(socketId) {
  const now = Date.now();
  const entry = msgRateLimits.get(socketId);
  if (!entry || now > entry.resetAt) {
    msgRateLimits.set(socketId, { count: 1, resetAt: now + 10_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

async function getCompanionIds(userId) {
  const chats = await prisma.chat.findMany({
    where: {
      OR: [{ user1Id: userId }, { user2Id: userId }],
      messages: { some: {} },
    },
    select: { user1Id: true, user2Id: true },
  });
  return chats.map((c) => (c.user1Id === userId ? c.user2Id : c.user1Id));
}

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3001",
      credentials: true,
    },
  });

  // JWT auth middleware for every socket connection
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Unauthorized"));
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.id;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId;

    // Track online sessions
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    // Mark online in DB (only on first session)
    if (onlineUsers.get(userId).size === 1) {
      await prisma.user.update({
        where: { id: userId },
        data: { isOnline: true, lastSeenAt: new Date() },
      });
    }

    // Join personal room (for notifications / online status)
    socket.join(`user:${userId}`);

    // Auto-join all existing chat rooms
    const chats = await prisma.chat.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      select: { id: true },
    });
    for (const chat of chats) {
      socket.join(`chat:${chat.id}`);
    }

    // Notify contacts that user is online
    const companionIds = await getCompanionIds(userId);
    for (const companionId of companionIds) {
      if (onlineUsers.has(companionId)) {
        io.to(`user:${companionId}`).emit("user-online", { userId });
      }
    }

    // ── send-message ────────────────────────────────────────────────────
    // attachments: [{previewUrl, originalUrl}] for IMAGE, [{url, fileName, fileSize}] for FILE
    socket.on("send-message", async ({ chatId, text, attachments, attachmentType }, callback) => {
      if (!checkRateLimit(socket.id)) {
        return callback?.({ error: "Слишком много сообщений, подождите немного" });
      }

      if (!chatId) return callback?.({ error: "chatId обязателен" });
      if (!text?.trim() && !attachments?.length) return callback?.({ error: "Пустое сообщение" });

      // Verify sender is a participant
      const chat = await prisma.chat.findFirst({
        where: {
          id: chatId,
          OR: [{ user1Id: userId }, { user2Id: userId }],
        },
      });
      if (!chat) return callback?.({ error: "Чат не найден" });

      const message = await prisma.message.create({
        data: {
          chatId,
          senderId: userId,
          text: text?.trim() || null,
          attachments: attachments?.length ? attachments : null,
          attachmentType: attachments?.length ? (attachmentType || "IMAGE") : "TEXT",
        },
        include: { sender: { select: userSelect } },
      });

      await prisma.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      });

      // Ensure sender socket is in the room (handles chats created after connect)
      socket.join(`chat:${chatId}`);

      // If companion is online, make their sockets join the room too
      // (needed when chat was created while companion was already connected)
      const companionId = chat.user1Id === userId ? chat.user2Id : chat.user1Id;
      const companionSockets = onlineUsers.get(companionId);
      if (companionSockets) {
        for (const socketId of companionSockets) {
          io.in(socketId).socketsJoin(`chat:${chatId}`);
        }
      }

      io.to(`chat:${chatId}`).emit("new-message", { message });
      callback?.({ success: true, message });
    });

    // ── typing ──────────────────────────────────────────────────────────
    socket.on("typing", async ({ chatId }) => {
      if (!chatId) return;
      const isMember = await prisma.chat.findFirst({
        where: {
          id: chatId,
          OR: [{ user1Id: userId }, { user2Id: userId }],
        },
        select: { id: true },
      });
      if (!isMember) return;
      socket.to(`chat:${chatId}`).emit("user-typing", { chatId, userId });
    });

    // ── stop-typing ─────────────────────────────────────────────────────
    socket.on("stop-typing", async ({ chatId }) => {
      if (!chatId) return;
      socket.to(`chat:${chatId}`).emit("user-stop-typing", { chatId, userId });
    });

    // ── mark-read ────────────────────────────────────────────────────────
    socket.on("mark-read", async ({ chatId }) => {
      if (!chatId) return;

      const chat = await prisma.chat.findFirst({
        where: {
          id: chatId,
          OR: [{ user1Id: userId }, { user2Id: userId }],
        },
      });
      if (!chat) return;

      await prisma.message.updateMany({
        where: {
          chatId,
          senderId: { not: userId },
          isRead: false,
        },
        data: { isRead: true },
      });

      socket.to(`chat:${chatId}`).emit("messages-read", { chatId, userId });
    });

    // ── disconnect ───────────────────────────────────────────────────────
    socket.on("disconnect", async () => {
      msgRateLimits.delete(socket.id);

      const sessions = onlineUsers.get(userId);
      if (sessions) {
        sessions.delete(socket.id);
        if (sessions.size === 0) {
          onlineUsers.delete(userId);
          const lastSeenAt = new Date();
          await prisma.user.update({
            where: { id: userId },
            data: { isOnline: false, lastSeenAt },
          });
          const ids = await getCompanionIds(userId);
          for (const companionId of ids) {
            io.to(`user:${companionId}`).emit("user-offline", { userId, lastSeenAt });
          }
        }
      }
    });
  });

  return io;
}
