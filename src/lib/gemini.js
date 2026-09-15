import { supabase } from './supabaseClient';
import {
  AppError,
  assertPayloadSize,
  checkClientRateLimit,
  toFriendlyFunctionError,
  validateTextInput,
} from './security';

const aiMemoCache = new Map();
const aiInflight = new Map();
const AI_MEMO_TTL_MS = 5 * 60 * 1000;
const AI_MEMO_MAX_ENTRIES = 100;

const memoizedAI = async (key, loader, ttlMs = AI_MEMO_TTL_MS) => {
  const now = Date.now();
  const cached = aiMemoCache.get(key);
  if (cached && cached.expiresAt > now) {
    aiMemoCache.delete(key);
    aiMemoCache.set(key, cached);
    return cached.value;
  }
  if (cached) aiMemoCache.delete(key);

  const existing = aiInflight.get(key);
  if (existing) return existing;

  const request = Promise.resolve()
    .then(loader)
    .then((value) => {
      if (value !== null && value !== undefined) {
        aiMemoCache.set(key, { value, expiresAt: Date.now() + ttlMs });
        while (aiMemoCache.size > AI_MEMO_MAX_ENTRIES) {
          aiMemoCache.delete(aiMemoCache.keys().next().value);
        }
      }
      return value;
    })
    .finally(() => aiInflight.delete(key));

  aiInflight.set(key, request);
  return request;
};

const invokeAI = async (body) => {
  const safeBody = {
    ...body,
    prompt: validateTextInput(body.prompt, 'Nội dung AI', 20_000),
  };

  if (safeBody.responseType) {
    if (!['text', 'json', 'stream'].includes(safeBody.responseType)) {
      safeBody.responseType = 'json';
    }
  }

  assertPayloadSize(safeBody);

  const rate = checkClientRateLimit('ai:assistant', 30, 60 * 1000);
  if (!rate.allowed) {
    throw new AppError(`Bạn gọi AI quá nhanh. Vui lòng thử lại sau ${rate.retryAfterSeconds} giây.`, 429);
  }

  const { data, error } = await supabase.functions.invoke('chat-gemini', {
    body: safeBody,
  });

  if (error) {
    throw await toFriendlyFunctionError(error, 'Không thể gọi AI lúc này. Vui lòng thử lại sau.');
  }

  if (data?.error) {
    throw new AppError(data.error);
  }

  return data;
};

// Stream version: fetches Edge Function and returns a ReadableStream reader
const invokeAIStream = async (body) => {
  const safeBody = {
    ...body,
    prompt: validateTextInput(body.prompt, 'Nội dung AI', 20_000),
    responseType: 'stream',
  };

  assertPayloadSize(safeBody);

  const rate = checkClientRateLimit('ai:assistant', 30, 60 * 1000);
  if (!rate.allowed) {
    throw new AppError(`Bạn gọi AI quá nhanh. Vui lòng thử lại sau ${rate.retryAfterSeconds} giây.`, 429);
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Get the current session token for auth
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token || supabaseAnonKey;

  const response = await fetch(`${supabaseUrl}/functions/v1/chat-gemini`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'apikey': supabaseAnonKey,
    },
    body: JSON.stringify(safeBody),
  });

  if (!response.ok || !response.body) {
    throw new AppError('Không thể kết nối AI. Vui lòng thử lại sau.', response.status);
  }

  return response.body.getReader();
};

