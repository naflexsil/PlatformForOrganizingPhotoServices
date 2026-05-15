import prisma from '../config/db.js';

export const getFolders = async (req, res) => {
  const { userId } = req.params;

  try {
    const folders = await prisma.portfolioFolder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ status: 'success', data: folders });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const createFolder = async (req, res) => {
  const { name } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ status: 'error', message: 'Название папки обязательно' });
  }

  try {
    const folder = await prisma.portfolioFolder.create({
      data: { userId: req.user.id, name: name.trim(), images: [] },
    });
    return res.status(201).json({ status: 'success', data: folder });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const updateFolder = async (req, res) => {
  const { id } = req.params;
  const { name, images } = req.body;

  if (images !== undefined && !Array.isArray(images)) {
    return res.status(400).json({ status: 'error', message: 'images должен быть массивом' });
  }

  try {
    const folder = await prisma.portfolioFolder.findUnique({ where: { id } });
    if (!folder) {
      return res.status(404).json({ status: 'error', message: 'Папка не найдена' });
    }
    if (folder.userId !== req.user.id) {
      return res.status(403).json({ status: 'error', message: 'Нет доступа' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (images !== undefined) updateData.images = images;

    const updated = await prisma.portfolioFolder.update({ where: { id }, data: updateData });
    return res.json({ status: 'success', data: updated });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const addPhotos = async (req, res) => {
  const { id } = req.params;
  const { images } = req.body;

  if (!Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ status: 'error', message: 'images должен быть непустым массивом строк' });
  }
  if (!images.every((p) => typeof p === 'string')) {
    return res.status(400).json({ status: 'error', message: 'Все элементы images должны быть строками' });
  }

  try {
    const folder = await prisma.portfolioFolder.findUnique({ where: { id } });
    if (!folder) {
      return res.status(404).json({ status: 'error', message: 'Папка не найдена' });
    }
    if (folder.userId !== req.user.id) {
      return res.status(403).json({ status: 'error', message: 'Нет доступа' });
    }

    const updated = await prisma.portfolioFolder.update({
      where: { id },
      data: { images: [...folder.images, ...images] },
    });
    return res.json({ status: 'success', data: updated });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const removePhotos = async (req, res) => {
  const { id } = req.params;
  const { images } = req.body;

  if (!Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ status: 'error', message: 'images должен быть непустым массивом строк' });
  }

  try {
    const folder = await prisma.portfolioFolder.findUnique({ where: { id } });
    if (!folder) {
      return res.status(404).json({ status: 'error', message: 'Папка не найдена' });
    }
    if (folder.userId !== req.user.id) {
      return res.status(403).json({ status: 'error', message: 'Нет доступа' });
    }

    const toRemove = new Set(images);
    const updated = await prisma.portfolioFolder.update({
      where: { id },
      data: { images: folder.images.filter((img) => !toRemove.has(img)) },
    });
    return res.json({ status: 'success', data: updated });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const deleteFolder = async (req, res) => {
  const { id } = req.params;

  try {
    const folder = await prisma.portfolioFolder.findUnique({ where: { id } });
    if (!folder) {
      return res.status(404).json({ status: 'error', message: 'Папка не найдена' });
    }
    if (folder.userId !== req.user.id) {
      return res.status(403).json({ status: 'error', message: 'Нет доступа' });
    }

    await prisma.portfolioFolder.delete({ where: { id } });
    return res.json({ status: 'success', message: 'Папка удалена' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
