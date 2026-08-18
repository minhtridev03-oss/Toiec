import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createAdminClient } from '../_shared/security.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const reply = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405)
  try {
    const body = await req.json()
    const id = typeof body?.id === 'string' ? body.id : ''
    const transferCode = typeof body?.transferCode === 'string' ? body.transferCode : ''
    if (!id || !transferCode) return reply({ error: 'Thiếu thông tin giao dịch.' }, 400)
    const admin = createAdminClient()
    const { data, error } = await admin.from('donations').select('id, status, amount, paid_at').eq('id', id).eq('transfer_code', transferCode).maybeSingle()
    if (error) throw error
    if (!data) return reply({ error: 'Không tìm thấy giao dịch.' }, 404)
    return reply({ donation: data })
  } catch (error) {
    console.error('donation-status error:', error)
    return reply({ error: 'Không thể kiểm tra trạng thái giao dịch.' }, 500)
  }
})