export const evaluateTranslation = async (originalText, targetText, userTranslation, contextBefore = '', contextAfter = '', examType = 'IELTS/TOEIC') => {
  let criteria = '';
  if (examType.toUpperCase().includes('IELTS')) {
    criteria = 'Tiêu chí chấm: Task Achievement, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy.';
  } else if (examType.toUpperCase().includes('TOEIC')) {
    criteria = 'Tiêu chí chấm: Grammar, Vocabulary, Organization, và Relevance to the task.';
  } else {
    criteria = 'Tiêu chí chấm: Ngữ pháp và Từ vựng.';
  }

  const prompt = `Chấm điểm tiếng Anh (${examType}).
Nội dung gốc: "${targetText}"
Bài làm của học sinh: "${userTranslation}"
Tham khảo: "${originalText}"
Ngữ cảnh xung quanh (tùy chọn): "${contextBefore}" [...] "${contextAfter}"

Nhiệm vụ:
1. Cho điểm chính xác (accuracy) 0-100 dựa theo: ${criteria}
2. Nhận xét (tiếng Việt) CHUYÊN SÂU NHƯNG SÚC TÍCH (2-3 câu). Chỉ ra lỗi sai theo tiêu chí ${examType} hoặc khen ngợi.
3. 1 câu gợi ý (suggestion) hoàn chỉnh, tự nhiên nhất.

Trả về JSON thuần:
{"is_correct": boolean, "accuracy": number, "suggestion": "string", "feedback": "string"}`;

  try {
    const data = await invokeAI({
      task: 'writing_evaluate',
      prompt,
      responseType: 'json',
      maxOutputTokens: 1024,
    });
    return data;
  } catch (error) {
    console.error('Edge Function Error:', error);
    throw new Error(`Lỗi gọi AI (Edge Function): ${error.message || 'Không xác định'}`);
  }
};

export const chatSpeaking = async (scenarioTitle, scenarioDesc, partnerName, partnerRole, userMessage, history = [], level = "Intermediate", audioData = null) => {
  const normalizedUserMessage = String(userMessage || '').trim();
  const recentHistory = history
    .filter(msg => (msg.role === 'user' || msg.role === 'ai') && msg.content)
    .slice(-10);

  // Tránh gửi lặp câu mới nhất nếu caller đã thêm nó vào history.
  const lastMessage = recentHistory[recentHistory.length - 1];
  if (
    lastMessage?.role === 'user'
    && String(lastMessage.content).trim() === normalizedUserMessage
  ) {
    recentHistory.pop();
  }

  const historyText = recentHistory
    .map(msg => `${msg.role === 'user' ? 'User' : partnerName}: ${msg.content}`)
    .join('\n');

  const prompt = `You are ${partnerName}, ${partnerRole}.
You are NOT an AI assistant. You are a highly realistic, intelligent person having a real conversation. Stay perfectly in character at all times.

Scenario context: "${scenarioTitle}" — ${scenarioDesc}
(Note: In the scenario description, "You" refers to the HUMAN USER. You must play the role of ${partnerName}.)
Target English Level: ${level} (CEFR Level)

Conversation history:
${historyText || '(This is the start of the conversation.)'}

The user just said: "${audioData ? '[Audio message attached]' : userMessage}"

INSTRUCTIONS:
1. GOAL: Your ultimate goal is to fulfill the scenario described above. If the user goes off-topic, organically steer them back. If they say nonsense, react with natural confusion.
2. ADAPT YOUR VOCABULARY AND GRAMMAR to the ${level} level. 
   - If A1/A2/Basic: Use very simple words, short sentences, and speak warmly.
   - If B1/B2: Use intermediate vocabulary, some idioms, and moderate complexity.
   - If C1/C2: Use advanced vocabulary, complex sentence structures, sophisticated idioms, nuanced arguments, and a highly professional or academic tone if appropriate for the scenario. Challenge the user intellectually!
3. Keep it CONCISE: 1–3 sentences max. This is a spoken conversation, not an essay. Don't overwhelm the user with long speeches.
4. CONTINUATION: If the goal is not yet reached, drive the conversation forward by asking a relevant follow-up question, raising a counterpoint, or presenting a new angle.
5. ENDING: If the scenario goal is successfully achieved, or the user explicitly says goodbye, naturally end the conversation (e.g., "Have a great day", "Goodbye", "See you later"). Do NOT ask any more questions.
6. Use filler words occasionally if appropriate for the level ("Well,", "Hmm," for lower levels; "Indeed,", "Fascinating," for higher levels).
7. NEVER say you are an AI, a language model, or a chatbot. NEVER use bullet points.
8. DO NOT echo or parrot the user. Your spoken reply must be a natural RESPONSE to what the user said. ${audioData ? 'Put the exact audio transcription ONLY into the userTranscript field.' : ''}

Also suggest exactly 3 short phrases or sentence starters (2-5 words each) that the user could naturally say next.

Return ONLY valid JSON in this exact shape:
{"reply":"${partnerName}'s concise spoken reply","suggestions":["phrase 1","phrase 2","phrase 3"]${audioData ? ',"userTranscript":"exact transcription of user audio"' : ''},"isFinished":boolean}`;


  try {
    const data = await invokeAI({
      task: 'speaking_chat',
      prompt,
      responseType: 'json',
      maxOutputTokens: 1024,
      ...(audioData ? { inlineData: audioData } : {})
    });

    let parsed = data;
    if (typeof parsed === 'string') {
      parsed = JSON.parse(parsed.replace(/```json\n?|\n?```/g, '').trim());
    } else if (typeof parsed?.response === 'string') {
      parsed = JSON.parse(parsed.response.replace(/```json\n?|\n?```/g, '').trim());
    }

    const reply = typeof parsed?.reply === 'string' ? parsed.reply.trim() : '';
    if (!reply) throw new Error('Gemini did not return a speaking reply.');

    const suggestions = Array.isArray(parsed?.suggestions)
      ? parsed.suggestions
        .filter(item => typeof item === 'string' && item.trim())
        .map(item => item.trim())
        .slice(0, 3)
      : [];

    const userTranscript = typeof parsed?.userTranscript === 'string' ? parsed.userTranscript.trim() : '';
    const isFinished = parsed?.isFinished === true;

    return { reply, suggestions, userTranscript, isFinished };
  } catch (error) {
    console.error('Edge Function Error (Speaking):', error);
    throw new Error(`Failed to get AI response: ${error.message || 'Unknown'}`);
  }
};

