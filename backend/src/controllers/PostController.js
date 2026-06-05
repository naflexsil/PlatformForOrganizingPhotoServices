import prisma from '../config/db.js';
import { notify } from '../utils/notifications.js';

const MAX_PHOTOS = 10;

const buildPhotoSelect = (userId) => {
  const select = {
    id: true,
    urlPreview: true,
    urlOriginal: true,
    _count: { select: { likes: true, favorites: true } },
  };
  if (userId) {
    select.likes = { where: { userId }, select: { userId: true } };
    select.favorites = { where: { userId }, select: { userId: true } };
  }
  return { select, orderBy: { createdAt: 'asc' } };
};

const buildPostInclude = (userId) => {
  const include = {
    author: { select: { id: true, firstName: true, lastName: true, tag: true, avatarUrl: true } },
    photos: buildPhotoSelect(userId),
    _count: { select: { likes: true, favorites: true } },
  };
  if (userId) {
    include.likes = { where: { userId }, select: { userId: true } };
    include.favorites = { where: { userId }, select: { userId: true } };
  }
  return include;
};

const transformPhoto = (photo, userId) => {
  const { likes, favorites, ...rest } = photo;
  return {
    ...rest,
    ...(userId && {
      isLiked: (likes?.length || 0) > 0,
      isFavorited: (favorites?.length || 0) > 0,
    }),
  };
};

const transformPost = (post, userId) => {
  const { likes, favorites, photos, ...rest } = post;
  return {
    ...rest,
    photos: (photos || []).map((p) => transformPhoto(p, userId)),
    ...(userId && {
      isLiked: (likes?.length || 0) > 0,
      isFavorited: (favorites?.length || 0) > 0,
    }),
  };
};

