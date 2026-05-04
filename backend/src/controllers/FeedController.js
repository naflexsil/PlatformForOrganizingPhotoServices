import prisma from '../config/db.js';

const PHOTOGRAPHER_SELECT = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    tag: true,
    avatarUrl: true,
    photographer: { select: { rating: true, pricePerHour: true } },
  },
};

const buildFeedPhotoSelect = (userId) => {
  const select = {
    id: true,
    urlPreview: true,
    createdAt: true,
    _count: { select: { likes: true, favorites: true } },
    folder: {
      select: {
        id: true,
        name: true,
        user: PHOTOGRAPHER_SELECT,
      },
    },
  };
  if (userId) {
    select.likes = { where: { userId }, select: { userId: true } };
    select.favorites = { where: { userId }, select: { userId: true } };
  }
  return select;
};

const transformFeedPhoto = (photo, userId) => {
  const { likes, favorites, ...rest } = photo;
  return {
    ...rest,
    ...(userId && {
      isLiked: (likes?.length || 0) > 0,
      isFavorited: (favorites?.length || 0) > 0,
    }),
  };
};

const FEED_WHERE = {
  folderId: { not: null },
  folder: { user: { isDeleted: false } },
};

export const getFeed = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const userId = req.user?.id ?? null;

  try {
    const [photos, total] = await Promise.all([
      prisma.photo.findMany({
        where: FEED_WHERE,
        select: buildFeedPhotoSelect(userId),
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.photo.count({ where: FEED_WHERE }),
    ]);

    return res.json({
      status: 'success',
      data: photos.map((p) => transformFeedPhoto(p, userId)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const getFeedPhoto = async (req, res) => {
  const { photoId } = req.params;
  const userId = req.user?.id ?? null;

  const select = {
    ...buildFeedPhotoSelect(userId),
    urlOriginal: true,
  };

  try {
    const photo = await prisma.photo.findFirst({
      where: { id: photoId, ...FEED_WHERE },
      select,
    });

    if (!photo) {
      return res.status(404).json({ status: 'error', message: 'Фото не найдено' });
    }

    return res.json({ status: 'success', data: transformFeedPhoto(photo, userId) });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
