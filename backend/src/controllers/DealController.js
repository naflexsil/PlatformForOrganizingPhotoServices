import prisma from "../config/db.js";
import { getIO } from "../socket/index.js";
import { notify } from "../utils/notifications.js";

const ACTIVE_STATUSES = ["PENDING", "AWAITING_PAYMENT", "IN_PROGRESS", "AWAITING_REVIEW", "REVISION"];

const userSelect = { id: true, firstName: true, lastName: true, tag: true, avatarUrl: true, role: true };

const dealSelect = {
  id: true,
  chatId: true,
  clientId: true,
  photographerId: true,
  proposerId: true,
  conditions: true,
  status: true,
  clientPaid: true,
  photographerConfirmedPayment: true,
  rating: true,
  ratingComment: true,
  createdAt: true,
  updatedAt: true,
  revisions: { orderBy: { createdAt: "asc" }, select: { reason: true, createdAt: true } },
};

function emitDealUpdated(deal) {
  getIO()?.to(`chat:${deal.chatId}`).emit("deal-updated", { deal });
}

async function emitSystemMessage(chatId, senderId, text) {
  const msg = await prisma.message.create({
    data: { chatId, senderId, text, attachmentType: "TEXT" },
    include: { sender: { select: userSelect } },
  });
  await prisma.chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });
  getIO()?.to(`chat:${chatId}`).emit("new-message", { message: msg });
}

export const proposeDeal = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { chatId, conditions } = req.body;

    if (!chatId || !conditions?.trim()) {
      return res.status(400).json({ status: "error", message: "chatId и conditions обязательны" });
    }

    const chat = await prisma.chat.findFirst({
      where: { id: chatId, OR: [{ user1Id: userId }, { user2Id: userId }] },
      include: {
        user1: { select: { id: true, role: true } },
        user2: { select: { id: true, role: true } },
      },
    });
    if (!chat) return res.status(403).json({ status: "error", message: "Нет доступа к чату" });

    const isUser1 = chat.user1Id === userId;
    const proposer = isUser1 ? chat.user1 : chat.user2;
    const companion = isUser1 ? chat.user2 : chat.user1;
    const companionId = companion.id;

    if (proposer.role === "USER" && companion.role === "USER") {
      return res.status(400).json({ status: "error", message: "Клиент не может предложить сделку другому клиенту" });
    }

    const activeDeal = await prisma.deal.findFirst({
      where: { chatId, status: { in: ACTIVE_STATUSES } },
    });
    if (activeDeal) {
      return res.status(400).json({ status: "error", message: "В этом чате уже есть активная сделка" });
    }

    let clientId, photographerId;
    if (proposer.role === "PHOTOGRAPHER" && companion.role === "USER") {
      clientId = companionId;
      photographerId = userId;
    } else if (proposer.role === "USER" && companion.role === "PHOTOGRAPHER") {
      clientId = userId;
      photographerId = companionId;
    } else {
      clientId = userId;
      photographerId = companionId;
    }

    const deal = await prisma.deal.create({
      data: { chatId, clientId, photographerId, proposerId: userId, conditions: conditions.trim() },
      select: dealSelect,
    });

    emitDealUpdated(deal);
    await emitSystemMessage(chatId, userId, `Предложена сделка:\n${conditions.trim()}`);
    notify({ userId: companionId, type: 'DEAL_PROPOSED', fromUserId: userId, dealId: deal.id });

    return res.status(201).json({ status: "success", data: deal });
  } catch (err) { return next(err); }
};

export const acceptDeal = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const deal = await prisma.deal.findUnique({ where: { id: req.params.id } });
    if (!deal) return res.status(404).json({ status: "error", message: "Сделка не найдена" });
    if (deal.photographerId !== userId) return res.status(403).json({ status: "error", message: "Только исполнитель может принять сделку" });
    if (deal.status !== "PENDING") return res.status(400).json({ status: "error", message: "Нельзя принять сделку в текущем статусе" });

    const updated = await prisma.deal.update({
      where: { id: deal.id },
      data: { status: "AWAITING_PAYMENT" },
      select: dealSelect,
    });
    emitDealUpdated(updated);
    await emitSystemMessage(deal.chatId, userId, "Сделка принята. Ожидается оплата.");
    notify({ userId: deal.proposerId, type: 'DEAL_ACCEPTED', fromUserId: userId, dealId: deal.id });
    return res.json({ status: "success", data: updated });
  } catch (err) { return next(err); }
};

