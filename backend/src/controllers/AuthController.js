import prisma from '../config/db.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import {
  generatePkce,
  buildAuthUrl,
  exchangeCodeForToken,
  parseUserFromIdToken,
} from '../services/vkService.js';

const PKCE_COOKIE = 'pkce_verifier';

const buildUserAndTokens = async ({ vkId, firstName, lastName, avatarUrl, tag, birthDate, gender }, role) => {
  const normalizedRole = role === 'PHOTOGRAPHER' ? 'PHOTOGRAPHER' : 'USER';

  const existingUser = await prisma.user.findUnique({ where: { vkId } });
  const isNewUser = !existingUser;

  const user = await prisma.$transaction(async (tx) => {
    const upserted = await tx.user.upsert({
      where: { vkId },
      update: { firstName, lastName, avatarUrl },
      create: {
        vkId,
        firstName,
        lastName,
        tag,
        avatarUrl,
        role: normalizedRole,
        ...(birthDate && { birthDate }),
        ...(gender && { gender }),
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

  const { userId, firstName, lastName, avatarUrl, birthDate, gender } = idToken
    ? parseUserFromIdToken(idToken)
    : { userId: tokenUserId, firstName: '', lastName: '', avatarUrl: null, birthDate: null, gender: null };

  const finalUserId = userId || tokenUserId;

  return buildUserAndTokens(
    { vkId: finalUserId, firstName, lastName, avatarUrl, tag: `vk_${finalUserId}`, birthDate, gender },
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
  const { role = 'USER', id = '1' } = req.query;
  const vkId = `mock_${id}`;

  try {
    const data = await buildUserAndTokens(
      {
        vkId,
        firstName: 'Test',
        lastName: `User${id}`,
        avatarUrl: null,
        tag: `vk_${vkId}`,
        birthDate: null,
        gender: null,
      },
      role,
    );
    return res.status(200).json({ status: 'success', data });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const cancelRegistration = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ status: 'error', message: 'Пользователь не найден' });
    if (user.tag && !user.tag.startsWith('vk_')) {
      return res.status(400).json({ status: 'error', message: 'Регистрация уже завершена, удаление недоступно' });
    }
    await prisma.user.delete({ where: { id: req.user.id } });
    return res.json({ status: 'success' });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const loginWithVkSdk = async (req, res) => {
  const { idToken, firstName: clientFirstName, lastName: clientLastName, avatarUrl: clientAvatarUrl } = req.body;
  if (!idToken) {
    return res.status(400).json({ status: 'error', message: 'idToken обязателен' });
  }

  let vkData;
  try {
    vkData = parseUserFromIdToken(idToken);
  } catch {
    return res.status(400).json({ status: 'error', message: 'Не удалось разобрать id_token от VK ID' });
  }

  const { userId: vkId, birthDate, gender } = vkData;
  const firstName = vkData.firstName || clientFirstName || '';
  const lastName = vkData.lastName || clientLastName || '';
  const avatarUrl = vkData.avatarUrl || clientAvatarUrl || null;

  console.log('[VK SDK] resolved name:', { firstName, lastName, avatarUrl });

  try {
    let user = await prisma.user.findUnique({ where: { vkId } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          vkId,
          firstName,
          lastName,
          tag: `vk_${vkId}`,
          avatarUrl,
          role: 'USER',
          ...(birthDate && { birthDate }),
          ...(gender && { gender }),
        },
      });
    } else {
      const isRegistered = user.tag && !user.tag.startsWith('vk_');
      const updateData = {};
      if (!isRegistered) {
        // До завершения регистрации синхронизируем данные из VK
        if (firstName) updateData.firstName = firstName;
        if (lastName) updateData.lastName = lastName;
      }
      // Аватар из VK обновляем только если пользователь не загрузил свой
      if (avatarUrl && !user.avatarUrlOriginal) {
        updateData.avatarUrl = avatarUrl;
      }
      if (Object.keys(updateData).length > 0) {
        user = await prisma.user.update({ where: { vkId }, data: updateData });
      }
    }

    const registrationComplete = !user.tag.startsWith('vk_');
    const jwtPayload = { id: user.id, vkId: user.vkId, role: user.role };

    return res.status(200).json({
      status: 'success',
      data: {
        accessToken: generateAccessToken(jwtPayload),
        refreshToken: generateRefreshToken(jwtPayload),
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          tag: user.tag,
          role: user.role,
          avatarUrl: user.avatarUrl,
          birthDate: user.birthDate,
          gender: user.gender,
        },
        registrationComplete,
      },
    });
  } catch (err) {
    console.error('[VK SDK] loginWithVkSdk error:', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
};

export const completeRegistration = async (req, res) => {
  const {
    firstName, lastName, gender, birthDate, role, tag, city, bio,
    pricePerHour, additionalPriceInfo, experienceYears, experienceMonths, deliveryTime,
  } = req.body;

  if (!firstName || !lastName || !role || !tag) {
    return res.status(400).json({ status: 'error', message: 'Обязательные поля: firstName, lastName, role, tag' });
  }

  if (role !== 'USER' && role !== 'PHOTOGRAPHER') {
    return res.status(400).json({ status: 'error', message: 'Роль должна быть USER или PHOTOGRAPHER' });
  }

  try {
    const currentUser = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!currentUser) {
      return res.status(404).json({ status: 'error', message: 'Пользователь не найден' });
    }

    const isAlreadyRegistered = currentUser.tag && !currentUser.tag.startsWith('vk_');
    if (isAlreadyRegistered && role !== currentUser.role) {
      return res.status(409).json({ status: 'error', message: 'Роль нельзя изменить после регистрации' });
    }

    const tagTaken = await prisma.user.findFirst({
      where: { tag, NOT: { id: req.user.id } },
    });
    if (tagTaken) {
      return res.status(409).json({ status: 'error', message: 'Тег уже занят' });
    }

    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: req.user.id },
        data: {
          firstName,
          lastName,
          tag,
          role,
          ...(gender !== undefined && { gender }),
          ...(birthDate !== undefined && { birthDate: new Date(birthDate) }),
          ...(city !== undefined && { city }),
          ...(bio !== undefined && { bio }),
        },
      });

      if (role === 'PHOTOGRAPHER') {
        const photographerData = {
          ...(pricePerHour !== undefined && { pricePerHour: parseFloat(pricePerHour) || null }),
          ...(additionalPriceInfo !== undefined && { additionalPriceInfo }),
          ...(experienceYears !== undefined && { experienceYears: parseInt(experienceYears) || null }),
          ...(experienceMonths !== undefined && { experienceMonths: parseInt(experienceMonths) || null }),
          ...(deliveryTime !== undefined && { deliveryTime: parseInt(deliveryTime) || null }),
        };
        await tx.photographer.upsert({
          where: { userId: updated.id },
          update: photographerData,
          create: { userId: updated.id, ...photographerData },
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
        gender: user.gender,
        birthDate: user.birthDate,
        city: user.city,
        avatarUrl: user.avatarUrl,
        avatarUrlOriginal: user.avatarUrlOriginal,
        role: user.role,
        photographer: user.photographer ?? null,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
};
