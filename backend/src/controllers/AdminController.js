import prisma from '../config/db.js';
import { notify } from '../utils/notifications.js';

export const getTickets = async (req, res) => {
  try {
    const tickets = await prisma.supportTicket.findMany({
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, tag: true, avatarUrl: true },
        },
      },
    });
    return res.json({ status: 'success', data: tickets });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const replyToTicket = async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ status: 'error', message: 'Сообщение обязательно' });
  }

  try {
    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) return res.status(404).json({ status: 'error', message: 'Тикет не найден' });
    if (ticket.adminReply) {
      return res.status(400).json({ status: 'error', message: 'Ответ уже был отправлен' });
    }

    const updated = await prisma.supportTicket.update({
      where: { id },
      data: {
        adminReply: message.trim(),
        status:     'RESOLVED',
        resolvedAt: new Date(),
      },
    });

    await notify({
      userId:   ticket.userId,
      type:     'SYSTEM_REPLY',
      metadata: {
        ticketId:      ticket.id,
        ticketMessage: ticket.message,
        adminReply:    message.trim(),
      },
    });

    return res.json({ status: 'success', data: updated });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
