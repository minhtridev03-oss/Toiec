import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createAdminClient } from '../_shared/security.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const response = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return response({ error: 'Method not allowed' }, 405)

  try {
    const body = await req.json()
    const amount = Math.round(Number(body?.amount))
    if (!Number.isFinite(amount) || amount < 1000 || amount > 100_000_000) {
      return response({ error: 'Số tiền không hợp lệ.' }, 400)
    }

    const donorName = typeof body?.donorName === 'string' ? body.donorName.trim().slice(0, 80) : null
    const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 240) : null
    const isPublic = body?.isPublic === true && Boolean(donorName)
    const admin = createAdminClient()
    const existingId = typeof body?.donationId === 'string' ? body.donationId : ''
    const existingCode = typeof body?.transferCode === 'string' ? body.transferCode : ''
    if (existingId && existingCode) {
      const { data: updated, error: updateError } = await admin.from('donations')
        .update({ amount, donor_name: isPublic ? donorName : null, message, is_public: isPublic })
        .eq('id', existingId).eq('transfer_code', existingCode).eq('status', 'pending')
        .select('id, amount, transfer_code').maybeSingle()
      if (updateError) throw updateError
      if (updated) return response({ donation: updated })
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
    return response({ donation: data })
  } catch (error) {
    console.error('create-donation error:', error)
    return response({ error: 'Không thể tạo giao dịch ủng hộ.' }, 500)
  }
})
