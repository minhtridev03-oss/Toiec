import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import {
  assertAllowedOrigin,
  assertSafeRedirect,
  consumeRateLimit,
  createAdminClient,
  errorResponse,
  getClientIp,
  HttpError,
  jsonResponse,
  normalizeEmail,
  optionsResponse,
  readJsonBody,
  stableHash,
} from '../_shared/security.ts'

const EMAIL_AUTH_LIMIT = 5
const EMAIL_AUTH_WINDOW_SECONDS = 15 * 60

const emailSchema = z.string().trim().email().max(254)
const passwordSchema = z.string().min(6).max(128)
const redirectSchema = z.string().url().max(2048).optional()

const authRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('sign-in'),
    email: emailSchema,
    password: passwordSchema,
    redirectTo: redirectSchema,
  }).strict(),
  z.object({
    action: z.literal('sign-up'),
    email: emailSchema,
    password: passwordSchema,
    redirectTo: redirectSchema,
  }).strict(),
  z.object({
    action: z.literal('reset-password'),
    email: emailSchema,
    redirectTo: redirectSchema,
  }).strict(),
])

const getAuthConfig = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !anonKey) {
    throw new HttpError(500, 'Thiếu cấu hình xác thực phía server.')
  }

  return { supabaseUrl, anonKey }
}

const formatSupabaseAuthError = (status: number, message: string, action: string) => {
  const normalized = message.toLowerCase()

  if (status === 429) {
    return new HttpError(429, 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.', 60)
  }

  if (action === 'sign-in' && (status === 400 || status === 401)) {
    return new HttpError(status, 'Email hoặc mật khẩu không chính xác.')
  }

  if (normalized.includes('already registered') || normalized.includes('already exists')) {
    return new HttpError(409, 'Email này đã được đăng ký. Hãy đăng nhập hoặc đặt lại mật khẩu.')
  }

  if (normalized.includes('password')) {
    return new HttpError(400, 'Mật khẩu không đáp ứng yêu cầu bảo mật.')
  }

  if (normalized.includes('email')) {
    return new HttpError(400, 'Email không hợp lệ hoặc chưa được phép sử dụng.')
  }

  return new HttpError(status >= 400 && status < 500 ? status : 502, 'Không thể xử lý xác thực lúc này. Vui lòng thử lại sau.')
}

const callSupabaseAuth = async (
  path: string,
  body: Record<string, unknown>,
  action: string,
) => {
  const { supabaseUrl, anonKey } = getAuthConfig()
  const response = await fetch(`${supabaseUrl}/auth/v1${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
    },
    body: JSON.stringify(body),
  })

  const text = await response.text()
  let data: Record<string, unknown> = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { message: text }
  }

  if (!response.ok) {
    const message = data?.msg || data?.message || data?.error_description || data?.error || ''
    throw formatSupabaseAuthError(response.status, String(message), action)
  }

  return data
}

const buildSessionPayload = (authData: Record<string, unknown>) => {
  if (!authData.access_token || !authData.refresh_token) return null

  return {
    access_token: authData.access_token,
    refresh_token: authData.refresh_token,
    expires_in: authData.expires_in,
    expires_at: authData.expires_at,
    token_type: authData.token_type,
    user: authData.user,
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req)

  try {
    assertAllowedOrigin(req)

    if (req.method !== 'POST') {
      throw new HttpError(405, 'Phương thức request không được hỗ trợ.')
    }

    const rawBody = await readJsonBody(req)
    const payload = authRequestSchema.parse(rawBody)
    const email = normalizeEmail(payload.email)
    const ip = getClientIp(req)
    const emailHash = await stableHash(email)
    const admin = createAdminClient()

    await consumeRateLimit(
      admin,
      `auth:${payload.action}:ip:${ip}`,
      EMAIL_AUTH_LIMIT,
      EMAIL_AUTH_WINDOW_SECONDS,
    )
    await consumeRateLimit(
      admin,
      `auth:${payload.action}:email:${emailHash}`,
      EMAIL_AUTH_LIMIT,
      EMAIL_AUTH_WINDOW_SECONDS,
    )

    const redirectTo = assertSafeRedirect(payload.redirectTo)

    if (payload.action === 'reset-password') {
      const query = redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : ''
      await callSupabaseAuth(`/recover${query}`, { email }, payload.action)
      return jsonResponse(req, { ok: true, message: 'Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.' })
    }

    if (payload.action === 'sign-up') {
      const query = redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : ''
      const authData = await callSupabaseAuth(`/signup${query}`, {
        email,
        password: payload.password,
      }, payload.action)

      return jsonResponse(req, {
        ok: true,
        user: authData.user,
        session: buildSessionPayload(authData),
      })
    }

    const authData = await callSupabaseAuth('/token?grant_type=password', {
      email,
      password: payload.password,
    }, payload.action)

    return jsonResponse(req, {
      ok: true,
      user: authData.user,
      session: buildSessionPayload(authData),
    })
  } catch (error) {
    return errorResponse(req, error)
  }
})
