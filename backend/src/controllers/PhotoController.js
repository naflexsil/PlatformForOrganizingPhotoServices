import prisma from '../config/db.js';
import { notify } from '../utils/notifications.js';
import { deleteFile } from '../services/fileService.js';

const deleteFromUrl = async (url) => {
  const parts = url?.split('/api/files/');
  if (parts?.length === 2) {
    const [bucket, ...keyParts] = parts[1].split('/');
    const key = keyParts.join('/');
    if (bucket && key) await deleteFile(bucket, key);
  }
};

export const getPhotos = async (req, res) => {
  const { userId, folderId, standalone } = req.query;
  const currentUserId = req.user?.id;

  try {
    const where = {};
    if (userId) where.userId = userId;
    if (folderId) {
      where.folderId = folderId;
    } else if (standalone === 'true') {
      where.folderId = null;
    }

    const photos = await prisma.photo.findMany({
      where,
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
      include: {
        _count: { select: { likes: true, favorites: true } },
        ...(currentUserId && {
          likes: { where: { userId: currentUserId }, select: { userId: true } },
          favorites: { where: { userId: currentUserId }, select: { userId: true } },
        }),
      },
    });

    const data = photos.map((p) => ({
      id: p.id,
      userId: p.userId,
      urlPreview: p.urlPreview,
      urlOriginal: p.urlOriginal,
      description: p.description || '',
      position: p.position,
      createdAt: p.createdAt,
      folderId: p.folderId,
      likesCount: p._count.likes,
      favoritesCount: p._count.favorites,
      isLiked: currentUserId ? (p.likes?.length > 0) : false,
      isFavorited: currentUserId ? (p.favorites?.length > 0) : false,
    }));

    return res.json({ status: 'success', data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const updatePhoto = async (req, res) => {
  const { id } = req.params;
  const { description } = req.body;

  try {
    const photo = await prisma.photo.findUnique({ where: { id } });
    if (!photo) return res.status(404).json({ status: 'error', message: 'Фото не найдено' });
    if (photo.userId !== req.user.id) return res.status(403).json({ status: 'error', message: 'Нет доступа' });

    const updated = await prisma.photo.update({
      where: { id },
      data: { description: description?.trim() ?? null },
    });
    return res.json({ status: 'success', data: updated });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const deletePortfolioPhoto = async (req, res) => {
  const { id } = req.params;

  try {
    const photo = await prisma.photo.findUnique({ where: { id } });
    if (!photo) return res.status(404).json({ status: 'error', message: 'Фото не найдено' });
    if (photo.userId !== req.user.id) return res.status(403).json({ status: 'error', message: 'Нет доступа' });

    await prisma.photo.delete({ where: { id } });

    Promise.all([
      deleteFromUrl(photo.urlPreview),
      deleteFromUrl(photo.urlOriginal),
    ]).catch(() => {});

    return res.json({ status: 'success', message: 'Фото удалено' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const togglePhotoLike = async (req, res) => {
  const { id: photoId } = req.params;
  const userId = req.user.id;

  try {
    const photo = await prisma.photo.findUnique({ where: { id: photoId } });
    if (!photo) return res.status(404).json({ status: 'error', message: 'Фото не найдено' });

    const existing = await prisma.photoLike.findFirst({ where: { userId, photoId } });
    if (existing) {
      await prisma.photoLike.deleteMany({ where: { userId, photoId } });
    } else {
      await prisma.photoLike.create({ data: { userId, photoId } });
    }

    const count = await prisma.photoLike.count({ where: { photoId } });

    await prisma.photo.update({
      where: { id: photoId },
      data: { likesCount: count },
    });

    if (!existing && photo.userId) notify({ userId: photo.userId, type: 'LIKE_PHOTO', fromUserId: userId, photoId });
    return res.json({ status: 'success', data: { liked: !existing, count } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const getFavoritePhotos = async (req, res) => {
  const userId = req.user.id;
  const page  = Math.max(1, parseInt(req.query.page) || 1);
  const limit = 20;
  const skip  = (page - 1) * limit;

  try {
    const [rows, total] = await Promise.all([
      prisma.photoFavorite.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          photo: {
            include: {
              _count: { select: { likes: true, favorites: true } },
              likes:     { where: { userId }, select: { userId: true } },
              favorites: { where: { userId }, select: { userId: true } },
              user: { select: { id: true, firstName: true, lastName: true, tag: true, avatarUrl: true, isDeleted: true } },
            },
          },
        },
      }),
      prisma.photoFavorite.count({ where: { userId } }),
    ]);

    const data = rows
      .filter((r) => r.photo)
      .map((r) => {
        const p = r.photo;
        return {
          id: p.id,
          userId: p.userId,
          urlPreview: p.urlPreview,
          urlOriginal: p.urlOriginal,
          folderId: p.folderId,
          description: p.description || '',
          likesCount: p._count.likes,
          favoritesCount: p._count.favorites,
          isLiked: (p.likes?.length || 0) > 0,
          isFavorited: true,
          author: p.user
            ? {
                id: p.user.id,
                firstName: p.user.isDeleted ? 'Удалённый' : p.user.firstName,
                lastName: p.user.isDeleted ? 'пользователь' : p.user.lastName,
                tag: p.user.isDeleted ? null : p.user.tag,
                avatarUrl: p.user.isDeleted ? null : p.user.avatarUrl,
              }
            : null,
        };
      });

    return res.json({
      status: 'success',
      data,
      pagination: { page, limit, total, hasMore: skip + data.length < total },
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const togglePhotoFavorite = async (req, res) => {
  const { id: photoId } = req.params;
  const userId = req.user.id;

  try {
    const photo = await prisma.photo.findUnique({ where: { id: photoId } });
    if (!photo) return res.status(404).json({ status: 'error', message: 'Фото не найдено' });

    const existing = await prisma.photoFavorite.findFirst({ where: { userId, photoId } });
    if (existing) {
      await prisma.photoFavorite.deleteMany({ where: { userId, photoId } });
    } else {
      await prisma.photoFavorite.create({ data: { userId, photoId } });
    }

    const count = await prisma.photoFavorite.count({ where: { photoId } });
    return res.json({ status: 'success', data: { favorited: !existing, count } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
