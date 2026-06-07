import multer from 'multer';
import path from 'path';
import prisma from '../config/db.js';
import { multerErrorMessage } from '../utils/multerError.js';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL;

const fileFilter = (_req, file, cb) => {
  const extOk = /jpeg|jpg|png|webp/.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = /image\/(jpeg|png|webp)/.test(file.mimetype);
  if (extOk && mimeOk) return cb(null, true);
  cb(new Error('Разрешены только изображения (jpeg, jpg, png, webp)'));
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const searchByImageMiddleware = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ status: 'error', message: multerErrorMessage(err) });
    next();
  });
};

export const searchByImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: 'error', message: 'Файл не загружен' });
  }

  if (!AI_SERVICE_URL) {
    return res.status(503).json({ status: 'error', message: 'Сервис поиска недоступен' });
  }

  const userId = req.user?.id ?? null;

  let embedding;
  try {
    const formData = new FormData();
    formData.append(
      'file',
      new Blob([req.file.buffer], { type: req.file.mimetype }),
      req.file.originalname,
    );

    const aiRes = await fetch(`${AI_SERVICE_URL}/embed-upload`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(15000),
    });

    if (!aiRes.ok) {
      return res.status(503).json({ status: 'error', message: 'Сервис поиска временно недоступен' });
    }

    ({ embedding } = await aiRes.json());
  } catch (err) {
    if (err.name === 'TimeoutError') {
      return res.status(504).json({ status: 'error', message: 'Сервис поиска не ответил вовремя' });
    }
    return res.status(503).json({ status: 'error', message: 'Сервис поиска временно недоступен' });
  }

  try {
    const vectorLiteral = `[${embedding.join(',')}]`;

    const rows = await prisma.$queryRawUnsafe(
      `SELECT id::text
       FROM photos
       WHERE "embeddingVector" IS NOT NULL
         AND "userId" IS NOT NULL
         AND id NOT IN (SELECT "A" FROM "_PhotoToPost")
       ORDER BY "embeddingVector" <=> $1::vector
       LIMIT 20`,
      vectorLiteral,
    );

    if (rows.length === 0) {
      return res.json({ status: 'success', data: [] });
    }

    const ids = rows.map((r) => r.id);

    const photos = await prisma.photo.findMany({
      where: { id: { in: ids }, user: { isDeleted: false } },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, tag: true, avatarUrl: true },
        },
        _count: { select: { favorites: true } },
        ...(userId && {
          likes: { where: { userId }, select: { userId: true } },
          favorites: { where: { userId }, select: { userId: true } },
        }),
      },
    });

    const photoMap = new Map(photos.map((p) => [p.id, p]));
    const sorted = ids.map((id) => photoMap.get(id)).filter(Boolean);

    const data = sorted.map((p) => ({
      id: p.id,
      urlPreview: p.urlPreview,
      urlOriginal: p.urlOriginal,
      description: p.description || '',
      likesCount: p.likesCount,
      favoritesCount: p._count.favorites,
      createdAt: p.createdAt,
      isLiked: userId ? p.likes?.length > 0 : false,
      isFavorited: userId ? p.favorites?.length > 0 : false,
      author: p.user
        ? {
            id: p.user.id,
            firstName: p.user.firstName,
            lastName: p.user.lastName,
            tag: p.user.tag,
            avatarUrl: p.user.avatarUrl,
          }
        : null,
    }));

    return res.json({ status: 'success', data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
