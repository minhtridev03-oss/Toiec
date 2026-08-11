import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.7'

export const MAX_PAYLOAD_BYTES = 1_000_000

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:5179',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5178',
  'http://localhost:5180',
]

const textEncoder = new TextEncoder()

export class HttpError extends Error {
  status: number
  retryAfterSeconds?: number

  constructor(status: number, message: string, retryAfterSeconds?: number) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.retryAfterSeconds = retryAfterSeconds
  }
}

export const normalizeEmail = (email: string) => email.trim().toLowerCase()

const stripUnsafeControlChars = (text: string) => {
  return Array.from(text).filter((char) => {
    const code = char.charCodeAt(0)
    return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127)
  }).join('')
}

export const sanitizeText = (value: unknown, maxLength = 20_000) => {
  const text = stripUnsafeControlChars(String(value ?? '').normalize('NFKC'))
    .replace(/<\s*\/?\s*script\b/gi, '')
    .replace(/\son[a-z]+\s*=/gi, '')
    .trim()

  return text.slice(0, maxLength)
}

export const getAllowedOrigins = () => {
  const configured = Deno.env.get('ALLOWED_ORIGINS')
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  return configured?.length ? configured : DEFAULT_ALLOWED_ORIGINS
}

export const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get('origin') || ''
  const allowedOrigins = getAllowedOrigins()
  const allowAll = allowedOrigins.includes('*')
  const allowOrigin = allowAll || !origin || allowedOrigins.includes(origin)
    ? (origin || allowedOrigins[0] || '*')
    : allowedOrigins[0]

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}

export const assertAllowedOrigin = (req: Request) => {
  const origin = req.headers.get('origin')
  if (!origin) return

  const allowedOrigins = getAllowedOrigins()
  if (!allowedOrigins.includes('*') && !allowedOrigins.includes(origin)) {
    throw new HttpError(403, 'Nguồn request không được phép.')
  }
}

export const securityHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
}

export const jsonResponse = (
  req: Request,
  body: Record<string, unknown> | unknown[],
  status = 200,
  extraHeaders: HeadersInit = {},
) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...securityHeaders,
      ...getCorsHeaders(req),
      ...extraHeaders,
    },
  })
}

export const optionsResponse = (req: Request) => {
  try {
    assertAllowedOrigin(req)
    return new Response('ok', { headers: { ...getCorsHeaders(req), ...securityHeaders } })
  } catch (error) {
    return errorResponse(req, error)
  }
}

export const errorResponse = (req: Request, error: unknown) => {
  if (error instanceof HttpError) {
    const headers: Record<string, string> = {}
    if (error.retryAfterSeconds) {
      headers['Retry-After'] = String(error.retryAfterSeconds)
    }
    return jsonResponse(req, { error: error.message }, error.status, headers)
  }

  if (typeof error === 'object' && error && 'issues' in error) {
    console.error('Zod Validation Error:', JSON.stringify(error.issues, null, 2))
    return jsonResponse(req, { error: 'Dữ liệu gửi lên không hợp lệ.' }, 400)
  }

  console.error('Unhandled Edge Function error:', error instanceof Error ? error.message : error)
  return jsonResponse(req, { error: 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.' }, 500)
}

export const readJsonBody = async (req: Request) => {
  const contentLength = Number(req.headers.get('content-length') || '0')
  if (contentLength > MAX_PAYLOAD_BYTES) {
    throw new HttpError(413, 'Payload quá lớn. Vui lòng gửi dữ liệu nhỏ hơn 1MB.')
  }

  const bodyText = await req.text()
  if (textEncoder.encode(bodyText).length > MAX_PAYLOAD_BYTES) {
    throw new HttpError(413, 'Payload quá lớn. Vui lòng gửi dữ liệu nhỏ hơn 1MB.')
  }

  try {
    return JSON.parse(bodyText || '{}')
  } catch {
    throw new HttpError(400, 'JSON không hợp lệ.')
  }
}

export const getClientIp = (req: Request) => {
  return (
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

export const stableHash = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(value))
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export const createAdminClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    throw new HttpError(500, 'Thiếu cấu hình bảo mật phía server.')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export const consumeRateLimit = async (
  adminClient: ReturnType<typeof createAdminClient>,
  key: string,
  limit: number,
  windowSeconds: number,
) => {
  const { data, error } = await adminClient
    .rpc('hit_rate_limit', {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    })
    .single()

  if (error) {
    console.error('Rate limiter error:', error.message)
    throw new HttpError(503, 'Chưa thể kiểm tra tần suất request. Vui lòng thử lại sau.')
  }

  const rateLimitResult = data as {
    allowed?: boolean
    retry_after_seconds?: number
  } | null

  if (!rateLimitResult?.allowed) {
    const retryAfter = Number(rateLimitResult?.retry_after_seconds || windowSeconds)
    throw new HttpError(
      429,
      `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${retryAfter} giây.`,
      retryAfter,
    )
  }
}

const decodeBase64Url = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  return new TextDecoder().decode(Uint8Array.from(atob(padded), (char) => char.charCodeAt(0)))
}

export const decodeJwtPayload = (authorizationHeader: string | null) => {
  const token = authorizationHeader?.replace(/^Bearer\s+/i, '')
  if (!token || token.split('.').length < 2) return null

  try {
    return JSON.parse(decodeBase64Url(token.split('.')[1]))
  } catch {
    return null
  }
}

export const getAuthContext = (req: Request) => {
  const payload = decodeJwtPayload(req.headers.get('authorization'))
  const role = payload?.role

  return {
    role,
    userId: role === 'authenticated' ? payload?.sub as string | undefined : undefined,
    isServiceRole: role === 'service_role',
    isAdmin: payload?.app_metadata?.role === 'admin',
  }
}

export const assertAuthenticatedForAi = (req: Request) => {
  const auth = getAuthContext(req)
  if (!auth.userId && !auth.isServiceRole) {
    throw new HttpError(401, 'Vui lòng đăng nhập để sử dụng AI.')
  }

  return auth
}

export const assertSafeRedirect = (redirectTo?: string) => {
  if (!redirectTo) return undefined

  let parsed: URL
  try {
    parsed = new URL(redirectTo)
  } catch {
    throw new HttpError(400, 'Đường dẫn chuyển hướng không hợp lệ.')
  }

  const allowedOrigins = getAllowedOrigins()
  if (!allowedOrigins.includes('*') && !allowedOrigins.includes(parsed.origin)) {
    throw new HttpError(400, 'Đường dẫn chuyển hướng không được phép.')
  }

  return parsed.toString()
}
