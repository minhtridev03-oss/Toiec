import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  Flame,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { praiseLearningBot } from '../../../lib/learningBot';
import { usePracticeSessionTimer } from '../../../lib/practiceActivity';
import {
  isSoundEnabled,
  playCorrectSound,
  playFanfareSound,
  playFrenzySound,
  playTickSound,
  playWrongSound,
  setSoundEnabled,
  speakWord,
} from '../gameAudio';
import { shuffleGameWords } from '../wordRocket/gameConfig';

const GAME_DURATION = 60; // 60 seconds

function buildChoices(currentWord, allWords) {
  if (!currentWord || !allWords || allWords.length < 2) {
    return [currentWord];
  }
  const distractors = allWords
    .filter((w) => w.word.toLowerCase() !== currentWord.word.toLowerCase())
    .slice(0, 10);
  const shuffledDistractors = shuffleGameWords(distractors).slice(0, 3);
  return shuffleGameWords([currentWord, ...shuffledDistractors]);
}

export default function SpeedReflexGame({ words = [], user, onExit }) {
  const [phase, setPhase] = useState('ready'); // 'ready' | 'playing' | 'paused' | 'complete'
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState(null); // choice object
  const [feedback, setFeedback] = useState(null); // 'correct' | 'wrong'
  const [sessionResults, setSessionResults] = useState([]);
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [isFrenzy, setIsFrenzy] = useState(false);
  const timerRef = useRef(null);

  const bestScoreKey = `speed-reflex-best:${user?.id || 'guest'}`;
  const [bestScore, setBestScore] = useState(() => {
    try {
      return Number(window.localStorage.getItem(bestScoreKey)) || 0;
    } catch {
      return 0;
    }
  });
  const [isNewBest, setIsNewBest] = useState(false);

  // Deck of words for this session
  const [deck, setDeck] = useState(() => shuffleGameWords(words));

  const currentWord = deck[currentIndex % deck.length] || null;

  // 4 choices for current word
  const choices = useMemo(() => {
    return buildChoices(currentWord, words);
  }, [currentWord, words]);

  usePracticeSessionTimer('vocabulary', user, phase === 'playing');

  // Toggle sound
  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  // Start game
  const startGame = () => {
    const shuffled = shuffleGameWords(words);
    setDeck(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setTimeLeft(GAME_DURATION);
    setSessionResults([]);
    setSelectedChoice(null);
    setFeedback(null);
    setIsNewBest(false);
    setIsFrenzy(false);
    setPhase('playing');
  };

  // Timer countdown
  useEffect(() => {
    if (phase !== 'playing') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        if (prev <= 10 && prev > 1) {
          playTickSound();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  // Handle Game Over when timeLeft reaches 0
  useEffect(() => {
    if (timeLeft === 0 && phase === 'playing') {
      setPhase('complete');
      if (score > bestScore) {
        setIsNewBest(true);
        setBestScore(score);
        try {
          window.localStorage.setItem(bestScoreKey, String(score));
        } catch {}
      }
      playFanfareSound?.();
      praiseLearningBot(
        score >= 1000
          ? 'Tốc độ phản xạ kinh ngạc! Bạn vừa lập kỷ lục điểm số siêu ấn tượng ⚡'
          : 'Tuyệt vời! 60 giây luyện phản xạ chớp nhoáng giúp não bộ ghi nhớ cực sâu 💪',
      );
    }
  }, [timeLeft, phase, score, bestScore, bestScoreKey]);

  // Handle Answer selection
  const handleSelect = useCallback(
    (choice) => {
      if (phase !== 'playing' || feedback !== null || !currentWord) return;

      setSelectedChoice(choice);
      const isCorrect = choice.word.toLowerCase() === currentWord.word.toLowerCase();

      if (isCorrect) {
        const nextCombo = combo + 1;
        setCombo(nextCombo);
        setMaxCombo((prev) => Math.max(prev, nextCombo));

        // Combo multipliers
        let multiplier = 1;
        if (nextCombo >= 12) multiplier = 3.5;
        else if (nextCombo >= 8) multiplier = 2.5;
        else if (nextCombo >= 5) multiplier = 2;
        else if (nextCombo >= 3) multiplier = 1.5;

        const earned = Math.round(100 * multiplier);
        setScore((prev) => prev + earned);
        setFeedback('correct');

        playCorrectSound(nextCombo);
        speakWord(currentWord.word);

        if (nextCombo === 5 || nextCombo === 10) {
          setIsFrenzy(true);
          playFrenzySound();
          setTimeout(() => setIsFrenzy(false), 1200);
        }

        setSessionResults((prev) => [
          ...prev,
          { ...currentWord, userChoice: choice.word, isCorrect: true },
        ]);

        // Next word after rapid delay (340ms)
        setTimeout(() => {
          setSelectedChoice(null);
          setFeedback(null);
          setCurrentIndex((prev) => prev + 1);
        }, 340);
      } else {
        setCombo(0);
        setFeedback('wrong');
        playWrongSound();

        setSessionResults((prev) => [
          ...prev,
          { ...currentWord, userChoice: choice.word, isCorrect: false },
        ]);

        // Next word after slightly longer delay (600ms) to see correct answer
        setTimeout(() => {
          setSelectedChoice(null);
          setFeedback(null);
          setCurrentIndex((prev) => prev + 1);
        }, 600);
      }
    },
    [phase, feedback, currentWord, combo],
  );

  // Keyboard shortcut listener (1, 2, 3, 4)
  useEffect(() => {
    if (phase !== 'playing') return;

    const handleKeyDown = (e) => {
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 4 && choices[num - 1]) {
        e.preventDefault();
        handleSelect(choices[num - 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, choices, handleSelect]);

  // Ready Screen
  if (phase === 'ready') {
    return (
      <div className="relative mx-auto max-w-3xl overflow-hidden rounded-[2.5rem] border border-amber-300/30 bg-slate-900/85 p-6 shadow-2xl backdrop-blur-2xl sm:p-10">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-rose-500 shadow-xl shadow-amber-500/30">
            <Zap size={40} className="text-white" />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300">
            <Sparkles size={14} /> CHẾ ĐỘ 60 GIÂY THỬ THÁCH
          </span>
          <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">
            Phản Xạ Chớp Nhoáng
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
            60 giây sinh tử! Đọc nghĩa tiếng Việt và chọn nhanh từ tiếng Anh chuẩn xác. Giữ chuỗi
            đúng liên tiếp để bùng nổ điểm số <span className="font-bold text-amber-300">Frenzy Mode</span>!
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-center">
              <span className="block text-xs font-semibold text-slate-400">Kho từ ôn luyện</span>
              <span className="text-lg font-black text-white">{words.length} từ</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-center">
              <span className="block text-xs font-semibold text-slate-400">Kỷ lục cao nhất</span>
              <span className="text-lg font-black text-amber-300">{bestScore} pts</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-center">
              <span className="block text-xs font-semibold text-slate-400">Phím tắt nhanh</span>
              <span className="text-lg font-black text-cyan-300">Phím 1 - 4</span>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={startGame}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-pink-500 px-8 py-3.5 text-base font-extrabold text-white shadow-xl shadow-rose-500/25 transition hover:brightness-110 active:scale-95 sm:w-auto"
            >
              <Zap size={20} /> Bắt đầu 60 giây ngay
            </button>
            <button
              type="button"
              onClick={onExit}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-bold text-slate-300 transition hover:bg-white/10 sm:w-auto"
            >
              <ArrowLeft size={18} /> Về sảnh chờ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Complete Screen
  if (phase === 'complete') {
    const totalAnswered = sessionResults.length;
    const correctCount = sessionResults.filter((r) => r.isCorrect).length;
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
    const reviewWords = sessionResults.filter((r) => !r.isCorrect);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative mx-auto max-w-3xl overflow-hidden rounded-[2.5rem] border border-amber-400/30 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-2xl sm:p-10"
      >
        <div className="text-center">
          <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-2xl shadow-amber-500/40">
            <Trophy size={42} className="text-white" />
            {isNewBest && (
              <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-xs font-black text-white shadow">
                ★
              </span>
            )}
          </div>
          <h2 className="text-3xl font-black text-white sm:text-4xl">Hết Giờ Phản Xạ!</h2>
          <p className="mt-1 text-sm text-slate-300">
            {isNewBest
              ? '🎉 KỶ LỤC MỚI! Bạn đã vượt qua kỷ lục trước đó!'
              : 'Một lượt rèn phản xạ tốc độ cao cực kỳ xuất sắc!'}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
              <span className="block text-2xl font-black text-amber-300 sm:text-3xl">{score}</span>
              <span className="text-xs font-semibold text-slate-400">Điểm số</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
              <span className="block text-2xl font-black text-emerald-400 sm:text-3xl">
                {accuracy}%
              </span>
              <span className="text-xs font-semibold text-slate-400">Chính xác</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
              <span className="block text-2xl font-black text-rose-400 sm:text-3xl">
                x{maxCombo}
              </span>
              <span className="text-xs font-semibold text-slate-400">Chuỗi cao nhất</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
              <span className="block text-2xl font-black text-cyan-300 sm:text-3xl">
                {correctCount}/{totalAnswered}
              </span>
              <span className="text-xs font-semibold text-slate-400">Từ chuẩn</span>
            </div>
          </div>

          {/* Review words section */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-4 text-left">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                Từ vựng trong lượt ({sessionResults.length} từ)
              </h3>
              <span className="text-xs font-semibold text-rose-300">
                {reviewWords.length} từ cần chú ý
              </span>
            </div>
            <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
              {sessionResults.map((item, idx) => (
                <div
                  key={`${item.word}-${idx}`}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs sm:text-sm ${
                    item.isCorrect
                      ? 'border border-emerald-500/20 bg-emerald-500/5'
                      : 'border border-rose-500/30 bg-rose-500/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => speakWord(item.word)}
                      className="rounded-lg p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white"
                      title="Nghe phát âm"
                    >
                      <Volume2 size={16} />
                    </button>
                    <div>
                      <span className="font-extrabold text-white">{item.word}</span>
                      {item.pronunciation && (
                        <span className="ml-2 font-mono text-[11px] text-slate-400">
                          {item.pronunciation}
                        </span>
                      )}
                      <p className="line-clamp-1 text-[11px] text-slate-300 sm:text-xs">
                        {item.meaning}
                      </p>
                    </div>
                  </div>
                  <div>
                    {item.isCorrect ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                        <Check size={14} /> Đúng
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400">
                        <X size={14} /> Sai ({item.userChoice})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={startGame}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 px-7 py-3 font-extrabold text-white shadow-xl shadow-rose-500/20 transition hover:brightness-110 active:scale-95 sm:w-auto"
            >
              <RotateCcw size={18} /> Chơi lại 60s nữa
            </button>
            <button
              type="button"
              onClick={onExit}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-6 py-3 font-bold text-slate-300 transition hover:bg-white/10 sm:w-auto"
            >
              <ArrowLeft size={18} /> Đổi chế độ khác
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Active Game In-Progress
  const timePercent = (timeLeft / GAME_DURATION) * 100;
  const isUrgent = timeLeft <= 10;

  return (
    <div
      className={`relative mx-auto max-w-4xl overflow-hidden rounded-[2.5rem] border ${
        isFrenzy ? 'border-amber-400 shadow-[0_0_60px_rgba(251,191,36,0.35)]' : 'border-white/15'
      } bg-slate-900/95 shadow-2xl backdrop-blur-2xl transition-all duration-300`}
    >
      {/* Top Header HUD */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-950/60 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="mr-1 inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-white/15 hover:text-white"
              title="Về sảnh Arcade"
            >
              ← <span className="hidden sm:inline">Sảnh Arcade</span>
            </button>
          )}
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-rose-500">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white sm:text-base">Phản xạ 60 giây</h3>
            <p className="text-[11px] text-slate-400">Câu #{currentIndex + 1}</p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-2">
          {/* Combo badge */}
          <div
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black transition ${
              combo >= 5
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-lg shadow-rose-500/30'
                : 'border border-white/10 bg-white/5 text-amber-300'
            }`}
          >
            <Flame size={15} className={combo >= 5 ? 'animate-bounce' : ''} />
            <span>x{combo} COMBO</span>
          </div>

          {/* Score */}
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-white">
            <Trophy size={14} className="text-amber-400" />
            <span>{score} pts</span>
          </div>

          {/* Sound toggle */}
          <button
            type="button"
            onClick={handleToggleSound}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
            title={soundOn ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Pause / Exit */}
          <button
            type="button"
            onClick={() => setPhase((prev) => (prev === 'paused' ? 'playing' : 'paused'))}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
            title={phase === 'paused' ? 'Tiếp tục' : 'Tạm dừng'}
          >
            {phase === 'paused' ? <Play size={16} /> : <Pause size={16} />}
          </button>

          <button
            type="button"
            onClick={onExit}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-rose-500/20 hover:text-rose-300"
            title="Thoát trò chơi"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Countdown Timer Line */}
      <div className="relative h-2 w-full bg-slate-800">
        <motion.div
          className={`h-full transition-all duration-300 ${
            isUrgent
              ? 'bg-gradient-to-r from-rose-500 to-red-500'
              : 'bg-gradient-to-r from-amber-400 to-rose-500'
          }`}
          style={{ width: `${timePercent}%` }}
        />
      </div>

      {/* Main Playing Area */}
      <div className="relative p-6 sm:p-10">
        {/* Urgent countdown pill */}
        <div className="mb-6 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400">
            Nhấn phím 1 - 4 hoặc chạm vào thẻ
          </span>
          <div
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1 text-sm font-black transition ${
              isUrgent
                ? 'animate-pulse bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/50'
                : 'border border-white/10 bg-white/5 text-slate-300'
            }`}
          >
            <span>⏱️ 00:{String(timeLeft).padStart(2, '0')}</span>
          </div>
        </div>

        {/* Question Prompt */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentWord?.word || currentIndex}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="mb-8 rounded-3xl border border-cyan-400/25 bg-slate-950/70 p-6 text-center shadow-xl sm:p-8"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-300">
              Nghĩa tiếng Việt
            </span>
            <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
              {currentWord?.meaning}
            </h2>
            {currentWord?.pronunciation && (
              <p className="mt-1 font-mono text-xs font-medium text-slate-400">
                {currentWord.pronunciation}
              </p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* 4 Choices Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {choices.map((choice, idx) => {
            const isSelected = selectedChoice?.word === choice.word;
            const isTarget = currentWord?.word.toLowerCase() === choice.word.toLowerCase();

            let btnStyle = 'border-white/10 bg-white/5 hover:border-amber-400/40 hover:bg-white/10 text-white';

            if (feedback !== null) {
              if (isTarget) {
                btnStyle = 'border-emerald-400 bg-emerald-500/25 text-emerald-200 ring-2 ring-emerald-400/40';
              } else if (isSelected && !isTarget) {
                btnStyle = 'border-rose-500 bg-rose-500/25 text-rose-200 ring-2 ring-rose-500/40';
              } else {
                btnStyle = 'border-white/5 bg-white/5 opacity-40 text-slate-400';
              }
            }

            return (
              <button
                type="button"
                key={choice.word}
                disabled={feedback !== null || phase !== 'playing'}
                onClick={() => handleSelect(choice)}
                className={`group relative flex min-h-16 items-center justify-between rounded-2xl border p-4 text-left font-bold transition-all duration-150 active:scale-[0.98] ${btnStyle}`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-black/30 font-mono text-xs font-extrabold text-slate-300 group-hover:border-amber-400 group-hover:text-amber-300">
                    {idx + 1}
                  </span>
                  <span className="text-base font-extrabold tracking-wide sm:text-lg">
                    {choice.word}
                  </span>
                </div>
                {feedback !== null && isTarget && (
                  <Check size={20} className="text-emerald-400" />
                )}
                {feedback !== null && isSelected && !isTarget && (
                  <X size={20} className="text-rose-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Paused Overlay */}
        {phase === 'paused' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-400/20 text-amber-300">
                <Pause size={32} />
              </div>
              <h3 className="text-2xl font-black text-white">Đang tạm dừng</h3>
              <p className="mt-1 text-sm text-slate-300">Hít thở sâu và sẵn sàng tiếp tục!</p>
              <button
                type="button"
                onClick={() => setPhase('playing')}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-bold text-white shadow-lg transition hover:brightness-110"
              >
                <Play size={18} /> Tiếp tục chơi
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
