import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import {
  assertAllowedOrigin,
  consumeRateLimit,
  createAdminClient,
  errorResponse,
  getClientIp,
  HttpError,
  jsonResponse,
  optionsResponse,
  readJsonBody,
  sanitizeText,
} from '../_shared/security.ts'

const DONATE_IP_LIMIT_PER_MINUTE = 5

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req)

  try {
    assertAllowedOrigin(req)
    if (req.method !== 'POST') {
      throw new HttpError(405, 'Phương thức không được hỗ trợ.')
    }

    const admin = createAdminClient()
    const ip = getClientIp(req)
    await consumeRateLimit(admin, `donate:create:ip:${ip}`, DONATE_IP_LIMIT_PER_MINUTE, 60)

    const body = await readJsonBody(req)
    const amount = Math.round(Number(body?.amount))
    if (!Number.isFinite(amount) || amount < 1000 || amount > 100_000_000) {
      throw new HttpError(400, 'Số tiền không hợp lệ (tối thiểu 1.000đ, tối đa 100.000.000đ).')
    }

    const donorName = typeof body?.donorName === 'string' ? sanitizeText(body.donorName, 80) : null
    const message = typeof body?.message === 'string' ? sanitizeText(body.message, 240) : null
    const isPublic = body?.isPublic === true && Boolean(donorName)
    const existingId = typeof body?.donationId === 'string' ? body.donationId.trim() : ''
    const existingCode = typeof body?.transferCode === 'string' ? body.transferCode.trim() : ''

    if (existingId && existingCode) {
      const { data: updated, error: updateError } = await admin.from('donations')
        .update({ amount, donor_name: isPublic ? donorName : null, message, is_public: isPublic })
        .eq('id', existingId).eq('transfer_code', existingCode).eq('status', 'pending')
        .select('id, amount, transfer_code').maybeSingle()
      if (updateError) throw updateError
      if (updated) return jsonResponse(req, { donation: updated })
    }

    const transferCode = `TOIEC-DONATE-${crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`
    const { data, error } = await admin.from('donations').insert({
      amount,
      transfer_code: transferCode,
      donor_name: isPublic ? donorName : null,
      message,
      is_public: isPublic,
    }).select('id, amount, transfer_code').single()

    if (error) throw error
    return jsonResponse(req, { donation: data })
  } catch (error) {
    return errorResponse(req, error)
  }
})
