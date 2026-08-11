import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import {
  assertAllowedOrigin,
  assertAuthenticatedForAi,
  consumeRateLimit,
  createAdminClient,
  errorResponse,
  getClientIp,
  HttpError,
  jsonResponse,
  optionsResponse,
  readJsonBody,
  sanitizeText,
  stableHash,
} from '../_shared/security.ts'

const AI_IP_LIMIT_PER_MINUTE = 30
const AI_USER_LIMIT_PER_15_MINUTES = 120
const AI_TOTAL_TIMEOUT_MS = 25_000
const AI_ATTEMPT_TIMEOUT_MS = 8_000
const AI_CACHE_VERSION = 'v2'
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'
const RETRYABLE_STATUS_CODES = new Set([404, 408, 409, 429, 500, 502, 503, 504])

type AiProvider = 'gemini' | 'openai'

const AI_TASKS = [
  'writing_evaluate',
  'speaking_chat',
  'speaking_suggestions',
  'translate',
  'speaking_evaluate',
  'dictionary_lookup',
  'reading_explain',
] as const

type AiTask = typeof AI_TASKS[number]

type TaskPolicy = {
  defaultMaxOutputTokens: number
  maxOutputTokens: number
  cacheable: boolean
  cacheTtlSeconds?: number
}

const LEGACY_TASK_POLICY: TaskPolicy = {
  defaultMaxOutputTokens: 8192,
  maxOutputTokens: 8192,
  cacheable: true,
}

const TASK_POLICIES: Record<AiTask, TaskPolicy> = {
  writing_evaluate: { defaultMaxOutputTokens: 1024, maxOutputTokens: 1536, cacheable: false },
  speaking_chat: { defaultMaxOutputTokens: 768, maxOutputTokens: 1024, cacheable: false },
  speaking_suggestions: { defaultMaxOutputTokens: 128, maxOutputTokens: 256, cacheable: false },
  translate: { defaultMaxOutputTokens: 2048, maxOutputTokens: 2048, cacheable: true, cacheTtlSeconds: 7 * 24 * 60 * 60 },
  speaking_evaluate: { defaultMaxOutputTokens: 1536, maxOutputTokens: 2048, cacheable: false },
  dictionary_lookup: { defaultMaxOutputTokens: 2048, maxOutputTokens: 2048, cacheable: true, cacheTtlSeconds: 30 * 24 * 60 * 60 },
  reading_explain: { defaultMaxOutputTokens: 1024, maxOutputTokens: 2048, cacheable: true, cacheTtlSeconds: 30 * 24 * 60 * 60 },
}

const requestSchema = z.object({
  prompt: z.string().trim().min(1).max(20_000),
  responseType: z.enum(['json', 'text']).default('json'),
  maxOutputTokens: z.number().int().min(1).max(8192).optional(),
  task: z.enum(AI_TASKS).optional(),
}).strict()

const getTaskPolicy = (task?: AiTask) => task ? TASK_POLICIES[task] : LEGACY_TASK_POLICY

const getGeminiModels = () => {
  const primary = Deno.env.get('GEMINI_MODEL') || 'gemini-flash-latest'
  const fallbacks = (Deno.env.get('GEMINI_FALLBACK_MODELS') || 'gemini-flash-lite-latest')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean)

  return [...new Set([primary, ...fallbacks])]
}

const getProviderOrder = (): AiProvider[] => {
  const configured = (Deno.env.get('AI_TEXT_PROVIDER') || 'auto').trim().toLowerCase()
  if (configured === 'auto') return ['gemini', 'openai']
  if (configured === 'gemini' || configured === 'openai') return [configured]
  throw new HttpError(500, 'Cấu hình AI phía server chưa hợp lệ.')
}

const getErrorStatus = (error: unknown) => error instanceof HttpError ? error.status : 502

const totalDeadlineError = () => new HttpError(
  504,
  'AI ph\u1ea3n h\u1ed3i qu\u00e1 l\u00e2u. Vui l\u00f2ng th\u1eed l\u1ea1i.',
)

const getAttemptTimeout = (deadlineAt: number) => {
  const remainingTimeout = deadlineAt - Date.now()
  if (remainingTimeout <= 0) throw totalDeadlineError()
  return Math.min(AI_ATTEMPT_TIMEOUT_MS, remainingTimeout)
}

