import prisma from '../config/db.js';

export const searchAll = async (req, res) => {
  const {
    tab       = 'photographer',
    q         = '',
    city      = '',
    minRating = '',
    minPrice  = '',
    maxPrice  = '',
    page      = '1',
    limit     = '12',
  } = req.query;

  const role  = tab === 'model' ? 'USER' : 'PHOTOGRAPHER';
  const skip  = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
  const take  = Math.min(40, parseInt(limit));

  const currentUserId = req.user?.id ?? null;

  const where = {
    isDeleted: false,
    role,
    NOT: [
      { tag: { startsWith: 'vk_' } },
      ...(currentUserId ? [{ id: currentUserId }] : []),
    ],
    ...(city.trim() && { city: { equals: city.trim(), mode: 'insensitive' } }),
    ...(q.trim() && {
      OR: [
        { firstName: { contains: q.trim(), mode: 'insensitive' } },
        { lastName:  { contains: q.trim(), mode: 'insensitive' } },
        { tag:       { contains: q.trim().replace('@', ''), mode: 'insensitive' } },
      ],
    }),
    ...(role === 'PHOTOGRAPHER' && (minRating || minPrice || maxPrice) && {
      photographer: {
        ...(minRating && { rating:       { gte: parseFloat(minRating) } }),
        ...(minPrice  && { pricePerHour: { gte: parseFloat(minPrice)  } }),
        ...(maxPrice  && { pricePerHour: { lte: parseFloat(maxPrice)  } }),
      },
    }),
  };

  try {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: [{ subscribers: { _count: 'desc' } }, { createdAt: 'asc' }],
        skip,
        take,
        select: {
          id:        true,
          firstName: true,
          lastName:  true,
          tag:       true,
          avatarUrl: true,
          city:      true,
          role:      true,
          photographer: {
            select: { rating: true, pricePerHour: true, searchPhotos: true },
          },
          _count: { select: { subscribers: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({
      status: 'success',
      data: users,
      pagination: {
        page:    parseInt(page),
        limit:   take,
        total,
        hasMore: skip + users.length < total,
      },
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const getCities = async (req, res) => {
  const { tab = 'photographer' } = req.query;
  const role = tab === 'model' ? 'USER' : 'PHOTOGRAPHER';

  try {
    const rows = await prisma.user.findMany({
      where: {
        isDeleted: false,
        role,
        city: { not: null },
        NOT: { tag: { startsWith: 'vk_' } },
      },
      select:   { city: true },
      distinct: ['city'],
      orderBy:  { city: 'asc' },
    });

    return res.json({
      status: 'success',
      data:   rows.map((r) => r.city).filter(Boolean),
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
