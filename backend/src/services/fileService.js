import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import path from 'path';

export const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

const BUCKET_ORIGINALS = process.env.S3_BUCKET_ORIGINALS || 'originals';
const BUCKET_PREVIEWS = process.env.S3_BUCKET_PREVIEWS || 'previews';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

const sanitizeName = (name) =>
  path.basename(name, path.extname(name))
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .toLowerCase();

const buildKey = (originalName, ext) => {
  const base = sanitizeName(originalName);
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}-${base}${ext}`;
};

export const publicUrl = (bucket, key) =>
  `${BACKEND_URL}/api/files/${bucket}/${key}`;

/**
 * Загружает оригинал и WebP-превью в S3.
 * @returns {{ originalKey, previewKey, originalUrl, previewUrl }}
 */
export const uploadImage = async (fileBuffer, originalName, mimetype) => {
  const ext = path.extname(originalName).toLowerCase() || '.bin';
  const originalKey = buildKey(originalName, ext);
  const previewKey = buildKey(originalName, '.webp');

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_ORIGINALS,
      Key: originalKey,
      Body: fileBuffer,
      ContentType: mimetype,
    }),
  );

  const previewBuffer = await sharp(fileBuffer)
    .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer();

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_PREVIEWS,
      Key: previewKey,
      Body: previewBuffer,
      ContentType: 'image/webp',
    }),
  );

  return {
    originalKey,
    previewKey,
    originalUrl: publicUrl(BUCKET_ORIGINALS, originalKey),
    previewUrl: publicUrl(BUCKET_PREVIEWS, previewKey),
  };
};

/**
 * Загружает файл в указанный бакет без генерации превью (аватары, фото поиска и т.д.).
 * @returns {{ key, url }}
 */
export const uploadRaw = async (fileBuffer, originalName, mimetype, bucket = BUCKET_ORIGINALS) => {
  const ext = path.extname(originalName).toLowerCase() || '.bin';
  const key = buildKey(originalName, ext);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: mimetype,
    }),
  );

  return { key, url: publicUrl(bucket, key) };
};

/**
 * Удаляет файл из S3 (игнорирует ошибки отсутствия файла).
 */
export const deleteFile = async (bucket, key) => {
  try {
    await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch {
    // файл мог быть уже удалён — не критично
  }
};
