import prisma from '../config/db.js';

export const getFolders = async (req, res) => {
  const { userId } = req.params;
  try {
    const folders = await prisma.portfolioFolder.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { photos: true } } },
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
  if (name.trim().length > 50) {
    return res.status(400).json({ status: 'error', message: 'Название не должно превышать 50 символов' });
  }
  try {
    const folder = await prisma.portfolioFolder.create({
      data: { userId: req.user.id, name: name.trim() },
      include: { _count: { select: { photos: true } } },
    });
    return res.status(201).json({ status: 'success', data: folder });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const updateFolder = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ status: 'error', message: 'Название обязательно' });
  }
  if (name.trim().length > 50) {
    return res.status(400).json({ status: 'error', message: 'Название не должно превышать 50 символов' });
  }
  try {
    const folder = await prisma.portfolioFolder.findUnique({ where: { id } });
    if (!folder) return res.status(404).json({ status: 'error', message: 'Папка не найдена' });
    if (folder.userId !== req.user.id) return res.status(403).json({ status: 'error', message: 'Нет доступа' });

    const updated = await prisma.portfolioFolder.update({
      where: { id },
      data: { name: name.trim() },
      include: { _count: { select: { photos: true } } },
    });
    return res.json({ status: 'success', data: updated });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const deleteFolder = async (req, res) => {
  const { id } = req.params;
  try {
    const folder = await prisma.portfolioFolder.findUnique({
      where: { id },
      include: { _count: { select: { photos: true } } },
    });
    if (!folder) return res.status(404).json({ status: 'error', message: 'Папка не найдена' });
    if (folder.userId !== req.user.id) return res.status(403).json({ status: 'error', message: 'Нет доступа' });

    await prisma.portfolioFolder.delete({ where: { id } });
    return res.json({ status: 'success', data: { photosDeleted: folder._count.photos } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
