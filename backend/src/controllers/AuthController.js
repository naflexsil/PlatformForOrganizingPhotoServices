import prisma from '../config/db.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import {
  generatePkce,
  buildAuthUrl,
  exchangeCodeForToken,
  parseUserFromIdToken,
} from '../services/vkService.js';

const PKCE_COOKIE = 'pkce_verifier';

const buildUserAndTokens = async ({ vkId, firstName, lastName, avatarUrl, tag }, role) => {
  const normalizedRole = role === 'PHOTOGRAPHER' ? 'PHOTOGRAPHER' : 'USER';

  const existingUser = await prisma.user.findUnique({ where: { vkId } });
  const isNewUser = !existingUser;

  const user = await prisma.$transaction(async (tx) => {
    const upserted = await tx.user.upsert({
      where: { vkId },
      update: { firstName, lastName, avatarUrl },
      create: { vkId, firstName, lastName, tag, avatarUrl, role: normalizedRole },
    });

    if (isNewUser && normalizedRole === 'PHOTOGRAPHER') {
      await tx.photographer.create({ data: { userId: upserted.id } });
    }

    return tx.user.findUnique({
      where: { id: upserted.id },
      include: { photographer: true },
    });
  });

  const jwtPayload = { id: user.id, vkId: user.vkId, role: user.role };

  return {
    accessToken: generateAccessToken(jwtPayload),
    refreshToken: generateRefreshToken(jwtPayload),
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      tag: user.tag,
      role: user.role,
      avatarUrl: user.avatarUrl,
      photographer: user.photographer ?? null,
    },
  };
};

const processVkAuth = async (code, codeVerifier, role) => {
  const { idToken, userId: tokenUserId } = await exchangeCodeForToken(code, codeVerifier);

  const { userId, firstName, lastName, avatarUrl } = idToken
    ? parseUserFromIdToken(idToken)
    : { userId: tokenUserId, firstName: '', lastName: '', avatarUrl: null };

  const finalUserId = userId || tokenUserId;

  return buildUserAndTokens(
    { vkId: finalUserId, firstName, lastName, avatarUrl, tag: `vk_${finalUserId}` },
    role,
  );
};

export const initiateVkLogin = (req, res) => {
  const { role = 'USER' } = req.query;
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

export const mockLogin = async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ status: 'error', message: 'Not found' });
  }

  const { role = 'USER' } = req.query;

  try {
    const data = await buildUserAndTokens(
      {
        vkId: 'mock_12345',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        tag: 'vk_mock_12345',
      },
      role,
    );
    return res.status(200).json({ status: 'success', data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const completeRegistration = async (req, res) => {
  const { firstName, lastName, gender, birthDate, role, tag } = req.body;

  if (!firstName || !lastName || !gender || !birthDate || !role || !tag) {
    return res.status(400).json({ status: 'error', message: 'Все поля обязательны' });
  }

  if (role !== 'USER' && role !== 'PHOTOGRAPHER') {
    return res.status(400).json({ status: 'error', message: 'Роль должна быть USER или PHOTOGRAPHER' });
  }

  try {
    const tagTaken = await prisma.user.findFirst({
      where: { tag, NOT: { id: req.user.id } },
    });
    if (tagTaken) {
      return res.status(409).json({ status: 'error', message: 'Тег уже занят' });
    }

    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: req.user.id },
        data: { firstName, lastName, gender, birthDate: new Date(birthDate), tag, role },
      });

      if (role === 'PHOTOGRAPHER') {
        await tx.photographer.upsert({
          where: { userId: updated.id },
          update: {},
          create: { userId: updated.id },
        });
      }

      return tx.user.findUnique({
        where: { id: updated.id },
        include: { photographer: true },
      });
    });

    return res.status(200).json({ status: 'success', data: user });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { photographer: true },
    });

    if (!user) {
      return res.status(404).json({ status: 'error', message: 'Пользователь не найден' });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        tag: user.tag,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        role: user.role,
        photographer: user.photographer ?? null,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
