const UPLOAD_ERROR_MESSAGES = {
  'Network request failed': 'Нет соединения с сервером',
  'Failed to fetch': 'Не удалось подключиться к серверу',
  'NetworkError': 'Ошибка сети',
};

const FRIENDLY_ERRORS = {
  413: 'Файл слишком большой',
  401: 'Необходимо войти в аккаунт',
  403: 'Нет прав для выполнения этого действия',
  404: 'Ресурс не найден',
  500: 'Внутренняя ошибка сервера. Попробуйте позже',
  503: 'Сервер временно недоступен. Попробуйте позже',
};

export const safeJson = async (response) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    const status = response.status;
    const friendly = FRIENDLY_ERRORS[status];
    if (friendly) {
      return { status: 'error', message: friendly };
    }
    if (text.trim().startsWith('<')) {
      return { status: 'error', message: `Ошибка сервера (${status}). Попробуйте позже` };
    }
    return { status: 'error', message: `Неизвестная ошибка (${status})` };
  }
};

export const apiFetch = async (url, options = {}) => {
  try {
    const response = await fetch(url, options);
    return safeJson(response);
  } catch (err) {
    const msg = UPLOAD_ERROR_MESSAGES[err.message] || 'Не удалось подключиться к серверу';
    return { status: 'error', message: msg };
  }
};

export const uploadFile = async (url, file, fieldName, accessToken) => {
  const formData = new FormData();
  formData.append(fieldName, file);
  return apiFetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  });
};