/**
 * chatSpeakingStream
 * Streaming version of chatSpeaking.
 * @param {object} params
 * @param {function} params.onChunk - Called with each text chunk from the AI reply.
 * @param {function} params.onMeta - Called once with { suggestions, userTranscript } when META section arrives.
 * @param {function} params.onDone - Called when stream is fully complete.
 */
export const chatSpeakingStream = async ({
  scenarioTitle, scenarioDesc, partnerName, partnerRole,
  userMessage, history = [], level = 'Intermediate', audioData = null,
  onChunk, onMeta, onDone,
}) => {
  const normalizedUserMessage = String(userMessage || '').trim();
  const recentHistory = history
    .filter(msg => (msg.role === 'user' || msg.role === 'ai') && msg.content)
    .slice(-10);

  const lastMessage = recentHistory[recentHistory.length - 1];
  if (lastMessage?.role === 'user' && String(lastMessage.content).trim() === normalizedUserMessage) {
    recentHistory.pop();
  }

  const historyText = recentHistory
    .map(msg => `${msg.role === 'user' ? 'User' : partnerName}: ${msg.content}`)
    .join('\n');

  const prompt = `You are ${partnerName}, ${partnerRole}.
You are NOT an AI assistant. You are a real human with your own personality. Stay perfectly in character at all times.

Scenario context: "${scenarioTitle}" — ${scenarioDesc}
(Note: In the scenario description, "You" refers to the HUMAN USER. You must play the role of ${partnerName}.)
Target English Level: ${level} (CEFR Level)

Conversation history:
${historyText || '(This is the start of the conversation.)'}

The user just said: "${audioData ? '[Audio message attached — transcribe it]' : userMessage}"

INSTRUCTIONS:
1. GOAL: Your ultimate goal is to fulfill the scenario described above. If the user goes off-topic, organically steer them back. If they say nonsense, react with natural confusion.
2. ADAPT vocabulary to ${level} level. Keep it CONCISE (1-3 sentences max).
3. CONTINUATION: If the goal is not yet reached, drive the conversation forward with a follow-up question or statement.
4. ENDING: If the scenario goal is successfully achieved, or the user says goodbye, end the conversation naturally. Do NOT ask any more questions.
5. NEVER reveal you are an AI. NEVER use bullet points.
6. DO NOT echo or parrot the user. Your spoken reply must be a natural RESPONSE to what the user said. ${audioData ? 'Put the exact audio transcription ONLY into the userTranscript field.' : ''}

Format your response EXACTLY as follows (no markdown, no code blocks):
[Write your spoken reply here — plain English text only]
---META---
{"suggestions":["phrase 1","phrase 2","phrase 3"]${audioData ? ',"userTranscript":"exact transcription of user audio"' : ''},"isFinished":true/false}`;

  const reader = await invokeAIStream({
    task: 'speaking_chat',
    prompt,
    maxOutputTokens: 1024,
    ...(audioData ? { inlineData: audioData } : {}),
  });

  const decoder = new TextDecoder();
  let buffer = '';
  let metaFound = false;
  let replyText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    buffer += chunk;

    if (!metaFound) {
      const metaIdx = buffer.indexOf('---META---');
      if (metaIdx !== -1) {
        // Send the reply part
        const replyPart = buffer.slice(replyText.length, metaIdx);
        if (replyPart) {
          onChunk?.(replyPart);
          replyText += replyPart;
        }
        metaFound = true;
        // Parse META JSON from what's available so far (may be incomplete)
        buffer = buffer.slice(metaIdx + 10); // skip '---META---'
      } else {
        // Stream reply text incrementally
        const safeUpTo = buffer.length;
        const newChunk = buffer.slice(replyText.length, safeUpTo);
        if (newChunk) {
          onChunk?.(newChunk);
          replyText += newChunk;
        }
      }
    }
    // If metaFound: accumulate remaining buffer as JSON (don't emit to onChunk)
  }

  // Parse META
  if (metaFound && buffer.trim()) {
    try {
      const cleanJson = buffer.trim().replace(/```json/g, '').replace(/```/g, '').trim();
      const meta = JSON.parse(cleanJson);
      const suggestions = Array.isArray(meta.suggestions)
        ? meta.suggestions.filter(s => typeof s === 'string').slice(0, 3)
        : [];
      const userTranscript = typeof meta.userTranscript === 'string' ? meta.userTranscript.trim() : '';
      onMeta?.({ suggestions, userTranscript });
    } catch {
      onMeta?.({ suggestions: [], userTranscript: '' });
    }
  } else {
    onMeta?.({ suggestions: [], userTranscript: '' });
  }

  onDone?.();
};

