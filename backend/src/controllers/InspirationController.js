import prisma from '../config/db.js';

export const getInspirationFeed = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(40, Math.max(1, parseInt(req.query.limit) || 20));
  const userId = req.user?.id;

  try {
    const where = {
      userId: { not: null },
    };

    const skip = (page - 1) * limit;

    const [photos, total] = await Promise.all([
      prisma.photo.findMany({
        where,
        orderBy: { likesCount: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              tag: true,
              avatarUrl: true,
            },
          },
          _count: { select: { favorites: true } },
          ...(userId && {
            likes: { where: { userId }, select: { userId: true } },
            favorites: { where: { userId }, select: { userId: true } },
          }),
        },
      }),
      prisma.photo.count({ where }),
    ]);

    const data = photos.map((p) => ({
      id: p.id,
      urlPreview: p.urlPreview,
      urlOriginal: p.urlOriginal,
      description: p.description || '',
      likesCount: p.likesCount,
      favoritesCount: p._count.favorites,
      createdAt: p.createdAt,
      isLiked: userId ? p.likes?.length > 0 : false,
      isFavorited: userId ? p.favorites?.length > 0 : false,
      author: p.user
        ? {
            id: p.user.id,
            firstName: p.user.firstName,
            lastName: p.user.lastName,
            tag: p.user.tag,
            avatarUrl: p.user.avatarUrl,
          }
        : null,
    }));

    return res.json({
      status: 'success',
      data,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + data.length < total,
      },
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
