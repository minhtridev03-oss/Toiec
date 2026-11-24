import { supabase } from './supabaseClient';
import { getShortMeaning } from '../utils/dictionaryParser';
import { lookupDictionaryWord } from './gemini';

const cache = new Map();
const CACHE_PREFIX = 't_qw_v4:';

function cleanPhoneticAndPos(rawPro) {
  if (!rawPro || typeof rawPro !== 'string') return { phonetic: '', pos: '' };
  const parts = rawPro.split('#;#');
  let phonetic = (parts[0] || '').replace(/[#;]+$/g, '').trim();
  let posRaw = parts[1] || '';

  const posMap = {
    n: 'danh từ',
    v: 'động từ',
    adj: 'tính từ',
    adv: 'trạng từ',
    prep: 'giới từ',
    conj: 'liên từ',
    pron: 'đại từ',
    int: 'thán từ'
  };

  const posList = posRaw.split(',').map((p) => p.trim().toLowerCase()).filter(Boolean);
  const posVi = posList.map((p) => posMap[p] || p).join(', ');

  return { phonetic, pos: posVi };
}

function cleanMeaning(rawMean) {
  if (!rawMean || typeof rawMean !== 'string') return '';
  if (rawMean.startsWith('CQkJ') || (rawMean.length > 200 && /^[A-Za-z0-9+/=\s]+$/.test(rawMean.trim()))) {
    return '';
  }
  let cleaned = rawMean
    .replace(/#+$/g, '')
    .replace(/#;#.*/g, '')
    .replace(/^@.*?\s+/g, '')
    .replace(/^-\s*/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned;
}

function getRootWord(mean) {
  if (!mean || typeof mean !== 'string') return '';
  let root = '';
  if (mean.startsWith('(xem)')) {
    root = mean.slice(5);
  } else if (mean.startsWith('@')) {
    root = mean.slice(1);
  }
  return root.trim().replace(/#+$/g, '').replace(/_/g, ' ');
}

export async function fetchQuickWord(rawWord, onPartial) {
  if (!rawWord) return null;
  const word = String(rawWord).replace(/[^a-zA-Z\s'-]/g, '').trim();
  if (!word) return null;
  const lower = word.toLowerCase();

  try {
    sessionStorage.removeItem(`qw:${lower}`);
    sessionStorage.removeItem(`t_qw_v3:${lower}`);
  } catch {}

  if (cache.has(lower)) {
    const cached = cache.get(lower);
    if (cached && cached.meaning && !cached.meaning.startsWith('CQkJ')) {
      return cached;
    }
  }

  try {
    const sessionItem = sessionStorage.getItem(`${CACHE_PREFIX}${lower}`);
    if (sessionItem) {
      const parsed = JSON.parse(sessionItem);
      if (parsed && parsed.meaning && !parsed.meaning.startsWith('CQkJ')) {
        cache.set(lower, parsed);
        return parsed;
      }
    }
  } catch {}

  let finalResult = null;

  try {
    const { data, error } = await supabase
      .from('vocabularies')
      .select('id, word, pro, mean, av')
      .ilike('word', lower)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      let foundData = data;
      const root = getRootWord(data.mean);
      if (root && !data.av) {
        const { data: rootData } = await supabase
          .from('vocabularies')
          .select('id, word, pro, mean, av')
          .ilike('word', root)
          .limit(1)
          .maybeSingle();

        if (rootData) {
          foundData = {
            ...rootData,
            word: data.word,
            pro: data.pro || rootData.pro,
            _inflected: true
          };
        }
      }

      const { phonetic, pos } = cleanPhoneticAndPos(foundData.pro);
      let meaning = cleanMeaning(foundData.mean);
      if (!meaning) {
        meaning = getShortMeaning(foundData);
        if (meaning && (meaning.startsWith('CQkJ') || /^[A-Za-z0-9+/=\s]{50,}$/.test(meaning.trim()))) {
          meaning = '';
        }
      }

      if (meaning) {
        const fullMeaning = pos ? `[${pos}] ${meaning}` : meaning;
        finalResult = {
          word: foundData.word || word,
          phonetic: phonetic,
          meaning: fullMeaning,
          source: 'database'
        };
        onPartial?.(finalResult);
      }
    }
  } catch (err) {
    console.warn('DB lookup error:', err);
  }

  try {
    const aiPromise = lookupDictionaryWord(word);
    if (!finalResult || !finalResult.meaning) {
      const aiData = await aiPromise;
      if (aiData && aiData.word && !aiData.error) {
        const primaryMeaning = aiData.partsOfSpeech?.[0]?.meanings?.[0]?.definition || '';
        const partType = aiData.partsOfSpeech?.[0]?.type || '';
        const fullMeaning = partType ? `[${partType}] ${primaryMeaning}` : primaryMeaning;
        finalResult = {
          word: aiData.word,
          phonetic: aiData.phonetic || finalResult?.phonetic || '',
          meaning: fullMeaning,
          example: aiData.partsOfSpeech?.[0]?.meanings?.[0]?.englishExample || '',
          source: 'ai'
        };
      }
    } else {
      aiPromise.then((aiData) => {
        if (aiData && aiData.word && !aiData.error) {
          const example = aiData.partsOfSpeech?.[0]?.meanings?.[0]?.englishExample || '';
          if (example) {
            const enriched = { ...finalResult, example };
            cache.set(lower, enriched);
            onPartial?.(enriched);
            try {
              sessionStorage.setItem(`${CACHE_PREFIX}${lower}`, JSON.stringify(enriched));
            } catch {}
          }
        }
      }).catch(() => {});
    }
  } catch (aiErr) {
    console.warn('AI lookup error:', aiErr);
  }

  if (!finalResult) {
    finalResult = {
      word: word,
      phonetic: '',
      meaning: '',
      source: 'fallback'
    };
  }

  if (finalResult.meaning && !finalResult.meaning.startsWith('CQkJ')) {
    cache.set(lower, finalResult);
    try {
      sessionStorage.setItem(`${CACHE_PREFIX}${lower}`, JSON.stringify(finalResult));
    } catch {}
  }

  return finalResult;
}
