import prisma from '../config/db.js';

export const searchUsers = async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim() === '') {
    return res.status(400).json({ status: 'error', message: 'Параметр q обязателен' });
  }

  const query = q.trim();
  const isTagSearch = query.startsWith('@');
  const searchTerm = isTagSearch ? query.slice(1) : query;

  try {
    const users = await prisma.user.findMany({
      where: {
        isDeleted: false,
        OR: isTagSearch
          ? [{ tag: { contains: searchTerm, mode: 'insensitive' } }]
          : [
              { firstName: { contains: searchTerm, mode: 'insensitive' } },
              { lastName: { contains: searchTerm, mode: 'insensitive' } },
              { tag: { contains: searchTerm, mode: 'insensitive' } },
            ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        tag: true,
        avatarUrl: true,
        role: true,
        photographer: { select: { rating: true, pricePerHour: true } },
      },
    });

    return res.status(200).json({ status: 'success', data: users });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
