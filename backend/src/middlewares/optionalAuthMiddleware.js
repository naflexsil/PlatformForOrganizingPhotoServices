import { verifyAccessToken } from '../utils/jwt.js';

const optionalAuthMiddleware = (req, _res, next) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = verifyAccessToken(header.slice(7));
    } catch {
      // невалидный токен → продолжаем без пользователя
    }
  }
  next();
};

export default optionalAuthMiddleware;
