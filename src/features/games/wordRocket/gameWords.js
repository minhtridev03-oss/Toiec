import { fetchLearnedPracticeWords, fetchLearnedVocabularyWords } from '../../../lib/api';
import { supabase } from '../../../lib/supabaseClient';
import { getShortMeaning } from '../../../utils/dictionaryParser';
import { shuffleGameWords } from './gameConfig';

const formatWord = (item, source = 'learned', extra = {}) => {
  const word = String(item?.word || '').trim();
  const rawMeaning = String(getShortMeaning(item) || item?.meaning || item?.mean || '').trim();
  if (!word || !rawMeaning || word.length > 40 || !/[a-z]/i.test(word)) return null;

  return {
    id: item.id ? `${source}-${item.id}` : `word-${word.toLowerCase()}`,
    rawId: item.id,
    word,
    meaning: rawMeaning.length > 240 ? `${rawMeaning.slice(0, 237)}…` : rawMeaning,
    pronunciation: item.pro || item.phonetic || item.ipa || '',
    source,
    sub_category_id: item.sub_category_id,
    topicName: extra.topicName || '',
  };
};

export async function fetchWordRocketWords(userId) {
  if (!userId) return [];
  const learnedRows = await fetchLearnedVocabularyWords(userId);
  return shuffleGameWords(learnedRows.map((row) => formatWord(row, 'learned')).filter(Boolean));
}

export async function fetchUnifiedGameData(userId) {
  if (!userId) {
    return { allWords: [], personalWords: [], topics: [] };
  }

  try {
    const [{ words: topicWords = [], topics = [] }, personalRes] = await Promise.all([
      fetchLearnedPracticeWords(userId),
      supabase
        .from('user_vocabulary')
        .select('*')
        .eq('user_id', userId)
        .eq('is_learned', true)
        .order('created_at', { ascending: false }),
    ]);

    const topicMap = new Map();
    topics.forEach((top) => {
      top.subCategories?.forEach((sub) => {
        topicMap.set(sub.id, `${top.name} · ${sub.name}`);
      });
    });

    const formattedTopicWords = (topicWords || [])
      .map((item) => formatWord(item, 'topic', { topicName: topicMap.get(item.sub_category_id) }))
      .filter(Boolean);

    const formattedPersonalWords = (personalRes.data || [])
      .map((item) => formatWord(item, 'personal', { topicName: 'Sổ từ cá nhân' }))
      .filter(Boolean);

    // Merge unique words by lowercase word
    const uniqueMap = new Map();
    formattedPersonalWords.forEach((item) => uniqueMap.set(item.word.toLowerCase(), item));
    formattedTopicWords.forEach((item) => {
      if (!uniqueMap.has(item.word.toLowerCase())) {
        uniqueMap.set(item.word.toLowerCase(), item);
      }
    });

    const allWords = shuffleGameWords([...uniqueMap.values()]);

    return {
      allWords,
      personalWords: formattedPersonalWords,
      topics: (topics || []).filter((t) => t.word_count > 0 || (t.subCategories && t.subCategories.length > 0)),
    };
  } catch (err) {
    console.error('fetchUnifiedGameData error:', err);
    // Fallback to basic learned words
    const fallbackWords = await fetchWordRocketWords(userId);
    return {
      allWords: fallbackWords,
      personalWords: [],
      topics: [],
    };
  }
}
