import prisma from '../config/db.js';

export const deleteAccount = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'Пользователь не найден' });
    }

    if (user.isDeleted) {
      return res.status(400).json({ status: 'error', message: 'Аккаунт уже удалён' });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    return res.status(200).json({ status: 'success', message: 'Аккаунт скрыт. Данные сохранены.' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const restoreAccount = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'Пользователь не найден' });
    }

    if (!user.isDeleted) {
      return res.status(400).json({ status: 'error', message: 'Аккаунт не был удалён' });
    }

    const restored = await prisma.user.update({
      where: { id: req.user.id },
      data: { isDeleted: false, deletedAt: null },
      include: { photographer: true },
    });

    return res.status(200).json({ status: 'success', data: restored });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
