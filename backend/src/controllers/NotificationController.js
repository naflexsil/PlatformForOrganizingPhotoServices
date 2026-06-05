import prisma from '../config/db.js';

const TAB_TYPES = {
  orders:        ['DEAL_PROPOSED', 'DEAL_ACCEPTED', 'DEAL_REJECTED', 'DEAL_COMPLETED', 'DEAL_REVISION_REQUESTED'],
  subscriptions: ['NEW_SUBSCRIBER'],
  likes:         ['LIKE_POST', 'LIKE_PHOTO'],
  events:        ['FRIEND_DEAL_COMPLETED'],
  system:        ['SYSTEM_REPLY'],
};

const FROM_USER_SELECT = {
  select: { id: true, firstName: true, lastName: true, tag: true, avatarUrl: true },
};

export const getNotifications = async (req, res) => {
  const userId = req.user.id;
  const tab    = req.query.tab || 'orders';
  const page   = Math.max(1, parseInt(req.query.page) || 1);
  const limit  = 20;
  const skip   = (page - 1) * limit;

  const types = TAB_TYPES[tab];
  if (!types) return res.status(400).json({ status: 'error', message: 'Неверная вкладка' });

  try {
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where:   { userId, type: { in: types } },
        orderBy: { createdAt: 'desc' },
        skip,
        take:    limit,
        include: {
          fromUser: FROM_USER_SELECT,
          post:  { select: { id: true, images: true } },
          photo: { select: { id: true, urlPreview: true } },
          deal:  { select: { id: true, status: true, conditions: true, chatId: true } },
        },
      }),
      prisma.notification.count({ where: { userId, type: { in: types } } }),
    ]);

    return res.json({
      status: 'success',
      data:   notifications,
      pagination: { page, limit, total, hasMore: skip + notifications.length < total },
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const getUnreadCount = async (req, res) => {
  const userId = req.user.id;
  try {
    const count = await prisma.notification.count({ where: { userId, isRead: false } });
    return res.json({ status: 'success', data: { count } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const markAllRead = async (req, res) => {
  const userId = req.user.id;
  const tab    = req.query.tab;
  const types  = tab ? TAB_TYPES[tab] : null;

  try {
    await prisma.notification.updateMany({
      where: { userId, isRead: false, ...(types && { type: { in: types } }) },
      data:  { isRead: true },
    });
    return res.json({ status: 'success' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const markOneRead = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    await prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
    return res.json({ status: 'success' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
