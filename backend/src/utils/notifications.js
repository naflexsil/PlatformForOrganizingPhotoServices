import prisma from '../config/db.js';
import { getIO } from '../socket/index.js';

export const notify = async ({ userId, type, fromUserId = null, postId = null, photoId = null, dealId = null, metadata = null }) => {
  if (!userId || userId === fromUserId) return;
  try {
    await prisma.notification.create({ data: { userId, type, fromUserId, postId, photoId, dealId, metadata } });
    const io = getIO();
    if (io) io.to(`user:${userId}`).emit('new-notification');
  } catch (err) {
    console.error('[Notify]', err.message);
  }
};
