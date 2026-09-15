import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Check,
  Flame,
  Gamepad2,
  Heart,
  Lightbulb,
  Pause,
  Play,
  Rocket,
  RotateCcw,
  Shield,
  Sparkles,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { praiseLearningBot } from '../../../lib/learningBot';
import { usePracticeSessionTimer } from '../../../lib/practiceActivity';
import {
  buildWordHint,
  DIFFICULTIES,
  getTargetLanePercent,
  getWordFallSeconds,
} from './gameConfig';
import GameKeyboard from './GameKeyboard';
import { useWordRocketGame } from './useWordRocketGame';

const COPY = {
  vi: {
    gameName: 'Phi thuyền từ vựng', readyTitle: 'Sẵn sàng bảo vệ hành tinh?',
    readyCopy: 'Nhìn nghĩa tiếng Việt, nhập đúng từ tiếng Anh trước khi mục tiêu chạm vạch phòng thủ.',
    difficulty: 'Chọn độ khó', start: 'Bắt đầu chơi', learnedPool: (count) => `${count} từ sẵn sàng`,
    score: 'Điểm', level: 'Từ', combo: 'Combo', best: 'Kỷ lục', hint: 'Gợi ý', pause: 'Tạm dừng', quit: 'Thoát',
    placeholder: 'Nhập từ tiếng Anh...', submit: 'Bắn', wrong: 'Chưa đúng, thử lại nhé!',
    correct: 'Chính xác!', missed: 'Mục tiêu đã vượt qua!', paused: 'Đã tạm dừng', resume: 'Tiếp tục',
    complete: 'Hoàn thành nhiệm vụ!', completeCopy: 'Mỗi từ bạn vừa gặp đều là một bước tiến mới.',
    accuracy: 'Độ chính xác', correctWords: 'Từ đúng', missedWords: 'Bỏ lỡ', maxCombo: 'Combo cao nhất',
    playAgain: 'Chơi lại', changeDifficulty: 'Đổi độ khó', review: 'Từ cần ôn lại', noMissed: 'Bạn không bỏ lỡ từ nào. Tuyệt vời!',
    highScore: 'Kỷ lục mới!', defense: 'Vạch phòng thủ', answerWas: 'Đáp án',
    speed: 'Tốc độ', lostLife: 'Mất 1 tim',
  },
  en: {
    gameName: 'Word Rocket', readyTitle: 'Ready to defend the planet?',
    readyCopy: 'Read the meaning and type the English word before it reaches the defense line.',
    difficulty: 'Choose difficulty', start: 'Start game', learnedPool: (count) => `${count} words ready`,
    score: 'Score', level: 'Word', combo: 'Combo', best: 'Best', hint: 'Hint', pause: 'Pause', quit: 'Exit',
    placeholder: 'Type the English word...', submit: 'Fire', wrong: 'Not quite. Try again!',
    correct: 'Correct!', missed: 'Target slipped through!', paused: 'Game paused', resume: 'Resume',
    complete: 'Mission complete!', completeCopy: 'Every word you met is one more step forward.',
    accuracy: 'Accuracy', correctWords: 'Correct', missedWords: 'Missed', maxCombo: 'Best combo',
    playAgain: 'Play again', changeDifficulty: 'Change difficulty', review: 'Words to review', noMissed: 'No words missed. Amazing!',
    highScore: 'New high score!', defense: 'Defense line', answerWas: 'Answer',
    speed: 'Speed', lostLife: 'Lost 1 life',
  },
};

const EXPLOSION_PARTICLES = [
  [-92, -54], [-56, -88], [-14, -96], [38, -86], [86, -50], [102, -4],
  [84, 48], [42, 78], [0, 92], [-50, 76], [-88, 42], [-104, -4],
];

const getBestScore = (userId) => {
  try {
    return Number(window.localStorage.getItem(`word-rocket-best:${userId}`)) || 0;
  } catch {
    return 0;
  }
};

function StatusPill({ icon: Icon, label, value, accent = 'text-white' }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-2.5 py-1.5 backdrop-blur sm:gap-2 sm:px-3">
      <Icon size={15} className={accent} />
      <span className="hidden text-[11px] font-semibold uppercase tracking-wider text-slate-400 lg:inline">{label}</span>
      <span className="truncate text-sm font-extrabold text-white">{value}</span>
    </div>
  );
}

function DifficultyPicker({ locale, value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {DIFFICULTIES.map((item) => {
        const selected = item.id === value;
        return (
          <button
            type="button"
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`rounded-2xl border p-3 text-left transition sm:p-4 ${selected ? 'border-fuchsia-400 bg-fuchsia-500/20 shadow-[0_0_24px_rgba(217,70,239,0.18)]' : 'border-white/10 bg-white/5 hover:border-fuchsia-400/50 hover:bg-white/10'}`}
          >
            <span className="block text-sm font-extrabold text-white sm:text-base">{item.labels[locale]}</span>
            <span className="mt-1 hidden text-xs leading-5 text-slate-400 sm:block">{item.descriptions[locale]}</span>
          </button>
        );
      })}
    </div>
  );
}

