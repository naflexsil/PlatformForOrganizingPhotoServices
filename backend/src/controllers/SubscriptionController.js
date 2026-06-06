import prisma from '../config/db.js';
import { notify } from '../utils/notifications.js';

export const subscribe = async (req, res) => {
  const { targetId } = req.params;
  const followerId = req.user.id;

  if (followerId === targetId) {
    return res.status(400).json({ status: 'error', message: 'Нельзя подписаться на себя' });
  }

  try {
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target || target.isDeleted) {
      return res.status(404).json({ status: 'error', message: 'Пользователь не найден' });
    }

    const existing = await prisma.subscription.findFirst({
      where: { followerId, followingId: targetId },
    });

    if (existing) {
      await prisma.subscription.deleteMany({
        where: { followerId, followingId: targetId },
      });
      return res.json({ status: 'success', subscribed: false });
    }

    await prisma.subscription.create({ data: { followerId, followingId: targetId } });
    notify({ userId: targetId, type: 'NEW_SUBSCRIBER', fromUserId: followerId });
    return res.json({ status: 'success', subscribed: true });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const getSubscriptions = async (req, res) => {
  const userId = req.user.id;

  try {
    const subs = await prisma.subscription.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            tag: true,
            avatarUrl: true,
            role: true,
            photographer: { select: { rating: true, pricePerHour: true } },
          },
        },
      },
    });

    const followingIds = subs.map((s) => s.followingId);

    const mutualSubs = await prisma.subscription.findMany({
      where: { followerId: { in: followingIds }, followingId: userId },
    });
    const friendIds = new Set(mutualSubs.map((s) => s.followerId));

    const data = subs
      .map((s) => ({ ...s.following, isFriend: friendIds.has(s.followingId) }))
      .sort((a, b) => Number(b.isFriend) - Number(a.isFriend));

    return res.json({ status: 'success', data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const getSubscribers = async (req, res) => {
  const userId = req.user.id;

  try {
    const subs = await prisma.subscription.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            tag: true,
            avatarUrl: true,
            role: true,
          },
        },
      },
    });

    return res.json({ status: 'success', data: subs.map((s) => s.follower) });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const checkSubscription = async (req, res) => {
  const { targetId } = req.params;
  const followerId = req.user.id;

  try {
    const sub = await prisma.subscription.findFirst({
      where: { followerId, followingId: targetId },
    });
    return res.json({ status: 'success', subscribed: !!sub });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const getUserSubscribers = async (req, res) => {
  const { userId } = req.params;
  try {
    const subs = await prisma.subscription.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: { id: true, firstName: true, lastName: true, tag: true, avatarUrl: true, role: true, isDeleted: true },
        },
      },
    });

    const followerIds = subs.map((s) => s.followerId);
    const mutual = followerIds.length
      ? await prisma.subscription.findMany({
          where: { followerId: userId, followingId: { in: followerIds } },
        })
      : [];
    const friendIds = new Set(mutual.map((m) => m.followingId));

    const data = subs
      .filter((s) => s.follower && !s.follower.isDeleted)
      .map((s) => {
        const { isDeleted, ...rest } = s.follower;
        return { ...rest, isFriend: friendIds.has(s.followerId) };
      });

    return res.json({ status: 'success', data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const getUserSubscriptions = async (req, res) => {
  const { userId } = req.params;
  try {
    const subs = await prisma.subscription.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: { id: true, firstName: true, lastName: true, tag: true, avatarUrl: true, role: true, isDeleted: true },
        },
      },
    });

    const followingIds = subs.map((s) => s.followingId);
    const mutual = followingIds.length
      ? await prisma.subscription.findMany({
          where: { followerId: { in: followingIds }, followingId: userId },
        })
      : [];
    const friendIds = new Set(mutual.map((m) => m.followerId));

    const data = subs
      .filter((s) => s.following && !s.following.isDeleted)
      .map((s) => {
        const { isDeleted, ...rest } = s.following;
        return { ...rest, isFriend: friendIds.has(s.followingId) };
      });

    return res.json({ status: 'success', data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
