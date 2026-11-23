import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Eye,
  Home,
  Keyboard,
  ListChecks,
  Loader2,
  RotateCcw,
  Search,
  Send,
  Shuffle,
  Trophy,
  Volume2,
  XCircle,
  Sparkles,
  Flame,
  Zap,
  Bookmark,
  Layers,
  Target,
  Brain,
  Headphones,
  Repeat,
  PenTool,
  Mic,
  FileText,
} from 'lucide-react';
import SkillSwitchTabs from '../components/navigation/SkillSwitchTabs';
import { playWordAudio } from '../lib/audioService';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { fetchLearnedPracticeWords } from '../lib/api';
import { supabase } from '../lib/supabaseClient';
import { usePracticeSessionTimer } from '../lib/practiceActivity';
import { praiseLearningBot } from '../lib/learningBot';
import { getShortMeaning } from '../utils/dictionaryParser';

const WORDS_PER_ROUND = 10;

const PAIR_COLORS = [
  { bg: 'bg-emerald-500/15', border: 'border-emerald-500', text: 'text-emerald-700 dark:text-emerald-300' },
  { bg: 'bg-blue-500/15', border: 'border-blue-500', text: 'text-blue-700 dark:text-blue-300' },
  { bg: 'bg-indigo-500/15', border: 'border-indigo-500', text: 'text-indigo-700 dark:text-indigo-300' },
  { bg: 'bg-cyan-500/15', border: 'border-cyan-500', text: 'text-cyan-700 dark:text-cyan-300' },
  { bg: 'bg-teal-500/15', border: 'border-teal-500', text: 'text-teal-700 dark:text-teal-300' },
  { bg: 'bg-purple-500/15', border: 'border-purple-500', text: 'text-purple-700 dark:text-purple-300' },
  { bg: 'bg-amber-500/15', border: 'border-amber-500', text: 'text-amber-700 dark:text-amber-300' },
  { bg: 'bg-rose-500/15', border: 'border-rose-500', text: 'text-rose-700 dark:text-rose-300' },
  { bg: 'bg-sky-500/15', border: 'border-sky-500', text: 'text-sky-700 dark:text-sky-300' },
  { bg: 'bg-violet-500/15', border: 'border-violet-500', text: 'text-violet-700 dark:text-violet-300' },
];

const PRACTICE_MODES = [
  {
    id: 'matching',
    labels: {
      vi: {
        title: 'Nối ghép từ',
        subtitle: 'Ghép từ tiếng Anh với nghĩa tiếng Việt tương ứng. Rèn luyện phản xạ nhận diện từ vựng siêu tốc.',
      },
      en: {
        title: 'Word Matching',
        subtitle: 'Match English words with their correct Vietnamese meanings. Boost rapid word recognition reflex.',
      },
    },
    Icon: ListChecks,
    gradient: 'from-blue-600 via-indigo-600 to-cyan-600',
    iconBg: 'bg-blue-500/15 dark:bg-cyan-500/20 text-blue-600 dark:text-cyan-400',
    tags: ['⚡ Phản xạ siêu tốc', '10 cặp từ / lượt', 'Tương tác nối đôi'],
  },
  {
    id: 'meaning',
    labels: {
      vi: {
        title: 'Nhập lại từ',
        subtitle: 'Nhìn nghĩa tiếng Việt và gõ lại chuẩn xác từ tiếng Anh. Rèn luyện chính tả và ghi nhớ từ sâu.',
      },
      en: {
        title: 'Type the Word',
        subtitle: 'Recall and type the English word from its meaning. Master exact spelling and deep memory retention.',
      },
    },
    Icon: Keyboard,
    gradient: 'from-indigo-600 via-blue-600 to-cyan-600',
    iconBg: 'bg-indigo-500/15 dark:bg-blue-500/20 text-indigo-600 dark:text-cyan-400',
    tags: ['✍️ Chuẩn chính tả', 'Phát âm bản xứ', 'Thử thách trí nhớ'],
  },
];

const SKILL_PRACTICE_HUBS = [
  {
    id: 'dictation',
    to: '/dictation',
    title: 'Luyện Nghe Chép Chính Tả',
    subtitle: 'Rèn đôi tai bắt trọn từng âm tiết, ngữ điệu và chuẩn chính tả qua video thực tế.',
    icon: Headphones,
    iconBg: 'bg-indigo-500/15 text-indigo-600 dark:text-cyan-400',
    borderGlow: 'hover:border-indigo-500/50 hover:shadow-indigo-500/10',
    stats: '481 bài nghe',
    badge: 'Kỹ Năng Nghe',
    tags: ['🎧 Video thực tế', 'Chuẩn âm điệu', 'A1 - C2'],
  },
  {
    id: 'shadowing',
    to: '/shadowing',
    title: 'Luyện Nghe Nhại (Shadowing)',
    subtitle: 'Nhại giọng người bản xứ, tinh chỉnh phát âm, luyến láy và phản xạ tự nhiên.',
    icon: Repeat,
    iconBg: 'bg-rose-500/15 text-rose-600 dark:text-pink-400',
    borderGlow: 'hover:border-rose-500/50 hover:shadow-rose-500/10',
    stats: 'Phòng thu âm',
    badge: 'Kỹ Năng Nói',
    tags: ['🗣️ Thu âm & So sánh', 'Khẩu hình bản xứ', 'Phản xạ nói'],
  },
  {
    id: 'writing',
    to: '/writing',
    title: 'Luyện Viết Câu (Writing)',
    subtitle: 'Dịch câu thực tế, rèn cấu trúc ngữ pháp với Trợ lý AI chấm chữa và sửa lỗi tức thì.',
    icon: PenTool,
    iconBg: 'bg-blue-500/15 text-blue-600 dark:text-cyan-400',
    borderGlow: 'hover:border-blue-500/50 hover:shadow-blue-500/10',
    stats: 'Chấm điểm AI',
    badge: 'Kỹ Năng Viết',
    tags: ['✍️ Dịch câu chuẩn', 'AI chấm chi tiết', '30+ Chủ đề'],
  },
  {
    id: 'reading',
    to: '/reading',
    title: 'Luyện Đọc Hiểu (Reading)',
    subtitle: 'Đọc hiểu văn bản TOEIC thương mại song ngữ, tra từ vựng 1 chạm trực tiếp trong bài.',
    icon: BookOpen,
    iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    borderGlow: 'hover:border-emerald-500/50 hover:shadow-emerald-500/10',
    stats: 'Song ngữ thông minh',
    badge: 'Kỹ Năng Đọc',
    tags: ['📖 Đọc hiểu TOEIC', 'Tra từ 1 chạm', 'Part 5, 6, 7'],
  },
  {
    id: 'speaking',
    to: '/speaking',
    title: 'Luyện Nói Phản Xạ',
    subtitle: 'Luyện phát âm từng từ, nói câu phản xạ và kiểm tra độ chính xác khẩu hình người học.',
    icon: Mic,
    iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    borderGlow: 'hover:border-amber-500/50 hover:shadow-amber-500/10',
    stats: 'Nhận diện giọng nói',
    badge: 'Giao Tiếp',
    tags: ['🎙️ Nhận diện AI', 'Sửa phát âm', 'Giao tiếp thực'],
  },
  {
    id: 'tenses',
    to: '/tenses',
    title: '12 Thì Ngữ Pháp',
    subtitle: 'Nắm trọn bản chất 12 thì tiếng Anh, sơ đồ tư duy thời gian và bài tập trắc nghiệm trọng tâm.',
    icon: FileText,
    iconBg: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    borderGlow: 'hover:border-violet-500/50 hover:shadow-violet-500/10',
    stats: 'Lý thuyết & Bài tập',
    badge: 'Ngữ Pháp',
    tags: ['📐 Trọng tâm TOEIC', 'Sơ đồ thì', 'Trắc nghiệm phản xạ'],
  },
];

