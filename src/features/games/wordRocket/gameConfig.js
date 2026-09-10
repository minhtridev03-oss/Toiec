export const WORDS_PER_GAME = 20;
export const STARTING_LIVES = 3;
export const CORRECT_TRANSITION_MS = 980;
export const MISSED_TRANSITION_MS = 850;

export const DIFFICULTIES = [
  {
    id: 'easy',
    startFallSeconds: 17,
    endFallSeconds: 11.5,
    scoreMultiplier: 1,
    labels: { vi: 'Dễ', en: 'Easy' },
    descriptions: { vi: 'Thư giãn, phù hợp để làm quen', en: 'Relaxed pace for warming up' },
  },
  {
    id: 'normal',
    startFallSeconds: 13,
    endFallSeconds: 8.5,
    scoreMultiplier: 1.25,
    labels: { vi: 'Vừa', en: 'Normal' },
    descriptions: { vi: 'Cân bằng giữa học và thử thách', en: 'Balanced learning and challenge' },
  },
  {
    id: 'hard',
    startFallSeconds: 10,
    endFallSeconds: 6.25,
    scoreMultiplier: 1.6,
    labels: { vi: 'Khó', en: 'Hard' },
    descriptions: { vi: 'Nhanh hơn, điểm thưởng cao hơn', en: 'Faster words and higher rewards' },
  },
];

export const getWordFallSeconds = ({ difficultyId, currentIndex = 0, totalWords = WORDS_PER_GAME }) => {
  const difficulty = DIFFICULTIES.find((item) => item.id === difficultyId) || DIFFICULTIES[1];
  const safeTotal = Math.max(1, totalWords);
  const progress = safeTotal <= 1
    ? 0
    : Math.min(1, Math.max(0, currentIndex / (safeTotal - 1)));

  return Number((
    difficulty.startFallSeconds
    + ((difficulty.endFallSeconds - difficulty.startFallSeconds) * progress)
  ).toFixed(2));
};

export const getTargetLanePercent = ({ sessionId = 0, currentIndex = 0 } = {}) => {
  const safeSessionId = Number.isFinite(Number(sessionId)) ? Math.trunc(Number(sessionId)) : 0;
  const safeCurrentIndex = Number.isFinite(Number(currentIndex)) ? Math.trunc(Number(currentIndex)) : 0;

  // Mix the two stable round identifiers into a deterministic unsigned 32-bit value.
  let hash = Math.imul(safeSessionId + 1, 0x9e3779b1)
    ^ Math.imul(safeCurrentIndex + 1, 0x85ebca77);
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;

  const ratio = (hash >>> 0) / 0xffffffff;
  return Number((20 + (ratio * 60)).toFixed(2));
};

export const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

export const normalizeGameAnswer = (value = '') => (
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
);

export const shuffleGameWords = (items) => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
};

export const buildGameRound = (items, count = WORDS_PER_GAME) => {
  const uniqueWords = new Map();
  items.forEach((item) => {
    const key = normalizeGameAnswer(item.word);
    if (key && item.meaning && !uniqueWords.has(key)) uniqueWords.set(key, item);
  });
  return shuffleGameWords([...uniqueWords.values()]).slice(0, Math.min(count, uniqueWords.size));
};

export const calculateWordScore = ({ combo, difficulty, usedHint }) => {
  const multiplier = DIFFICULTIES.find((item) => item.id === difficulty)?.scoreMultiplier || 1;
  const comboBonus = Math.min(combo, 10) * 12;
  const hintPenalty = usedHint ? 35 : 0;
  return Math.max(25, Math.round((100 + comboBonus - hintPenalty) * multiplier));
};

export const buildWordHint = (word = '', revealCount = 1) => {
  let revealed = 0;
  return [...word].map((character) => {
    if (!/[a-z]/i.test(character)) return character;
    if (revealed < revealCount) {
      revealed += 1;
      return character.toUpperCase();
    }
    return '_';
  }).join(' ');
};
