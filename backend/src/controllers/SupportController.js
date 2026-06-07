import prisma from "../config/db.js";

export const createTicket = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { message, dealId, chatId } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ status: "error", message: "Сообщение обязательно" });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        message: message.trim(),
        dealId: dealId || null,
        chatId: chatId || null,
      },
      select: {
        id: true,
        message: true,
        status: true,
        dealId: true,
        chatId: true,
        createdAt: true,
      },
    });

    return res.status(201).json({ status: "success", data: ticket });
  } catch (err) {
    return next(err);
  }
};

export const getMyTickets = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const tickets = await prisma.supportTicket.findMany({
      where: { userId },
      select: {
        id: true,
        message: true,
        status: true,
        dealId: true,
        chatId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ status: "success", data: tickets });
  } catch (err) {
    return next(err);
  }
};
