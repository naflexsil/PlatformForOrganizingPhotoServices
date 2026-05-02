import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import prisma from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_ROOT = path.join(__dirname, '../../uploads');

const makeStorage = (folder) => {
  const dir = path.join(UPLOADS_ROOT, folder);
  fs.mkdirSync(dir, { recursive: true });
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  });
};

const fileFilter = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype);
  if (extOk && mimeOk) return cb(null, true);
  cb(new Error('Разрешены только изображения (jpeg, jpg, png, gif, webp)'));
};

const limits = { fileSize: 10 * 1024 * 1024 };

const makeMiddleware = (folder) => {
  const uploader = multer({ storage: makeStorage(folder), fileFilter, limits });
  return (req, res, next) => {
    uploader.single('image')(req, res, (err) => {
      if (err) return res.status(400).json({ status: 'error', message: err.message });
      next();
    });
  };
};

const removeLocalFile = (filePath) => {
  fs.unlink(filePath, () => {});
};

export const uploadMiddleware = makeMiddleware('posts');
export const avatarMiddleware = makeMiddleware('avatars');
export const searchPhotoMiddleware = makeMiddleware('search');

export const uploadImage = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: 'error', message: 'Файл не загружен' });
  }
  return res.status(200).json({
    status: 'success',
    data: { url: `/uploads/posts/${req.file.filename}` },
  });
};

export const uploadAvatar = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: 'error', message: 'Файл не загружен' });
  }

  const url = `/uploads/avatars/${req.file.filename}`;

  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl: url },
      include: { photographer: true },
    });

    return res.json({ status: 'success', data: { url, user } });
  } catch (err) {
    removeLocalFile(req.file.path);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const uploadSearchPhoto = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: 'error', message: 'Файл не загружен' });
  }

  if (req.user.role !== 'PHOTOGRAPHER') {
    removeLocalFile(req.file.path);
    return res.status(403).json({ status: 'error', message: 'Только для фотографов' });
  }

  try {
    const photographer = await prisma.photographer.findUnique({ where: { userId: req.user.id } });

    if (!photographer) {
      removeLocalFile(req.file.path);
      return res.status(404).json({ status: 'error', message: 'Профиль фотографа не найден' });
    }

    if (photographer.searchPhotos.length >= 5) {
      removeLocalFile(req.file.path);
      return res.status(400).json({
        status: 'error',
        message: `Максимум 5 фото для поиска. Сейчас загружено: ${photographer.searchPhotos.length}`,
      });
    }

    const url = `/uploads/search/${req.file.filename}`;

    const updated = await prisma.photographer.update({
      where: { userId: req.user.id },
      data: { searchPhotos: [...photographer.searchPhotos, url] },
    });

    return res.json({ status: 'success', data: { url, searchPhotos: updated.searchPhotos } });
  } catch (err) {
    removeLocalFile(req.file.path);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const deleteSearchPhoto = async (req, res) => {
  if (req.user.role !== 'PHOTOGRAPHER') {
    return res.status(403).json({ status: 'error', message: 'Только для фотографов' });
  }

  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ status: 'error', message: 'Поле url обязательно' });
  }

  try {
    const photographer = await prisma.photographer.findUnique({ where: { userId: req.user.id } });

    if (!photographer) {
      return res.status(404).json({ status: 'error', message: 'Профиль фотографа не найден' });
    }

    if (!photographer.searchPhotos.includes(url)) {
      return res.status(404).json({ status: 'error', message: 'Фото не найдено в списке' });
    }

    const updated = await prisma.photographer.update({
      where: { userId: req.user.id },
      data: { searchPhotos: photographer.searchPhotos.filter((p) => p !== url) },
    });

    if (url.startsWith('/uploads/search/')) {
      const filename = path.basename(url);
      removeLocalFile(path.join(UPLOADS_ROOT, 'search', filename));
    }

    return res.json({ status: 'success', data: { searchPhotos: updated.searchPhotos } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
