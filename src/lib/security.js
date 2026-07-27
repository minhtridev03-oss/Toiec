export const MAX_PAYLOAD_BYTES = 1_000_000;

const encoder = new TextEncoder();

export class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }
}

const stripUnsafeControlChars = (text) => {
  return Array.from(text).filter((char) => {
    const code = char.charCodeAt(0);
    return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
  }).join('');
};

export const sanitizeText = (value, maxLength = 5000) => {
  const text = stripUnsafeControlChars(String(value ?? '').normalize('NFKC'))
    .replace(/<\s*\/?\s*script\b/gi, '')
    .replace(/\son[a-z]+\s*=/gi, '')
    .trim();

  return text.slice(0, maxLength);
};

export const sanitizeEmail = (email) => sanitizeText(email, 254).toLowerCase();

export const validateEmail = (email) => {
  const normalized = sanitizeEmail(email);
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);

  if (!isValid) {
    throw new AppError('Email không hợp lệ.');
  }

  return normalized;
};

export const validatePassword = (password, minLength = 6) => {
  const value = String(password ?? '');

  if (value.length < minLength) {
    throw new AppError(`Mật khẩu phải có ít nhất ${minLength} ký tự.`);
  }

  if (value.length > 128) {
    throw new AppError('Mật khẩu quá dài.');
  }

  return value;
};

export const validateTextInput = (value, fieldName, maxLength = 5000) => {
  const sanitized = sanitizeText(value, maxLength);

  if (!sanitized) {
    throw new AppError(`${fieldName} không được để trống.`);
  }

  return sanitized;
};

export const assertPayloadSize = (payload) => {
  const bytes = encoder.encode(JSON.stringify(payload ?? {})).length;
  if (bytes > MAX_PAYLOAD_BYTES) {
    throw new AppError('Payload quá lớn. Vui lòng gửi dữ liệu nhỏ hơn 1MB.', 413);
  }
};

const getRateBucket = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
};

export const checkClientRateLimit = (key, limit, windowMs) => {
  const storageKey = `rl:${key}`;
  const now = Date.now();
  const current = getRateBucket(storageKey);

  if (!current || now >= current.resetAt) {
    localStorage.setItem(storageKey, JSON.stringify({ count: 1, resetAt: now + windowMs }));
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  localStorage.setItem(storageKey, JSON.stringify({ ...current, count: current.count + 1 }));
  return { allowed: true, retryAfterSeconds: 0 };
};

export const toFriendlyFunctionError = async (error, fallbackMessage = 'Đã xảy ra lỗi. Vui lòng thử lại sau.') => {
  const response = error?.context;

  if (response?.status) {
    try {
      const body = await response.clone().json();
      return new AppError(body?.error || fallbackMessage, response.status);
    } catch {
      return new AppError(fallbackMessage, response.status);
    }
  }

  return new AppError(error?.message || fallbackMessage, error?.status || 500);
};

export const getFriendlyErrorMessage = (error, fallbackMessage = 'Đã xảy ra lỗi. Vui lòng thử lại sau.') => {
  if (error instanceof AppError) return error.message;
  return error?.message || fallbackMessage;
};