function RocketShip({ combo, isFiring = false, isDamaged = false, reduceMotion = false }) {
  const shipAnimation = reduceMotion
    ? { x: 0, y: 0, rotate: 0, scale: 1 }
    : isDamaged
      ? { x: [0, -9, 8, -6, 5, 0], y: [0, 3, -2, 2, 0], rotate: [0, -8, 7, -5, 3, 0], scale: [1, 0.92, 1.04, 1] }
      : isFiring
        ? { x: 0, y: [0, 7, -5, 0], rotate: 0, scale: [1, 0.93, 1.08, 1] }
        : { x: 0, y: [0, -6, 0], rotate: 0, scale: 1 };

  return (
    <div className="pointer-events-none absolute bottom-5 left-1/2 z-20 sm:bottom-6">
      <div className="-translate-x-1/2">
        <motion.div
          initial={false}
          animate={shipAnimation}
          transition={isDamaged || isFiring
            ? { duration: 0.48, ease: 'easeOut' }
            : { duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
          className="relative flex h-16 w-16 items-center justify-center sm:h-[4.5rem] sm:w-[4.5rem]"
        >
          <span className={`absolute inset-2 -z-10 rounded-full blur-xl ${isDamaged ? 'bg-rose-500/45' : 'bg-cyan-400/30'}`} />
          <Rocket
            size={58}
            className={`-rotate-45 fill-indigo-500/20 drop-shadow-[0_0_11px_rgba(103,232,249,0.95)] sm:h-16 sm:w-16 ${isDamaged ? 'text-rose-200' : 'text-cyan-100'}`}
            strokeWidth={1.85}
          />
          <motion.span
            animate={isDamaged
              ? { height: [22, 8, 18], opacity: [0.8, 0.25, 0.7] }
              : isFiring
                ? { height: [30, 52, 34], opacity: [0.8, 1, 0.85] }
                : { height: [26, 34, 26], opacity: [0.7, 1, 0.7] }}
            transition={isDamaged || isFiring
              ? { duration: 0.45, ease: 'easeOut' }
              : { duration: 0.7, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -bottom-4 left-1/2 w-2.5 -translate-x-1/2 rounded-full bg-gradient-to-b from-amber-100 via-orange-500 to-transparent blur-[1px]"
          />
          {combo >= 5 && <Sparkles size={19} className="absolute -right-2 -top-1 text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.8)]" />}
        </motion.div>
      </div>
    </div>
  );
}

function DefenseLine({ text }) {
  return (
    <div className="absolute bottom-[5.7rem] left-0 right-0 z-10 sm:bottom-[6.8rem]">
      <div className="h-px bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_12px_rgba(244,63,94,0.9)]" />
      <p className="mt-1 text-center text-[9px] font-bold uppercase tracking-[0.28em] text-rose-300/70">{text}</p>
    </div>
  );
}

function ImpactSequence({ word, points, text, impactPoint, sceneHeight, sceneWidth, combo, reduceMotion }) {
  const safeImpactX = Math.max(42, Math.min(sceneWidth - 42, impactPoint?.x || sceneWidth / 2));
  const safeImpactY = Math.max(58, Math.min(sceneHeight - 112, impactPoint?.y || sceneHeight * 0.42));
  const beamBottom = 62;
  const shipX = sceneWidth / 2;
  const shipY = sceneHeight - beamBottom;
  const deltaX = safeImpactX - shipX;
  const deltaY = Math.max(12, shipY - safeImpactY);
  const beamHeight = Math.hypot(deltaX, deltaY);
  const beamAngle = Math.atan2(deltaX, deltaY) * (180 / Math.PI);

  if (reduceMotion) {
    return (
      <div className="absolute inset-0 z-20 flex items-center justify-center px-4" aria-live="polite">
        <div className="rounded-2xl border border-emerald-300/30 bg-emerald-400/15 px-6 py-4 text-center text-emerald-100">
          <Check className="mx-auto" size={34} strokeWidth={3} />
          <p className="mt-2 text-xl font-black text-white">{word}</p>
          <p className="mt-1 text-sm font-bold">+{points} {text.score.toLowerCase()}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-20 overflow-hidden" aria-live="polite">
      <DefenseLine text={text.defense} />
      <RocketShip combo={combo} isFiring reduceMotion={reduceMotion} />

      {/* Laser beam */}
      <div
        className="absolute z-30 w-1 origin-bottom"
        style={{
          left: shipX,
          bottom: beamBottom,
          height: beamHeight,
          transform: `translateX(-50%) rotate(${beamAngle}deg)`,
          transformOrigin: '50% 100%',
        }}
      >
        <motion.div
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: [0, 1, 1], opacity: [0, 0.7, 0] }}
          transition={{ duration: 0.42, times: [0, 0.34, 1], ease: 'easeOut' }}
          className="h-full w-full origin-bottom rounded-full bg-gradient-to-t from-cyan-300 via-white to-fuchsia-300 shadow-[0_0_18px_rgba(103,232,249,1)]"
        />
      </div>

      {/* Missile rocket traveling toward target */}
      <motion.div
        className="pointer-events-none absolute z-[38]"
        style={{ left: shipX, bottom: beamBottom }}
        initial={{ x: '-50%', y: 0, opacity: 1, scale: 1 }}
        animate={{ x: `calc(-50% + ${deltaX}px)`, y: -deltaY, opacity: [1, 1, 0], scale: [1, 1.15, 0.6] }}
        transition={{
          duration: 0.34, ease: 'easeIn',
          opacity: { times: [0, 0.72, 1], duration: 0.34 },
          scale: { times: [0, 0.72, 1], duration: 0.34 },
        }}
      >
        <Rocket
          size={26}
          style={{ transform: `rotate(${beamAngle - 45}deg)` }}
          className="text-cyan-100 fill-indigo-500/40 drop-shadow-[0_0_14px_rgba(103,232,249,1)]"
          strokeWidth={1.85}
        />
        {/* Rocket flame trail */}
        <motion.span
          style={{ transform: `rotate(${beamAngle - 45 + 180}deg)`, transformOrigin: '50% 0%' }}
          animate={{ height: [12, 22, 14], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 0.18, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute left-1/2 top-1/2 w-2 -translate-x-1/2 rounded-full bg-gradient-to-b from-amber-100 via-orange-500 to-transparent blur-[1px]"
        />
      </motion.div>

      <div className="absolute z-30" style={{ left: safeImpactX, top: safeImpactY }}>
        <div className="-translate-x-1/2 -translate-y-1/2">
          <motion.div
            initial={{ opacity: 1, scale: 1, rotate: 0 }}
            animate={{ opacity: [1, 1, 0], scale: [1, 1.08, 0.3], rotate: [0, -2, 16], filter: ['brightness(1)', 'brightness(2.8)', 'brightness(4)'] }}
            transition={{ duration: 0.58, delay: 0.15, times: [0, 0.38, 1], ease: 'easeOut' }}
            className="min-w-40 rounded-2xl border border-cyan-200/60 bg-[#171236] px-6 py-3 text-center shadow-[0_0_36px_rgba(34,211,238,0.45)] sm:min-w-56"
          >
            <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-cyan-300">{text.correct}</span>
            <p className="mt-1 text-xl font-black text-white sm:text-2xl">{word}</p>
          </motion.div>

          <motion.span
            initial={{ opacity: 0.9, scale: 0.2 }}
            animate={{ opacity: 0, scale: 3.4 }}
            transition={{ duration: 0.56, delay: 0.25, ease: 'easeOut' }}
            className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 rounded-full border-2 border-cyan-200"
            style={{ x: '-50%', y: '-50%' }}
          />
          <motion.span
            initial={{ opacity: 0.8, scale: 0.15 }}
            animate={{ opacity: 0, scale: 4.1 }}
            transition={{ duration: 0.64, delay: 0.3, ease: 'easeOut' }}
            className="pointer-events-none absolute left-1/2 top-1/2 h-12 w-12 rounded-full border border-fuchsia-300"
            style={{ x: '-50%', y: '-50%' }}
          />

          {EXPLOSION_PARTICLES.map(([x, y], index) => (
            <motion.span
              key={`${x}-${y}`}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
              animate={{ x, y, opacity: [0, 1, 0], scale: [0, 1.2, 0] }}
              transition={{ duration: 0.58, delay: 0.24 + (index % 3) * 0.025, ease: 'easeOut' }}
              className={`pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 rounded-full ${index % 3 === 0 ? 'bg-amber-300' : index % 3 === 1 ? 'bg-cyan-300' : 'bg-fuchsia-300'}`}
            />
          ))}

          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.85 }}
            animate={{ opacity: [0, 1, 1], y: [12, 34, 28], scale: [0.85, 1.08, 1] }}
            transition={{ duration: 0.5, delay: 0.42, ease: 'easeOut' }}
            className="absolute left-1/2 top-1/2 flex items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-300/30 bg-emerald-400/15 px-3 py-1.5 text-sm font-extrabold text-emerald-200 backdrop-blur"
            style={{ x: '-50%' }}
          >
            <Check size={16} strokeWidth={3} /> +{points} {text.score.toLowerCase()}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function MissImpactSequence({ word, meaning, text, impactPoint, sceneHeight, sceneWidth, combo, reduceMotion }) {
  const defenseBottom = sceneWidth >= 640 ? 109 : 91;
  const defenseY = sceneHeight - defenseBottom;
  const safeImpactX = Math.max(36, Math.min(sceneWidth - 36, impactPoint?.x || sceneWidth / 2));

  return (
    <div className="absolute inset-0 z-20 overflow-hidden" aria-live="polite">
      <DefenseLine text={text.defense} />
      <RocketShip combo={combo} isDamaged reduceMotion={reduceMotion} />

      {!reduceMotion && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.24, 0] }}
            transition={{ duration: 0.62, times: [0, 0.25, 1] }}
            className="absolute inset-0 bg-rose-600"
          />
          <motion.div
            initial={{ scaleX: 0.2, opacity: 0.5 }}
            animate={{ scaleX: [0.2, 1, 0.65], opacity: [0.5, 1, 0] }}
            transition={{ duration: 0.58, ease: 'easeOut' }}
            className="absolute left-0 right-0 z-20 h-1 origin-center bg-rose-300 shadow-[0_0_30px_rgba(251,113,133,1)]"
            style={{ top: defenseY }}
          />
        </>
      )}

      <div className="absolute z-30" style={{ left: safeImpactX, top: defenseY }}>
        <div className="-translate-x-1/2 -translate-y-1/2">
          <motion.div
            initial={reduceMotion ? false : { opacity: 1, y: -46, scale: 1, rotate: 0 }}
            animate={reduceMotion
              ? { opacity: 1, y: -28, scale: 1 }
              : { opacity: [1, 1, 0], y: [-46, 0, 16], scale: [1, 1.08, 0.35], rotate: [0, -3, 18], filter: ['brightness(1)', 'brightness(2.6)', 'brightness(4)'] }}
            transition={{ duration: 0.55, times: [0, 0.36, 1], ease: 'easeIn' }}
            className="max-w-[68vw] rounded-xl border border-rose-300/55 bg-[#1b1234]/95 px-4 py-2 text-center shadow-[0_0_26px_rgba(244,63,94,0.4)] sm:max-w-sm"
          >
            <p className="line-clamp-2 text-sm font-extrabold text-white sm:text-base">{meaning}</p>
          </motion.div>

          {!reduceMotion && (
            <>
              <motion.span
                initial={{ opacity: 0.95, scale: 0.15 }}
                animate={{ opacity: 0, scale: 4.3 }}
                transition={{ duration: 0.58, delay: 0.17, ease: 'easeOut' }}
                className="pointer-events-none absolute left-1/2 top-1/2 h-12 w-12 rounded-full border-2 border-rose-200"
                style={{ x: '-50%', y: '-50%' }}
              />
              <motion.span
                initial={{ opacity: 0.9, scale: 0.1 }}
                animate={{ opacity: 0, scale: 3.6 }}
                transition={{ duration: 0.64, delay: 0.2, ease: 'easeOut' }}
                className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 rounded-full border border-orange-300"
                style={{ x: '-50%', y: '-50%' }}
              />
              {EXPLOSION_PARTICLES.map(([x, y], index) => (
                <motion.span
                  key={`miss-${x}-${y}`}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                  animate={{ x: x * 0.72, y: y * 0.55, opacity: [0, 1, 0], scale: [0, 1.35, 0] }}
                  transition={{ duration: 0.58, delay: 0.16 + (index % 3) * 0.025, ease: 'easeOut' }}
                  className={`pointer-events-none absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-full ${index % 3 === 0 ? 'bg-amber-300' : index % 3 === 1 ? 'bg-rose-300' : 'bg-orange-400'}`}
                />
              ))}
            </>
          )}

          <motion.div
            initial={{ opacity: 0, y: 2, scale: 0.8 }}
            animate={{ opacity: [0, 1, 1], y: [2, 32, 27], scale: [0.8, 1.08, 1] }}
            transition={{ duration: 0.48, delay: reduceMotion ? 0 : 0.24, ease: 'easeOut' }}
            className="absolute left-1/2 top-1/2 whitespace-nowrap rounded-full border border-rose-300/35 bg-rose-500/20 px-3 py-1.5 text-xs font-extrabold text-rose-100 backdrop-blur sm:text-sm"
            style={{ x: '-50%' }}
          >
            −1 ♥ · {text.answerWas}: <span className="text-white">{word}</span>
          </motion.div>
        </div>
      </div>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: [0, 1, 1], y: [8, 0, 0] }}
        transition={{ duration: 0.45, delay: reduceMotion ? 0 : 0.2 }}
        className="absolute left-1/2 top-5 z-30 -translate-x-1/2 whitespace-nowrap text-sm font-black text-rose-200 sm:text-base"
      >
        {text.missed} · {text.lostLife}
      </motion.p>
    </div>
  );
}

