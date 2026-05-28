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

export const checkTag = async (req, res) => {
  const { tag } = req.query;
  if (!tag) return res.status(400).json({ status: 'error', message: 'tag обязателен' });
  try {
    const where = { tag };
    if (req.user?.id) where.NOT = { id: req.user.id };
    const existing = await prisma.user.findFirst({ where });
    return res.status(200).json({ status: 'success', data: { available: !existing } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const getUserByTag = async (req, res) => {
  const { tag } = req.params;
  try {
    const user = await prisma.user.findFirst({
      where: { tag, isDeleted: false },
      include: { photographer: true },
    });
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'Пользователь не найден' });
    }
    const { vkId, isDeleted, deletedAt, ...publicData } = user;
    return res.json({ status: 'success', data: publicData });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const updateMe = async (req, res) => {
  const { id } = req.user;
  const { firstName, lastName, bio, tag, gender, birthDate, city } = req.body;

  try {
    if (tag !== undefined) {
      if (tag.length > 20) {
        return res.status(400).json({ status: 'error', message: 'Тег не должен превышать 20 символов' });
      }
      const taken = await prisma.user.findFirst({ where: { tag, NOT: { id } } });
      if (taken) {
        return res.status(409).json({ status: 'error', message: 'Тег уже занят' });
      }
    }

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (bio !== undefined) updateData.bio = bio;
    if (tag !== undefined) updateData.tag = tag;
    if (gender !== undefined) updateData.gender = gender;
    if (birthDate !== undefined) updateData.birthDate = new Date(birthDate);
    if (city !== undefined) updateData.city = city;

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { photographer: true },
    });

    return res.json({ status: 'success', data: updated });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const updatePhotographerData = async (req, res) => {
  const { id, role } = req.user;

  if (role !== 'PHOTOGRAPHER') {
    return res.status(403).json({ status: 'error', message: 'Только для фотографов' });
  }

  const {
    pricePerHour,
    additionalPriceInfo,
    experienceYears,
    experienceMonths,
    deliveryTime,
    searchPhotos,
  } = req.body;

  if (pricePerHour !== undefined) {
    if (typeof pricePerHour !== 'number' || isNaN(pricePerHour) || pricePerHour < 0) {
      return res.status(400).json({ status: 'error', message: 'pricePerHour должен быть положительным числом' });
    }
  }

  if (searchPhotos !== undefined) {
    if (!Array.isArray(searchPhotos)) {
      return res.status(400).json({ status: 'error', message: 'searchPhotos должен быть массивом строк' });
    }
    if (searchPhotos.length > 5) {
      return res.status(400).json({ status: 'error', message: 'searchPhotos: максимум 5 элементов' });
    }
    if (!searchPhotos.every((p) => typeof p === 'string')) {
      return res.status(400).json({ status: 'error', message: 'searchPhotos: все элементы должны быть строками' });
    }
  }

  try {
    const updateData = {};
    if (pricePerHour !== undefined) updateData.pricePerHour = pricePerHour;
    if (additionalPriceInfo !== undefined) updateData.additionalPriceInfo = additionalPriceInfo;
    if (experienceYears !== undefined) updateData.experienceYears = Number(experienceYears);
    if (experienceMonths !== undefined) updateData.experienceMonths = Number(experienceMonths);
    if (deliveryTime !== undefined) updateData.deliveryTime = Number(deliveryTime);
    if (searchPhotos !== undefined) updateData.searchPhotos = searchPhotos;

    await prisma.photographer.update({ where: { userId: id }, data: updateData });

    const updated = await prisma.user.findUnique({
      where: { id },
      include: { photographer: true },
    });

    return res.json({ status: 'success', data: updated });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
