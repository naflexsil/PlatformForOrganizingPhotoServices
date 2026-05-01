import prisma from '../config/db.js';

const POST_INCLUDE = {
  author: { select: { id: true, firstName: true, lastName: true, tag: true, avatarUrl: true } },
  _count: { select: { likes: true, favorites: true } },
};

export const getAllPosts = async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      include: POST_INCLUDE,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
    return res.status(200).json({ status: 'success', data: posts });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const getPostById = async (req, res) => {
  const { id } = req.params;
  try {
    const post = await prisma.post.findUnique({ where: { id }, include: POST_INCLUDE });
    if (!post) {
      return res.status(404).json({ status: 'error', message: 'Пост не найден' });
    }
    return res.status(200).json({ status: 'success', data: post });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const createPost = async (req, res) => {
  const { description, images } = req.body;

  if (!images || !Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ status: 'error', message: 'Необходимо добавить хотя бы одно изображение' });
  }

  try {
    const post = await prisma.post.create({
      data: { authorId: req.user.id, description, images },
      include: POST_INCLUDE,
    });
    return res.status(201).json({ status: 'success', data: post });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const updatePost = async (req, res) => {
  const { id } = req.params;
  const { description } = req.body;

  try {
    const post = await prisma.post.findUnique({ where: { id } });

    if (!post) {
      return res.status(404).json({ status: 'error', message: 'Пост не найден' });
    }

    if (post.authorId !== req.user.id) {
      return res.status(403).json({ status: 'error', message: 'Нет прав для редактирования этого поста' });
    }

    const updated = await prisma.post.update({
      where: { id },
      data: { description },
      include: POST_INCLUDE,
    });
    return res.status(200).json({ status: 'success', data: updated });
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

    const existing = await prisma.like.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existing) {
      await prisma.like.delete({ where: { userId_postId: { userId, postId } } });
      return res.status(200).json({ status: 'success', data: { liked: false } });
    }

    await prisma.like.create({ data: { userId, postId } });
    return res.status(200).json({ status: 'success', data: { liked: true } });
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

    const existing = await prisma.favorite.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existing) {
      await prisma.favorite.delete({ where: { userId_postId: { userId, postId } } });
      return res.status(200).json({ status: 'success', data: { favorited: false } });
    }

    await prisma.favorite.create({ data: { userId, postId } });
    return res.status(200).json({ status: 'success', data: { favorited: true } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const pinPost = async (req, res) => {
  const { id } = req.params;
  const { isPinned } = req.body;

  if (typeof isPinned !== 'boolean') {
    return res.status(400).json({ status: 'error', message: 'Поле isPinned должно быть булевым' });
  }

  try {
    const post = await prisma.post.findUnique({ where: { id } });

    if (!post) {
      return res.status(404).json({ status: 'error', message: 'Пост не найден' });
    }

    if (post.authorId !== req.user.id) {
      return res.status(403).json({ status: 'error', message: 'Только автор может закреплять посты' });
    }

    if (isPinned) {
      // Exclude the current post from the count so re-pinning an already-pinned post is idempotent
      const pinnedCount = await prisma.post.count({
        where: { authorId: req.user.id, isPinned: true, NOT: { id } },
      });

      if (pinnedCount >= 3) {
        return res.status(400).json({ status: 'error', message: 'Максимум 3 закреплённых поста' });
      }
    }

    const updated = await prisma.post.update({
      where: { id },
      data: { isPinned },
      include: POST_INCLUDE,
    });

    return res.status(200).json({ status: 'success', data: updated });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
