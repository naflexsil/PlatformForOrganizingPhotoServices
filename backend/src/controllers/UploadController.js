import multer from 'multer';
import path from 'path';
import prisma from '../config/db.js';
import { uploadImage as s3UploadImage, deleteFile } from '../services/fileService.js';

const AI_SERVICE_URL    = process.env.AI_SERVICE_URL;
const BACKEND_INTERNAL  = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3000';

async function scheduleEmbedding(photoId, previewUrl) {
  if (!AI_SERVICE_URL) return;
  try {
    const fullUrl = previewUrl.startsWith('http') ? previewUrl : `${BACKEND_INTERNAL}${previewUrl}`;
    const res  = await fetch(`${AI_SERVICE_URL}/embed`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ url: fullUrl }),
    });
    const data = await res.json();
    if (data.embedding) {
      await prisma.photo.update({
        where: { id: photoId },
        data:  { embeddingVector: data.embedding },
      });
    }
  } catch (err) {
    console.error(`[EMBED] failed for photo ${photoId}:`, err.message);
  }
}


const fileFilter = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype);
  if (extOk && mimeOk) return cb(null, true);
  cb(new Error('Разрешены только изображения (jpeg, jpg, png, gif, webp)'));
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const wrapUpload = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ status: 'error', message: err.message });
    next();
  });
};

export const uploadMiddleware = wrapUpload;
export const avatarMiddleware = wrapUpload;
export const searchPhotoMiddleware = wrapUpload;

export const uploadPhoto = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: 'error', message: 'Файл не загружен' });
  }

  const { postId, folderId, description } = req.body;
  const userId = req.user?.id;
  console.log(`[UPLOAD] photo: ${req.file.originalname} (${req.file.size} bytes)`);

  try {
    // Лимиты для портфолио
    if (userId && !postId) {
      if (folderId) {
        const folderCount = await prisma.photo.count({ where: { folderId } });
        if (folderCount >= 40) {
          return res.status(400).json({ status: 'error', message: 'В папке не может быть более 40 фотографий' });
        }
      } else {
        const standaloneCount = await prisma.photo.count({ where: { userId, folderId: null } });
        if (standaloneCount >= 100) {
          return res.status(400).json({ status: 'error', message: 'В портфолио не может быть более 100 фотографий' });
        }
      }
    }

    const { originalKey, previewKey, originalUrl, previewUrl } = await s3UploadImage(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
    );
    console.log(`[UPLOAD] photo OK → originalUrl="${originalUrl}" previewUrl="${previewUrl}"`);

    const photo = await prisma.photo.create({
      data: {
        urlOriginal: originalUrl,
        urlPreview: previewUrl,
        ...(userId && !postId && { userId }),
        ...(description?.trim() && { description: description.trim() }),
        ...(postId && { postId }),
        ...(folderId && { folderId }),
      },
    });

    // fire-and-forget: не блокируем ответ пользователю
    scheduleEmbedding(photo.id, previewUrl);

    return res.status(201).json({
      status: 'success',
      data: { photo, originalKey, previewKey },
    });
  } catch (err) {
    console.error(`[UPLOAD] photo FAILED: ${err.message}`);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const uploadImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: 'error', message: 'Файл не загружен' });
  }

  try {
    const { originalUrl } = await s3UploadImage(req.file.buffer, req.file.originalname, req.file.mimetype);
    return res.status(200).json({ status: 'success', data: { url: originalUrl } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const uploadAvatar = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: 'error', message: 'Файл не загружен' });
  }
  console.log(`[UPLOAD] avatar: ${req.file.originalname} (${req.file.size} bytes)`);

  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { avatarUrl: true, avatarUrlOriginal: true },
    });

    const { originalUrl, previewUrl } = await s3UploadImage(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
    );

    console.log(`[UPLOAD] avatar OK → previewUrl="${previewUrl}" originalUrl="${originalUrl}"`);
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        avatarUrl: previewUrl,
        avatarUrlOriginal: originalUrl,
      },
      include: { photographer: true },
    });

    const deleteFromUrl = async (url) => {
      const parts = url?.split('/api/files/');
      if (parts?.length === 2) {
        const [bucket, ...keyParts] = parts[1].split('/');
        const key = keyParts.join('/');
        if (bucket && key) await deleteFile(bucket, key);
      }
    };
    Promise.all([
      deleteFromUrl(currentUser?.avatarUrl),
      deleteFromUrl(currentUser?.avatarUrlOriginal),
    ]).catch(() => {});

    return res.json({ status: 'success', data: { previewUrl, originalUrl, user } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const uploadSearchPhoto = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: 'error', message: 'Файл не загружен' });
  }

  if (req.user.role !== 'PHOTOGRAPHER') {
    return res.status(403).json({ status: 'error', message: 'Только для фотографов' });
  }

  try {
    const photographer = await prisma.photographer.findUnique({ where: { userId: req.user.id } });

    if (!photographer) {
      return res.status(404).json({ status: 'error', message: 'Профиль фотографа не найден' });
    }

    if (photographer.searchPhotos.length >= 5) {
      return res.status(400).json({
        status: 'error',
        message: `Максимум 5 фото для поиска. Сейчас загружено: ${photographer.searchPhotos.length}`,
      });
    }

    const { previewUrl } = await s3UploadImage(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
    );

    const updated = await prisma.photographer.update({
      where: { userId: req.user.id },
      data: { searchPhotos: [...photographer.searchPhotos, previewUrl] },
    });

    return res.json({ status: 'success', data: { url: previewUrl, searchPhotos: updated.searchPhotos } });
  } catch (err) {
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

    const match = url.split('/api/files/');
    if (match.length === 2) {
      const [bucket, ...keyParts] = match[1].split('/');
      const key = keyParts.join('/');
      if (bucket && key) await deleteFile(bucket, key);
    }

    return res.json({ status: 'success', data: { searchPhotos: updated.searchPhotos } });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
