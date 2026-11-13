import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  Delete,
  Lightbulb,
  RotateCcw,
  Shuffle,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { praiseLearningBot } from '../../../lib/learningBot';
import { usePracticeSessionTimer } from '../../../lib/practiceActivity';
import {
  isSoundEnabled,
  playCorrectSound,
  playFanfareSound,
  playWrongSound,
  setSoundEnabled,
  speakWord,
} from '../gameAudio';
import { shuffleGameWords } from '../wordRocket/gameConfig';

const ROUND_SIZE = 10;

function scrambleWordLetters(word) {
  const letters = word
    .toUpperCase()
    .split('')
    .map((char, id) => ({ id: `${char}-${id}-${Math.random()}`, char, placed: false }));

  // Shuffle until it's not identical to the original (if len > 2)
  let scrambled = shuffleGameWords(letters);
  if (letters.length > 2 && scrambled.map((l) => l.char).join('') === word.toUpperCase()) {
    scrambled = [...scrambled].reverse();
  }
  return scrambled;
}

export default function WordScrambleGame({ words = [], user, onExit }) {
  const [phase, setPhase] = useState('ready'); // 'ready' | 'playing' | 'paused' | 'complete'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [results, setResults] = useState([]);
  const [hintUsedCount, setHintUsedCount] = useState(0);
  const [wrongShake, setWrongShake] = useState(false);

  // Deck for round
  const [deck, setDeck] = useState([]);
  const currentWord = deck[currentIndex] || null;

  // Active letter tiles for current word
  const [availableLetters, setAvailableLetters] = useState([]);
  const [placedLetters, setPlacedLetters] = useState([]);

  usePracticeSessionTimer('vocabulary', user, phase === 'playing');

  // Toggle sound
  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  // Start / Restart game
  const startGame = () => {
    const roundWords = shuffleGameWords(words).slice(0, ROUND_SIZE);
    setDeck(roundWords);
    setCurrentIndex(0);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setResults([]);
    setHintUsedCount(0);

    if (roundWords[0]) {
      setupWordLetters(roundWords[0].word);
    }
    setPhase('playing');
  };

  const setupWordLetters = (word) => {
    const letters = scrambleWordLetters(word);
    setAvailableLetters(letters);
    setPlacedLetters([]);
    setWrongShake(false);
  };

  // When moving to next word
  useEffect(() => {
    if (phase === 'playing' && currentWord) {
      setupWordLetters(currentWord.word);
    }
  }, [currentIndex, phase]);

  // Click letter to place it
  const handlePickLetter = (tile) => {
    if (tile.placed || phase !== 'playing') return;
    setAvailableLetters((prev) =>
      prev.map((l) => (l.id === tile.id ? { ...l, placed: true } : l)),
    );
    setPlacedLetters((prev) => [...prev, tile]);
  };

  // Click placed letter to return it
  const handleRemovePlacedLetter = (tile) => {
    if (phase !== 'playing') return;
    setPlacedLetters((prev) => prev.filter((l) => l.id !== tile.id));
    setAvailableLetters((prev) =>
      prev.map((l) => (l.id === tile.id ? { ...l, placed: false } : l)),
    );
  };

  // Backspace last placed letter
  const handleBackspace = () => {
    if (placedLetters.length === 0 || phase !== 'playing') return;
    const last = placedLetters[placedLetters.length - 1];
    handleRemovePlacedLetter(last);
  };

  // Reset current word placed letters
  const handleResetLetters = () => {
    if (phase !== 'playing') return;
    setPlacedLetters([]);
    setAvailableLetters((prev) => prev.map((l) => ({ ...l, placed: false })));
  };

  // Shuffle available letters
  const handleReshuffle = () => {
    if (phase !== 'playing') return;
    setAvailableLetters((prev) => shuffleGameWords([...prev]));
  };

  // Use Hint (places next correct letter)
  const handleHint = () => {
    if (!currentWord || phase !== 'playing') return;
    const targetWord = currentWord.word.toUpperCase();
    const nextIdx = placedLetters.length;
    if (nextIdx >= targetWord.length) return;

    const neededChar = targetWord[nextIdx];
    const candidate = availableLetters.find((l) => !l.placed && l.char === neededChar);

    if (candidate) {
      setHintUsedCount((prev) => prev + 1);
      handlePickLetter(candidate);
    }
  };

  // Physical Keyboard Listener
  useEffect(() => {
    if (phase !== 'playing' || !currentWord) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleResetLetters();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        const char = e.key.toUpperCase();
        const candidate = availableLetters.find((l) => !l.placed && l.char === char);
        if (candidate) {
          handlePickLetter(candidate);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [availableLetters, phase, currentWord, placedLetters]);

  // Check completion whenever placedLetters changes
  useEffect(() => {
    if (phase !== 'playing' || !currentWord) return;
    const target = currentWord.word.toUpperCase();
    const current = placedLetters.map((l) => l.char).join('');

    if (current.length === target.length) {
      if (current === target) {
        // Correct!
        const nextCombo = combo + 1;
        setCombo(nextCombo);
        setMaxCombo((prev) => Math.max(prev, nextCombo));

        const earned = Math.round(120 * (1 + nextCombo * 0.15));
        setScore((prev) => prev + earned);
        playCorrectSound(nextCombo);
        speakWord(currentWord.word);

        setResults((prev) => [
          ...prev,
          { ...currentWord, isCorrect: true, hintUsed: hintUsedCount > 0 },
        ]);

        setTimeout(() => {
          if (currentIndex + 1 >= deck.length) {
            setPhase('complete');
            playFanfareSound?.();
            praiseLearningBot('Chúc mừng bạn đã hoàn thành xuất sắc thử thách Đảo chữ! 🧩');
          } else {
            setCurrentIndex((prev) => prev + 1);
            setHintUsedCount(0);
          }
        }, 600);
      } else {
        // Wrong combination
        setWrongShake(true);
        playWrongSound();
        setCombo(0);
        setTimeout(() => setWrongShake(false), 500);
      }
    }
  }, [placedLetters, currentWord, phase, deck.length, currentIndex, combo, hintUsedCount]);

  // Ready Screen
  if (phase === 'ready') {
    return (
      <div className="relative mx-auto max-w-3xl overflow-hidden rounded-[2.5rem] border border-emerald-400/30 bg-slate-900/85 p-6 shadow-2xl backdrop-blur-2xl sm:p-10">
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-xl shadow-emerald-500/30">
            <Shuffle size={38} className="text-white" />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
            <Sparkles size={14} /> CHẾ ĐỘ RÈN CHÍNH TẢ & TƯ DUY
          </span>
          <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">
            Đảo Chữ Thiên Tài
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Các chữ cái tiếng Anh bị xáo trộn lung tung! Hãy đọc nghĩa tiếng Việt và nhấp hoặc gõ
            từng ký tự để xếp lại từ vựng hoàn chỉnh.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-center">
              <span className="block text-xs font-semibold text-slate-400">Số từ mỗi lượt</span>
              <span className="text-lg font-black text-white">{ROUND_SIZE} từ</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-center">
              <span className="block text-xs font-semibold text-slate-400">Cách chơi</span>
              <span className="text-lg font-black text-emerald-300">Gõ phím hoặc Click</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-center">
              <span className="block text-xs font-semibold text-slate-400">Hỗ trợ gợi ý</span>
              <span className="text-lg font-black text-amber-300">Phím 💡 Hint</span>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={startGame}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-8 py-3.5 text-base font-extrabold text-white shadow-xl shadow-teal-500/25 transition hover:brightness-110 active:scale-95 sm:w-auto"
            >
              <Shuffle size={20} /> Bắt đầu xếp chữ
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
    const totalWords = results.length;
    const correctCount = results.filter((r) => r.isCorrect).length;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative mx-auto max-w-3xl overflow-hidden rounded-[2.5rem] border border-emerald-400/30 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-2xl sm:p-10"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-2xl shadow-emerald-500/40">
            <Trophy size={42} className="text-white" />
          </div>
          <h2 className="text-3xl font-black text-white sm:text-4xl">Hoàn Thành Xuất Sắc!</h2>
          <p className="mt-1 text-sm text-slate-300">
            Bạn đã ghép chuẩn xác toàn bộ {totalWords} từ vựng trong lượt chơi!
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
              <span className="block text-2xl font-black text-amber-300 sm:text-3xl">{score}</span>
              <span className="text-xs font-semibold text-slate-400">Điểm số</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
              <span className="block text-2xl font-black text-emerald-400 sm:text-3xl">
                {correctCount}/{totalWords}
              </span>
              <span className="text-xs font-semibold text-slate-400">Từ hoàn thành</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center col-span-2 sm:col-span-1">
              <span className="block text-2xl font-black text-teal-300 sm:text-3xl">
                x{maxCombo}
              </span>
              <span className="text-xs font-semibold text-slate-400">Combo cao nhất</span>
            </div>
          </div>

          {/* Word list review */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-4 text-left">
            <h3 className="mb-3 text-sm font-bold text-white">Từ vựng đã chinh phục</h3>
            <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
              {results.map((item, idx) => (
                <div
                  key={`${item.word}-${idx}`}
                  className="flex items-center justify-between rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs sm:text-sm"
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
                  <Check size={16} className="text-emerald-400" />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={startGame}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-7 py-3 font-extrabold text-white shadow-xl shadow-teal-500/20 transition hover:brightness-110 active:scale-95 sm:w-auto"
            >
              <RotateCcw size={18} /> Chơi vòng khác
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

  // Active Play Screen
  return (
    <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[2.5rem] border border-white/15 bg-slate-900/95 shadow-2xl backdrop-blur-2xl">
      {/* Top Header HUD */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-950/60 px-4 py-3 sm:px-6">
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
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500">
            <Shuffle size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white sm:text-base">Đảo chữ thiên tài</h3>
            <p className="text-[11px] text-slate-400">
              Từ {currentIndex + 1} / {deck.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-emerald-300">
            <span>x{combo} COMBO</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black text-white">
            <Trophy size={14} className="text-amber-400" />
            <span>{score} pts</span>
          </div>
          <button
            type="button"
            onClick={handleToggleSound}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button
            type="button"
            onClick={onExit}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-rose-500/20 hover:text-rose-300"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / deck.length) * 100}%` }}
        />
      </div>

      {/* Main Play Body */}
      <div className="p-6 sm:p-10">
        {/* Word Meaning Prompt */}
        <div className="mb-6 rounded-3xl border border-teal-400/25 bg-slate-950/70 p-6 text-center shadow-xl sm:p-8">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-teal-300">
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
        </div>

        {/* Answer Tray (Placed Letters) */}
        <div
          className={`mb-6 min-h-20 rounded-2xl border ${
            wrongShake ? 'border-rose-500 bg-rose-500/10' : 'border-dashed border-white/20 bg-black/20'
          } p-4 transition duration-150`}
        >
          <div className="flex flex-wrap items-center justify-center gap-2">
            {placedLetters.length === 0 ? (
              <span className="text-xs font-bold text-slate-500">
                Nhấp vào các ký tự bên dưới hoặc gõ phím để xếp chữ
              </span>
            ) : (
              placedLetters.map((tile, idx) => (
                <motion.button
                  key={`placed-${tile.id}-${idx}`}
                  layout
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  type="button"
                  onClick={() => handleRemovePlacedLetter(tile)}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-emerald-400 bg-emerald-500/20 text-xl font-black text-emerald-200 shadow-lg shadow-emerald-500/10 transition hover:bg-rose-500/20 hover:border-rose-400 hover:text-rose-200 sm:h-14 sm:w-14 sm:text-2xl"
                  title="Nhấp để gỡ ký tự này"
                >
                  {tile.char}
                </motion.button>
              ))
            )}
          </div>
        </div>

        {/* Available Scrambled Letter Tiles */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {availableLetters.map((tile) => (
            <motion.button
              key={tile.id}
              layout
              disabled={tile.placed}
              onClick={() => handlePickLetter(tile)}
              className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-xl font-black transition-all sm:h-14 sm:w-14 sm:text-2xl ${
                tile.placed
                  ? 'border-transparent bg-white/5 opacity-20 text-slate-500 cursor-not-allowed scale-90'
                  : 'border-white/15 bg-white/10 text-white hover:border-teal-400 hover:bg-teal-500/20 hover:scale-105 active:scale-95 shadow-md'
              }`}
            >
              {tile.char}
            </motion.button>
          ))}
        </div>

        {/* Helper Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleBackspace}
            disabled={placedLetters.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
          >
            <Delete size={16} /> Xóa ký tự (Backspace)
          </button>
          <button
            type="button"
            onClick={handleReshuffle}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-white/10"
          >
            <Shuffle size={16} /> Đảo lại vị trí
          </button>
          <button
            type="button"
            onClick={handleResetLetters}
            disabled={placedLetters.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-slate-300 transition hover:bg-white/10 disabled:opacity-40"
          >
            <RotateCcw size={16} /> Xếp lại từ đầu (Esc)
          </button>
          <button
            type="button"
            onClick={handleHint}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-xs font-bold text-amber-300 transition hover:bg-amber-400/20"
          >
            <Lightbulb size={16} /> Gợi ý ký tự kế
          </button>
        </div>
      </div>
    </div>
  );
}
