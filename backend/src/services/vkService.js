import crypto from 'node:crypto';


export const generatePkce = () => {
  const codeVerifier = crypto.randomBytes(64).toString('base64url'); 
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  return { codeVerifier, codeChallenge };
};

export const buildAuthUrl = (codeChallenge, state) => {
  const url = new URL('https://id.vk.ru/auth');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', process.env.VK_APP_ID);
  url.searchParams.set('redirect_uri', process.env.VK_REDIRECT_URI);
  url.searchParams.set('scope', 'vkid.personal_info');
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'sha256');
  url.searchParams.set('state', state);
  return url.toString();
};

export const exchangeCodeForToken = async (code, codeVerifier) => {
  console.log('[VK ID] Exchanging code for token…');
  console.log('[VK ID] redirect_uri:', process.env.VK_REDIRECT_URI);
  console.log('[VK ID] code_verifier length:', codeVerifier?.length);
  console.log('[VK ID] code (preview):', code?.slice(0, 6) + '…');

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: process.env.VK_APP_ID,
    client_secret: process.env.VK_APP_SECRET,
    redirect_uri: process.env.VK_REDIRECT_URI,
    code_verifier: codeVerifier,
  });

  const res = await fetch('https://id.vk.ru/oauth2/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await res.json();
  console.log('[VK ID] Token response status:', res.status);

  if (data.error) {
    console.error('[VK ID] Token error:', data.error, '|', data.error_description);
    throw new Error(data.error_description || `VK ID: ${data.error}`);
  }

  return {
    accessToken: data.access_token,
    idToken: data.id_token ?? null,
    userId: String(data.user_id),
  };
};

export const parseUserFromIdToken = (idToken) => {
  try {
    const raw = idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
    console.log('[VK ID] id_token claims:', Object.keys(payload));

    return {
      userId: String(payload.sub),
      firstName: payload.first_name ?? '',
      lastName: payload.last_name ?? '',
      avatarUrl: payload.avatar ?? null,
    };
  } catch (err) {
    console.error('[VK ID] id_token parse error:', err.message);
    throw new Error('Не удалось разобрать id_token от VK ID');
  }
};
