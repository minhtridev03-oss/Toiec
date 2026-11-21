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

  try {
    const data = await invokeAuthGuard({
      action: 'sign-in',
      email: normalizedEmail,
      password: safePassword,
      redirectTo: getRedirectTo('/dashboard'),
    });

    await persistSessionIfPresent(data.session);
    return data;
  } catch (err) {
    // Nếu Edge Function auth-guard chặn origin hoặc lỗi mạng, tự động fallback sang Supabase Auth chuẩn
    console.warn('Auth guard failed, falling back to direct Supabase auth:', err?.message || err);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: safePassword,
    });
    if (authError) throw authError;
    return authData;
  }
};

export const signUpWithEmail = async ({ email, password }) => {
  assertLocalAuthLimit('sign-up');
  const normalizedEmail = validateEmail(email);
  const safePassword = validatePassword(password);

  try {
    const data = await invokeAuthGuard({
      action: 'sign-up',
      email: normalizedEmail,
      password: safePassword,
      redirectTo: getRedirectTo('/dashboard'),
    });

    await persistSessionIfPresent(data.session);
    return data;
  } catch (err) {
    console.warn('Auth guard failed, falling back to direct Supabase auth:', err?.message || err);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: safePassword,
      options: {
        emailRedirectTo: getRedirectTo('/dashboard'),
      },
    });
    if (authError) throw authError;
    return authData;
  }
};

export const requestPasswordReset = async (email) => {
  assertLocalAuthLimit('reset-password');
  const normalizedEmail = validateEmail(sanitizeEmail(email));

  try {
    return await invokeAuthGuard({
      action: 'reset-password',
      email: normalizedEmail,
      redirectTo: getRedirectTo('/reset-password'),
    });
  } catch (err) {
    console.warn('Auth guard failed, falling back to direct Supabase auth:', err?.message || err);
    const { data, error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: getRedirectTo('/reset-password'),
    });
    if (error) throw error;
    return data;
  }
};
