import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '../services/fileService.js';

export const serveFile = async (req, res) => {
  const { bucket, key } = req.params;

  try {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const s3Response = await s3Client.send(command);

    res.setHeader('Content-Type', s3Response.ContentType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=86400');

    s3Response.Body.pipe(res);
  } catch (err) {
    console.error(`[FILE] ERROR bucket="${bucket}" key="${key}" → ${err.name}: ${err.message}`);
    if (err.name === 'NoSuchKey') {
      return res.status(404).json({ status: 'error', message: 'Файл не найден' });
    }
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
