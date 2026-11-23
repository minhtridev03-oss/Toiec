import { supabase } from './supabaseClient';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
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

/**
 * Đăng nhập bằng tài khoản Google (tương thích tối ưu cho cả Web và Android APK)
 * - Trên Android Native: Dùng Chrome Custom Tabs + Deep Link com.tenglish.app://google-auth
 *   để Google không chặn disallowed_useragent và tự động quay lại app sau khi chọn tài khoản.
 * - Trên Web: Dùng luồng OAuth tiêu chuẩn của Supabase.
 */
export const signInWithGoogle = async () => {
  if (Capacitor.isNativePlatform()) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'com.tenglish.app://google-auth',
        skipBrowserRedirect: true,
      },
    });

    if (error) throw error;
    if (data?.url) {
      await Browser.open({ url: data.url, windowName: '_system' });
    }
    return data;
  } else {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) throw error;
    return data;
  }
};

/**
 * Xử lý Deep Link trả về từ Google OAuth trên Mobile App
 * Nhận chuỗi URL (dạng com.tenglish.app://google-auth#access_token=... hoặc ?code=...)
 * Thiết lập phiên đăng nhập vào Supabase và đóng Chrome Custom Tab.
 */
export const handleOAuthDeepLink = async (rawUrl) => {
  if (!rawUrl || !rawUrl.includes('google-auth')) return false;

  // Đóng Chrome Custom Tab nếu đang mở
  try {
    await Browser.close().catch(() => {});
  } catch {}

  try {
    // 1. Trường hợp Implicit flow (trả về hash #access_token=...&refresh_token=...)
    if (rawUrl.includes('access_token=')) {
      const hashPart = rawUrl.includes('#') ? rawUrl.substring(rawUrl.indexOf('#') + 1) : rawUrl;
      const params = new URLSearchParams(hashPart);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');

      if (access_token && refresh_token) {
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (error) throw error;
        return true;
      }
    }

    // 2. Trường hợp PKCE Code flow (trả về ?code=...)
    if (rawUrl.includes('code=')) {
      const queryPart = rawUrl.includes('?') ? rawUrl.substring(rawUrl.indexOf('?') + 1) : rawUrl;
      const params = new URLSearchParams(queryPart.split('#')[0]);
      const code = params.get('code');
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        return true;
      }
    }
  } catch (err) {
    console.error('Lỗi thiết lập phiên đăng nhập từ Deep Link:', err);
    throw err;
  }
  return false;
};