export const translateText = async (text, targetLang = 'Vietnamese') => {
  const normalizedText = String(text || '').trim();
  const normalizedTarget = String(targetLang || 'Vietnamese').trim().toLowerCase();
  const cacheKey = `translate:${normalizedTarget}:${normalizedText}`;
  const prompt = `Translate the following English text to ${targetLang}. 
Keep the tone natural. If there are any notes in parentheses like (Tip: ...), translate them as well.
Return ONLY the translated text, nothing else.

Text to translate:
"${text}"`;

  try {
    return await memoizedAI(cacheKey, async () => {
      const data = await invokeAI({
        task: 'translate',
        prompt,
        responseType: 'text',
        maxOutputTokens: 2048,
      });
      return typeof data === 'object' && data.text ? data.text : (data.response || data);
    });
  } catch (error) {
    console.error('Edge Function Error (Translation):', error);
    return "Lỗi khi dịch. Vui lòng thử lại sau.";
  }
};

export const evaluateSpeaking = async (scenarioTitle, scenarioDesc, partnerName, history = []) => {
  const historyText = history
    .filter(msg => msg.role === 'user' || msg.role === 'ai')
    .map(msg => `${msg.role === 'user' ? 'User' : partnerName}: ${msg.content}`)
    .join('\n');

  const prompt = `You are an expert English teacher evaluating a student's speaking practice.

Scenario: "${scenarioTitle}" — ${scenarioDesc}

Conversation Transcript:
${historyText || '(No conversation took place)'}

Please evaluate the user's performance in this conversation. 
Consider grammar, vocabulary usage, naturalness, and how well they handled the scenario.

IMPORTANT: You must write the feedback, strengths, and improvements in BOTH English and Vietnamese, or mainly in Vietnamese so the learner can easily understand.

Return your evaluation as a JSON object with the following exact structure:
{
  "score": <number out of 100>,
  "feedback": "<A short paragraph of general feedback and encouragement (in Vietnamese)>",
  "strengths": ["<strength 1 (in Vietnamese)>", "<strength 2 (in Vietnamese)>"],
  "improvements": ["<area for improvement 1 (in Vietnamese)>", "<area for improvement 2 (in Vietnamese)>"]
}

Return ONLY valid JSON. No markdown formatting like \`\`\`json.`;

  try {
    const data = await invokeAI({
      task: 'speaking_evaluate',
      prompt,
      responseType: 'json',
      maxOutputTokens: 1536,
    });
    let parsedData = data;
    if (typeof data === 'string') {
      // Clean up markdown if any
      const cleaned = data.replace(/```json\n?|\n?```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    } else if (data.response) {
      const cleaned = data.response.replace(/```json\n?|\n?```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    return parsedData;
  } catch (error) {
    console.error('Error getting evaluation:', error);
    throw new Error('Failed to evaluate conversation.');
  }
};

export const lookupDictionaryWord = async (word) => {
  const normalizedWord = String(word || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const cacheKey = `dictionary:${normalizedWord}`;
  const prompt = `You are an English dictionary for Vietnamese learners. 
Lookup the word/phrase: "${word}".

IMPORTANT: If the inputted word "${word}" is in Vietnamese, FIRST translate it to the most common English equivalent, and then provide the dictionary lookup for that ENGLISH word. 
If it is already in English, just look it up directly.

Return a JSON object with the following exact structure:
{
  "word": "<The English word being looked up>",
  "phonetic": "<UK/US phonetic transcription, e.g. /æbˈzɒlv/>",
  "level": "<CEFR level e.g. A1, A2, B1, B2, C1, C2>",
  "partsOfSpeech": [
    {
      "type": "<Part of speech in Vietnamese e.g. Ngoại động từ, Danh từ>",
      "meanings": [
        {
          "definition": "<Meaning in Vietnamese>",
          "englishExample": "<An example sentence in English using the word>",
          "vietnameseExample": "<Translation of the example sentence>"
        }
      ]
    }
  ]
}

If the word is invalid, return a JSON object with an "error" field.
Return ONLY valid JSON. No markdown formatting like \`\`\`json.`;

  try {
    return await memoizedAI(cacheKey, async () => {
      const data = await invokeAI({
        task: 'dictionary_lookup',
        prompt,
        responseType: 'json',
        maxOutputTokens: 2048,
      });
      let parsedData = data;
      if (typeof data === 'string') {
        const cleaned = data.replace(/```json\n?|\n?```/g, '').trim();
        parsedData = JSON.parse(cleaned);
      } else if (data.response) {
        const cleaned = data.response.replace(/```json\n?|\n?```/g, '').trim();
        parsedData = JSON.parse(cleaned);
      }

      return parsedData;
    });
  } catch (error) {
    console.error('Error looking up word:', error);
    return null;
  }
};

const READING_BATCH_SIZE = 5;
const READING_BATCH_CONCURRENCY = 2;

const explainReadingMistakesBatch = async (passage, items = []) => {
  if (!Array.isArray(items) || items.length === 0) return [];

  const normalizedItems = items.map(item => ({
    id: item.id,
    question: item.question,
    options: Array.isArray(item.options) ? item.options : [],
    correctAnswer: item.correctAnswer,
    userAnswer: item.userAnswer,
  }));
  const serializedItems = JSON.stringify(normalizedItems);
  const promptPrefix = `Bạn là một giáo viên tiếng Anh xuất sắc. Hãy giải thích các câu đọc hiểu mà học sinh làm sai.

Với MỖI câu:
1. Giải thích bằng tiếng Việt tại sao đáp án học sinh chọn là sai dựa trên đoạn văn.
2. Giải thích tại sao đáp án đúng là đúng và chỉ ra thông tin liên quan trong đoạn văn.
3. Viết một đoạn ngắn gọn, dễ hiểu, thân thiện.

Các câu cần giải thích (JSON):
${serializedItems}

Trả về ONLY JSON hợp lệ theo cấu trúc:
{"explanations":[{"id":"giữ nguyên id đầu vào","explanation":"lời giải thích"}]}

Đoạn văn:
`;
  const availablePassageLength = 19_000 - promptPrefix.length;
  const passageText = String(passage || '');
  if (availablePassageLength < 1_000 || passageText.length > availablePassageLength) {
    throw new Error('Đoạn văn hoặc dữ liệu câu hỏi vượt quá giới hạn xử lý an toàn.');
  }

  const passageForPrompt = passageText;
  const prompt = `${promptPrefix}${passageForPrompt}`;
  const maxOutputTokens = Math.min(2048, Math.max(512, normalizedItems.length * 256 + 512));

  try {
    const data = await invokeAI({
      task: 'reading_explain',
      prompt,
      responseType: 'json',
      maxOutputTokens,
    });

    let parsed = data;
    if (typeof parsed === 'string') {
      parsed = JSON.parse(parsed.replace(/```json\n?|\n?```/g, '').trim());
    } else if (typeof parsed?.response === 'string') {
      parsed = JSON.parse(parsed.response.replace(/```json\n?|\n?```/g, '').trim());
    }

    const rawExplanations = Array.isArray(parsed) ? parsed : parsed?.explanations;
    if (!Array.isArray(rawExplanations)) {
      throw new Error('Gemini did not return reading explanations.');
    }

    const inputById = new Map(normalizedItems.map(item => [String(item.id), item.id]));
    const seenIds = new Set();
    return rawExplanations.reduce((results, item) => {
      const itemId = String(item?.id ?? '');
      if (
        !inputById.has(itemId)
        || seenIds.has(itemId)
        || typeof item?.explanation !== 'string'
        || !item.explanation.trim()
      ) {
        return results;
      }

      seenIds.add(itemId);
      results.push({
        id: inputById.get(itemId),
        explanation: item.explanation.trim(),
      });
      return results;
    }, []);
  } catch (error) {
    console.error('Edge Function Error (Explain Reading Batch):', error);
    throw new Error(`Không thể phân tích lỗi đọc hiểu: ${error.message || 'Không xác định'}`);
  }
};

export const explainReadingMistakes = async (passage, items = []) => {
  if (!Array.isArray(items) || items.length === 0) return [];

  const batches = [];
  for (let index = 0; index < items.length; index += READING_BATCH_SIZE) {
    batches.push(items.slice(index, index + READING_BATCH_SIZE));
  }

  const explanations = [];
  let firstError;
  for (let index = 0; index < batches.length; index += READING_BATCH_CONCURRENCY) {
    const group = batches.slice(index, index + READING_BATCH_CONCURRENCY);
    const groupResults = await Promise.allSettled(
      group.map(batch => explainReadingMistakesBatch(passage, batch))
    );
    const fulfilledResults = groupResults
      .filter(result => result.status === 'fulfilled')
      .flatMap(result => result.value);
    explanations.push(...fulfilledResults);
    firstError ||= groupResults.find(result => result.status === 'rejected')?.reason;
  }

  if (explanations.length === 0 && firstError) {
    throw firstError;
  }

  return explanations;
};

export const transcribeAudio = async (audioData) => {
  if (!audioData) return '';
  const prompt = `Please transcribe the following audio accurately in the language it was spoken (mostly English). Return ONLY the exact transcribed text. Do not add any extra comments or quotes.`;
  try {
    const data = await invokeAI({
      task: 'speaking_evaluate',
      prompt,
      responseType: 'text',
      maxOutputTokens: 512,
      inlineData: audioData,
    });
    return (typeof data === 'object' && data.text ? data.text : (data.response || data)).trim();
  } catch (error) {
    console.error('Edge Function Error (Transcribe):', error);
    return '';
  }
};

// Giữ API cũ cho các caller khác trong thời gian chuyển đổi sang batch.
export const explainReadingMistake = async (passage, question, options, correctAnswer, userAnswer) => {
  try {
    const [result] = await explainReadingMistakes(passage, [{
      id: 'single',
      question,
      options,
      correctAnswer,
      userAnswer,
    }]);
    return result?.explanation || 'Chưa thể tạo lời giải thích.';
  } catch {
    return 'Lỗi khi phân tích. Vui lòng thử lại sau.';
  }
};
