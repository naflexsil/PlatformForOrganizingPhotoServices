import prisma from '../config/db.js';

const MONTH_LABELS_RU = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

const getPeriodStart = (period) => {
  const now = new Date();
  if (period === '7d') return new Date(now - 7 * 24 * 60 * 60 * 1000);
  if (period === '30d') return new Date(now - 30 * 24 * 60 * 60 * 1000);
  if (period === '90d') return new Date(now - 90 * 24 * 60 * 60 * 1000);
  return null;
};

export const getContentStats = async (req, res) => {
  if (req.user.role !== 'PHOTOGRAPHER') {
    return res.status(403).json({ status: 'error', message: 'Доступ запрещён' });
  }

  const userId = req.user.id;
  const periodStart = getPeriodStart(req.query.period);
  const dateFilter = periodStart ? { createdAt: { gte: periodStart } } : {};

  try {
    const [
      totalPostLikes,
      totalPostFavorites,
      totalPhotoLikes,
      totalPosts,
      totalPortfolioPhotos,
    ] = await Promise.all([
      prisma.like.count({ where: { post: { authorId: userId }, ...dateFilter } }),
      prisma.favorite.count({ where: { post: { authorId: userId }, ...dateFilter } }),
      prisma.photoLike.count({ where: { photo: { userId, folderId: { not: null } }, ...dateFilter } }),
      prisma.post.count({ where: { authorId: userId, ...dateFilter } }),
      prisma.photo.count({ where: { userId, folderId: { not: null }, ...dateFilter } }),
    ]);

    const posts = await prisma.post.findMany({
      where: { authorId: userId, ...dateFilter },
      include: {
        _count: { select: { likes: true, favorites: true } },
        photos: { take: 1, orderBy: { position: 'asc' }, select: { urlPreview: true } },
      },
    });

    const topPosts = posts
      .map((p) => ({
        id: p.id,
        previewUrl: p.photos[0]?.urlPreview || null,
        description: p.description || '',
        likes: p._count.likes,
        favorites: p._count.favorites,
        total: p._count.likes + p._count.favorites,
        createdAt: p.createdAt,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const topPhotosRaw = await prisma.photo.findMany({
      where: { userId, folderId: { not: null }, ...dateFilter },
      orderBy: { likesCount: 'desc' },
      take: 5,
      include: { folder: { select: { name: true } } },
    });

    const topPhotos = topPhotosRaw.map((ph) => ({
      id: ph.id,
      urlPreview: ph.urlPreview,
      likesCount: ph.likesCount,
      folderName: ph.folder?.name || null,
      folderId: ph.folderId,
      createdAt: ph.createdAt,
    }));

    const eightWeeksAgo = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000);

    const [weeklyPostLikes, weeklyPhotoLikes, weeklyPostFavs] = await Promise.all([
      prisma.like.findMany({
        where: { post: { authorId: userId }, createdAt: { gte: eightWeeksAgo } },
        select: { createdAt: true },
      }),
      prisma.photoLike.findMany({
        where: { photo: { userId, folderId: { not: null } }, createdAt: { gte: eightWeeksAgo } },
        select: { createdAt: true },
      }),
      prisma.favorite.findMany({
        where: { post: { authorId: userId }, createdAt: { gte: eightWeeksAgo } },
        select: { createdAt: true },
      }),
    ]);

    const weeklyTrend = Array.from({ length: 8 }, (_, i) => {
      const start = new Date(eightWeeksAgo.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
      const label = start.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
      const inWeek = (item) => item.createdAt >= start && item.createdAt < end;
      return {
        label,
        postLikes: weeklyPostLikes.filter(inWeek).length,
        photoLikes: weeklyPhotoLikes.filter(inWeek).length,
        postFavorites: weeklyPostFavs.filter(inWeek).length,
        total:
          weeklyPostLikes.filter(inWeek).length +
          weeklyPhotoLikes.filter(inWeek).length +
          weeklyPostFavs.filter(inWeek).length,
      };
    });

    const [allPostsForAvg, allPhotosForAvg] = await Promise.all([
      prisma.post.findMany({
        where: { authorId: userId },
        include: { _count: { select: { likes: true, favorites: true } } },
      }),
      prisma.photo.findMany({
        where: { userId, folderId: { not: null } },
        select: { likesCount: true },
      }),
    ]);

    const avgPostReactions =
      allPostsForAvg.length
        ? Math.round(
            (allPostsForAvg.reduce((s, p) => s + p._count.likes + p._count.favorites, 0) /
              allPostsForAvg.length) *
              10,
          ) / 10
        : 0;

    const avgPhotoReactions =
      allPhotosForAvg.length
        ? Math.round(
            (allPhotosForAvg.reduce((s, p) => s + p.likesCount, 0) / allPhotosForAvg.length) * 10,
          ) / 10
        : 0;

    return res.json({
      status: 'success',
      data: {
        summary: {
          totalLikes: totalPostLikes + totalPhotoLikes,
          totalFavorites: totalPostFavorites,
          totalPosts,
          totalPortfolioPhotos,
        },
        topPosts,
        topPhotos,
        weeklyTrend,
        contentComparison: {
          avgPostReactions,
          avgPhotoReactions,
          postsCount: allPostsForAvg.length,
          photosCount: allPhotosForAvg.length,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const getDealStats = async (req, res) => {
  if (req.user.role !== 'PHOTOGRAPHER') {
    return res.status(403).json({ status: 'error', message: 'Доступ запрещён' });
  }

  const userId = req.user.id;
  const periodStart = getPeriodStart(req.query.period);
  const dateFilter = periodStart ? { createdAt: { gte: periodStart } } : {};

  try {
    const deals = await prisma.deal.findMany({
      where: { photographerId: userId, ...dateFilter },
      select: {
        status: true,
        rating: true,
        createdAt: true,
        _count: { select: { revisions: true } },
      },
    });

    const completed = deals.filter((d) => d.status === 'COMPLETED');
    const rejected = deals.filter((d) => d.status === 'REJECTED');
    const active = deals.filter((d) => !['COMPLETED', 'REJECTED'].includes(d.status));

    const reliabilityBase = completed.length + rejected.length;
    const reliabilityIndex =
      reliabilityBase > 0 ? Math.round((completed.length / reliabilityBase) * 100) : null;

    const ratingsWithValue = completed.filter((d) => d.rating !== null);
    const avgRating =
      ratingsWithValue.length
        ? Math.round(
            (ratingsWithValue.reduce((s, d) => s + d.rating, 0) / ratingsWithValue.length) * 10,
          ) / 10
        : null;

    const avgRevisions =
      deals.length
        ? Math.round(
            (deals.reduce((s, d) => s + d._count.revisions, 0) / deals.length) * 10,
          ) / 10
        : 0;

    const STATUS_ORDER = [
      'PENDING',
      'AWAITING_PAYMENT',
      'IN_PROGRESS',
      'AWAITING_REVIEW',
      'REVISION',
      'COMPLETED',
      'REJECTED',
    ];
    const statusBreakdown = {};
    STATUS_ORDER.forEach((st) => {
      statusBreakdown[st] = deals.filter((d) => d.status === st).length;
    });

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const allDealsForTrend = await prisma.deal.findMany({
      where: { photographerId: userId, createdAt: { gte: sixMonthsAgo } },
      select: { status: true, createdAt: true },
    });

    const monthMap = {};
    allDealsForTrend.forEach((d) => {
      const key = `${d.createdAt.getFullYear()}-${String(d.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) monthMap[key] = { total: 0, completed: 0 };
      monthMap[key].total++;
      if (d.status === 'COMPLETED') monthMap[key].completed++;
    });

    const monthlyTrend = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => ({
        label: MONTH_LABELS_RU[parseInt(key.split('-')[1]) - 1],
        ...val,
      }));

    return res.json({
      status: 'success',
      data: {
        summary: {
          total: deals.length,
          completed: completed.length,
          rejected: rejected.length,
          active: active.length,
          reliabilityIndex,
        },
        avgRating,
        avgRevisions,
        monthlyTrend,
        statusBreakdown,
      },
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
