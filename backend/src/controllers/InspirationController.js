import prisma from '../config/db.js';

const USER_SELECT = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    tag: true,
    avatarUrl: true,
  },
};

const getMixRatio = (likeCount) => {
  if (likeCount < 5)   return { pop: 1.0, per: 0.0 };
  if (likeCount <= 20) return { pop: 0.7, per: 0.3 };
  if (likeCount <= 50) return { pop: 0.5, per: 0.5 };
  return { pop: 0.1, per: 0.9 };
};

const formatPhoto = (p, userId) => ({
  id: p.id,
  urlPreview: p.urlPreview,
  urlOriginal: p.urlOriginal,
  description: p.description || '',
  likesCount: p.likesCount,
  favoritesCount: p._count?.favorites ?? 0,
  createdAt: p.createdAt,
  isLiked: userId ? (p.likes?.length > 0) : false,
  isFavorited: userId ? (p.favorites?.length > 0) : false,
  author: p.user
    ? {
        id: p.user.id,
        firstName: p.user.firstName,
        lastName: p.user.lastName,
        tag: p.user.tag,
        avatarUrl: p.user.avatarUrl,
      }
    : null,
});

const fetchFullPhotos = async (ids, userId) => {
  const photos = await prisma.photo.findMany({
    where: { id: { in: ids }, user: { isDeleted: false } },
    include: {
      user: USER_SELECT,
      _count: { select: { favorites: true } },
      ...(userId && {
        likes: { where: { userId }, select: { userId: true } },
        favorites: { where: { userId }, select: { userId: true } },
      }),
    },
  });
  const map = new Map(photos.map((p) => [p.id, p]));
  return ids.map((id) => map.get(id)).filter(Boolean);
};

const popularityFeed = async (res, page, skip, limit, userId) => {
  const where = { userId: { not: null } };
  const [photos, total] = await Promise.all([
    prisma.photo.findMany({
      where,
      orderBy: [{ likesCount: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
      include: {
        user: USER_SELECT,
        _count: { select: { favorites: true } },
        ...(userId && {
          likes: { where: { userId }, select: { userId: true } },
          favorites: { where: { userId }, select: { userId: true } },
        }),
      },
    }),
    prisma.photo.count({ where }),
  ]);

  return res.json({
    status: 'success',
    data: photos.map((p) => formatPhoto(p, userId)),
    pagination: { page, limit, total, hasMore: skip + photos.length < total },
  });
};

export const getInspirationFeed = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(40, Math.max(1, parseInt(req.query.limit) || 20));
  const userId = req.user?.id ?? null;
  const skip = (page - 1) * limit;

  try {
    if (!userId) {
      return popularityFeed(res, page, skip, limit, null);
    }

    const countRows = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS cnt
       FROM photo_likes pl
       JOIN photos p ON pl."photoId" = p.id
       WHERE pl."userId" = $1
         AND p."userId" IS NOT NULL
         AND p."embeddingVector" IS NOT NULL`,
      userId,
    );
    const likeCount = Number(countRows[0]?.cnt ?? 0);
    const { pop, per } = getMixRatio(likeCount);

    if (per === 0) {
      return popularityFeed(res, page, skip, limit, userId);
    }

    const vecRows = await prisma.$queryRawUnsafe(
      `SELECT avg(ph."embeddingVector")::text AS vec
       FROM (
         SELECT ph2."embeddingVector"
         FROM photos ph2
         JOIN photo_likes pl ON pl."photoId" = ph2.id
         WHERE pl."userId" = $1
           AND ph2."embeddingVector" IS NOT NULL
           AND ph2."userId" IS NOT NULL
         ORDER BY pl."createdAt" DESC
         LIMIT 50
       ) ph`,
      userId,
    );

    const userVec = vecRows[0]?.vec ?? null;
    if (!userVec) {
      return popularityFeed(res, page, skip, limit, userId);
    }

    const ranked = await prisma.$queryRawUnsafe(
      `WITH max_l AS (
         SELECT GREATEST(MAX("likesCount"), 1)::float AS val
         FROM photos
         WHERE "userId" IS NOT NULL AND "embeddingVector" IS NOT NULL
       )
       SELECT id::text
       FROM photos, max_l
       WHERE "userId" IS NOT NULL
         AND "embeddingVector" IS NOT NULL
       ORDER BY
         $1::float * ("likesCount"::float / max_l.val) +
         $2::float * (1 - ("embeddingVector" <=> $3::vector))
       DESC
       LIMIT $4 OFFSET $5`,
      pop, per, userVec, limit, skip,
    );

    const totalRows = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS cnt FROM photos
       WHERE "userId" IS NOT NULL AND "embeddingVector" IS NOT NULL`,
    );
    const total = Number(totalRows[0]?.cnt ?? 0);

    if (ranked.length === 0) {
      return res.json({
        status: 'success',
        data: [],
        pagination: { page, limit, total, hasMore: false },
      });
    }

    const ids = ranked.map((r) => r.id);
    const sorted = await fetchFullPhotos(ids, userId);
    const data = sorted.map((p) => formatPhoto(p, userId));

    return res.json({
      status: 'success',
      data,
      pagination: { page, limit, total, hasMore: skip + data.length < total },
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