export const rejectDeal = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { reason } = req.body;
    const deal = await prisma.deal.findUnique({ where: { id: req.params.id } });
    if (!deal) return res.status(404).json({ status: "error", message: "Сделка не найдена" });
    if (deal.photographerId !== userId) return res.status(403).json({ status: "error", message: "Только исполнитель может отклонить сделку" });
    if (deal.status !== "PENDING") return res.status(400).json({ status: "error", message: "Нельзя отклонить сделку в текущем статусе" });

    if (reason?.trim()) {
      await prisma.dealRevision.create({ data: { dealId: deal.id, reason: `Отказ: ${reason.trim()}` } });
    }

    const updated = await prisma.deal.update({
      where: { id: deal.id },
      data: { status: "REJECTED" },
      select: dealSelect,
    });
    emitDealUpdated(updated);
    const reasonText = reason?.trim() ? ` Причина: ${reason.trim()}` : "";
    await emitSystemMessage(deal.chatId, userId, `Сделка отклонена.${reasonText}`);
    notify({ userId: deal.proposerId, type: 'DEAL_REJECTED', fromUserId: userId, dealId: deal.id });
    return res.json({ status: "success", data: updated });
  } catch (err) { return next(err); }
};

export const cancelDeal = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { reason } = req.body;
    const deal = await prisma.deal.findUnique({ where: { id: req.params.id } });
    if (!deal) return res.status(404).json({ status: "error", message: "Сделка не найдена" });
    if (deal.clientId !== userId && deal.photographerId !== userId) {
      return res.status(403).json({ status: "error", message: "Нет доступа" });
    }
    if (deal.status !== "PENDING") {
      return res.status(400).json({ status: "error", message: "Отменить можно только в статусе Ожидает подтверждения" });
    }

    if (reason?.trim()) {
      await prisma.dealRevision.create({ data: { dealId: deal.id, reason: `Отмена: ${reason.trim()}` } });
    }

    const updated = await prisma.deal.update({
      where: { id: deal.id },
      data: { status: "REJECTED" },
      select: dealSelect,
    });
    emitDealUpdated(updated);
    const reasonText = reason?.trim() ? ` Причина: ${reason.trim()}` : "";
    await emitSystemMessage(deal.chatId, userId, `Сделка отменена.${reasonText}`);
    return res.json({ status: "success", data: updated });
  } catch (err) { return next(err); }
};

export const confirmPaid = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const deal = await prisma.deal.findUnique({ where: { id: req.params.id } });
    if (!deal) return res.status(404).json({ status: "error", message: "Сделка не найдена" });
    if (deal.clientId !== userId) return res.status(403).json({ status: "error", message: "Только клиент может подтвердить оплату" });
    if (deal.status !== "AWAITING_PAYMENT") return res.status(400).json({ status: "error", message: "Неверный статус" });

    const bothConfirmed = deal.photographerConfirmedPayment;
    const updated = await prisma.deal.update({
      where: { id: deal.id },
      data: { clientPaid: true, ...(bothConfirmed && { status: "IN_PROGRESS" }) },
      select: dealSelect,
    });
    emitDealUpdated(updated);
    if (bothConfirmed) {
      await emitSystemMessage(deal.chatId, userId, "Оплата подтверждена обеими сторонами. Сделка в работе!");
    } else {
      await emitSystemMessage(deal.chatId, userId, "Клиент подтвердил оплату. Ожидается подтверждение исполнителя.");
    }
    return res.json({ status: "success", data: updated });
  } catch (err) { return next(err); }
};

export const confirmPaymentReceived = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const deal = await prisma.deal.findUnique({ where: { id: req.params.id } });
    if (!deal) return res.status(404).json({ status: "error", message: "Сделка не найдена" });
    if (deal.photographerId !== userId) return res.status(403).json({ status: "error", message: "Только исполнитель может подтвердить получение оплаты" });
    if (deal.status !== "AWAITING_PAYMENT") return res.status(400).json({ status: "error", message: "Неверный статус" });

    if (!deal.clientPaid) {
      return res.status(400).json({ status: "error", message: "Клиент ещё не подтвердил оплату" });
    }

    const updated = await prisma.deal.update({
      where: { id: deal.id },
      data: { photographerConfirmedPayment: true, status: "IN_PROGRESS" },
      select: dealSelect,
    });
    emitDealUpdated(updated);
    await emitSystemMessage(deal.chatId, userId, "Оплата подтверждена. Сделка переходит в работу!");
    return res.json({ status: "success", data: updated });
  } catch (err) { return next(err); }
};

export const completeWork = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const deal = await prisma.deal.findUnique({ where: { id: req.params.id } });
    if (!deal) return res.status(404).json({ status: "error", message: "Сделка не найдена" });
    if (deal.photographerId !== userId) return res.status(403).json({ status: "error", message: "Только исполнитель может сдать работу" });
    if (!["IN_PROGRESS", "REVISION"].includes(deal.status)) {
      return res.status(400).json({ status: "error", message: "Неверный статус" });
    }

    const updated = await prisma.deal.update({
      where: { id: deal.id },
      data: { status: "AWAITING_REVIEW" },
      select: dealSelect,
    });
    emitDealUpdated(updated);
    await emitSystemMessage(deal.chatId, userId, "Исполнитель сдал работу. Ожидается проверка клиентом.");
    return res.json({ status: "success", data: updated });
  } catch (err) { return next(err); }
};