const COPY = {
  vi: {
    heroBadge: 'Practice Arena • Đấu trường ôn luyện từ vựng',
    noMeaning: 'Chưa có nghĩa',
    loadError: 'Không thể tải dữ liệu ôn luyện. Vui lòng thử lại.',
    error: 'Có lỗi xảy ra',
    reload: 'Tải lại',
    noWords: 'Chưa có từ đã học',
    noWordsCopy: 'Đánh dấu một vài từ là đã học rồi quay lại ôn luyện.',
    goVocabulary: 'Đi đến kho từ vựng',
    practice: 'Luyện tập tổng hợp',
    chooseMode: 'Chọn kiểu ôn luyện',
    ready: (count) => `${count} từ đã học sẵn sàng để ôn lại.`,
    changeMode: 'Đổi kiểu ôn',
    chooseScope: 'Chọn phạm vi ôn luyện',
    searchTopic: 'Tìm chủ đề...',
    allLearned: 'Tất cả từ đã học',
    reviewAll: 'Ôn tất cả từ đã học',
    learnedWords: (count) => `${count} từ đã học`,
    noTopic: 'Không tìm thấy chủ đề phù hợp.',
    changeScope: 'Đổi phạm vi',
    submit: 'Nộp đáp án & Xem kết quả',
    english: 'Từ tiếng Anh',
    vietnamese: 'Nghĩa tiếng Việt',
    hear: 'Nghe phát âm',
    inputMeaning: 'Nhập từ tiếng Anh...',
    savedMeaning: 'Từ tiếng Anh',
    reveal: 'Hiện đáp án',
    check: 'Kiểm tra',
    continue: 'Tiếp tục',
    complete: 'Hoàn thành lượt ôn!',
    totalWords: 'Tổng số từ',
    correct: 'Đúng',
    incorrect: 'Chưa đúng',
    result: 'Độ chính xác',
    retryRound: 'Ôn lại lượt này',
    nextRound: 'Lượt tiếp theo',
    finishedScope: 'Đã hoàn thành toàn bộ phạm vi này',
    home: 'Về trang chủ',
    quickStartTitle: 'Ôn nhanh 1 click',
    quickStartDesc: 'Bắt đầu ngay một lượt ôn tập toàn bộ từ vựng mà không cần qua nhiều bước:',
    myPersonalVocab: 'Sổ tay từ vựng của tôi',
    spacedRepetitionTip: 'Phương pháp lặp lại ngắt quãng (Spaced Repetition) giúp củng cố trí nhớ dài hạn và phản xạ ngôn ngữ tự nhiên.',
  },
  en: {
    heroBadge: 'Practice Arena • Vocabulary Review Hub',
    noMeaning: 'No meaning yet',
    loadError: 'Could not load practice data. Please try again.',
    error: 'An error occurred',
    reload: 'Reload',
    noWords: 'No learned words',
    noWordsCopy: 'Mark some words as learned and come back to practice.',
    goVocabulary: 'Go to vocabulary',
    practice: 'Comprehensive Practice',
    chooseMode: 'Choose Practice Mode',
    ready: (count) => `${count} learned words are ready for review.`,
    changeMode: 'Change mode',
    chooseScope: 'Choose Practice Scope',
    searchTopic: 'Search topics...',
    allLearned: 'All learned words',
    reviewAll: 'Review all learned words',
    learnedWords: (count) => `${count} learned words`,
    noTopic: 'No matching topics found.',
    changeScope: 'Change scope',
    submit: 'Submit & View Results',
    english: 'English Word',
    vietnamese: 'Vietnamese Meaning',
    hear: 'Play pronunciation',
    inputMeaning: 'Type the English word...',
    savedMeaning: 'The word',
    reveal: 'Show answer',
    check: 'Check',
    continue: 'Continue',
    complete: 'Round Completed!',
    totalWords: 'Total Words',
    correct: 'Correct',
    incorrect: 'Incorrect',
    result: 'Accuracy',
    retryRound: 'Review this round again',
    nextRound: 'Next round',
    finishedScope: 'You have finished this whole scope',
    home: 'Back to Dashboard',
    quickStartTitle: 'Quick Start Review',
    quickStartDesc: 'Pick a popular option to begin your review session immediately:',
    myPersonalVocab: 'My Personal Vocabulary',
    spacedRepetitionTip: 'Spaced repetition helps lock new vocabulary into long-term memory for effortless recall.',
  },
};

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const normalizeAnswer = (value = '') =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const isMeaningAnswerCorrect = (answer, meaning) => {
  const normalizedAnswer = normalizeAnswer(answer);
  if (normalizedAnswer.length < 2) return false;
  const normalizedMeaning = normalizeAnswer(meaning);
  if (!normalizedMeaning) return false;
  if (normalizedAnswer === normalizedMeaning) return true;
  const candidates = meaning
    .split(/[;,/()]+|\s+-\s+/)
    .map((part) => normalizeAnswer(part))
    .filter((part) => part.length >= 2);
  return candidates.some((candidate) => {
    if (candidate === normalizedAnswer) return true;
    if (candidate.length < 3 || normalizedAnswer.length < 3) return false;
    return candidate.includes(normalizedAnswer) || normalizedAnswer.includes(candidate);
  });
};

const formatPracticeWord = (word, fallbackMeaning) => ({
  ...word,
  meaning: getShortMeaning(word) || word.mean || fallbackMeaning,
});

const pickRound = (items) => shuffleArray(items).slice(0, Math.min(WORDS_PER_ROUND, items.length));