const callGeminiModel = async (
  apiKey: string,
  model: string,
  prompt: string,
  responseType: 'json' | 'text',
  maxOutputTokens: number,
  timeoutMs: number,
) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            ...(responseType === 'json' ? { responseMimeType: 'application/json' } : {}),
            ...(maxOutputTokens ? { maxOutputTokens } : {}),
          },
        }),
      },
    )

    if (!response.ok) {
      throw new HttpError(response.status, 'Gemini không thể xử lý yêu cầu.')
    }

    const data = await response.json()
    const candidate = data.candidates?.[0]
    const finishReason = candidate?.finishReason
    if (finishReason && finishReason !== 'STOP') {
      const nonRetryableReasons = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'RECITATION'])
      if (nonRetryableReasons.has(finishReason)) {
        throw new HttpError(400, 'Nội dung không thể được AI xử lý an toàn.')
      }
      throw new HttpError(502, `Gemini dừng phản hồi sớm (${finishReason}).`)
    }

    const responseText = candidate?.content?.parts
      ?.map((part: { text?: string }) => part.text || '')
      .join('')
      .trim()

    if (!responseText) throw new HttpError(502, 'Gemini không trả về nội dung.')
    return responseText
  } catch (error) {
    if (error instanceof HttpError) throw error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new HttpError(504, 'Gemini phản hồi quá lâu.')
    }
    throw new HttpError(502, 'Gemini không thể xử lý yêu cầu.')
  } finally {
    clearTimeout(timeout)
  }
}

const generateWithGemini = async (
  apiKey: string,
  prompt: string,
  responseType: 'json' | 'text',
  maxOutputTokens: number,
  deadlineAt: number,
) => {
  let lastError: unknown

  for (const model of getGeminiModels()) {
    try {
      const timeoutMs = getAttemptTimeout(deadlineAt)
      return await callGeminiModel(apiKey, model, prompt, responseType, maxOutputTokens, timeoutMs)
    } catch (error) {
      lastError = error
      if (Date.now() >= deadlineAt) throw totalDeadlineError()
      if (!RETRYABLE_STATUS_CODES.has(getErrorStatus(error))) break
    }
  }

  throw lastError || new HttpError(502, 'Gemini không thể tạo phản hồi.')
}

const extractOpenAIOutput = (payload: Record<string, unknown>) => {
  const outputText = payload.output_text
  if (typeof outputText === 'string' && outputText.trim()) return outputText

  const output = Array.isArray(payload.output) ? payload.output : []
  const text = output
    .flatMap((item) => {
      const content = item && typeof item === 'object' ? (item as { content?: unknown }).content : []
      return Array.isArray(content) ? content : []
    })
    .filter((item) => item && typeof item === 'object' && (item as { type?: string }).type === 'output_text')
    .map((item) => (item as { text?: string }).text || '')
    .join('')
    .trim()

  if (!text) throw new HttpError(502, 'OpenAI không trả về nội dung.')
  return text
}

const generateWithOpenAI = async (
  apiKey: string,
  prompt: string,
  responseType: 'json' | 'text',
  maxOutputTokens: number,
  deadlineAt: number,
) => {
  const model = Deno.env.get('OPENAI_TEXT_MODEL') || 'gpt-5.6-sol'
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), getAttemptTimeout(deadlineAt))

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        input: prompt,
        ...(maxOutputTokens ? { max_output_tokens: maxOutputTokens } : {}),
        ...(responseType === 'json' ? { text: { format: { type: 'json_object' } } } : {}),
      }),
    })

    if (!response.ok) {
      throw new HttpError(response.status, 'OpenAI không thể xử lý yêu cầu.')
    }

    const payload = await response.json()
    if (payload?.status === 'incomplete') {
      throw new HttpError(502, 'OpenAI dừng phản hồi trước khi hoàn tất.')
    }
    return extractOpenAIOutput(payload)
  } catch (error) {
    if (error instanceof HttpError) throw error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new HttpError(504, 'OpenAI phản hồi quá lâu.')
    }
    throw new HttpError(502, 'OpenAI không thể xử lý yêu cầu.')
  } finally {
    clearTimeout(timeout)
  }
}

const getApiKey = (provider: AiProvider): string | undefined => {
  const envKey = provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY'
  const keysStr = Deno.env.get(envKey)
  if (!keysStr) return undefined
  
  const keys = keysStr.split(',').map(k => k.trim()).filter(Boolean)
  if (keys.length === 0) return undefined
  
  // Key Rotation: Chọn ngẫu nhiên 1 key trong danh sách để cân bằng tải
  return keys[Math.floor(Math.random() * keys.length)]
}

const generateWithFallbacks = async (
  prompt: string,
  responseType: 'json' | 'text',
  maxOutputTokens: number,
) => {
  let lastError: unknown
  let hasConfiguredProvider = false
  const deadlineAt = Date.now() + AI_TOTAL_TIMEOUT_MS
  const configuredProvider = (Deno.env.get('AI_TEXT_PROVIDER') || 'auto').trim().toLowerCase()

  for (const provider of getProviderOrder()) {
    const apiKey = getApiKey(provider)

    if (!apiKey) {
      console.warn(`AI provider is not configured: ${provider}`)
      continue
    }

    hasConfiguredProvider = true
    try {
      return provider === 'gemini'
        ? await generateWithGemini(apiKey, prompt, responseType, maxOutputTokens, deadlineAt)
        : await generateWithOpenAI(apiKey, prompt, responseType, maxOutputTokens, deadlineAt)
    } catch (error) {
      lastError = error
      const status = getErrorStatus(error)
      console.warn(`AI provider failed: ${provider} (${status})`)
      if (Date.now() >= deadlineAt) {
        lastError = totalDeadlineError()
        break
      }
      if (configuredProvider !== 'auto' || !RETRYABLE_STATUS_CODES.has(status)) break
    }
  }

  const status = getErrorStatus(lastError)
  if (!hasConfiguredProvider || [401, 403].includes(status)) {
    throw new HttpError(502, 'Cấu hình AI phía server chưa hợp lệ.')
  }
  if (status === 504) throw lastError
  if (status === 429) {
    throw new HttpError(429, 'AI đang bận. Vui lòng thử lại sau ít phút.', 60)
  }
  throw new HttpError(502, 'AI chưa phản hồi được. Vui lòng thử lại sau.')
}

