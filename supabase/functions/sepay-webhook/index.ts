import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createAdminClient } from '../_shared/security.ts'

const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
})

const getValue = (payload: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) if (payload[key] !== undefined && payload[key] !== null) return payload[key]
  return undefined
}

// Banks may remove punctuation or insert spaces in transfer content.
// Accept the canonical code as well as variants such as TOIECDONA TE0BE2B9B6.
const extractTransferCode = (value: string) => {
  const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const match = normalized.match(/TOIECDONATE([A-Z0-9]{8})/)
  return match ? `TOIEC-DONATE-${match[1]}` : undefined
}

serve(async (req) => {
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405)
  const expectedKey = Deno.env.get('SEPAY_WEBHOOK_API_KEY')
  const providedKey = req.headers.get('Authorization')?.replace(/^Apikey\s+/i, '').replace(/^Bearer\s+/i, '') || req.headers.get('x-api-key')
  if (!expectedKey || providedKey !== expectedKey) return json({ success: false, error: 'Unauthorized' }, 401)

  try {
    const payload = await req.json() as Record<string, unknown>
    const content = String(getValue(payload, ['content', 'description', 'transferContent']) || '')
    const explicitCode = String(getValue(payload, ['code', 'paymentCode']) || '')
    const code = extractTransferCode(explicitCode) || extractTransferCode(content)
    const transactionId = String(getValue(payload, ['id', 'transaction_id', 'transactionId', 'referenceCode']) || '')
    const amount = Number(getValue(payload, ['transferAmount', 'amount', 'amount_in']) || 0)
    const transferType = String(getValue(payload, ['transferType', 'transfer_type', 'type']) || 'in').toLowerCase()
    if (!code || !transactionId || amount <= 0 || (transferType && !['in', 'credit', 'receive'].includes(transferType))) {
      return json({ success: true, ignored: true })
    }

    const admin = createAdminClient()
    const { data: donation } = await admin.from('donations').select('id, amount, status').eq('transfer_code', code).maybeSingle()
    if (!donation || Number(donation.amount) !== amount || donation.status === 'paid') {
      return json({ success: true, ignored: true })
    }

    const { error } = await admin.from('donations').update({
      status: 'paid',
      provider_transaction_id: transactionId,
      paid_at: new Date().toISOString(),
    }).eq('id', donation.id).eq('status', 'pending')
    if (error) throw error
    return json({ success: true })
  } catch (error) {
    console.error('sepay-webhook error:', error)
    return json({ success: false, error: 'Webhook processing failed' }, 500)
  }
})
