import prisma from "../config/db.js";
import { getIO } from "../socket/index.js";

const SUPPORT_EMAIL = "mailto:laceebbarffq2d@outlook.com";

const ACTIVE_STATUSES = ["PENDING", "AWAITING_PAYMENT", "IN_PROGRESS", "AWAITING_REVIEW", "REVISION"];

const dealSelect = {
  id: true,
  chatId: true,
  clientId: true,
  photographerId: true,
  conditions: true,
  status: true,
  clientPaid: true,
  photographerConfirmedPayment: true,
  rating: true,
  ratingComment: true,
  createdAt: true,
  updatedAt: true,
  revisions: { orderBy: { createdAt: "desc" }, take: 1, select: { reason: true, createdAt: true } },
};

function emitDealUpdated(deal) {
  getIO()?.to(`chat:${deal.chatId}`).emit("deal-updated", { deal });
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
    });
    if (!chat) return res.status(403).json({ status: "error", message: "Нет доступа к чату" });

    const activeDeal = await prisma.deal.findFirst({
      where: { chatId, status: { in: ACTIVE_STATUSES } },
    });
    if (activeDeal) {
      return res.status(400).json({ status: "error", message: "В этом чате уже есть активная сделка" });
    }

    const companionId = chat.user1Id === userId ? chat.user2Id : chat.user1Id;

    const deal = await prisma.deal.create({
      data: {
        chatId,
        clientId: userId,
        photographerId: companionId,
        conditions: conditions.trim(),
      },
      select: dealSelect,
    });

    emitDealUpdated(deal);
    return res.status(201).json({ status: "success", data: deal });
  } catch (err) {
    return next(err);
  }
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
    return res.json({ status: "success", data: updated });
  } catch (err) { return next(err); }
};

export const rejectDeal = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const deal = await prisma.deal.findUnique({ where: { id: req.params.id } });
    if (!deal) return res.status(404).json({ status: "error", message: "Сделка не найдена" });
    if (deal.photographerId !== userId) return res.status(403).json({ status: "error", message: "Только исполнитель может отклонить сделку" });
    if (deal.status !== "PENDING") return res.status(400).json({ status: "error", message: "Нельзя отклонить сделку в текущем статусе" });

    const updated = await prisma.deal.update({
      where: { id: deal.id },
      data: { status: "REJECTED" },
      select: dealSelect,
    });
    emitDealUpdated(updated);
    return res.json({ status: "success", data: updated });
  } catch (err) { return next(err); }
};

export const cancelDeal = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const deal = await prisma.deal.findUnique({ where: { id: req.params.id } });
    if (!deal) return res.status(404).json({ status: "error", message: "Сделка не найдена" });
    if (deal.clientId !== userId && deal.photographerId !== userId) {
      return res.status(403).json({ status: "error", message: "Нет доступа" });
    }
    if (deal.status !== "PENDING") {
      return res.status(400).json({ status: "error", message: "Отменить можно только в статусе Ожидает подтверждения" });
    }

    const updated = await prisma.deal.update({
      where: { id: deal.id },
      data: { status: "REJECTED" },
      select: dealSelect,
    });
    emitDealUpdated(updated);
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
      data: {
        clientPaid: true,
        ...(bothConfirmed && { status: "IN_PROGRESS" }),
      },
      select: dealSelect,
    });
    emitDealUpdated(updated);
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

    const bothConfirmed = deal.clientPaid;
    const updated = await prisma.deal.update({
      where: { id: deal.id },
      data: {
        photographerConfirmedPayment: true,
        ...(bothConfirmed && { status: "IN_PROGRESS" }),
      },
      select: dealSelect,
    });
    emitDealUpdated(updated);
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
      await prisma.photographer.update({
        where: { userId: deal.photographerId },
        data: { rating: Math.round(avg * 10) / 10 },
      });
    }

    emitDealUpdated(updated);
    return res.json({ status: "success", data: updated });
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
            user1: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, tag: true } },
            user2: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, tag: true } },
          },
        },
      },
      orderBy: [
        { status: "asc" },  
        { updatedAt: "desc" },
      ],
    });

    return res.json({ status: "success", data: deals });
  } catch (err) { return next(err); }
};