export default function Practice() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const navigate = useNavigate();
  const text = COPY[locale] || COPY.vi;
  const noMeaning = text.noMeaning;
  const loadError = text.loadError;

  const [screen, setScreen] = useState('mode');
  const [selectedMode, setSelectedMode] = useState(null);
  const [selectedScope, setSelectedScope] = useState(null);
  const [scopeQuery, setScopeQuery] = useState('');

  const [practicePool, setPracticePool] = useState([]);
  const [usedWordIds, setUsedWordIds] = useState([]);
  const [currentRoundItems, setCurrentRoundItems] = useState([]);
  const [leftItems, setLeftItems] = useState([]);
  const [rightItems, setRightItems] = useState([]);
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [selectedRight, setSelectedRight] = useState(null);
  const [links, setLinks] = useState([]);
  const [availableColors, setAvailableColors] = useState([...Array(WORDS_PER_ROUND).keys()]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [typingInput, setTypingInput] = useState('');
  const [typingFeedback, setTypingFeedback] = useState(null);
  const [typingAnswers, setTypingAnswers] = useState({});

  const fetchPracticeData = async () => {
    if (!user) throw new Error('Missing user');
    const [data, personalData] = await Promise.all([
      fetchLearnedPracticeWords(user.id),
      supabase
        .from('user_vocabulary')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_learned', true)
        .order('created_at', { ascending: false }),
    ]);

    const personalWords = (personalData.data || [])
      .filter((w) => w.word && w.meaning)
      .map((w) => ({
        id: `pv_${w.id}`,
        word: w.word,
        meaning: w.meaning,
        pro: w.phonetic || '',
        example: w.example_sentence || '',
      }));

    const formattedById = new Map();
    const formattedWords = (data.words || [])
      .map((word) => {
        const formatted = formatPracticeWord(word, noMeaning);
        formattedById.set(formatted.id, formatted);
        return formatted;
      })
      .filter((word) => word.id && word.word);

    const formattedTopics = (data.topics || [])
      .map((topic) => ({
        ...topic,
        words: (topic.words || [])
          .map((word) => formattedById.get(word.id) || formatPracticeWord(word, noMeaning))
          .filter((word) => word.id && word.word),
      }))
      .filter((topic) => topic.words.length > 0);

    return {
      learnedWords: formattedWords,
      topics: formattedTopics,
      personalVocabWords: personalWords,
    };
  };

  const { data, error: swrError, isLoading } = useSWR(
    user ? `practice_data_${user.id}` : null,
    fetchPracticeData,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      keepPreviousData: true,
      dedupingInterval: 60000,
    }
  );

  const learnedWords = data?.learnedWords || [];
  const topics = data?.topics || [];
  const personalVocabWords = data?.personalVocabWords || [];
  const loading = isLoading && !data;
  const error = swrError ? loadError : null;

  usePracticeSessionTimer(
    'vocabulary',
    user,
    screen !== 'mode' && (learnedWords?.length > 0 || personalVocabWords?.length > 0)
  );

  const modeConfig = PRACTICE_MODES.find((mode) => mode.id === selectedMode);
  const allMatched = selectedMode === 'matching' && leftItems.length > 0 && links.length === leftItems.length;
  const matchedCount = links.length;
  const currentTypingWord = currentRoundItems[currentWordIndex];
  const remainingWords = practicePool.filter((word) => !usedWordIds.includes(word.id));
  const canStartNextRound = remainingWords.length > 0;

  const filteredTopics = useMemo(() => {
    const query = scopeQuery.trim().toLowerCase();
    if (!query) return topics;
    return topics.filter((topic) =>
      `${topic.categoryName || ''} ${topic.name || ''}`.toLowerCase().includes(query)
    );
  }, [topics, scopeQuery]);

  const resetRoundState = () => {
    setLinks([]);
    setSelectedLeft(null);
    setSelectedRight(null);
    setAvailableColors([...Array(WORDS_PER_ROUND).keys()]);
    setCurrentWordIndex(0);
    setTypingInput('');
    setTypingFeedback(null);
    setTypingAnswers({});
  };

  const resetLinks = () => {
    setLinks([]);
    setSelectedLeft(null);
    setSelectedRight(null);
    setAvailableColors([...Array(WORDS_PER_ROUND).keys()]);
  };

  const beginRound = (items, options = {}) => {
    const roundItems = items.slice(0, WORDS_PER_ROUND);
    resetRoundState();
    setCurrentRoundItems(roundItems);
    const activeMode = options.mode || selectedMode;
    if (activeMode === 'matching') {
      setLeftItems(shuffleArray(roundItems));
      setRightItems(shuffleArray(roundItems));
    } else {
      setLeftItems([]);
      setRightItems([]);
    }
    const roundIds = roundItems.map((word) => word.id);
    if (options.resetUsed) {
      setUsedWordIds(roundIds);
    } else if (options.appendUsed) {
      setUsedWordIds((prev) => [...new Set([...prev, ...roundIds])]);
    }
    setScreen('playing');
  };

  const chooseMode = (modeId) => {
    setSelectedMode(modeId);
    setSelectedScope(null);
    setPracticePool([]);
    setUsedWordIds([]);
    setCurrentRoundItems([]);
    setScopeQuery('');
    resetRoundState();
    setScreen('scope');
  };

  const chooseScope = (scope) => {
    const pool = scope.type === 'all' ? [...learnedWords, ...personalVocabWords] : scope.words;
    if (pool.length === 0) return;
    setSelectedScope(scope);
    setPracticePool(pool);
    beginRound(pickRound(pool), { resetUsed: true });
  };

  const quickStartScope = (modeId) => {
    const pool = [...learnedWords, ...personalVocabWords];
    if (pool.length === 0) return;
    setSelectedMode(modeId);
    const scope = {
      type: 'all',
      id: 'all',
      name: text.allLearned,
      categoryName: 'Practice',
      words: pool,
    };
    setSelectedScope(scope);
    setPracticePool(pool);
    beginRound(pickRound(pool), { resetUsed: true, mode: modeId });
  };

  const retryCurrentRound = () => {
    beginRound(currentRoundItems);
  };

  const startNextRound = () => {
    if (!canStartNextRound) return;
    beginRound(pickRound(remainingWords), { appendUsed: true });
  };

  const backToScope = () => {
    setScreen('scope');
    setCurrentRoundItems([]);
    setPracticePool([]);
    setUsedWordIds([]);
    resetRoundState();
  };

  const speakWord = (word) => {
    if (!word) return;
    const text = typeof word === 'string' ? word : word.word;
    if (!text) return;
    playWordAudio(text, 'en');
  };

  const handleItemClick = (type, id) => {
    // If tapping an English word, trigger its audio pronunciation for enhanced feedback
    if (type === 'left') {
      const clickedWord = leftItems.find((w) => w.id === id);
      if (clickedWord) speakWord(clickedWord);
    }

    const currentSelected = type === 'left' ? selectedLeft : selectedRight;
    const oppositeSelected = type === 'left' ? selectedRight : selectedLeft;
    if (currentSelected === id) {
      if (type === 'left') setSelectedLeft(null);
      else setSelectedRight(null);
      return;
    }
    if (oppositeSelected !== null) {
      const leftId = type === 'left' ? id : oppositeSelected;
      const rightId = type === 'right' ? id : oppositeSelected;
      const conflictingLinks = links.filter((link) => link.leftId === leftId || link.rightId === rightId);
      let nextLinks = [...links];
      let nextAvailableColors = [...availableColors];
      if (conflictingLinks.length > 0) {
        nextLinks = nextLinks.filter((link) => !conflictingLinks.includes(link));
        conflictingLinks.forEach((link) => nextAvailableColors.push(link.colorIdx));
        nextAvailableColors.sort((a, b) => a - b);
      }
      const colorIdx = nextAvailableColors.shift() ?? 0;
      nextLinks.push({ leftId, rightId, colorIdx });
      setLinks(nextLinks);
      setAvailableColors(nextAvailableColors);
      setSelectedLeft(null);
      setSelectedRight(null);
      return;
    }
    if (type === 'left') {
      setSelectedLeft(id);
      setSelectedRight(null);
    } else {
      setSelectedRight(id);
      setSelectedLeft(null);
    }
  };

  const checkMeaningAnswer = () => {
    if (!currentTypingWord) return;
    // Check against English word
    const isCorrect = normalizeAnswer(typingInput) === normalizeAnswer(currentTypingWord.word);
    setTypingFeedback(isCorrect ? 'correct' : 'incorrect');
    praiseLearningBot(
      isCorrect
        ? 'Đúng rồi! Bạn nhớ từ rất tốt 🌟'
        : 'Chưa đúng cũng không sao, mình thử lại một lần nữa nhé 💪'
    );
    setTypingAnswers((prev) => ({
      ...prev,
      [currentTypingWord.id]: {
        answer: typingInput,
        correct: isCorrect,
      },
    }));
  };

  const revealMeaningAnswer = () => {
    if (!currentTypingWord) return;
    setTypingInput(currentTypingWord.word);
    setTypingFeedback('revealed');
    setTypingAnswers((prev) => ({
      ...prev,
      [currentTypingWord.id]: {
        answer: '',
        correct: false,
        revealed: true,
      },
    }));
  };

  const nextTypingWord = () => {
    if (!typingFeedback) {
      checkMeaningAnswer();
      return;
    }
    if (currentWordIndex < currentRoundItems.length - 1) {
      setCurrentWordIndex((prev) => prev + 1);
      setTypingInput('');
      setTypingFeedback(null);
    } else {
      setScreen('results');
    }
  };

  const getResult = () => {
    const total = currentRoundItems.length;
    const score =
      selectedMode === 'matching'
        ? links.filter((link) => link.leftId === link.rightId).length
        : currentRoundItems.filter((word) => typingAnswers[word.id]?.correct).length;
    return {
      total,
      score,
      mistakes: Math.max(total - score, 0),
      percent: total > 0 ? Math.round((score / total) * 100) : 0,
    };
  };

  // 1. Loading state
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-transparent min-h-[60vh] gap-3">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin"></div>
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 animate-pulse">
          Đang chuẩn bị dữ liệu ôn luyện...
        </span>
      </div>
    );
  }

  // 2. Error state
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-transparent">
        <div className="max-w-md w-full rounded-3xl p-8 text-center backdrop-blur-2xl bg-white/40 dark:bg-slate-950/45 border border-white/60 dark:border-white/15 shadow-2xl">
          <XCircle className="mx-auto mb-4 text-rose-500" size={44} />
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{text.error}</h1>
          <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black py-3 rounded-xl hover:opacity-95 transition-all shadow-md cursor-pointer"
          >
            {text.reload}
          </button>
        </div>
      </div>
    );
  }

  // 3. Empty state
  if (learnedWords.length === 0 && personalVocabWords.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-transparent">
        <div className="max-w-md w-full rounded-3xl p-8 text-center backdrop-blur-2xl bg-white/40 dark:bg-slate-950/45 border border-white/60 dark:border-white/15 shadow-2xl">
          <BookOpen className="mx-auto mb-4 text-blue-500 dark:text-cyan-400" size={44} />
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{text.noWords}</h1>
          <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm font-medium">
            {text.noWordsCopy}
          </p>
          <button
            onClick={() => navigate('/categories')}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-black py-3 rounded-xl hover:opacity-95 transition-all shadow-md cursor-pointer"
          >
            {text.goVocabulary}
          </button>
        </div>
      </div>
    );
  }

  // ========================================================
  // 1. SCREEN: CHOOSE PRACTICE MODE (PREMIUM STUDIO HUB)
  // ========================================================
  if (screen === 'mode') {
    const totalWords = learnedWords.length + personalVocabWords.length;

    return (
      <div className="flex-1 bg-transparent text-slate-800 dark:text-white overflow-y-auto min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-7 space-y-6 sm:space-y-7 pb-24">
          
          {/* Top Quick Skill Navigation Pills */}
          <SkillSwitchTabs />

          {/* HERO GLASS BANNER & STATS */}
          <div className="relative rounded-[2.5rem] p-6 sm:p-8 lg:p-10 backdrop-blur-2xl bg-white/40 dark:bg-slate-950/45 border border-white/60 dark:border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.08),_inset_0_1.5px_2px_rgba(255,255,255,0.85)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.6),_inset_0_1px_2px_rgba(255,255,255,0.25)] overflow-hidden">
            {/* Ambient Glows */}
            <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-br from-blue-500/20 via-indigo-500/15 to-cyan-400/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-gradient-to-tr from-indigo-500/20 via-sky-500/15 to-transparent blur-3xl pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              <div className="lg:col-span-8 space-y-4">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-cyan-300 text-xs font-black tracking-wider uppercase backdrop-blur-md">
                  <Sparkles size={14} className="text-blue-600 dark:text-cyan-400 animate-pulse" />
                  <span>{text.heroBadge}</span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-950 dark:text-white leading-tight">
                  {text.chooseMode}
                </h1>

                <p className="text-slate-700 dark:text-slate-200 text-sm sm:text-base leading-relaxed max-w-2xl font-bold">
                  {text.ready(totalWords)}
                </p>

                {/* Quick Metrics */}
                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/45 dark:bg-white/10 border border-white/60 dark:border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.04),_inset_0_1px_1px_rgba(255,255,255,0.85)] backdrop-blur-xl">
                    <Flame size={16} className="text-rose-500" />
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {totalWords} từ sẵn sàng
                    </span>
                  </div>

                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/45 dark:bg-white/10 border border-white/60 dark:border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.04),_inset_0_1px_1px_rgba(255,255,255,0.85)] backdrop-blur-xl">
                    <Zap size={16} className="text-amber-500" />
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      2 Kiểu ôn phản xạ
                    </span>
                  </div>

                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/45 dark:bg-white/10 border border-white/60 dark:border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.04),_inset_0_1px_1px_rgba(255,255,255,0.85)] backdrop-blur-xl">
                    <Brain size={16} className="text-cyan-500" />
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      Tối ưu trí nhớ dài hạn
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Quick Start Instant Card */}
              <div className="lg:col-span-4">
                <div className="p-5 rounded-3xl bg-white/45 dark:bg-slate-900/50 border border-white/65 dark:border-white/15 shadow-[0_16px_36px_-10px_rgba(15,23,42,0.05),_inset_0_1.5px_1px_rgba(255,255,255,0.85)] backdrop-blur-2xl space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-700 dark:text-cyan-300">
                    <Target size={15} />
                    <span>{text.quickStartTitle}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {text.quickStartDesc}
                  </p>
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={() => quickStartScope('matching')}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 to-cyan-600 text-white flex items-center justify-between shadow-md shadow-blue-500/20 hover:opacity-95 transition-all cursor-pointer active:scale-95"
                    >
                      <span className="flex items-center gap-2">
                        <ListChecks size={15} />
                        <span>Nối từ tất cả</span>
                      </span>
                      <ArrowRight size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => quickStartScope('meaning')}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-black bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 border border-white/60 dark:border-white/15 flex items-center justify-between transition-all cursor-pointer active:scale-95"
                    >
                      <span className="flex items-center gap-2">
                        <Keyboard size={15} />
                        <span>Gõ từ tất cả</span>
                      </span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* ========================================================= */}
          {/* SUPER SKILL HUB: 6 CORE PRACTICE MODULES                   */}
          {/* ========================================================= */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white shadow-md shadow-indigo-500/25">
                    <Sparkles size={16} />
                  </span>
                  <span>Luyện Tập Kỹ Năng Chuyên Sâu</span>
                </h2>
                <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 mt-1">
                  Chọn kỹ năng bạn muốn bứt phá hôm nay: Nghe chép, Nghe nhại, Luyện viết, Luyện đọc, Nói hay Ngữ pháp.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {SKILL_PRACTICE_HUBS.map((skill) => {
                const Icon = skill.icon;
                return (
                  <motion.div
                    key={skill.id}
                    whileHover={{ y: -4, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(skill.to)}
                    className={`group relative rounded-[2rem] p-5 sm:p-6 backdrop-blur-2xl bg-white/40 dark:bg-slate-950/45 border border-white/60 dark:border-white/15 shadow-[0_16px_36px_-10px_rgba(15,23,42,0.05),_inset_0_1.5px_2px_rgba(255,255,255,0.85)] dark:shadow-[0_16px_36px_-10px_rgba(0,0,0,0.5),_inset_0_1px_2px_rgba(255,255,255,0.2)] ${skill.borderGlow} transition-all cursor-pointer flex flex-col justify-between overflow-hidden min-h-[210px]`}
                  >
                    <div className="space-y-3 relative z-10">
                      <div className="flex items-center justify-between">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${skill.iconBg} group-hover:scale-110 transition-transform duration-300`}>
                          <Icon size={24} />
                        </div>

                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white/45 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-white/60 dark:border-white/15 shadow-2xs">
                          {skill.badge}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-lg font-black text-slate-950 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-cyan-400 transition-colors">
                          {skill.title}
                        </h3>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed mt-1 line-clamp-2">
                          {skill.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 mt-auto border-t border-white/40 dark:border-white/10 flex items-center justify-between relative z-10">
                      <span className="text-[11px] font-extrabold text-indigo-700 dark:text-cyan-400">
                        {skill.stats}
                      </span>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/50 dark:bg-white/10 border border-white/60 dark:border-white/15 text-slate-700 dark:text-slate-200 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-2xs">
                        <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* ========================================================= */}
          {/* VOCABULARY ARENA: 2 INTERACTIVE REVIEW MODES              */}
          {/* ========================================================= */}
          <div className="space-y-4 pt-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white shadow-md shadow-amber-500/25">
                <Zap size={16} />
              </span>
              <span>Đấu Trường Ôn Luyện Từ Vựng</span>
            </h2>
          </div>

          {/* TWO MAIN MODE CARDS */}
          <div className="grid md:grid-cols-2 gap-6">
            {PRACTICE_MODES.map(({ id, labels, Icon, iconBg, tags }) => (
              <motion.div
                key={id}
                whileHover={{ y: -6, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => chooseMode(id)}
                className="group relative rounded-[2rem] p-7 backdrop-blur-2xl bg-white/40 dark:bg-slate-950/45 border border-white/60 dark:border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.06),_inset_0_1.5px_2px_rgba(255,255,255,0.85)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.6),_inset_0_1px_2px_rgba(255,255,255,0.2)] hover:border-blue-500/50 dark:hover:border-cyan-400/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all cursor-pointer flex flex-col justify-between overflow-hidden min-h-[250px]"
              >
                <div className="space-y-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md ${iconBg} group-hover:scale-110 transition-transform duration-300`}>
                      <Icon size={28} />
                    </div>

                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/45 dark:bg-white/10 border border-white/60 dark:border-white/15 text-slate-600 dark:text-slate-300 group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-cyan-600 group-hover:text-white group-hover:border-transparent transition-all shadow-xs">
                      <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  <div>
                    <h2 className="text-2xl font-black text-slate-950 dark:text-white mb-1.5 group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">
                      {labels[locale]?.title || labels.vi.title}
                    </h2>
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
                      {labels[locale]?.subtitle || labels.vi.subtitle}
                    </p>
                  </div>
                </div>

                {/* Feature Tags */}
                <div className="flex flex-wrap items-center gap-2 pt-6 mt-auto border-t border-white/40 dark:border-white/10 relative z-10">
                  {tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/45 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-white/60 dark:border-white/15 shadow-2xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          {/* STUDY INSIGHT / BENEFIT CARD */}
          <div className="p-5 sm:p-6 rounded-3xl backdrop-blur-2xl bg-white/35 dark:bg-slate-950/40 border border-white/55 dark:border-white/15 shadow-[0_8px_25px_rgba(0,0,0,0.03),_inset_0_1.5px_1px_rgba(255,255,255,0.85)] flex flex-col sm:flex-row items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/15 dark:bg-cyan-500/20 text-blue-600 dark:text-cyan-400 flex items-center justify-center shrink-0 shadow-xs border border-blue-500/20">
              <Brain size={24} />
            </div>
            <div className="space-y-0.5 text-center sm:text-left flex-1">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Khoa học ghi nhớ từ vựng (Spaced Repetition)
              </h3>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {text.spacedRepetitionTip}
              </p>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ========================================================
  // 2. SCREEN: CHOOSE REVIEW SCOPE (COMPACT BENTO DOCK)
  // ========================================================
  if (screen === 'scope') {
    return (
      <div className="flex-1 bg-transparent text-slate-800 dark:text-white overflow-y-auto min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-5 pb-24">
          
          {/* FLOATING STREAMLINED TOPBAR */}
          <div className="sticky top-3 z-30 py-1">
            <div className="p-3 sm:p-3.5 rounded-2xl sm:rounded-3xl bg-white/45 dark:bg-slate-950/50 backdrop-blur-2xl border border-white/60 dark:border-white/15 shadow-[0_8px_25px_rgba(0,0,0,0.04),_inset_0_1.5px_1px_rgba(255,255,255,0.85)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setScreen('mode')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/50 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 font-black text-xs transition-all border border-white/60 dark:border-white/15 cursor-pointer shadow-2xs"
                >
                  <ArrowLeft size={16} />
                  <span>{text.changeMode}</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-blue-500/15 text-blue-700 dark:text-cyan-300 border border-blue-500/20">
                    {modeConfig?.labels[locale]?.title || modeConfig?.labels.vi.title}
                  </span>
                  <span className="text-xs font-black text-slate-800 dark:text-white hidden md:inline">
                    • {text.chooseScope}
                  </span>
                </div>
              </div>

              {/* Scope Search Bar */}
              <div className="relative flex-1 sm:max-w-xs">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={scopeQuery}
                  onChange={(e) => setScopeQuery(e.target.value)}
                  placeholder={text.searchTopic}
                  className="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white/60 dark:bg-slate-900/70 border border-white/60 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs backdrop-blur-md transition-all"
                />
                {scopeQuery && (
                  <button
                    type="button"
                    onClick={() => setScopeQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>

            </div>
          </div>

          {/* PRIMARY SCOPES BENTO GRID (2-COLUMN HERO DOCK) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Card 1: Tất cả từ đã học */}
            <motion.button
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() =>
                chooseScope({
                  type: 'all',
                  id: 'all',
                  name: text.allLearned,
                  categoryName: 'Practice',
                  words: learnedWords,
                })
              }
              className="relative overflow-hidden text-left rounded-3xl p-5 sm:p-6 backdrop-blur-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-xl shadow-blue-500/20 hover:shadow-2xl hover:shadow-blue-500/30 transition-all cursor-pointer flex flex-col justify-between min-h-[140px] border border-white/25 group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-md shrink-0">
                  <BookOpen size={24} />
                </div>
                <div className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-black uppercase tracking-wider">
                  Toàn diện
                </div>
              </div>
              
              <div className="mt-4">
                <h2 className="text-xl sm:text-2xl font-black text-white">{text.reviewAll}</h2>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-white/85 text-xs sm:text-sm font-bold">
                    {text.learnedWords(learnedWords.length)}
                  </p>
                  <span className="flex items-center gap-1 text-xs font-black text-white bg-white/20 px-2.5 py-1 rounded-xl group-hover:translate-x-1 transition-transform">
                    Bắt đầu <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            </motion.button>

            {/* Card 2: Sổ tay từ vựng của tôi */}
            <motion.button
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() =>
                chooseScope({
                  type: 'personal',
                  id: 'personal',
                  name: locale === 'vi' ? 'Sổ tay từ vựng của tôi' : 'My Personal Vocabulary',
                  categoryName: locale === 'vi' ? 'Cá nhân' : 'Personal',
                  words: personalVocabWords,
                })
              }
              className="relative overflow-hidden text-left rounded-3xl p-5 sm:p-6 backdrop-blur-2xl bg-white/45 dark:bg-slate-950/50 border border-white/60 dark:border-white/15 shadow-[0_16px_36px_-10px_rgba(15,23,42,0.05),_inset_0_1.5px_1px_rgba(255,255,255,0.85)] hover:border-cyan-500/50 hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between min-h-[140px] group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shadow-md border border-cyan-500/20 shrink-0">
                  <Bookmark size={24} />
                </div>
                <div className="px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 text-[11px] font-black uppercase tracking-wider border border-cyan-500/20">
                  Sổ cá nhân
                </div>
              </div>
              
              <div className="mt-4">
                <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white">
                  {locale === 'vi' ? 'Sổ tay từ vựng của tôi' : 'My Personal Vocabulary'}
                </h2>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-bold">
                    {text.learnedWords(personalVocabWords.length)}
                  </p>
                  <span className="flex items-center gap-1 text-xs font-black text-cyan-700 dark:text-cyan-300 group-hover:translate-x-1 transition-transform">
                    Ôn sổ tay <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            </motion.button>

          </div>

          {/* TOPIC SECTION HEADER WITH GLASS CONTAINER */}
          <div className="flex items-center justify-between p-3.5 px-5 rounded-2xl backdrop-blur-2xl bg-white/45 dark:bg-slate-950/50 border border-white/60 dark:border-white/15 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-cyan-400 flex items-center justify-center">
                <Layers size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-950 dark:text-white">
                  {locale === 'vi' ? 'Ôn tập theo chủ đề' : 'Review by Topic'}
                </h3>
                <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  {filteredTopics.length} {locale === 'vi' ? 'chủ đề có từ vựng cần ôn' : 'topics available'}
                </p>
              </div>
            </div>
            <span className="text-xs font-black px-3 py-1 rounded-full bg-blue-500/15 text-blue-700 dark:text-cyan-300 border border-blue-500/20">
              {filteredTopics.length} chủ đề
            </span>
          </div>

          {/* TOPICS GRID */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTopics.map((topic) => (
              <motion.button
                key={topic.id}
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => chooseScope({ type: 'topic', ...topic })}
                className="text-left rounded-2xl p-5 backdrop-blur-2xl bg-white/40 dark:bg-slate-950/45 border border-white/60 dark:border-white/15 shadow-[0_8px_25px_rgba(0,0,0,0.04),_inset_0_1.5px_1px_rgba(255,255,255,0.85)] hover:border-blue-500/50 hover:shadow-xl transition-all cursor-pointer min-h-[135px] flex flex-col justify-between group"
              >
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-cyan-300 px-2.5 py-1 rounded-lg bg-blue-500/15 border border-blue-500/20">
                    {topic.categoryName}
                  </span>
                  <h4 className="text-base font-black text-slate-950 dark:text-white mt-2.5 group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors line-clamp-2">
                    {topic.name}
                  </h4>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 pt-3 border-t border-white/30 dark:border-white/10">
                  <span className="text-blue-700 dark:text-cyan-300 font-black">
                    {text.learnedWords(topic.words.length)}
                  </span>
                  <ArrowRight size={15} className="text-slate-400 group-hover:translate-x-1 group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-all" />
                </div>
              </motion.button>
            ))}
          </div>

          {filteredTopics.length === 0 && (
            <div className="p-8 rounded-2xl backdrop-blur-2xl bg-white/40 dark:bg-slate-950/45 border border-white/60 dark:border-white/15 text-center text-slate-600 dark:text-slate-400 font-bold">
              {text.noTopic}
            </div>
          )}

        </div>
      </div>
    );
  }

  // ========================================================
  // 3. SCREEN: MATCHING GAME (SPEED VOCAB MATCHING ARENA)
  // ========================================================
  if (screen === 'playing' && selectedMode === 'matching') {
    const progress = leftItems.length > 0 ? Math.round((matchedCount / leftItems.length) * 100) : 0;

    return (
      <div className="flex-1 bg-transparent text-slate-800 dark:text-white overflow-y-auto min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-5 pb-24">
          
          {/* FLOATING TOPBAR */}
          <div className="sticky top-3 z-30 py-1">
            <div className="p-3 sm:p-3.5 rounded-2xl sm:rounded-3xl bg-white/45 dark:bg-slate-950/50 backdrop-blur-2xl border border-white/60 dark:border-white/15 shadow-[0_8px_25px_rgba(0,0,0,0.04),_inset_0_1.5px_1px_rgba(255,255,255,0.85)] flex items-center justify-between gap-3">
              
              <button
                type="button"
                onClick={backToScope}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/50 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 font-black text-xs transition-all border border-white/60 dark:border-white/15 cursor-pointer shadow-2xs"
              >
                <ArrowLeft size={16} />
                <span>{text.changeScope}</span>
              </button>

              <div className="text-center min-w-0">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-cyan-300">
                    {modeConfig?.labels[locale]?.title || modeConfig?.labels.vi.title}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-slate-950 dark:text-white truncate">
                    {selectedScope?.name}
                  </span>
                </div>
              </div>

              {/* Reset Links button or matched counter */}
              {links.length > 0 ? (
                <button
                  type="button"
                  onClick={resetLinks}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-500/20 text-xs font-black transition-all cursor-pointer shadow-2xs"
                  title="Xóa toàn bộ các cặp đã nối để ghép lại"
                >
                  <RotateCcw size={14} />
                  <span className="hidden sm:inline">Làm lại</span>
                </button>
              ) : (
                <div className="px-3 py-1.5 rounded-xl bg-blue-500/15 text-blue-800 dark:text-cyan-200 border border-blue-500/25 text-xs font-black shrink-0">
                  {matchedCount} / {leftItems.length}
                </div>
              )}

            </div>
          </div>

          {/* GAME ARENA BOARD (LIQUID GLASS CONTAINER) */}
          <div className="rounded-[2.5rem] p-5 sm:p-8 backdrop-blur-2xl bg-white/40 dark:bg-slate-950/45 border border-white/60 dark:border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.08),_inset_0_1.5px_2px_rgba(255,255,255,0.85)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.6),_inset_0_1px_2px_rgba(255,255,255,0.25)] space-y-6">
            
            {/* Arena Header: Progress & Instructions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-black">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Sparkles size={15} className="text-blue-500 animate-pulse" />
                  <span>Tiến độ ghép đôi: {matchedCount} / {leftItems.length} cặp</span>
                </span>
                <span className="text-blue-600 dark:text-cyan-400 font-extrabold">{progress}%</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 rounded-full bg-white/50 dark:bg-slate-800/80 overflow-hidden p-0.5 border border-white/60 dark:border-white/10 shadow-inner">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.25 }}
                />
              </div>
            </div>

            {/* TWO COLUMNS: ENGLISH & VIETNAMESE */}
            <div className="grid grid-cols-2 gap-3 sm:gap-6">
              
              {/* Left Column: English Words */}
              <div className="flex flex-col gap-3">
                <div className="py-2 px-3 rounded-xl bg-white/60 dark:bg-slate-900/70 backdrop-blur-md border border-white/60 dark:border-white/20 shadow-2xs text-center">
                  <span className="text-xs font-black text-blue-700 dark:text-cyan-300 uppercase tracking-wider">
                    🇬🇧 {text.english}
                  </span>
                </div>

                {leftItems.map((item) => {
                  const linkIndex = links.findIndex((row) => row.leftId === item.id);
                  const isMatched = linkIndex !== -1;
                  const link = isMatched ? links[linkIndex] : null;
                  const isSelected = selectedLeft === item.id;
                  const color = isMatched ? PAIR_COLORS[link.colorIdx] : null;

                  let cls = 'bg-white/45 dark:bg-slate-900/50 border-white/65 dark:border-white/15 text-slate-900 dark:text-white hover:border-blue-400 hover:scale-[1.01]';
                  if (isMatched && color) {
                    cls = `${color.bg} ${color.border} ${color.text} shadow-md`;
                  } else if (isSelected) {
                    cls = 'bg-blue-500/20 border-blue-500 text-blue-900 dark:text-cyan-200 ring-4 ring-blue-500/25 scale-[1.02] shadow-lg';
                  }

                  return (
                    <motion.button
                      layout
                      key={`left-${item.id}`}
                      onClick={() => handleItemClick('left', item.id)}
                      className={`relative min-h-[82px] sm:min-h-[90px] p-3.5 sm:p-4 rounded-2xl border-2 flex items-center justify-center text-center font-black text-base sm:text-lg backdrop-blur-2xl transition-all duration-200 break-words cursor-pointer shadow-[0_8px_25px_rgba(0,0,0,0.03),_inset_0_1.5px_1px_rgba(255,255,255,0.85)] ${cls}`}
                    >
                      {/* Pair number tag */}
                      {isMatched && (
                        <span className="absolute top-2 left-2 text-[10px] font-black px-1.5 py-0.5 rounded-md bg-white/60 dark:bg-black/40 text-slate-700 dark:text-slate-200 shadow-2xs">
                          #{linkIndex + 1}
                        </span>
                      )}
                      
                      <span>{item.word}</span>

                      {isMatched && (
                        <CheckCircle2 size={18} className="absolute top-2.5 right-2.5 text-emerald-500 drop-shadow-sm" />
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Right Column: Vietnamese Meanings */}
              <div className="flex flex-col gap-3">
                <div className="py-2 px-3 rounded-xl bg-white/60 dark:bg-slate-900/70 backdrop-blur-md border border-white/60 dark:border-white/20 shadow-2xs text-center">
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                    🇻🇳 {text.vietnamese}
                  </span>
                </div>

                {rightItems.map((item) => {
                  const linkIndex = links.findIndex((row) => row.rightId === item.id);
                  const isMatched = linkIndex !== -1;
                  const link = isMatched ? links[linkIndex] : null;
                  const isSelected = selectedRight === item.id;
                  const color = isMatched ? PAIR_COLORS[link.colorIdx] : null;

                  let cls = 'bg-white/45 dark:bg-slate-900/50 border-white/65 dark:border-white/15 text-slate-800 dark:text-slate-100 hover:border-blue-400 hover:scale-[1.01]';
                  if (isMatched && color) {
                    cls = `${color.bg} ${color.border} ${color.text} shadow-md`;
                  } else if (isSelected) {
                    cls = 'bg-blue-500/20 border-blue-500 text-blue-900 dark:text-cyan-200 ring-4 ring-blue-500/25 scale-[1.02] shadow-lg';
                  }

                  return (
                    <motion.button
                      layout
                      key={`right-${item.id}`}
                      onClick={() => handleItemClick('right', item.id)}
                      title={item.meaning}
                      className={`relative min-h-[82px] sm:min-h-[90px] p-3.5 sm:p-4 rounded-2xl border-2 flex items-center justify-center text-center font-bold text-xs sm:text-sm backdrop-blur-2xl transition-all duration-200 break-words cursor-pointer shadow-[0_8px_25px_rgba(0,0,0,0.03),_inset_0_1.5px_1px_rgba(255,255,255,0.85)] ${cls}`}
                    >
                      {/* Pair number tag */}
                      {isMatched && (
                        <span className="absolute top-2 left-2 text-[10px] font-black px-1.5 py-0.5 rounded-md bg-white/60 dark:bg-black/40 text-slate-700 dark:text-slate-200 shadow-2xs">
                          #{linkIndex + 1}
                        </span>
                      )}

                      <span className="line-clamp-2 leading-relaxed">{item.meaning}</span>

                      {isMatched && (
                        <CheckCircle2 size={18} className="absolute top-2.5 right-2.5 text-emerald-500 drop-shadow-sm" />
                      )}
                    </motion.button>
                  );
                })}
              </div>

            </div>

            {/* SUBMIT BUTTON WHEN ALL MATCHED */}
            <AnimatePresence>
              {allMatched && (
                <motion.div
                  initial={{ opacity: 0, y: 16, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="pt-4 flex flex-col items-center gap-3"
                >
                  <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 size={16} />
                    <span>Xuất sắc! Bạn đã ghép thành công tất cả {leftItems.length} cặp từ</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setScreen('results')}
                    className="flex items-center gap-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white font-black py-4 px-10 rounded-2xl hover:opacity-95 transition-all shadow-xl shadow-blue-500/30 cursor-pointer text-base sm:text-lg active:scale-95"
                  >
                    <Send size={20} />
                    <span>{text.submit}</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

        </div>
      </div>
    );
  }

  // ========================================================
  // 4. SCREEN: TYPING GAME (SPELLING RECALL ARENA)
  // ========================================================
  if (screen === 'playing' && selectedMode === 'meaning' && currentTypingWord) {
    const progress = Math.round(((currentWordIndex + 1) / currentRoundItems.length) * 100);
    const isDoneWithWord =
      typingFeedback === 'correct' ||
      typingFeedback === 'incorrect' ||
      typingFeedback === 'revealed';

    return (
      <div className="flex-1 bg-transparent text-slate-800 dark:text-white overflow-y-auto min-h-screen">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-7 space-y-5 pb-24">
          
          {/* FLOATING TOPBAR */}
          <div className="sticky top-3 z-30 py-1">
            <div className="p-3 sm:p-3.5 rounded-2xl sm:rounded-3xl bg-white/45 dark:bg-slate-950/50 backdrop-blur-2xl border border-white/60 dark:border-white/15 shadow-[0_8px_25px_rgba(0,0,0,0.04),_inset_0_1.5px_1px_rgba(255,255,255,0.85)] flex items-center justify-between gap-3">
              
              <button
                type="button"
                onClick={backToScope}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/50 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 font-black text-xs transition-all border border-white/60 dark:border-white/15 cursor-pointer shadow-2xs"
              >
                <ArrowLeft size={16} />
                <span>{text.changeScope}</span>
              </button>

              <div className="text-center min-w-0">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-700 dark:text-cyan-300">
                    {modeConfig?.labels[locale]?.title || modeConfig?.labels.vi.title}
                  </span>
                  <span className="text-xs sm:text-sm font-black text-slate-950 dark:text-white truncate">
                    {selectedScope?.name}
                  </span>
                </div>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-blue-500/15 text-blue-800 dark:text-cyan-200 border border-blue-500/25 text-xs font-black shrink-0">
                {currentWordIndex + 1} / {currentRoundItems.length}
              </div>

            </div>
          </div>

          {/* MAIN TYPING ARENA CARD */}
          <div className="rounded-[2.5rem] p-6 sm:p-10 backdrop-blur-2xl bg-white/40 dark:bg-slate-950/45 border border-white/60 dark:border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.08),_inset_0_1.5px_2px_rgba(255,255,255,0.85)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.6),_inset_0_1px_2px_rgba(255,255,255,0.25)] space-y-6">
            
            {/* Progress Header */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-black">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Keyboard size={15} className="text-indigo-500" />
                  <span>Từ vựng thứ {currentWordIndex + 1} / {currentRoundItems.length}</span>
                </span>
                <span className="text-blue-600 dark:text-cyan-400 font-extrabold">{progress}%</span>
              </div>

              <div className="w-full h-2.5 rounded-full bg-white/50 dark:bg-slate-800/80 overflow-hidden p-0.5 border border-white/60 dark:border-white/10 shadow-inner">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.25 }}
                />
              </div>
            </div>

            {/* Vietnamese Prompt */}
            <div className="text-center space-y-2 py-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-black uppercase tracking-wider">
                🇻🇳 {text.vietnamese}
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-950 dark:text-white break-words leading-snug">
                {currentTypingWord.meaning}
              </h2>
            </div>

            {/* Input Box */}
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={typingInput}
                  onChange={(e) => {
                    setTypingInput(e.target.value);
                    if (typingFeedback === 'incorrect') setTypingFeedback(null);
                  }}
                  disabled={typingFeedback === 'correct' || typingFeedback === 'revealed'}
                  placeholder={text.inputMeaning}
                  className={`w-full rounded-2xl border-2 px-5 py-4 text-xl sm:text-2xl font-black text-center outline-none transition-all bg-white/60 dark:bg-slate-900/70 backdrop-blur-md ${
                    typingFeedback === 'correct' || typingFeedback === 'revealed'
                      ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/10'
                      : typingFeedback === 'incorrect'
                      ? 'border-rose-500 text-rose-600 dark:text-rose-400 shadow-lg shadow-rose-500/10 animate-shake'
                      : 'border-white/65 dark:border-white/15 text-slate-950 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 shadow-inner'
                  }`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (!isDoneWithWord) checkMeaningAnswer();
                      else nextTypingWord();
                    }
                  }}
                  autoFocus
                />

                {(typingFeedback === 'correct' || typingFeedback === 'revealed') && (
                  <CheckCircle2 size={26} className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500" />
                )}
                {typingFeedback === 'incorrect' && (
                  <XCircle size={26} className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-500" />
                )}
              </div>

              {/* Reveal Card when Done */}
              {isDoneWithWord && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl p-4 bg-white/50 dark:bg-slate-900/60 border border-white/60 dark:border-white/15 backdrop-blur-md space-y-1 text-center"
                >
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    🇬🇧 {text.savedMeaning}
                  </span>
                  <div className="flex items-center justify-center gap-3">
                    <p className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">
                      {currentTypingWord.word}
                    </p>
                    <button
                      type="button"
                      onClick={() => speakWord(currentTypingWord)}
                      className="p-2 rounded-xl bg-blue-500/15 text-blue-600 dark:text-cyan-400 hover:bg-blue-500/25 transition-colors cursor-pointer shrink-0 border border-blue-500/20 shadow-2xs"
                      title={text.hear}
                    >
                      <Volume2 size={18} />
                    </button>
                  </div>
                  {currentTypingWord.pro && (
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {currentTypingWord.pro}
                    </p>
                  )}
                </motion.div>
              )}

              {/* Action Buttons */}
              {!isDoneWithWord ? (
                <div className="grid sm:grid-cols-[1fr_2fr] gap-3 pt-2">
                  <button
                    type="button"
                    onClick={revealMeaningAnswer}
                    className="flex items-center justify-center gap-2 border border-white/60 dark:border-white/15 bg-white/45 hover:bg-white/75 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 py-3.5 rounded-xl font-black text-sm transition-all cursor-pointer shadow-2xs"
                  >
                    <Eye size={18} />
                    <span>{text.reveal}</span>
                  </button>
                  <button
                    type="button"
                    onClick={checkMeaningAnswer}
                    className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:opacity-95 text-white py-3.5 rounded-xl font-black text-sm transition-all cursor-pointer shadow-lg shadow-blue-500/25 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span>{text.check}</span>
                    <span className="text-xs font-semibold opacity-80">(Enter ↵)</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={nextTypingWord}
                  className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white hover:opacity-95 py-3.5 rounded-xl font-black text-sm transition-all cursor-pointer shadow-lg shadow-blue-500/25 active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>{currentWordIndex < currentRoundItems.length - 1 ? text.continue : text.complete}</span>
                  <span className="text-xs font-semibold opacity-80">(Enter ↵)</span>
                </button>
              )}

            </div>
          </div>

        </div>
      </div>
    );
  }

  // ========================================================
  // 5. SCREEN: RESULTS (LIQUID GLASS VICTORY STUDIO)
  // ========================================================
  if (screen === 'results') {
    const result = getResult();

    const getFeedback = (percent) => {
      if (percent === 100) {
        return {
          Icon: Trophy,
          title: locale === 'vi' ? 'Hoàn hảo tuyệt đối! 🎉' : 'Perfect Score! 🎉',
          subtitle:
            locale === 'vi'
              ? 'Tuyệt vời! Bạn đã trả lời chính xác 100% tất cả các từ trong lượt này.'
              : 'Flawless! You mastered 100% of the words in this review round.',
          gradient: 'from-amber-400 via-amber-500 to-orange-500',
          glow: 'from-amber-400/50 via-orange-500/40 to-transparent',
          badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
          ringColor: 'text-amber-500',
        };
      }
      if (percent >= 80) {
        return {
          Icon: Sparkles,
          title: locale === 'vi' ? 'Kết quả xuất sắc! 🌟' : 'Excellent Work! 🌟',
          subtitle:
            locale === 'vi'
              ? 'Phản xạ từ vựng của bạn rất ấn tượng! Duy trì phong độ này nhé.'
              : 'Impressive vocabulary reflexes! Keep up this great momentum.',
          gradient: 'from-emerald-400 via-teal-500 to-cyan-500',
          glow: 'from-emerald-400/50 via-teal-500/40 to-transparent',
          badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
          ringColor: 'text-emerald-500',
        };
      }
      if (percent >= 50) {
        return {
          Icon: Zap,
          title: locale === 'vi' ? 'Luyện tập rất tốt! 💪' : 'Good Progress! 💪',
          subtitle:
            locale === 'vi'
              ? 'Đang tiến bộ rất tốt. Ôn lại thêm một lượt để ghi nhớ trọn vẹn!'
              : 'Great effort. Review one more time to solidify your memory retention!',
          gradient: 'from-blue-500 via-indigo-600 to-cyan-500',
          glow: 'from-blue-500/50 via-indigo-500/40 to-transparent',
          badgeBg: 'bg-blue-500/15 text-blue-700 dark:text-cyan-300 border-blue-500/30',
          ringColor: 'text-blue-500',
        };
      }
      return {
        Icon: Target,
        title: locale === 'vi' ? 'Đừng nản lòng, thử lại nhé! 🎯' : 'Keep Practicing! 🎯',
        subtitle:
          locale === 'vi'
            ? 'Mỗi lần sai là một cơ hội vàng để não bộ ghi nhớ sâu hơn. Ôn lại ngay nào!'
            : 'Mistakes are proof of learning. Review these words right now to master them!',
        gradient: 'from-rose-500 via-pink-600 to-purple-600',
        glow: 'from-rose-500/50 via-purple-500/40 to-transparent',
        badgeBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
        ringColor: 'text-rose-500',
      };
    };

    const feedback = getFeedback(result.percent);

    const isWordCorrect = (word) => {
      if (selectedMode === 'matching') {
        const link = links.find((l) => l.leftId === word.id);
        return link ? link.leftId === link.rightId : false;
      }
      return !!typingAnswers[word.id]?.correct;
    };

    return (
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-transparent min-h-screen overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="max-w-xl w-full my-auto"
        >
          {/* LIQUID GLASS VICTORY ARENA CARD */}
          <div className="relative rounded-[2.5rem] p-6 sm:p-9 backdrop-blur-3xl bg-white/50 dark:bg-slate-950/55 border border-white/70 dark:border-white/20 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.1),_inset_0_1.5px_2px_rgba(255,255,255,0.9)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.7),_inset_0_1px_2px_rgba(255,255,255,0.25)] space-y-6 overflow-hidden">
            
            {/* Ambient Glows */}
            <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gradient-to-br ${feedback.glow} blur-3xl pointer-events-none`} />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />

            {/* 1. Header: Dynamic Badge & Title */}
            <div className="relative z-10 text-center space-y-3">
              {/* Animated Floating Badge */}
              <div className="relative w-20 h-20 mx-auto">
                <div className={`absolute inset-0 bg-gradient-to-br ${feedback.glow} rounded-full blur-xl opacity-80 animate-pulse`} />
                <div
                  className={`relative w-full h-full rounded-full flex items-center justify-center bg-gradient-to-br ${feedback.gradient} shadow-xl border-4 border-white/80 dark:border-white/20`}
                >
                  <feedback.Icon size={38} className="text-white drop-shadow-md" />
                </div>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
                  {feedback.title}
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 max-w-sm mx-auto mt-1 leading-relaxed">
                  {feedback.subtitle}
                </p>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full bg-blue-500/15 text-blue-700 dark:text-cyan-300 border border-blue-500/25">
                    <span>{modeConfig?.labels[locale]?.title}</span>
                    <span>•</span>
                    <span className="truncate max-w-[200px]">{selectedScope?.name}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Middle Row: Radial Accuracy Ring & Bento Stat Tiles */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center p-4 rounded-3xl bg-white/40 dark:bg-slate-900/40 border border-white/60 dark:border-white/10 backdrop-blur-md">
              
              {/* Left: SVG Radial Meter */}
              <div className="sm:col-span-5 flex flex-col items-center justify-center py-1">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="stroke-slate-200/70 dark:stroke-slate-800"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeDasharray={251.32}
                      strokeDashoffset={251.32 - (251.32 * result.percent) / 100}
                      strokeLinecap="round"
                      fill="transparent"
                      className={`transition-all duration-1000 ease-out ${feedback.ringColor}`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-slate-950 dark:text-white leading-none">
                      {result.percent}%
                    </span>
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">
                      {text.result}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: 3 Mini Stat Cards */}
              <div className="sm:col-span-7 grid grid-cols-3 gap-2 text-center">
                
                {/* Total */}
                <div className="p-3 rounded-2xl bg-white/50 dark:bg-slate-900/60 border border-white/60 dark:border-white/10 shadow-2xs">
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase block truncate">
                    {text.totalWords}
                  </span>
                  <span className="text-xl font-black text-slate-950 dark:text-white mt-1 block">
                    {result.total}
                  </span>
                </div>

                {/* Correct */}
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-2xs">
                  <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 uppercase block truncate">
                    {text.correct}
                  </span>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                    {result.score}
                  </span>
                </div>

                {/* Incorrect */}
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 shadow-2xs">
                  <span className="text-[10px] font-black text-rose-700 dark:text-rose-300 uppercase block truncate">
                    {text.incorrect}
                  </span>
                  <span className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1 block">
                    {result.mistakes}
                  </span>
                </div>

              </div>

            </div>

            {/* 3. Detailed Word Review List */}
            {currentRoundItems.length > 0 && (
              <div className="relative z-10 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <BookOpen size={14} className="text-blue-500" />
                    <span>Chi tiết từ vựng lượt này ({currentRoundItems.length})</span>
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Bấm loa để nghe lại
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                  {currentRoundItems.map((word) => {
                    const correct = isWordCorrect(word);

                    return (
                      <div
                        key={word.id}
                        className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-white/45 dark:bg-slate-900/50 border border-white/60 dark:border-white/10 backdrop-blur-md shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                              correct
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25'
                            }`}
                          >
                            {correct ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                          </div>

                          <div className="min-w-0 text-left">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-slate-950 dark:text-white truncate">
                                {word.word}
                              </span>
                              {word.pro && (
                                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate hidden sm:inline">
                                  {word.pro}
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">
                              {word.meaning}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => speakWord(word)}
                          className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-cyan-400 transition-colors cursor-pointer shrink-0 ml-2 border border-blue-500/15"
                          title={text.hear}
                        >
                          <Volume2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. Action Buttons Dock */}
            <div className="relative z-10 space-y-2.5 pt-1">
              
              {/* Next Round Button if available */}
              {canStartNextRound ? (
                <button
                  type="button"
                  onClick={startNextRound}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-emerald-500/25 hover:opacity-95 transition-all cursor-pointer active:scale-95 text-sm sm:text-base"
                >
                  <Shuffle size={18} />
                  <span>{text.nextRound}</span>
                  <ArrowRight size={16} />
                </button>
              ) : null}

              {/* Retry Round Button */}
              <button
                type="button"
                onClick={retryCurrentRound}
                className={`w-full flex items-center justify-center gap-2 font-black py-3.5 rounded-2xl transition-all cursor-pointer active:scale-95 text-sm sm:text-base ${
                  !canStartNextRound
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-lg shadow-blue-500/25 hover:opacity-95'
                    : 'bg-white/50 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 border border-white/60 dark:border-white/15 shadow-2xs'
                }`}
              >
                <RotateCcw size={18} />
                <span>{text.retryRound}</span>
              </button>

              {/* Secondary Navigation */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={backToScope}
                  className="flex items-center justify-center gap-1.5 bg-white/45 hover:bg-white/75 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 font-black py-2.5 rounded-xl border border-white/60 dark:border-white/15 transition-all cursor-pointer text-xs shadow-2xs"
                >
                  <ArrowLeft size={14} />
                  <span>{text.changeScope}</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center justify-center gap-1.5 bg-white/45 hover:bg-white/75 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 font-black py-2.5 rounded-xl border border-white/60 dark:border-white/15 transition-all cursor-pointer text-xs shadow-2xs"
                >
                  <Home size={14} />
                  <span>{text.home}</span>
                </button>
              </div>

            </div>

          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}
