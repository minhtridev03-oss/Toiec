import { useEffect, useState } from 'react';
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
  List,
  Loader2,
  RotateCcw,
  Search,
  Send,
  Shuffle,
  Trophy,
  Volume2,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { fetchLearnedPracticeWords } from '../lib/api';
import { supabase } from '../lib/supabaseClient';
import { usePracticeSessionTimer } from '../lib/practiceActivity';
import { praiseLearningBot } from '../lib/learningBot';
import { getShortMeaning } from '../utils/dictionaryParser';
const WORDS_PER_ROUND = 10;
const PAIR_COLORS = [
  { bg: 'bg-emerald-100', border: 'border-emerald-500', text: 'text-emerald-800' },
  { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-800' },
  { bg: 'bg-violet-100', border: 'border-violet-500', text: 'text-violet-800' },
  { bg: 'bg-amber-100', border: 'border-amber-500', text: 'text-amber-800' },
  { bg: 'bg-rose-100', border: 'border-rose-500', text: 'text-rose-800' },
  { bg: 'bg-cyan-100', border: 'border-cyan-500', text: 'text-cyan-800' },
  { bg: 'bg-fuchsia-100', border: 'border-fuchsia-500', text: 'text-fuchsia-800' },
  { bg: 'bg-lime-100', border: 'border-lime-500', text: 'text-lime-800' },
  { bg: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-800' },
  { bg: 'bg-teal-100', border: 'border-teal-500', text: 'text-teal-800' },
];
const PRACTICE_MODES = [
  {
    id: 'matching',
    labels: { vi: { title: 'Nối ghép từ', subtitle: 'Ghép từ tiếng Anh với nghĩa tiếng Việt' }, en: { title: 'Match words', subtitle: 'Match English words with their meanings' } },
    Icon: List,
    accent: 'text-pink-600 bg-pink-100 dark:text-pink-200 dark:bg-pink-500/15',
  },
  {
    id: 'meaning',
    labels: { vi: { title: 'Nhập lại từ', subtitle: 'Nhìn nghĩa tiếng Việt và gõ lại từ tiếng Anh' }, en: { title: 'Type the word', subtitle: 'See the meaning and type the English word' } },
    Icon: Keyboard,
    accent: 'text-[#b72c8b] bg-[#fde8f6] dark:text-pink-200 dark:bg-pink-500/15',
  },
];
const COPY = {
  vi: {
    noMeaning: 'Chưa có nghĩa', loadError: 'Không thể tải dữ liệu ôn luyện. Vui lòng thử lại.', error: 'Có lỗi xảy ra', reload: 'Tải lại', noWords: 'Chưa có từ đã học', noWordsCopy: 'Đánh dấu một vài từ là đã học rồi quay lại ôn luyện.', goVocabulary: 'Đi đến từ vựng',
    practice: 'Luyện tập', chooseMode: 'Chọn kiểu ôn luyện', ready: (count) => `${count} từ đã học sẵn sàng để ôn lại.`, changeMode: 'Đổi kiểu ôn', chooseScope: 'Chọn phạm vi ôn luyện', searchTopic: 'Tìm chủ đề', allLearned: 'Tất cả từ đã học', reviewAll: 'Ôn tất cả từ đã học', learnedWords: (count) => `${count} từ đã học`, noTopic: 'Không tìm thấy chủ đề phù hợp.', changeScope: 'Đổi phạm vi', submit: 'Nộp đáp án', english: 'Tiếng Anh', vietnamese: 'Tiếng Việt', hear: 'Nghe phát âm', inputMeaning: 'Nhập từ tiếng Anh', savedMeaning: 'Từ tiếng Anh', reveal: 'Hiện đáp án', check: 'Kiểm tra', continue: 'Tiếp tục', complete: 'Hoàn thành', totalWords: 'Số từ', correct: 'Đúng', incorrect: 'Sai', result: 'Kết quả', retryRound: 'Ôn lại lượt này', nextRound: 'Lượt tiếp theo', finishedScope: 'Đã ôn hết phạm vi này', home: 'Về trang chính',
  },
  en: {
    noMeaning: 'No meaning yet', loadError: 'Could not load practice data. Please try again.', error: 'An error occurred', reload: 'Reload', noWords: 'No learned words', noWordsCopy: 'Mark some words as learned and come back to practice.', goVocabulary: 'Go to vocabulary',
    practice: 'Practice', chooseMode: 'Choose a practice mode', ready: (count) => `${count} learned words are ready for review.`, changeMode: 'Change practice mode', chooseScope: 'Choose a review scope', searchTopic: 'Search topics', allLearned: 'All learned words', reviewAll: 'Review all learned words', learnedWords: (count) => `${count} learned words`, noTopic: 'No matching topics found.', changeScope: 'Change scope', submit: 'Submit answers', english: 'English', vietnamese: 'Vietnamese', hear: 'Play pronunciation', inputMeaning: 'Type the English word', savedMeaning: 'The word', reveal: 'Show answer', check: 'Check', continue: 'Continue', complete: 'Complete', totalWords: 'Words', correct: 'Correct', incorrect: 'Incorrect', result: 'Result', retryRound: 'Review this round again', nextRound: 'Next round', finishedScope: 'You have reviewed this whole scope', home: 'Back to dashboard',
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
  const text = COPY[locale];
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
      personalVocabWords: personalWords
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
    screen !== 'mode' && (learnedWords?.length > 0)
  );

  const modeConfig = PRACTICE_MODES.find((mode) => mode.id === selectedMode);
  const allMatched = selectedMode === 'matching' && leftItems.length > 0 && links.length === leftItems.length;
  const matchedCount = links.length;
  const currentTypingWord = currentRoundItems[currentWordIndex];
  const remainingWords = practicePool.filter((word) => !usedWordIds.includes(word.id));
  const canStartNextRound = remainingWords.length > 0;
  const filteredTopics = topics.filter((topic) => {
    const query = scopeQuery.trim().toLowerCase();
    if (!query) return true;
    return `${topic.categoryName} ${topic.name}`.toLowerCase().includes(query);
  });
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
  const beginRound = (items, options = {}) => {
    const roundItems = items.slice(0, WORDS_PER_ROUND);
    resetRoundState();
    setCurrentRoundItems(roundItems);
    if (selectedMode === 'matching') {
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
    if (!word || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word.word);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };
  const handleItemClick = (type, id) => {
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
    praiseLearningBot(isCorrect
      ? 'Đúng rồi! Bạn nhớ từ rất tốt 🌟'
      : 'Chưa đúng cũng không sao, mình thử lại một lần nữa nhé 💪');
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
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#fff4fa] dark:bg-[#160B1E] transition-colors">
        <Loader2 className="w-9 h-9 text-pink-500 animate-spin" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-[#fff4fa] dark:bg-[#160B1E] transition-colors">
        <div className="max-w-md w-full bg-white dark:bg-[#1E1226] border border-red-100 dark:border-red-500/30 rounded-2xl p-8 text-center shadow-xl">
          <XCircle className="mx-auto mb-4 text-red-500" size={42} />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{text.error}</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-slate-900 text-white font-semibold py-3 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {text.reload}
          </button>
        </div>
      </div>
    );
  }
  if (learnedWords.length === 0 && personalVocabWords.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-[#fff4fa] dark:bg-[#160B1E] transition-colors">
        <div className="max-w-md w-full bg-white dark:bg-[#1E1226] border border-pink-200 dark:border-pink-500/20 rounded-2xl p-8 text-center shadow-xl shadow-pink-100/60 dark:shadow-none">
          <BookOpen className="mx-auto mb-4 text-pink-500" size={44} />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{text.noWords}</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {text.noWordsCopy}
          </p>
          <button
            onClick={() => navigate('/categories')}
            className="w-full bg-pink-500 text-white font-semibold py-3 rounded-xl hover:bg-pink-600 transition-colors cursor-pointer shadow-lg shadow-pink-500/20"
          >
            {text.goVocabulary}
          </button>
        </div>
      </div>
    );
  }
  if (screen === 'mode') {
    return (
      <div className="flex-1 overflow-y-auto bg-[#fff4fa] dark:bg-[#160B1E] p-4 sm:p-8 transition-colors">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <p className="text-sm font-bold uppercase tracking-widest text-pink-500 mb-2">{text.practice}</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {text.chooseMode}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              {text.ready(learnedWords.length + personalVocabWords.length)}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {PRACTICE_MODES.map(({ id, labels, Icon, accent }) => (
              <motion.button
                key={id}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => chooseMode(id)}
                className="group text-left bg-white dark:bg-[#1E1226] border border-pink-200 dark:border-pink-500/20 rounded-2xl p-6 shadow-[0_14px_34px_rgba(236,72,153,0.07)] hover:shadow-[0_20px_42px_rgba(236,72,153,0.15)] hover:border-pink-400 dark:hover:border-pink-400/60 transition-all cursor-pointer min-h-[180px]"
              >
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 ${accent}`}>
                  <Icon size={28} />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{labels[locale].title}</h2>
                    <p className="text-slate-600 dark:text-slate-400">{labels[locale].subtitle}</p>
                  </div>
                  <ArrowRight className="text-slate-300 dark:text-slate-600 group-hover:text-pink-500 group-hover:translate-x-1 transition-all shrink-0" />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (screen === 'scope') {
    return (
      <div className="flex-1 overflow-y-auto bg-[#fff4fa] dark:bg-[#160B1E] p-4 sm:p-8 transition-colors">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => setScreen('mode')}
            className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6 transition-colors cursor-pointer w-fit"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">{text.changeMode}</span>
          </button>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-pink-500 mb-2">
                {modeConfig?.labels[locale]?.title}
              </p>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {text.chooseScope}
              </h1>
            </div>
            <div className="relative w-full lg:w-80">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={scopeQuery}
                onChange={(event) => setScopeQuery(event.target.value)}
                placeholder={text.searchTopic}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-[#1E1226] border border-pink-200 dark:border-pink-500/20 text-slate-800 dark:text-slate-100 outline-none shadow-sm shadow-pink-100/60 focus:border-pink-400 focus:ring-4 focus:ring-pink-100/70 dark:focus:ring-pink-500/10 transition-colors"
              />
            </div>
          </div>
          <button
            onClick={() =>
              chooseScope({
                type: 'all',
                id: 'all',
                name: text.allLearned,
                categoryName: 'Practice',
                words: learnedWords,
              })
            }
            className="w-full text-left bg-gradient-to-r from-[#d9298b] to-[#ef4d9b] text-white rounded-2xl p-5 mb-6 flex items-center justify-between gap-4 hover:from-[#c5227c] hover:to-[#e84291] transition-colors cursor-pointer shadow-xl shadow-pink-300/50 dark:shadow-pink-950/25"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <BookOpen size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">{text.reviewAll}</h2>
                <p className="text-white/70 text-sm">{text.learnedWords(learnedWords.length)}</p>
              </div>
            </div>
            <ArrowRight className="shrink-0" />
          </button>
          {personalVocabWords.length > 0 && (
            <button
              onClick={() =>
                chooseScope({
                  type: 'personal',
                  id: 'personal',
                  name: locale === 'vi' ? 'S\u1ed5 tay t\u1eeb v\u1ef1ng' : 'My Vocabulary',
                  categoryName: locale === 'vi' ? 'C\u00e1 nh\u00e2n' : 'Personal',
                  words: personalVocabWords,
                })
              }
              className="w-full text-left bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white rounded-2xl p-5 mb-6 flex items-center justify-between gap-4 hover:from-fuchsia-500 hover:to-purple-500 transition-colors cursor-pointer shadow-xl shadow-fuchsia-300/50 dark:shadow-fuchsia-950/25"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                  <BookOpen size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{locale === 'vi' ? 'S\u1ed5 tay t\u1eeb v\u1ef1ng c\u1ee7a t\u00f4i' : 'My Personal Vocabulary'}</h2>
                  <p className="text-white/70 text-sm">{text.learnedWords(personalVocabWords.length)}</p>
                </div>
              </div>
              <ArrowRight className="shrink-0" />
            </button>
          )}
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTopics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => chooseScope({ type: 'topic', ...topic })}
                className="text-left bg-white dark:bg-[#1E1226] border border-pink-200 dark:border-pink-500/20 rounded-2xl p-5 hover:border-pink-400 dark:hover:border-pink-400/60 hover:shadow-lg hover:shadow-pink-100/70 transition-all cursor-pointer min-h-[150px] flex flex-col justify-between"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
                    {topic.categoryName}
                  </p>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white break-words">{topic.name}</h3>
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-sm font-semibold text-pink-600 dark:text-pink-300">
                    {text.learnedWords(topic.words.length)}
                  </span>
                  <ArrowRight size={18} className="text-slate-300 dark:text-slate-600" />
                </div>
              </button>
            ))}
          </div>
          {filteredTopics.length === 0 && (
            <div className="bg-white dark:bg-[#1E1226] border border-pink-100 dark:border-[#3A2F43] rounded-2xl p-8 text-center text-slate-500 dark:text-slate-400">
              {text.noTopic}
            </div>
          )}
        </div>
      </div>
    );
  }
  if (screen === 'playing' && selectedMode === 'matching') {
    const progress = leftItems.length > 0 ? Math.round((matchedCount / leftItems.length) * 100) : 0;
    return (
      <div className="flex-1 overflow-y-auto bg-[#fff4fa] dark:bg-[#160B1E] p-4 sm:p-8 transition-colors">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <button
                onClick={backToScope}
                className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-3 transition-colors cursor-pointer w-fit"
              >
                <ArrowLeft size={18} />
                <span className="font-medium">{text.changeScope}</span>
              </button>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {modeConfig?.labels[locale]?.title}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">{selectedScope?.name}</p>
            </div>
            <div className="bg-white dark:bg-[#1E1226] border border-pink-200 dark:border-pink-500/20 rounded-xl px-4 py-3 text-sm font-bold text-pink-600 dark:text-pink-300 w-fit shadow-sm shadow-pink-100/60">
              {matchedCount} / {leftItems.length}
            </div>
          </div>
          <div className="w-full h-2.5 bg-pink-100 dark:bg-[#2A1F33] rounded-full mb-6 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-pink-500 to-[#ef4d9b] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.25 }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-5">
            <div className="flex flex-col gap-2.5">
              <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 text-center">
                {text.english}
              </div>
              {leftItems.map((item) => {
                const link = links.find((row) => row.leftId === item.id);
                const isMatched = !!link;
                const isSelected = selectedLeft === item.id;
                const color = isMatched ? PAIR_COLORS[link.colorIdx] : null;
                let cls = 'bg-white dark:bg-[#1E1226] border-pink-200 dark:border-pink-500/20 text-slate-800 dark:text-white hover:border-pink-400 dark:hover:border-pink-400 hover:shadow-md hover:shadow-pink-100/70 cursor-pointer';
                if (isMatched && color) {
                  cls = `${color.bg} dark:bg-opacity-20 ${color.border} ${color.text} dark:text-opacity-90 shadow-sm`;
                } else if (isSelected) {
                  cls = 'bg-pink-50 dark:bg-pink-500/10 border-pink-500 text-pink-800 dark:text-pink-200 shadow-lg shadow-pink-200/70 dark:shadow-pink-950/20 ring-2 ring-pink-500/20 scale-[1.02]';
                }
                return (
                  <motion.button
                    layout
                    key={`left-${item.id}`}
                    onClick={() => handleItemClick('left', item.id)}
                    className={`relative min-h-[68px] p-3 md:p-4 rounded-xl border-2 text-center font-bold text-base md:text-lg transition-all duration-200 break-words ${cls}`}
                  >
                    {item.word}
                    {isMatched && <CheckCircle2 size={16} className="absolute top-2 right-2 opacity-50" />}
                  </motion.button>
                );
              })}
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 text-center">
                {text.vietnamese}
              </div>
              {rightItems.map((item) => {
                const link = links.find((row) => row.rightId === item.id);
                const isMatched = !!link;
                const isSelected = selectedRight === item.id;
                const color = isMatched ? PAIR_COLORS[link.colorIdx] : null;
                let cls = 'bg-white dark:bg-[#1E1226] border-pink-200 dark:border-pink-500/20 text-slate-700 dark:text-slate-200 hover:border-pink-400 dark:hover:border-pink-400 hover:shadow-md hover:shadow-pink-100/70 cursor-pointer';
                if (isMatched && color) {
                  cls = `${color.bg} dark:bg-opacity-20 ${color.border} ${color.text} dark:text-opacity-90 shadow-sm`;
                } else if (isSelected) {
                  cls = 'bg-pink-50 dark:bg-pink-500/10 border-pink-500 text-pink-800 dark:text-pink-200 shadow-lg shadow-pink-200/70 dark:shadow-pink-950/20 ring-2 ring-pink-500/20 scale-[1.02]';
                }
                return (
                  <motion.button
                    layout
                    key={`right-${item.id}`}
                    onClick={() => handleItemClick('right', item.id)}
                    className={`relative min-h-[68px] p-3 md:p-4 rounded-xl border-2 text-center text-sm md:text-base font-medium transition-all duration-200 break-words ${cls}`}
                  >
                    <span className="line-clamp-3">{item.meaning}</span>
                    {isMatched && <CheckCircle2 size={16} className="absolute top-2 right-2 opacity-50" />}
                  </motion.button>
                );
              })}
            </div>
          </div>
          <AnimatePresence>
            {allMatched && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-8 flex justify-center pb-8"
              >
                <button
                  onClick={() => setScreen('results')}
                  className="flex items-center gap-3 bg-gradient-to-r from-pink-500 to-[#e63e91] text-white font-bold py-4 px-8 rounded-2xl hover:from-pink-600 hover:to-[#d83282] transition-all shadow-xl shadow-pink-300/60 dark:shadow-pink-950/20 cursor-pointer text-base sm:text-lg"
                >
                  <Send size={22} />
                  {text.submit}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }
  if (screen === 'playing' && selectedMode === 'meaning' && currentTypingWord) {
    const progress = Math.round(((currentWordIndex + 1) / currentRoundItems.length) * 100);
    const isDoneWithWord = typingFeedback === 'correct' || typingFeedback === 'incorrect' || typingFeedback === 'revealed';
    return (
      <div className="flex-1 overflow-y-auto bg-[#fff4fa] dark:bg-[#160B1E] p-4 sm:p-8 transition-colors">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={backToScope}
            className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-6 transition-colors cursor-pointer w-fit"
          >
            <ArrowLeft size={18} />
            <span className="font-medium">{text.changeScope}</span>
          </button>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {modeConfig?.labels[locale]?.title}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">{selectedScope?.name}</p>
            </div>
            <div className="bg-white dark:bg-[#1E1226] border border-pink-200 dark:border-pink-500/20 rounded-xl px-4 py-3 text-sm font-bold text-pink-600 dark:text-pink-300 shrink-0 shadow-sm shadow-pink-100/60">
              {currentWordIndex + 1} / {currentRoundItems.length}
            </div>
          </div>
          <div className="w-full h-2.5 bg-pink-100 dark:bg-[#2A1F33] rounded-full mb-8 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-pink-500 to-[#ef4d9b] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.25 }}
            />
          </div>
          <div className="bg-white dark:bg-[#1E1226] border border-pink-200 dark:border-pink-500/20 rounded-2xl p-6 sm:p-8 shadow-xl shadow-pink-100/70 dark:shadow-none">
            <div className="text-center mb-8">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
                {text.vietnamese}
              </p>
              <div className="flex items-center justify-center gap-3">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white break-words">
                  {currentTypingWord.meaning}
                </h2>
              </div>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={typingInput}
                  onChange={(event) => {
                    setTypingInput(event.target.value);
                    if (typingFeedback === 'incorrect') setTypingFeedback(null);
                  }}
                  disabled={typingFeedback === 'correct' || typingFeedback === 'revealed'}
                  placeholder={text.inputMeaning}
                  className={`w-full rounded-xl border-2 px-5 py-4 text-lg sm:text-xl font-medium text-center outline-none transition-colors bg-slate-50 dark:bg-[#160B1E] ${typingFeedback === 'correct' || typingFeedback === 'revealed'
                    ? 'border-green-500 text-green-600 dark:text-green-400'
                    : typingFeedback === 'incorrect'
                      ? 'border-red-500 text-red-600 dark:text-red-400'
                      : 'border-pink-200 dark:border-pink-500/20 text-slate-900 dark:text-white focus:border-pink-400 focus:ring-4 focus:ring-pink-100/70'
                    }`}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') nextTypingWord();
                  }}
                  autoFocus
                />
                {(typingFeedback === 'correct' || typingFeedback === 'revealed') && (
                  <CheckCircle2 size={24} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" />
                )}
                {typingFeedback === 'incorrect' && (
                  <XCircle size={24} className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500" />
                )}
              </div>
              {isDoneWithWord && (
                <div className="rounded-xl bg-[#fff8fc] dark:bg-[#160B1E] border border-pink-100 dark:border-pink-500/20 p-4">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
                    {text.savedMeaning}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mb-1">
                    <p className="text-slate-800 dark:text-slate-200 font-bold text-2xl">{currentTypingWord.word}</p>
                    <button
                      onClick={() => speakWord(currentTypingWord)}
                      className="p-2 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors cursor-pointer flex-shrink-0"
                      title={text.hear}
                    >
                      <Volume2 size={20} />
                    </button>
                  </div>
                  {currentTypingWord.pro && (
                    <p className="text-slate-500 dark:text-slate-400">{currentTypingWord.pro}</p>
                  )}
                </div>
              )}
              {!isDoneWithWord ? (
                <div className="grid sm:grid-cols-[1fr_2fr] gap-3">
                  <button
                    onClick={revealMeaningAnswer}
                    className="flex items-center justify-center gap-2 border border-slate-200 dark:border-[#3A2F43] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 py-3.5 rounded-xl font-semibold transition-colors cursor-pointer"
                  >
                    <Eye size={20} />
                    {text.reveal}
                  </button>
                  <button
                    onClick={checkMeaningAnswer}
                    className="bg-pink-500 hover:bg-pink-600 text-white py-3.5 rounded-xl font-semibold transition-colors cursor-pointer shadow-lg shadow-pink-300/60 dark:shadow-pink-950/20"
                  >
                    {text.check}
                  </button>
                </div>
              ) : (
                <button
                  onClick={nextTypingWord}
                  className="w-full bg-[#2a1124] dark:bg-pink-600 text-white hover:bg-[#421536] dark:hover:bg-pink-500 py-3.5 rounded-xl font-semibold transition-colors cursor-pointer shadow-lg shadow-pink-200/70 dark:shadow-pink-950/20"
                >
                  {currentWordIndex < currentRoundItems.length - 1 ? text.continue : text.complete}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (screen === 'results') {
    const result = getResult();
    return (
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-[#fff4fa] dark:bg-[#0B0510] transition-colors min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="max-w-md w-full text-center relative z-10"
        >
          {/* Glowing Trophy */}
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full blur-xl opacity-60 animate-pulse" />
            <div className="relative w-full h-full rounded-full flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-500 shadow-xl shadow-orange-500/30 border-4 border-[#0B0510]">
              <Trophy size={40} className="text-white drop-shadow-md" />
            </div>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight drop-shadow-sm">{text.complete}</h1>
          <p className="text-slate-500 dark:text-slate-400/80 mb-8 font-medium text-lg">{selectedScope?.name}</p>
          {/* Result Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="bg-white/80 dark:bg-[#171123]/80 backdrop-blur-xl rounded-3xl p-6 mb-8 border border-pink-200 dark:border-white/5 shadow-2xl shadow-pink-100/50 dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400 font-medium">{text.totalWords}</span>
                <span className="text-xl font-bold text-slate-800 dark:text-white">{result.total}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400 font-medium">{text.correct}</span>
                <span className="text-xl font-bold text-emerald-500 dark:text-emerald-400 drop-shadow-sm">{result.score}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-white/5">
                <span className="text-slate-500 dark:text-slate-400 font-medium">{text.incorrect}</span>
                <span className="text-xl font-bold text-rose-500 dark:text-rose-400 drop-shadow-sm">{result.mistakes}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-base font-bold text-slate-700 dark:text-slate-200">{text.result}</span>
                <span className="text-2xl font-black text-amber-500 dark:text-amber-400 drop-shadow-sm">{result.percent}%</span>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={retryCurrentRound}
              className="w-full flex items-center justify-center gap-3 bg-slate-900 dark:bg-[#1E162B] text-white font-bold py-4 rounded-2xl hover:bg-slate-800 dark:hover:bg-[#2A203B] transition-all shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_25px_rgba(255,255,255,0.05)] border border-transparent dark:border-white/5 cursor-pointer text-lg"
            >
              <RotateCcw size={22} />
              {text.retryRound}
            </motion.button>

            <motion.button
              whileHover={{ scale: canStartNextRound ? 1.02 : 1 }}
              whileTap={{ scale: canStartNextRound ? 0.98 : 1 }}
              onClick={startNextRound}
              disabled={!canStartNextRound}
              className={`w-full flex items-center justify-center gap-3 font-bold py-4 rounded-2xl transition-all cursor-pointer text-lg ${canStartNextRound
                ? 'bg-pink-500 text-white border-pink-500 hover:bg-pink-600 cursor-pointer shadow-lg shadow-pink-300/60 dark:shadow-pink-950/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 cursor-not-allowed'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-[0_8px_25px_rgba(236,72,153,0.3)] hover:shadow-[0_12px_30px_rgba(236,72,153,0.4)] border-none'
                  : 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700/50 cursor-not-allowed'
                }`}
            >
              <Shuffle size={22} />
              {canStartNextRound ? text.nextRound : text.finishedScope}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={backToScope}
              className="w-full flex items-center justify-center gap-3 bg-transparent text-slate-700 dark:text-slate-300 border-2 border-slate-200 dark:border-white/10 font-bold py-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer text-lg"
            >
              <ArrowLeft size={22} />
              {text.changeScope}
            </motion.button>
            <div className="pt-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="inline-flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <Home size={18} />
                {text.home}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }
  return null;
}
