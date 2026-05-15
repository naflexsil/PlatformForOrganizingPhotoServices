import prisma from '../config/db.js';

export const togglePhotoLike = async (req, res) => {
  const { id: photoId } = req.params;
  const userId = req.user.id;

  try {
    const photo = await prisma.photo.findUnique({ where: { id: photoId } });
    if (!photo) {
      return res.status(404).json({ status: 'error', message: 'Фото не найдено' });
    }

    const existing = await prisma.photoLike.findFirst({ where: { userId, photoId } });

    if (existing) {
      await prisma.photoLike.deleteMany({ where: { userId, photoId } });
    } else {
      await prisma.photoLike.create({ data: { userId, photoId } });
    }

    const count = await prisma.photoLike.count({ where: { photoId } });
    return res.json({ status: 'success', data: { liked: !existing, count } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const togglePhotoFavorite = async (req, res) => {
  const { id: photoId } = req.params;
  const userId = req.user.id;

  try {
    const photo = await prisma.photo.findUnique({ where: { id: photoId } });
    if (!photo) {
      return res.status(404).json({ status: 'error', message: 'Фото не найдено' });
    }

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
