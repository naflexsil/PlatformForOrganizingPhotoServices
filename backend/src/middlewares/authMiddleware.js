import { verifyAccessToken } from '../utils/jwt.js';

const authMiddleware = (req, res, next) => {

  console.log('Новый запрос');
  console.log('Заголовки:', JSON.stringify(req.headers, null, 2));

  const authHeader = req.headers['authorization'];

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Токен авторизации отсутствует',
    });
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.id, vkId: payload.vkId, role: payload.role };
    return next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Токен истёк' : 'Токен невалиден';
    return res.status(401).json({ status: 'error', message });
  }
};

export default authMiddleware;