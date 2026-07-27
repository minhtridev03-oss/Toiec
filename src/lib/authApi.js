import { supabase } from './supabaseClient';
import {
  AppError,
  assertPayloadSize,
  checkClientRateLimit,
  sanitizeEmail,
  toFriendlyFunctionError,
  validateEmail,
  validatePassword,
} from './security';

const AUTH_LIMIT = 5;
const AUTH_WINDOW_MS = 15 * 60 * 1000;

const assertLocalAuthLimit = (action) => {
  const result = checkClientRateLimit(`auth:${action}`, AUTH_LIMIT, AUTH_WINDOW_MS);
  if (!result.allowed) {
    throw new AppError(`Bạn thao tác quá nhanh. Vui lòng thử lại sau ${result.retryAfterSeconds} giây.`, 429);
  }
};

const getRedirectTo = (path) => `${window.location.origin}${path}`;

const invokeAuthGuard = async (body) => {
  assertPayloadSize(body);

  const { data, error } = await supabase.functions.invoke('auth-guard', { body });
  if (error) {
    throw await toFriendlyFunctionError(error, 'Không thể xử lý xác thực lúc này. Vui lòng thử lại sau.');
  }

  if (data?.error) {
    throw new AppError(data.error, data.status || 400);
  }

  return data;
};

const persistSessionIfPresent = async (session) => {
  if (!session?.access_token || !session?.refresh_token) return;

  const { error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });

  if (error) throw error;
};

export const signInWithEmail = async ({ email, password }) => {
  assertLocalAuthLimit('sign-in');
  const normalizedEmail = validateEmail(email);
  const safePassword = validatePassword(password);

  const data = await invokeAuthGuard({
    action: 'sign-in',
    email: normalizedEmail,
    password: safePassword,
    redirectTo: getRedirectTo('/dashboard'),
  });

  await persistSessionIfPresent(data.session);
  return data;
};

export const signUpWithEmail = async ({ email, password }) => {
  assertLocalAuthLimit('sign-up');
  const normalizedEmail = validateEmail(email);
  const safePassword = validatePassword(password);

  const data = await invokeAuthGuard({
    action: 'sign-up',
    email: normalizedEmail,
    password: safePassword,
    redirectTo: getRedirectTo('/dashboard'),
  });

  await persistSessionIfPresent(data.session);
  return data;
};

export const requestPasswordReset = async (email) => {
  assertLocalAuthLimit('reset-password');
  const normalizedEmail = validateEmail(sanitizeEmail(email));

  return invokeAuthGuard({
    action: 'reset-password',
    email: normalizedEmail,
    redirectTo: getRedirectTo('/reset-password'),
  });
};
