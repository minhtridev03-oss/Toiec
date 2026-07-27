import { supabase } from './supabaseClient';
import {
  AppError,
  assertPayloadSize,
  checkClientRateLimit,
  toFriendlyFunctionError,
  validateTextInput,
} from './security';

const invokeAI = async (body) => {
  const safeBody = {
    ...body,
    prompt: validateTextInput(body.prompt, 'Nội dung AI', 20_000),
  };

  if (safeBody.responseType) {
    safeBody.responseType = safeBody.responseType === 'text' ? 'text' : 'json';
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
    const data = await invokeAI({ prompt, responseType: 'json' });
    return data;
  } catch (error) {
    console.error('Edge Function Error:', error);
    throw new Error(`Lỗi gọi AI (Edge Function): ${error.message || 'Không xác định'}`);
  }
};

export const chatSpeaking = async (scenarioTitle, scenarioDesc, partnerName, partnerRole, userMessage, history = [], level = "Intermediate") => {
  const historyText = history.map(msg => `${msg.role === 'user' ? 'User' : msg.role === 'ai' ? partnerName : 'System'}: ${msg.content}`).join('\n');

  const prompt = `You are ${partnerName}, ${partnerRole}.
You are NOT an AI assistant. You are a highly realistic, intelligent person having a real conversation. Stay perfectly in character at all times.

Scenario: "${scenarioTitle}" — ${scenarioDesc}
Target English Level: ${level} (CEFR Level)

Conversation so far:
${historyText || '(This is the start of the conversation.)'}

The user just said: "${userMessage}"

How to respond:
1. Talk like a real person in this specific situation. Be extremely smart, context-aware, and emotionally intelligent. React naturally to the user's points (e.g., surprise, agreement, skepticism, professional negotiation).
2. ADAPT YOUR VOCABULARY AND GRAMMAR to the ${level} level. 
   - If A1/A2/Basic: Use very simple words, short sentences, and speak warmly.
   - If B1/B2: Use intermediate vocabulary, some idioms, and moderate complexity.
   - If C1/C2: Use advanced vocabulary, complex sentence structures, sophisticated idioms, nuanced arguments, and a highly professional or academic tone if appropriate for the scenario. Challenge the user intellectually!
3. Keep it CONCISE: 1–3 sentences max. This is a spoken conversation, not an essay. Don't overwhelm the user with long speeches.
4. Drive the conversation forward by asking a relevant follow-up question, raising a counterpoint, or presenting a new angle.
5. Use filler words occasionally if appropriate for the level ("Well,", "Hmm," for lower levels; "Indeed,", "Fascinating," for higher levels).
6. NEVER say you are an AI, a language model, or a chatbot. NEVER use bullet points.

Respond exactly as ${partnerName} would. Return ONLY your spoken line. No JSON, no quotes.`;

  try {
    const data = await invokeAI({ prompt, responseType: 'text' });
    return typeof data === 'object' && data.text ? data.text : (data.response || data);
  } catch (error) {
    console.error('Edge Function Error (Speaking):', error);
    throw new Error(`Failed to get AI response: ${error.message || 'Unknown'}`);
  }
};

export const getSpeakingSuggestions = async (scenarioTitle, scenarioDesc, partnerName, history = []) => {
  const historyText = history.map(msg => `${msg.role === 'user' ? 'User' : partnerName}: ${msg.content}`).join('\n');

  const prompt = `You are helping an English learner practice speaking.

Scenario: "${scenarioTitle}" — ${scenarioDesc}

Conversation so far:
${historyText || '(Conversation is about to start.)'}

Suggest exactly 3 short phrases or sentence starters (2-5 words each) that the user could naturally say next in this conversation.
They should be contextually appropriate, helpful for a learner, and varied.

Return ONLY a JSON array of 3 strings. Example: ["Nice to meet you", "Where are you from", "I work in"]
No markdown, no explanation.`;

  try {
    const data = await invokeAI({ prompt });
    // data should be parsed JSON array
    if (Array.isArray(data)) return data;
    if (typeof data === 'string') {
      try { return JSON.parse(data); } catch { return []; }
    }
    return [];
  } catch (error) {
    console.error('Error getting suggestions:', error);
    return [];
  }
};

export const translateText = async (text, targetLang = 'Vietnamese') => {
  const prompt = `Translate the following English text to ${targetLang}. 
Keep the tone natural. If there are any notes in parentheses like (Tip: ...), translate them as well.
Return ONLY the translated text, nothing else.

Text to translate:
"${text}"`;

  try {
    const data = await invokeAI({ prompt, responseType: 'text' });
    return typeof data === 'object' && data.text ? data.text : (data.response || data);
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
    const data = await invokeAI({ prompt, responseType: 'json' });
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
    const data = await invokeAI({ prompt, responseType: 'json' });
    let parsedData = data;
    if (typeof data === 'string') {
      const cleaned = data.replace(/```json\n?|\n?```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    } else if (data.response) {
      const cleaned = data.response.replace(/```json\n?|\n?```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    return parsedData;
  } catch (error) {
    console.error('Error looking up word:', error);
    return null;
  }
};

export const explainReadingMistake = async (passage, question, options, correctAnswer, userAnswer) => {
  const prompt = `Bạn là một giáo viên tiếng Anh xuất sắc.
Học sinh vừa làm sai một câu hỏi đọc hiểu (Reading Comprehension).

Đoạn văn (Passage):
"${passage}"

Câu hỏi: "${question}"
Các đáp án: ${options.map((opt, i) => `\n${String.fromCharCode(65 + i)}) ${opt}`).join('')}

Đáp án đúng: "${correctAnswer}"
Đáp án học sinh chọn (bị sai): "${userAnswer}"

Nhiệm vụ của bạn:
1. Giải thích (bằng tiếng Việt) tại sao đáp án học sinh chọn lại SAI dựa vào đoạn văn.
2. Giải thích tại sao đáp án đúng lại ĐÚNG, chỉ ra chính xác thông tin nằm ở đâu trong đoạn văn.
3. Giữ câu trả lời ngắn gọn, súc tích, dễ hiểu, thân thiện. Không được xuống dòng quá nhiều, viết thành 1 đoạn văn.

Trả về ONLY phần giải thích của bạn dưới dạng text thuần túy. KHÔNG dùng markdown \`\`\`json hoặc bất kỳ format nào khác.`;

  try {
    const data = await invokeAI({ prompt, responseType: 'text' });
    return typeof data === 'object' && data.text ? data.text : (data.response || data);
  } catch (error) {
    console.error('Edge Function Error (Explain Reading):', error);
    return "Lỗi khi phân tích. Vui lòng thử lại sau.";
  }
};
