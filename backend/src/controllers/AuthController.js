import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import {
  generatePkce,
  buildAuthUrl,
  exchangeCodeForToken,
  parseUserFromIdToken,
} from '../services/vkService.js';

const PKCE_COOKIE = 'pkce_verifier';

const processVkAuth = async (code, codeVerifier, role) => {
  const normalizedRole = role === 'PHOTOGRAPHER' ? 'PHOTOGRAPHER' : 'CLIENT';

  const { idToken, userId: tokenUserId } = await exchangeCodeForToken(code, codeVerifier);

  const { userId, firstName, lastName, avatarUrl } = idToken
    ? parseUserFromIdToken(idToken)
    : { userId: tokenUserId, firstName: '', lastName: '', avatarUrl: null };

  const finalUserId = userId || tokenUserId;
  const username = `vk_${finalUserId}`;

  const existingUser = await prisma.user.findUnique({ where: { vkId: finalUserId } });
  const isNewUser = !existingUser;

  const user = await prisma.$transaction(async (tx) => {
    const upserted = await tx.user.upsert({
      where: { vkId: finalUserId },
      update: { firstName, lastName, avatarUrl },
      create: {
        vkId: finalUserId,
        firstName,
        lastName,
        username,
        avatarUrl,
        role: normalizedRole,
      },
    });

    if (isNewUser && normalizedRole === 'PHOTOGRAPHER') {
      await tx.photographer.create({ data: { userId: upserted.id } });
    }

    return tx.user.findUnique({
      where: { id: upserted.id },
      include: { photographer: true },
    });
  });

  const token = jwt.sign(
    { id: user.id, vkId: user.vkId, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' },
  );

  return {
    token,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      role: user.role,
      avatarUrl: user.avatarUrl,
      photographer: user.photographer ?? null,
    },
  };
};

export const initiateVkLogin = (req, res) => {
  const { role = 'CLIENT' } = req.query;
  const { codeVerifier, codeChallenge } = generatePkce();

  res.cookie(PKCE_COOKIE, codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 5 * 60 * 1000, 
  });

  const authUrl = buildAuthUrl(codeChallenge, role);
  console.log('[VK ID] Redirecting to:', authUrl);
  return res.redirect(authUrl);
};

export const handleVkCallback = async (req, res) => {
  const { code, state: role, error, error_description } = req.query;
  const codeVerifier = req.cookies?.[PKCE_COOKIE];

  if (error) {
    console.error('[VK ID] Callback error:', error, '|', error_description);
    return res.status(400).json({ status: 'error', message: error_description || error });
  }

  if (!code) {
    return res.status(400).json({ status: 'error', message: 'Параметр code отсутствует' });
  }

  if (!codeVerifier) {
    return res.status(400).json({
      status: 'error',
      message: 'PKCE: cookie code_verifier не найден — возможно, истёк (5 мин) или заблокирован браузером',
    });
  }

  res.clearCookie(PKCE_COOKIE);

  try {
    const data = await processVkAuth(code, codeVerifier, role);
    return res.status(200).json({ status: 'success', data });
  } catch (err) {
    console.error('[VK ID] processVkAuth error:', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const loginWithVk = async (req, res) => {
  const { code, codeVerifier, role } = req.body;

  if (!code || !codeVerifier) {
    return res.status(400).json({
      status: 'error',
      message: 'Поля code и codeVerifier обязательны',
    });
  }

  try {
    const data = await processVkAuth(code, codeVerifier, role);
    return res.status(200).json({ status: 'success', data });
  } catch (err) {
    console.error('[VK ID] loginWithVk error:', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