export const approveDeal = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const deal = await prisma.deal.findUnique({ where: { id: req.params.id } });
    if (!deal) return res.status(404).json({ status: "error", message: "Сделка не найдена" });
    if (deal.clientId !== userId) return res.status(403).json({ status: "error", message: "Только клиент может принять работу" });
    if (deal.status !== "AWAITING_REVIEW") return res.status(400).json({ status: "error", message: "Неверный статус" });

    const updated = await prisma.deal.update({
      where: { id: deal.id },
      data: { status: "COMPLETED" },
      select: dealSelect,
    });
    emitDealUpdated(updated);
    await emitSystemMessage(deal.chatId, userId, "Сделка успешно завершена!");
    notify({ userId: deal.photographerId, type: 'DEAL_COMPLETED', fromUserId: userId, dealId: deal.id });

    const followers = await prisma.subscription.findMany({
      where: { followingId: deal.clientId },
      select: { followerId: true },
      take: 100,
    });
    const meta = { clientId: deal.clientId, photographerId: deal.photographerId, dealId: deal.id };
    followers.forEach(({ followerId }) => {
      if (followerId !== deal.clientId && followerId !== deal.photographerId) {
        notify({ userId: followerId, type: 'FRIEND_DEAL_COMPLETED', fromUserId: deal.clientId, dealId: deal.id, metadata: meta });
      }
    });

    return res.json({ status: "success", data: updated });
  } catch (err) { return next(err); }
};

export const requestRevision = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { reason } = req.body;
    const deal = await prisma.deal.findUnique({ where: { id: req.params.id } });
    if (!deal) return res.status(404).json({ status: "error", message: "Сделка не найдена" });
    if (deal.clientId !== userId) return res.status(403).json({ status: "error", message: "Только клиент может отправить на доработку" });
    if (deal.status !== "AWAITING_REVIEW") return res.status(400).json({ status: "error", message: "Неверный статус" });

    await prisma.dealRevision.create({ data: { dealId: deal.id, reason: reason?.trim() || "Без причины" } });

    const updated = await prisma.deal.update({
      where: { id: deal.id },
      data: { status: "REVISION" },
      select: dealSelect,
    });
    emitDealUpdated(updated);
    const txt = reason?.trim() ? reason.trim() : "Без указания причины";
    await emitSystemMessage(deal.chatId, userId, `Работа отправлена на доработку. Причина: ${txt}`);
    notify({ userId: deal.photographerId, type: 'DEAL_REVISION_REQUESTED', fromUserId: userId, dealId: deal.id });
    return res.json({ status: "success", data: updated });
  } catch (err) { return next(err); }
};

export const rateDeal = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { rating, ratingComment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ status: "error", message: "Оценка должна быть от 1 до 5" });
    }

    const deal = await prisma.deal.findUnique({ where: { id: req.params.id } });
    if (!deal) return res.status(404).json({ status: "error", message: "Сделка не найдена" });
    if (deal.clientId !== userId) return res.status(403).json({ status: "error", message: "Только клиент может оставить оценку" });
    if (deal.status !== "COMPLETED") return res.status(400).json({ status: "error", message: "Оценить можно только завершённую сделку" });
    if (deal.rating !== null) return res.status(400).json({ status: "error", message: "Вы уже оставили оценку" });

    const updated = await prisma.deal.update({
      where: { id: deal.id },
      data: { rating, ratingComment: ratingComment?.trim() || null },
      select: dealSelect,
    });

    const deals = await prisma.deal.findMany({
      where: { photographerId: deal.photographerId, status: "COMPLETED", rating: { not: null } },
      select: { rating: true },
    });
    if (deals.length > 0) {
      const avg = deals.reduce((s, d) => s + d.rating, 0) / deals.length;
      await prisma.photographer.updateMany({
        where: { userId: deal.photographerId },
        data: { rating: Math.round(avg * 10) / 10 },
      });
    }

    emitDealUpdated(updated);
    return res.json({ status: "success", data: updated });
  } catch (err) { return next(err); }
};

export const getDealById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const deal = await prisma.deal.findUnique({
      where: { id: req.params.id },
      select: {
        ...dealSelect,
        revisions: { orderBy: { createdAt: "asc" }, select: { reason: true, createdAt: true } },
        chat: {
          select: {
            id: true,
            user1: { select: userSelect },
            user2: { select: userSelect },
          },
        },
      },
    });
    if (!deal) return res.status(404).json({ status: "error", message: "Сделка не найдена" });
    if (deal.clientId !== userId && deal.photographerId !== userId) {
      return res.status(403).json({ status: "error", message: "Нет доступа" });
    }
    return res.json({ status: "success", data: deal });
  } catch (err) { return next(err); }
};

export const getDeals = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.query;

    const where = chatId
      ? { chatId, OR: [{ clientId: userId }, { photographerId: userId }] }
      : { OR: [{ clientId: userId }, { photographerId: userId }] };

    const deals = await prisma.deal.findMany({
      where,
      select: {
        ...dealSelect,
        chat: {
          select: {
            id: true,
            user1: { select: userSelect },
            user2: { select: userSelect },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return res.json({ status: "success", data: deals });
  } catch (err) { return next(err); }
};