export const getAllPosts = async (req, res) => {
  const userId = req.user?.id ?? null;
  const { authorId } = req.query;
  try {
    const posts = await prisma.post.findMany({
      where: authorId ? { authorId } : {},
      include: buildPostInclude(userId),
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
    return res.status(200).json({ status: 'success', data: posts.map((p) => transformPost(p, userId)) });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const getPostById = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id ?? null;
  try {
    const post = await prisma.post.findUnique({ where: { id }, include: buildPostInclude(userId) });
    if (!post) {
      return res.status(404).json({ status: 'error', message: 'Пост не найден' });
    }
    return res.status(200).json({ status: 'success', data: transformPost(post, userId) });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const createPost = async (req, res) => {
  const { description, photoIds } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(photoIds) || photoIds.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Поле photoIds обязательно — передайте массив ID фото из POST /api/upload/photo (минимум 1)',
    });
  }
  if (photoIds.length > MAX_PHOTOS) {
    return res.status(400).json({ status: 'error', message: `Максимум ${MAX_PHOTOS} фотографий в посте` });
  }

  try {
    const photos = await prisma.photo.findMany({
      where: { id: { in: photoIds } },
      select: { id: true, urlPreview: true },
    });

    if (photos.length !== photoIds.length) {
      const found = photos.map((p) => p.id);
      const missing = photoIds.filter((id) => !found.includes(id));
      return res.status(400).json({
        status: 'error',
        message: `Фото не найдены: ${missing.join(', ')}`,
      });
    }

    const post = await prisma.post.create({
      data: {
        authorId: userId,
        description,
        images: photos.map((p) => p.urlPreview),
        photos: { connect: photoIds.map((id) => ({ id })) },
      },
      include: buildPostInclude(userId),
    });

    return res.status(201).json({ status: 'success', data: transformPost(post, userId) });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const updatePost = async (req, res) => {
  const { id } = req.params;
  const { description, addPhotoIds = [], removePhotoIds = [] } = req.body;
  const userId = req.user.id;

  try {
    const post = await prisma.post.findUnique({
      where: { id },
      include: { photos: { select: { id: true } } },
    });

    if (!post) {
      return res.status(404).json({ status: 'error', message: 'Пост не найден' });
    }
    if (post.authorId !== userId) {
      return res.status(403).json({ status: 'error', message: 'Нет прав для редактирования этого поста' });
    }

    const toRemove = new Set(removePhotoIds);
    const remaining = post.photos.map((p) => p.id).filter((i) => !toRemove.has(i));
    const finalCount = remaining.length + addPhotoIds.length;

    if (finalCount < 1) {
      return res.status(400).json({ status: 'error', message: 'Пост должен содержать хотя бы 1 фото' });
    }
    if (finalCount > MAX_PHOTOS) {
      return res.status(400).json({ status: 'error', message: `Максимум ${MAX_PHOTOS} фотографий в посте` });
    }

    if (addPhotoIds.length > 0) {
      const found = await prisma.photo.findMany({ where: { id: { in: addPhotoIds } }, select: { id: true } });
      if (found.length !== addPhotoIds.length) {
        return res.status(400).json({ status: 'error', message: 'Некоторые добавляемые фото не найдены' });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updateData = {};
      if (description !== undefined) updateData.description = description;
      if (addPhotoIds.length > 0 || toRemove.size > 0) {
        updateData.photos = {
          connect: addPhotoIds.map((pid) => ({ id: pid })),
          disconnect: [...toRemove].map((pid) => ({ id: pid })),
        };
      }

      const saved = await tx.post.update({
        where: { id },
        data: updateData,
        include: { photos: { select: { urlPreview: true } } },
      });

      await tx.post.update({
        where: { id },
        data: { images: saved.photos.map((p) => p.urlPreview) },
      });

      return tx.post.findUnique({ where: { id }, include: buildPostInclude(userId) });
    });

    return res.json({ status: 'success', data: transformPost(updated, userId) });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const deletePost = async (req, res) => {
  const { id } = req.params;

  try {
    const post = await prisma.post.findUnique({ where: { id } });

    if (!post) {
      return res.status(404).json({ status: 'error', message: 'Пост не найден' });
    }
    if (post.authorId !== req.user.id) {
      return res.status(403).json({ status: 'error', message: 'Нет прав для удаления этого поста' });
    }

    await prisma.post.delete({ where: { id } });
    return res.status(200).json({ status: 'success', message: 'Пост удалён' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const toggleLike = async (req, res) => {
  const { id: postId } = req.params;
  const userId = req.user.id;

  try {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return res.status(404).json({ status: 'error', message: 'Пост не найден' });
    }

    const existing = await prisma.like.findUnique({ where: { userId_postId: { userId, postId } } });

    if (existing) {
      await prisma.like.delete({ where: { userId_postId: { userId, postId } } });
    } else {
      await prisma.like.create({ data: { userId, postId } });
    }

    const count = await prisma.like.count({ where: { postId } });
    if (!existing) notify({ userId: post.authorId, type: 'LIKE_POST', fromUserId: userId, postId });
    return res.status(200).json({ status: 'success', data: { liked: !existing, count } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const toggleFavorite = async (req, res) => {
  const { id: postId } = req.params;
  const userId = req.user.id;

  try {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return res.status(404).json({ status: 'error', message: 'Пост не найден' });
    }

    const existing = await prisma.favorite.findUnique({ where: { userId_postId: { userId, postId } } });

    if (existing) {
      await prisma.favorite.delete({ where: { userId_postId: { userId, postId } } });
    } else {
      await prisma.favorite.create({ data: { userId, postId } });
    }

    const count = await prisma.favorite.count({ where: { postId } });
    return res.status(200).json({ status: 'success', data: { favorited: !existing, count } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const pinPost = async (req, res) => {
  const { id } = req.params;
  const { isPinned } = req.body;
  const userId = req.user.id;

  if (typeof isPinned !== 'boolean') {
    return res.status(400).json({ status: 'error', message: 'Поле isPinned должно быть булевым' });
  }

  try {
    const post = await prisma.post.findUnique({ where: { id } });

    if (!post) {
      return res.status(404).json({ status: 'error', message: 'Пост не найден' });
    }
    if (post.authorId !== userId) {
      return res.status(403).json({ status: 'error', message: 'Только автор может закреплять посты' });
    }

    if (isPinned) {
      const pinnedCount = await prisma.post.count({
        where: { authorId: userId, isPinned: true, NOT: { id } },
      });
      if (pinnedCount >= 3) {
        return res.status(400).json({ status: 'error', message: 'Максимум 3 закреплённых поста' });
      }
    }

    const updated = await prisma.post.update({
      where: { id },
      data: { isPinned },
      include: buildPostInclude(userId),
    });

    return res.status(200).json({ status: 'success', data: transformPost(updated, userId) });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
