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
    const status = response.status;
    let message = '';
    try {
      const body = await response.clone().json();
      message = body?.error || body?.message || body?.msg || '';
    } catch {
      try {
        message = await response.clone().text();
      } catch {}
    }

    if (!message) {
      if (status === 409) message = 'Email này đã được đăng ký. Hãy đăng nhập hoặc đặt lại mật khẩu.';
      else if (status === 429) message = 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.';
      else if (status === 401 || status === 400) message = 'Email hoặc mật khẩu không chính xác.';
      else message = fallbackMessage;
    }

    return new AppError(message, status);
  }

  const status = error?.status || 500;
  let message = error?.message || fallbackMessage;
  if (status === 409 && !message) message = 'Email này đã được đăng ký. Hãy đăng nhập hoặc đặt lại mật khẩu.';

  return new AppError(message, status);
};

export const parseAuthError = (error, locale = 'vi') => {
  const isVi = locale === 'vi';
  if (!error) {
    return {
      message: isVi ? 'Không thể xác thực lúc này. Vui lòng thử lại sau.' : 'We could not authenticate you right now. Please try again.',
      code: 'AUTH_FAILED',
      status: 500,
    };
  }

  const rawMessage = String(error?.message || '').trim();
  const lower = rawMessage.toLowerCase();
  const status = Number(error?.status || error?.context?.status || 0);

  // 1. Account already exists / 409 Conflict
  if (
    status === 409 ||
    lower.includes('already registered') ||
    lower.includes('already exists') ||
    lower.includes('đã được đăng ký') ||
    lower.includes('đã tồn tại') ||
    lower.includes('tài khoản đã tồn tại') ||
    lower.includes('user already exists')
  ) {
    return {
      message: isVi
        ? 'Email này đã được đăng ký. Hãy chuyển sang Đăng nhập nhé.'
        : 'This email is already registered. Please sign in.',
      code: 'EMAIL_ALREADY_REGISTERED',
      status: 409,
    };
  }

  // 2. Invalid credentials (Wrong email or password)
  if (
    status === 401 ||
    lower.includes('invalid login credentials') ||
    lower.includes('invalid credentials') ||
    lower.includes('không chính xác') ||
    lower.includes('sai mật khẩu') ||
    lower.includes('user not found')
  ) {
    return {
      message: isVi
        ? 'Email hoặc mật khẩu không chính xác.'
        : 'Your email or password is incorrect.',
      code: 'INVALID_CREDENTIALS',
      status: 401,
    };
  }

  // 3. Rate limiting / 429
  if (
    status === 429 ||
    lower.includes('rate') ||
    lower.includes('too many') ||
    lower.includes('quá nhanh') ||
    lower.includes('thử lại sau')
  ) {
    const matchSeconds = rawMessage.match(/(\d+)\s*(giây|s|seconds)/i);
    if (matchSeconds) {
      const sec = matchSeconds[1];
      return {
        message: isVi
          ? `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${sec} giây.`
          : `Too many attempts. Please try again after ${sec} seconds.`,
        code: 'RATE_LIMITED',
        status: 429,
      };
    }
    return {
      message: isVi
        ? 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.'
        : 'Too many attempts. Please wait a moment before trying again.',
      code: 'RATE_LIMITED',
      status: 429,
    };
  }

  // 4. Invalid email format
  if (
    lower.includes('email không hợp lệ') ||
    lower.includes('invalid email') ||
    lower.includes('email không đúng') ||
    lower.includes('chưa được phép sử dụng')
  ) {
    return {
      message: isVi
        ? 'Địa chỉ email không đúng định dạng. Vui lòng kiểm tra lại.'
        : 'Please enter a valid email address.',
      code: 'INVALID_EMAIL',
      status: 400,
    };
  }

  // 5. Password length / security
  if (
    lower.includes('mật khẩu phải có ít nhất') ||
    lower.includes('password should be at least') ||
    lower.includes('password too short') ||
    lower.includes('yêu cầu bảo mật')
  ) {
    return {
      message: isVi
        ? 'Mật khẩu phải có ít nhất 6 ký tự.'
        : 'Your password must contain at least 6 characters.',
      code: 'PASSWORD_TOO_SHORT',
      status: 400,
    };
  }

  // 6. Email not confirmed
  if (
    lower.includes('email not confirmed') ||
    lower.includes('chưa xác nhận email')
  ) {
    return {
      message: isVi
        ? 'Tài khoản chưa được xác nhận qua email. Vui lòng kiểm tra hộp thư của bạn.'
        : 'Your email has not been confirmed yet. Please check your inbox.',
      code: 'EMAIL_NOT_CONFIRMED',
      status: 400,
    };
  }

  // 7. Network / connection error
  if (
    lower.includes('failed to fetch') ||
    lower.includes('network error') ||
    lower.includes('kết nối')
  ) {
    return {
      message: isVi
        ? 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng của bạn.'
        : 'Cannot connect to server. Please check your internet connection.',
      code: 'NETWORK_ERROR',
      status: 503,
    };
  }

  // 8. Custom readable AppError in Vietnamese
  if (isVi && rawMessage && !lower.includes('functionshttperror') && !lower.includes('authapierror') && !lower.includes('không thể xử lý xác thực')) {
    return {
      message: rawMessage,
      code: 'CUSTOM_ERROR',
      status: status || 400,
    };
  }

  // 9. General fallback
  return {
    message: isVi
      ? 'Không thể xác thực lúc này. Vui lòng thử lại sau.'
      : 'We could not authenticate you right now. Please try again.',
    code: 'AUTH_FAILED',
    status: status || 500,
  };
};

export const getFriendlyErrorMessage = (error, fallbackMessage = 'Đã xảy ra lỗi. Vui lòng thử lại sau.') => {
  if (error instanceof AppError) return error.message;
  return error?.message || fallbackMessage;
};