function CompleteScreen({ game, text, bestScore, isNewBest, onRestart, onQuit }) {
  const attempts = game.correctCount + game.wrongAttempts + game.missedCount;
  const accuracy = attempts > 0 ? Math.round((game.correctCount / attempts) * 100) : 0;
  const reviewWords = game.results.filter((item) => item.needsReview);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="relative z-30 mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-7 text-center sm:py-10">
      <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-amber-300/50 bg-amber-400/15 shadow-[0_0_42px_rgba(251,191,36,0.25)]">
        <Trophy size={42} className="text-amber-300" />
        <Sparkles className="absolute -right-2 -top-2 text-fuchsia-300" size={22} />
      </div>
      <h2 className="text-2xl font-black text-white sm:text-3xl">{text.complete}</h2>
      <p className="mt-2 text-sm text-slate-300 sm:text-base">{text.completeCopy}</p>
      {isNewBest && <div className="mt-3 rounded-full bg-amber-300/15 px-4 py-1.5 text-sm font-bold text-amber-200">✨ {text.highScore}</div>}

      <div className="mt-6 grid w-full grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {[
          [text.score, game.score], [text.accuracy, `${accuracy}%`],
          [text.correctWords, game.correctCount], [text.maxCombo, `x${game.maxCombo}`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
            <div className="text-xl font-black text-white sm:text-2xl">{value}</div>
            <div className="mt-1 text-xs font-semibold text-slate-400">{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-left">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold text-white">{text.review}</h3>
          <span className="text-xs text-slate-400">{reviewWords.length} {text.missedWords.toLowerCase()}</span>
        </div>
        {reviewWords.length > 0 ? (
          <div className="grid max-h-32 gap-2 overflow-y-auto sm:grid-cols-2">
            {reviewWords.map((item, index) => (
              <div key={`${item.id}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2 text-sm">
                <span className="font-bold text-fuchsia-200">{item.word}</span>
                <span className="truncate text-slate-400">{item.meaning}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-emerald-300">{text.noMissed}</p>}
      </div>

      <div className="mt-5 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        <button type="button" onClick={onRestart} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 px-6 py-3 font-bold text-white shadow-lg shadow-fuchsia-950/30 transition hover:brightness-110">
          <RotateCcw size={18} /> {text.playAgain}
        </button>
        <button type="button" onClick={onQuit} className="rounded-xl border border-white/15 bg-white/5 px-6 py-3 font-bold text-slate-200 transition hover:bg-white/10">
          {text.changeDifficulty}
        </button>
      </div>
      <p className="mt-3 text-xs text-slate-500">{text.best}: {bestScore}</p>
    </motion.div>
  );
}

export default function WordRocketGame({ words, user, locale = 'vi', onPhaseChange }) {
  const text = COPY[locale] || COPY.vi;
  const game = useWordRocketGame(words);
  const { state, currentWord, difficulty } = game;
  const isInGame = ['playing', 'paused', 'transition'].includes(state.phase);
  const isImmersive = state.phase !== 'ready';
  const reduceMotion = useReducedMotion();
  const sceneRef = useRef(null);
  const targetRef = useRef(null);
  const inputRef = useRef(null);
  const announcedSessionRef = useRef(null);
  const [sceneSize, setSceneSize] = useState({ width: 960, height: 420 });
  const [fallDistance, setFallDistance] = useState(240);
  const [impactPoint, setImpactPoint] = useState({ x: 480, y: 170 });
  const [coarsePointer, setCoarsePointer] = useState(false);
  const [bestScore, setBestScore] = useState(() => getBestScore(user?.id || 'guest'));
  const [isNewBest, setIsNewBest] = useState(false);

  usePracticeSessionTimer('vocabulary', user, state.phase === 'playing');

  useEffect(() => {
    onPhaseChange?.(isImmersive);
  }, [isImmersive, onPhaseChange]);

  useEffect(() => () => onPhaseChange?.(false), [onPhaseChange]);

  useEffect(() => {
    setCoarsePointer(window.matchMedia?.('(pointer: coarse)').matches || false);
  }, []);

  const handleStart = (diff) => {
    game.start(diff);
    if (coarsePointer) {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      }
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  useEffect(() => {
    if (!sceneRef.current || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const reservedSpace = width >= 640 ? 205 : 175;
      setSceneSize({ width, height });
      setFallDistance(Math.max(45, Math.min(390, height - reservedSpace)));
    });
    observer.observe(sceneRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (state.phase !== 'playing' || coarsePointer) return;
    inputRef.current?.focus();
  }, [coarsePointer, state.currentIndex, state.phase]);

  useEffect(() => {
    if (state.phase === 'playing' && state.currentIndex === 0) setIsNewBest(false);
  }, [state.currentIndex, state.phase, state.sessionId]);

  useEffect(() => {
    if (state.phase !== 'complete' || announcedSessionRef.current === state.sessionId) return;
    announcedSessionRef.current = state.sessionId;
    const newBest = state.score > bestScore;
    setIsNewBest(newBest);
    if (newBest) {
      setBestScore(state.score);
      try {
        window.localStorage.setItem(`word-rocket-best:${user?.id || 'guest'}`, String(state.score));
      } catch {
        // Local storage can be unavailable in private browsing; the game still works normally.
      }
    }
    praiseLearningBot(state.correctCount >= 10
      ? 'Nhiệm vụ hoàn thành! Bạn vừa chinh phục một lượt từ vựng rất tuyệt 🚀'
      : 'Bạn đã hoàn thành lượt chơi rồi. Mỗi lần luyện là một lần tiến bộ nhé 💪');
  }, [bestScore, state.correctCount, state.phase, state.score, state.sessionId, user?.id]);

  const progress = state.round.length > 0
    ? Math.min(100, ((state.currentIndex + (state.phase === 'complete' ? 1 : 0)) / state.round.length) * 100)
    : 0;
  const hint = useMemo(
    () => currentWord && state.hintLevel > 0 ? buildWordHint(currentWord.word, state.hintLevel) : '',
    [currentWord, state.hintLevel],
  );
  const fallSeconds = getWordFallSeconds({
    difficultyId: state.difficulty,
    currentIndex: state.currentIndex,
    totalWords: state.round.length,
  });
  const speedMultiplier = (DIFFICULTIES[0].startFallSeconds / fallSeconds).toFixed(1);
  const targetLanePercent = useMemo(() => getTargetLanePercent({
    sessionId: state.sessionId,
    currentIndex: state.currentIndex,
  }), [state.currentIndex, state.sessionId]);

  useLayoutEffect(() => {
    if (!sceneRef.current || !targetRef.current || !['playing', 'paused'].includes(state.phase)) return;
    const targetTop = Number.parseFloat(window.getComputedStyle(targetRef.current).top) || 20;
    const defenseBottom = sceneSize.width >= 640 ? 109 : 91;
    const defenseY = sceneSize.height - defenseBottom;
    const exactDistance = defenseY - targetTop - targetRef.current.offsetHeight;
    setFallDistance(Math.max(36, Math.min(420, exactDistance)));
  }, [currentWord?.id, hint, sceneSize.height, sceneSize.width, state.currentIndex, state.phase]);

  const captureImpactPoint = () => {
    if (!sceneRef.current || !targetRef.current) return;
    const sceneBounds = sceneRef.current.getBoundingClientRect();
    const targetBounds = targetRef.current.getBoundingClientRect();
    setImpactPoint({
      x: targetBounds.left + (targetBounds.width / 2) - sceneBounds.left,
      y: targetBounds.top + (targetBounds.height / 2) - sceneBounds.top,
    });
  };

  const submit = (event) => {
    event?.preventDefault?.();
    captureImpactPoint();
    game.submit();
  };

  const missTarget = () => {
    captureImpactPoint();
    game.miss();
  };

  const sceneClassName = isInGame
    ? 'relative h-[60vh] min-h-[300px] overflow-hidden sm:h-[65vh] sm:min-h-[500px] lg:h-[75vh] lg:min-h-[600px]'
    : 'relative min-h-[440px] overflow-hidden sm:min-h-[500px] lg:min-h-[600px]';

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-fuchsia-500/25 bg-[#100a24] shadow-[0_24px_80px_rgba(49,10,74,0.28)]">
      <header className="relative z-40 border-b border-fuchsia-500/25 bg-[#15102e]/95 px-3 py-2.5 backdrop-blur sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-fuchsia-500 shadow-lg shadow-fuchsia-950/40">
              <Rocket size={21} className="-rotate-45 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-extrabold text-white sm:text-lg">{text.gameName}</h2>
              <p className="hidden text-xs text-slate-400 sm:block">{difficulty.labels[locale]} · {words.length} {locale === 'vi' ? 'từ trong kho' : 'words in pool'}</p>
            </div>
          </div>

          {isInGame && (
            <div className="order-3 grid w-full min-w-0 grid-cols-4 gap-1.5 sm:order-none sm:ml-auto sm:flex sm:w-auto sm:items-center sm:gap-2">
              <StatusPill icon={Trophy} label={text.score} value={state.score} accent="text-amber-300" />
              <StatusPill icon={Shield} label={text.level} value={`${Math.min(state.currentIndex + 1, state.round.length)}/${state.round.length}`} accent="text-cyan-300" />
              <StatusPill icon={Flame} label={text.combo} value={`x${state.combo}`} accent="text-orange-300" />
              <StatusPill icon={Zap} label={text.speed} value={`${speedMultiplier}x`} accent="text-fuchsia-300" />
            </div>
          )}

          {isInGame && (
            <div className="order-2 ml-auto flex items-center gap-0.5 sm:order-none sm:ml-0">
              <motion.div
                key={`${state.sessionId}-${state.lives}`}
                initial={state.feedback?.type === 'missed' && !reduceMotion ? { scale: 1.18, x: -5 } : false}
                animate={state.feedback?.type === 'missed' && !reduceMotion
                  ? { scale: [1.18, 0.9, 1], x: [-5, 6, -3, 0] }
                  : { scale: 1, x: 0 }}
                transition={{ duration: 0.48, ease: 'easeOut' }}
                className="mr-0.5 flex shrink-0 items-center gap-0.5 rounded-full border border-white/10 bg-black/25 px-2 py-2 sm:gap-1"
              >
                {Array.from({ length: 3 }, (_, index) => (
                  <Heart key={index} size={16} className={index < state.lives ? 'fill-rose-400 text-rose-400' : 'text-slate-700'} />
                ))}
              </motion.div>
              <button type="button" onClick={state.phase === 'paused' ? game.resume : game.pause} disabled={state.phase === 'transition'} className="rounded-xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-default disabled:opacity-35" aria-label={state.phase === 'paused' ? text.resume : text.pause} title={state.phase === 'paused' ? text.resume : text.pause}>
                {state.phase === 'paused' ? <Play size={19} /> : <Pause size={19} />}
              </button>
              <button type="button" onClick={game.quit} className="rounded-xl p-2 text-slate-400 transition hover:bg-rose-500/15 hover:text-rose-300" aria-label={text.quit} title={text.quit}>
                <X size={20} />
              </button>
            </div>
          )}
        </div>

        {isInGame && <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-pink-500 transition-[width] duration-500" style={{ width: `${progress}%` }} />}
      </header>

      <div ref={sceneRef} className={sceneClassName}>
        <div className="word-rocket-stars absolute left-0 right-0" aria-hidden="true" />
        <div className="absolute -left-24 top-1/3 h-64 w-64 rounded-full bg-fuchsia-600/15 blur-3xl" aria-hidden="true" />
        <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" aria-hidden="true" />

        {state.phase === 'ready' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative z-20 mx-auto flex min-h-[440px] w-full max-w-3xl flex-col justify-center px-4 py-7 sm:min-h-[500px] sm:px-8">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-cyan-300/30 bg-gradient-to-br from-cyan-400/20 to-fuchsia-500/20 shadow-[0_0_45px_rgba(217,70,239,0.18)]">
              <Gamepad2 size={42} className="text-cyan-200" />
            </div>
            <h3 className="text-center text-2xl font-black text-white sm:text-3xl">{text.readyTitle}</h3>
            <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-6 text-slate-300 sm:text-base">{text.readyCopy}</p>
            <div className="mt-7">
              <p className="mb-3 text-sm font-bold text-slate-200">{text.difficulty}</p>
              <DifficultyPicker locale={locale} value={state.difficulty} onChange={game.setDifficulty} />
            </div>
            <button type="button" onClick={() => handleStart(state.difficulty)} className="mx-auto mt-6 inline-flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-fuchsia-500 px-6 py-3.5 font-extrabold text-white shadow-[0_14px_35px_rgba(99,102,241,0.3)] transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0">
              <Zap size={20} /> {text.start}
            </button>
            <p className="mt-3 text-center text-xs font-medium text-slate-500">{text.learnedPool(words.length)}</p>
          </motion.div>
        )}

        {(state.phase === 'playing' || state.phase === 'paused') && currentWord && (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                ref={targetRef}
                key={`${state.sessionId}-${state.currentIndex}`}
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                className="word-rocket-target absolute top-5 z-20 w-max min-w-40 max-w-[68vw] sm:max-w-[52vw] lg:max-w-md"
                style={{
                  '--fall-distance': `${fallDistance}px`,
                  '--fall-duration': `${fallSeconds}s`,
                  '--fall-play-state': state.phase === 'paused' ? 'paused' : 'running',
                  '--target-x': `${targetLanePercent}%`,
                }}
                onAnimationEnd={(event) => {
                  if (event.target === event.currentTarget && event.animationName === 'word-rocket-fall') missTarget();
                }}
              >
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0.75, scale: 0.88, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: 'easeOut' }}
                  className="rounded-2xl border border-cyan-300/35 bg-[#171236]/92 px-4 py-2.5 text-center shadow-[0_0_28px_rgba(34,211,238,0.18)] backdrop-blur sm:px-5 sm:py-3"
                >
                  <motion.div
                    animate={reduceMotion || state.phase === 'paused'
                      ? { x: 0, rotate: 0 }
                      : { x: [-4, 4, -3, 2, -4], rotate: [-0.8, 0.7, -0.5, 0.4, -0.8] }}
                    transition={{ duration: 3.1, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-cyan-300">{locale === 'vi' ? 'Nghĩa của từ' : 'Word meaning'}</span>
                    <p className="mt-1 line-clamp-2 text-base font-black leading-snug text-white sm:text-xl">{currentWord.meaning}</p>
                    {hint && <p className="mt-1.5 font-mono text-xs font-bold tracking-widest text-amber-300 sm:text-sm">{hint}</p>}
                  </motion.div>
                </motion.div>
              </motion.div>
            </AnimatePresence>

            <DefenseLine text={text.defense} />
            <RocketShip combo={state.combo} reduceMotion={reduceMotion} />

            <AnimatePresence>
              {state.feedback?.type === 'wrong' && (
                <motion.div key={state.feedback.id} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0, x: [0, -6, 6, -3, 3, 0] }} exit={{ opacity: 0 }} className="absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-full border border-rose-400/30 bg-rose-500/15 px-4 py-2 text-xs font-bold text-rose-200 backdrop-blur sm:text-sm">
                  {text.wrong}
                </motion.div>
              )}
            </AnimatePresence>

            {state.phase === 'paused' && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#09061b]/75 p-5 backdrop-blur-sm">
                <div className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-white"><Pause size={30} /></div>
                  <h3 className="mt-4 text-2xl font-black text-white">{text.paused}</h3>
                  <button type="button" onClick={game.resume} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-fuchsia-500 px-6 py-3 font-bold text-white transition hover:bg-fuchsia-400"><Play size={18} /> {text.resume}</button>
                </div>
              </div>
            )}
          </>
        )}

        {state.phase === 'transition' && currentWord && (
          <div className="relative z-20 h-full">
            {state.feedback?.type === 'correct' ? (
              <ImpactSequence
                word={currentWord.word}
                points={state.feedback.points}
                text={text}
                impactPoint={impactPoint}
                sceneHeight={sceneSize.height}
                sceneWidth={sceneSize.width}
                combo={state.combo}
                reduceMotion={reduceMotion}
              />
            ) : (
              <MissImpactSequence
                word={currentWord.word}
                meaning={currentWord.meaning}
                text={text}
                impactPoint={impactPoint}
                sceneHeight={sceneSize.height}
                sceneWidth={sceneSize.width}
                combo={state.combo}
                reduceMotion={reduceMotion}
              />
            )}
          </div>
        )}

        {state.phase === 'complete' && (
          <CompleteScreen game={state} text={text} bestScore={bestScore} isNewBest={isNewBest} onRestart={() => handleStart(state.difficulty)} onQuit={game.quit} />
        )}
      </div>

      {isInGame && (
        <div className="relative z-40 border-t border-fuchsia-500/20 bg-[#15102e] p-2 sm:p-3">
          <form onSubmit={submit} className="mx-auto flex max-w-3xl gap-2">
            <motion.div key={state.wrongAttempts} className="min-w-0 flex-1">
              <input
                ref={inputRef}
                value={state.answer}
                onChange={(event) => game.setAnswer(event.target.value)}
                readOnly={false}
                disabled={state.phase !== 'playing'}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck="false"
                inputMode="text"
                placeholder={text.placeholder}
                aria-label={text.placeholder}
                className="h-11 w-full rounded-xl border border-white/10 bg-[#09061b] px-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/10 disabled:opacity-60 min-[390px]:h-12 min-[390px]:text-base"
              />
            </motion.div>
            <button type="button" onClick={game.useHint} disabled={state.phase !== 'playing'} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/10 text-amber-300 transition hover:bg-amber-300/20 disabled:opacity-40 min-[390px]:h-12 min-[390px]:w-12" aria-label={text.hint} title={text.hint}>
              <Lightbulb size={20} />
            </button>
            <button type="submit" disabled={state.phase !== 'playing' || !state.answer.trim()} className="hidden h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-fuchsia-500 px-5 font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 sm:flex">
              <Zap size={18} /> {text.submit}
            </button>
          </form>
          {!coarsePointer && (
            <div className="mx-auto mt-1.5 max-w-3xl sm:mt-2">
              <GameKeyboard locale={locale} onCharacter={game.appendCharacter} onBackspace={game.backspace} onSubmit={submit} disabled={state.phase !== 'playing'} alwaysVisible={false} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
