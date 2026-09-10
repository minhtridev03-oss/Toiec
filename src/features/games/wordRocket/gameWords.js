import { fetchLearnedVocabularyWords } from '../../../lib/api';
import { getShortMeaning } from '../../../utils/dictionaryParser';
import { shuffleGameWords } from './gameConfig';

const formatWord = (item) => {
  const word = String(item?.word || '').trim();
  const meaning = String(getShortMeaning(item) || item?.mean || '').trim();
  if (!word || !meaning || word.length > 40 || !/[a-z]/i.test(word)) return null;

  return {
    id: `learned-${item.id || word}`,
    word,
    meaning: meaning.length > 240 ? `${meaning.slice(0, 237)}…` : meaning,
    pronunciation: item.pro || '',
    source: 'learned',
  };
};

export async function fetchWordRocketWords(userId) {
  if (!userId) return [];

  const learnedRows = await fetchLearnedVocabularyWords(userId);
  return shuffleGameWords(learnedRows.map(formatWord).filter(Boolean));
}