const parseAiResponse = (responseText: string, responseType: 'json' | 'text') => {
  if (responseType === 'text') {
    return { response: sanitizeText(responseText, 20_000) }
  }

  const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim()
  try {
    return JSON.parse(cleanJson)
  } catch {
    throw new HttpError(502, 'AI trả về dữ liệu không hợp lệ. Vui lòng thử lại.')
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req)

  try {
    assertAllowedOrigin(req)

    if (req.method !== 'POST') {
      throw new HttpError(405, 'Phương thức request không được hỗ trợ.')
    }

    const auth = assertAuthenticatedForAi(req)
    const rawBody = await readJsonBody(req)
    const { prompt, responseType, maxOutputTokens, task } = requestSchema.parse(rawBody)
    const taskPolicy = getTaskPolicy(task)
    const effectiveMaxOutputTokens = Math.min(
      maxOutputTokens ?? taskPolicy.defaultMaxOutputTokens,
      taskPolicy.maxOutputTokens,
    )

    const admin = createAdminClient()
    await Promise.all([
      consumeRateLimit(admin, `ai:ip:${getClientIp(req)}`, AI_IP_LIMIT_PER_MINUTE, 60),
      consumeRateLimit(
        admin,
        `ai:${auth.userId ? `user:${auth.userId}` : 'service-role'}`,
        AI_USER_LIMIT_PER_15_MINUTES,
        15 * 60,
      ),
    ])

    // AI Caching: Tạo mã băm từ câu hỏi để kiểm tra xem đã từng được trả lời chưa
    let promptHash: string | undefined
    if (taskPolicy.cacheable) {
      promptHash = await stableHash(JSON.stringify({
        cacheVersion: AI_CACHE_VERSION,
        prompt,
        responseType,
        task: task ?? 'legacy',
        maxOutputTokens: effectiveMaxOutputTokens,
        providerOrder: getProviderOrder(),
        geminiModels: getGeminiModels(),
        openAiModel: Deno.env.get('OPENAI_TEXT_MODEL') || 'gpt-5.6-sol',
      }))

      // Kiểm tra trong CSDL
      const { data: cacheData } = await admin
        .from('ai_responses_cache')
        .select('response_data, created_at')
        .eq('prompt_hash', promptHash)
        .maybeSingle()

      const cacheAgeMs = cacheData?.created_at
        ? Date.now() - new Date(cacheData.created_at).getTime()
        : Number.POSITIVE_INFINITY
      const cacheIsFresh = !taskPolicy.cacheTtlSeconds
        || cacheAgeMs <= taskPolicy.cacheTtlSeconds * 1000

      if (cacheData?.response_data && cacheIsFresh) {
        console.log('Phục vụ từ bộ nhớ đệm (Cache hit).')
        return jsonResponse(req, cacheData.response_data as Record<string, unknown>)
      }
    }

    // Nếu không có cache, gọi AI thật
    const responseText = await generateWithFallbacks(
      sanitizeText(prompt, 20_000),
      responseType,
      effectiveMaxOutputTokens,
    )
    const parsedResponse = parseAiResponse(responseText, responseType)

    // Lưu vào Cache cho các lần sau (lưu ngầm không cần await)
    if (taskPolicy.cacheable && promptHash) {
      const cacheWrite = Promise.resolve(
        admin.from('ai_responses_cache').upsert({
          prompt_hash: promptHash,
          response_type: responseType,
          response_data: parsedResponse,
          created_at: new Date().toISOString(),
        }, {
          onConflict: 'prompt_hash',
        }),
      ).then(({ error }) => {
        if (error) console.error('Lỗi khi lưu cache AI:', error.message)
      })

      const edgeRuntime = (globalThis as typeof globalThis & {
        EdgeRuntime?: { waitUntil: (promise: Promise<unknown>) => void }
      }).EdgeRuntime
      if (edgeRuntime?.waitUntil) {
        edgeRuntime.waitUntil(cacheWrite)
      } else {
        await cacheWrite
      }
    }

    return jsonResponse(req, parsedResponse)
  } catch (error) {
    return errorResponse(req, error)
  }
})
