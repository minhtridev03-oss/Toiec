import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Check,
  Crosshair,
  Flame,
  Heart,
  Lightbulb,
  Pause,
  Play,
  Radar,
  Rocket,
  RotateCcw,
  Shield,
  Sparkles,
  Target,
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
  playExplosionSound,
  playLaserSound,
  playWrongSound,
  setSoundEnabled,
  speakWord,
} from '../gameAudio';
import {
  buildWordHint,
  DIFFICULTIES,
  getTargetLanePercent,
  getWordFallSeconds,
  normalizeGameAnswer,
} from './gameConfig';
import GameKeyboard from './GameKeyboard';
import { useWordRocketGame } from './useWordRocketGame';

const COPY = {
  vi: {
    gameName: 'Phi thuyền từ vựng',
    readyTitle: 'Sẵn sàng bảo vệ hành tinh?',
    readyCopy:
      'Các thiên thạch từ vựng đang lao xuống bầu khí quyển. Đọc nghĩa tiếng Việt, gõ đúng từ tiếng Anh để nã pháo tiêu diệt trước khi chạm vạch phòng thủ!',
    difficulty: 'Chọn cấp độ nhiệm vụ',
    start: 'Kích hoạt phi thuyền · Xuất kích',
    learnedPool: (count) => `${count} từ vựng sẵn sàng nạp đạn`,
    score: 'Điểm số',
    level: 'Vòng',
    combo: 'Combo',
    best: 'Kỷ lục',
    hint: 'Gợi ý',
    pause: 'Tạm dừng',
    quit: 'Thoát',
    placeholder: 'Gõ từ tiếng Anh tại đây (tự động bắn khi đủ từ)...',
    submit: 'Bắn hạ',
    wrong: 'Chưa đúng, thử lại nhé!',
    correct: 'Chính xác! Tiêu diệt mục tiêu!',
    missed: 'Mục tiêu đã xuyên thủng lá chắn!',
    paused: 'Đang tạm dừng chiến đấu',
    resume: 'Tiếp tục',
    complete: 'Chiến dịch hoàn thành!',
    completeCopy: 'Bạn đã xuất sắc bảo vệ trạm không gian và ghi nhớ trọn vẹn các từ vựng.',
    accuracy: 'Độ chính xác',
    correctWords: 'Bắn trúng',
    missedWords: 'Bỏ lỡ',
    maxCombo: 'Combo cao nhất',
    playAgain: 'Chiến dịch mới',
    changeDifficulty: 'Đổi cấp độ',
    review: 'Từ vựng cần củng cố',
    noMissed: 'Bắn trúng 100%! Không bỏ lỡ bất kỳ từ nào. Đỉnh cao!',
    highScore: 'Kỷ lục mới!',
    defense: 'Vạch phòng thủ năng lượng',
    answerWas: 'Đáp án chuẩn',
    speed: 'Tốc độ',
    lostLife: 'Tổn hại 1 Khiên',
  },
  en: {
    gameName: 'Word Rocket',
    readyTitle: 'Ready to defend the planet?',
    readyCopy:
      'Vocabulary meteors are falling into the atmosphere. Read the meaning and type the English word before it breaches the defense shield!',
    difficulty: 'Choose mission level',
    start: 'Launch Starship · Deploy',
    learnedPool: (count) => `${count} words ready in armory`,
    score: 'Score',
    level: 'Round',
    combo: 'Combo',
    best: 'Best',
    hint: 'Hint',
    pause: 'Pause',
    quit: 'Exit',
    placeholder: 'Type the English word here (auto-fires when full)...',
    submit: 'Fire',
    wrong: 'Not quite. Try again!',
    correct: 'Direct hit! Target destroyed!',
    missed: 'Target breached the shield!',
    paused: 'Combat paused',
    resume: 'Resume',
    complete: 'Mission complete!',
    completeCopy: 'You successfully defended the space station and reinforced your vocabulary.',
    accuracy: 'Accuracy',
    correctWords: 'Targets Hit',
    missedWords: 'Missed',
    maxCombo: 'Best Combo',
    playAgain: 'New Mission',
    changeDifficulty: 'Change Level',
    review: 'Words to review',
    noMissed: '100% Hit rate! Amazing shooting Commander!',
    highScore: 'New high score!',
    defense: 'Planetary Defense Shield',
    answerWas: 'Correct answer',
    speed: 'Speed',
    lostLife: 'Lost 1 shield',
  },
};

const EXPLOSION_PARTICLES = [
  [-92, -54],
  [-56, -88],
  [-14, -96],
  [38, -86],
  [86, -50],
  [102, -4],
  [84, 48],
  [42, 78],
  [0, 92],
  [-50, 76],
  [-88, 42],
  [-104, -4],
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
    <div className="flex min-w-0 items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2.5 py-1.5 backdrop-blur-md shadow sm:gap-2 sm:px-3">
      <Icon size={15} className={accent} />
      <span className="hidden text-[11px] font-bold uppercase tracking-wider text-slate-400 lg:inline">
        {label}
      </span>
      <span className="truncate text-sm font-black text-white">{value}</span>
    </div>
  );
}

function DifficultyPicker({ locale, value, onChange }) {
  const diffMeta = {
    easy: {
      icon: '🛰️',
      badge: 'Cadet',
      speed: '17s',
      color: 'from-cyan-500/20 via-blue-500/20 to-transparent',
      border: 'border-cyan-400',
      glow: 'shadow-[0_0_24px_rgba(34,211,238,0.25)]',
    },
    normal: {
      icon: '🚀',
      badge: 'Pilot',
      speed: '13s',
      color: 'from-indigo-500/20 via-fuchsia-500/20 to-transparent',
      border: 'border-fuchsia-400',
      glow: 'shadow-[0_0_24px_rgba(217,70,239,0.25)]',
    },
    hard: {
      icon: '☄️',
      badge: 'Ace',
      speed: '10s',
      color: 'from-amber-500/20 via-rose-500/20 to-transparent',
      border: 'border-rose-400',
      glow: 'shadow-[0_0_24px_rgba(244,63,94,0.25)]',
    },
  };

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-2.5">
      {DIFFICULTIES.map((item) => {
        const selected = item.id === value;
        const meta = diffMeta[item.id] || diffMeta.normal;
        return (
          <button
            type="button"
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`group relative rounded-xl border px-3 py-2 text-left transition-all duration-200 ${
              selected
                ? `bg-gradient-to-br ${meta.color} ${meta.border} ${meta.glow} ring-2 ring-white/20 backdrop-blur-xl`
                : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-base sm:text-lg leading-none">{meta.icon}</span>
                <span className="text-xs font-black text-white sm:text-sm truncate">
                  {item.labels[locale]}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 hidden min-[400px]:inline">
                  ({meta.badge})
                </span>
              </div>
              <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                  selected ? 'bg-white/20 text-white shadow' : 'bg-white/5 text-slate-400'
                }`}
              >
                {meta.speed} · {item.scoreMultiplier}x
              </span>
            </div>
            <span className="mt-1 block truncate text-[11px] text-slate-300">
              {item.descriptions[locale]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function RocketShip({
  combo = 0,
  isFiring = false,
  isDamaged = false,
  aimAngle = 0,
  reduceMotion = false,
}) {
  const baseRotation = -45 + aimAngle;
  const shipAnimation = reduceMotion
    ? { x: 0, y: 0, rotate: baseRotation, scale: 1 }
    : isDamaged
      ? {
          x: [0, -9, 8, -6, 5, 0],
          y: [0, 3, -2, 2, 0],
          rotate: [baseRotation, baseRotation - 8, baseRotation + 7, baseRotation],
          scale: [1, 0.92, 1.04, 1],
        }
      : isFiring
        ? { x: 0, y: [0, 7, -5, 0], rotate: baseRotation, scale: [1, 0.93, 1.08, 1] }
        : { x: 0, y: [0, -6, 0], rotate: baseRotation, scale: 1 };

  return (
    <div className="pointer-events-none absolute bottom-5 left-1/2 z-20 sm:bottom-6">
      <div className="-translate-x-1/2">
        <motion.div
          initial={false}
          animate={shipAnimation}
          transition={
            isDamaged || isFiring
              ? { duration: 0.48, ease: 'easeOut' }
              : { duration: 2.1, repeat: Infinity, ease: 'easeInOut' }
          }
          className="relative flex h-16 w-16 items-center justify-center sm:h-[4.5rem] sm:w-[4.5rem]"
        >
          {/* Energy aura glow */}
          <span
            className={`absolute inset-1 -z-10 rounded-full blur-xl transition-all duration-300 ${
              isDamaged
                ? 'bg-rose-500/50'
                : combo >= 5
                  ? 'bg-amber-400/50 scale-125'
                  : 'bg-cyan-400/35'
            }`}
          />

          {/* Warship Icon */}
          <Rocket
            size={58}
            className={`fill-indigo-500/30 drop-shadow-[0_0_14px_rgba(103,232,249,0.95)] sm:h-16 sm:w-16 transition-colors duration-200 ${
              isDamaged
                ? 'text-rose-200'
                : combo >= 5
                  ? 'text-amber-200'
                  : 'text-cyan-100'
            }`}
            strokeWidth={1.85}
          />

          {/* Dual thruster propulsion flames */}
          <div className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            <motion.span
              animate={
                isDamaged
                  ? { height: [22, 8, 18], opacity: [0.8, 0.25, 0.7] }
                  : isFiring
                    ? { height: [36, 58, 38], opacity: [0.85, 1, 0.9] }
                    : { height: [24, 36, 24], opacity: [0.7, 1, 0.7] }
              }
              transition={{ duration: 0.45, repeat: Infinity, ease: 'easeInOut' }}
              className="w-2 rounded-full bg-gradient-to-b from-cyan-100 via-blue-500 to-transparent blur-[1px]"
            />
            <motion.span
              animate={
                isDamaged
                  ? { height: [22, 8, 18], opacity: [0.8, 0.25, 0.7] }
                  : isFiring
                    ? { height: [36, 58, 38], opacity: [0.85, 1, 0.9] }
                    : { height: [24, 36, 24], opacity: [0.7, 1, 0.7] }
              }
              transition={{ duration: 0.45, repeat: Infinity, ease: 'easeInOut', delay: 0.08 }}
              className="w-2 rounded-full bg-gradient-to-b from-amber-100 via-orange-500 to-transparent blur-[1px]"
            />
          </div>

          {combo >= 3 && (
            <Sparkles
              size={20}
              className="absolute -right-2 -top-1 text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.8)] animate-bounce"
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}

function DefenseLine({ text }) {
  return (
    <div className="pointer-events-none absolute bottom-[5.7rem] left-0 right-0 z-10 sm:bottom-[6.8rem]">
      {/* Upper plasma wave */}
      <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80 shadow-[0_0_16px_rgba(34,211,238,0.9)]" />
      {/* Lower energetic line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent shadow-[0_0_24px_rgba(217,70,239,0.9)]" />
      <div className="mt-1 flex items-center justify-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-ping" />
        <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-rose-300 drop-shadow-[0_0_8px_rgba(244,63,94,0.7)]">
          {text} · LÁ CHẮN NĂNG LƯỢNG
        </p>
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-ping" />
      </div>
    </div>
  );
}

function ImpactSequence({
  word,
  points,
  text,
  impactPoint,
  sceneHeight,
  sceneWidth,
  combo,
  reduceMotion,
}) {
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
          <p className="mt-1 text-sm font-bold">
            +{points} {text.score.toLowerCase()}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-20 overflow-hidden" aria-live="polite">
      <DefenseLine text={text.defense} />
      <RocketShip combo={combo} isFiring reduceMotion={reduceMotion} aimAngle={beamAngle * 0.4} />

      {/* Dual Laser beams from ship cannons */}
      <div
        className="absolute z-30 w-1.5 origin-bottom"
        style={{
          left: shipX - 12,
          bottom: beamBottom,
          height: beamHeight,
          transform: `translateX(-50%) rotate(${beamAngle}deg)`,
          transformOrigin: '50% 100%',
        }}
      >
        <motion.div
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: [0, 1, 1], opacity: [0, 0.9, 0] }}
          transition={{ duration: 0.42, times: [0, 0.34, 1], ease: 'easeOut' }}
          className="h-full w-full origin-bottom rounded-full bg-gradient-to-t from-cyan-400 via-white to-cyan-300 shadow-[0_0_20px_rgba(103,232,249,1)]"
        />
      </div>

      <div
        className="absolute z-30 w-1.5 origin-bottom"
        style={{
          left: shipX + 12,
          bottom: beamBottom,
          height: beamHeight,
          transform: `translateX(-50%) rotate(${beamAngle}deg)`,
          transformOrigin: '50% 100%',
        }}
      >
        <motion.div
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: [0, 1, 1], opacity: [0, 0.9, 0] }}
          transition={{ duration: 0.42, times: [0, 0.34, 1], ease: 'easeOut' }}
          className="h-full w-full origin-bottom rounded-full bg-gradient-to-t from-fuchsia-400 via-white to-fuchsia-300 shadow-[0_0_20px_rgba(244,114,182,1)]"
        />
      </div>

      {/* Missile projectile traveling toward target */}
      <motion.div
        className="pointer-events-none absolute z-[38]"
        style={{ left: shipX, bottom: beamBottom }}
        initial={{ x: '-50%', y: 0, opacity: 1, scale: 1 }}
        animate={{
          x: `calc(-50% + ${deltaX}px)`,
          y: -deltaY,
          opacity: [1, 1, 0],
          scale: [1, 1.25, 0.6],
        }}
        transition={{
          duration: 0.34,
          ease: 'easeIn',
          opacity: { times: [0, 0.72, 1], duration: 0.34 },
          scale: { times: [0, 0.72, 1], duration: 0.34 },
        }}
      >
        <Rocket
          size={28}
          style={{ transform: `rotate(${beamAngle - 45}deg)` }}
          className="text-cyan-100 fill-indigo-500/40 drop-shadow-[0_0_16px_rgba(103,232,249,1)]"
          strokeWidth={1.85}
        />
      </motion.div>

      {/* Explosion detonation */}
      <div className="absolute z-30" style={{ left: safeImpactX, top: safeImpactY }}>
        <div className="-translate-x-1/2 -translate-y-1/2">
          <motion.div
            initial={{ opacity: 1, scale: 1, rotate: 0 }}
            animate={{
              opacity: [1, 1, 0],
              scale: [1, 1.15, 0.3],
              rotate: [0, -2, 16],
              filter: ['brightness(1)', 'brightness(3)', 'brightness(4)'],
            }}
            transition={{ duration: 0.58, delay: 0.15, times: [0, 0.38, 1], ease: 'easeOut' }}
            className="min-w-44 rounded-2xl border-2 border-cyan-300/80 bg-slate-950/95 px-6 py-3.5 text-center shadow-[0_0_45px_rgba(34,211,238,0.6)] sm:min-w-60"
          >
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-300">
              {text.correct}
            </span>
            <p className="mt-1 text-2xl font-black text-white sm:text-3xl tracking-wide">{word}</p>
          </motion.div>

          {/* Shockwave rings */}
          <motion.span
            initial={{ opacity: 1, scale: 0.2 }}
            animate={{ opacity: 0, scale: 3.8 }}
            transition={{ duration: 0.56, delay: 0.25, ease: 'easeOut' }}
            className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 rounded-full border-2 border-cyan-300"
            style={{ x: '-50%', y: '-50%' }}
          />
          <motion.span
            initial={{ opacity: 0.8, scale: 0.15 }}
            animate={{ opacity: 0, scale: 4.5 }}
            transition={{ duration: 0.64, delay: 0.3, ease: 'easeOut' }}
            className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 rounded-full border-2 border-fuchsia-400"
            style={{ x: '-50%', y: '-50%' }}
          />

          {EXPLOSION_PARTICLES.map(([x, y], index) => (
            <motion.span
              key={`${x}-${y}`}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
              animate={{ x, y, opacity: [0, 1, 0], scale: [0, 1.4, 0] }}
              transition={{ duration: 0.58, delay: 0.24 + (index % 3) * 0.025, ease: 'easeOut' }}
              className={`pointer-events-none absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-full ${
                index % 3 === 0
                  ? 'bg-amber-300 shadow-[0_0_8px_#fde047]'
                  : index % 3 === 1
                    ? 'bg-cyan-300 shadow-[0_0_8px_#67e8f9]'
                    : 'bg-fuchsia-300 shadow-[0_0_8px_#f0abfc]'
              }`}
            />
          ))}

          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.85 }}
            animate={{ opacity: [0, 1, 1], y: [12, 34, 28], scale: [0.85, 1.1, 1] }}
            transition={{ duration: 0.5, delay: 0.42, ease: 'easeOut' }}
            className="absolute left-1/2 top-1/2 flex items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-300/40 bg-emerald-500/25 px-3.5 py-1.5 text-sm font-black text-emerald-200 backdrop-blur-md shadow-lg shadow-emerald-500/20"
            style={{ x: '-50%' }}
          >
            <Check size={16} strokeWidth={3} /> +{points} {text.score.toLowerCase()}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function MissImpactSequence({
  word,
  meaning,
  text,
  impactPoint,
  sceneHeight,
  sceneWidth,
  combo,
  reduceMotion,
}) {
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
            animate={{ opacity: [0, 0.35, 0] }}
            transition={{ duration: 0.62, times: [0, 0.25, 1] }}
            className="absolute inset-0 bg-rose-600"
          />
          <motion.div
            initial={{ scaleX: 0.2, opacity: 0.5 }}
            animate={{ scaleX: [0.2, 1, 0.65], opacity: [0.5, 1, 0] }}
            transition={{ duration: 0.58, ease: 'easeOut' }}
            className="absolute left-0 right-0 z-20 h-1.5 origin-center bg-rose-300 shadow-[0_0_35px_rgba(251,113,133,1)]"
            style={{ top: defenseY }}
          />
        </>
      )}

      <div className="absolute z-30" style={{ left: safeImpactX, top: defenseY }}>
        <div className="-translate-x-1/2 -translate-y-1/2">
          <motion.div
            initial={reduceMotion ? false : { opacity: 1, y: -46, scale: 1, rotate: 0 }}
            animate={
              reduceMotion
                ? { opacity: 1, y: -28, scale: 1 }
                : {
                    opacity: [1, 1, 0],
                    y: [-46, 0, 16],
                    scale: [1, 1.08, 0.35],
                    rotate: [0, -3, 18],
                    filter: ['brightness(1)', 'brightness(2.6)', 'brightness(4)'],
                  }
            }
            transition={{ duration: 0.55, times: [0, 0.36, 1], ease: 'easeIn' }}
            className="max-w-[68vw] rounded-xl border border-rose-300/55 bg-[#1b1234]/95 px-4 py-2 text-center shadow-[0_0_26px_rgba(244,63,94,0.4)] sm:max-w-sm"
          >
            <p className="line-clamp-2 text-sm font-extrabold text-white sm:text-base">{meaning}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 2, scale: 0.8 }}
            animate={{ opacity: [0, 1, 1], y: [2, 32, 27], scale: [0.8, 1.08, 1] }}
            transition={{ duration: 0.48, delay: reduceMotion ? 0 : 0.24, ease: 'easeOut' }}
            className="absolute left-1/2 top-1/2 whitespace-nowrap rounded-full border border-rose-300/40 bg-rose-500/25 px-3.5 py-1.5 text-xs font-black text-rose-100 backdrop-blur-md sm:text-sm"
            style={{ x: '-50%' }}
          >
            −1 ♥ · {text.answerWas}: <span className="text-white font-black">{word}</span>
          </motion.div>
        </div>
      </div>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: [0, 1, 1], y: [8, 0, 0] }}
        transition={{ duration: 0.45, delay: reduceMotion ? 0 : 0.2 }}
        className="absolute left-1/2 top-5 z-30 -translate-x-1/2 whitespace-nowrap text-sm font-black text-rose-200 sm:text-base drop-shadow"
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
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative z-30 mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-7 text-center sm:py-10"
    >
      <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-300/50 bg-gradient-to-br from-amber-400 to-orange-500 shadow-[0_0_42px_rgba(251,191,36,0.35)]">
        <Trophy size={42} className="text-white" />
        <Sparkles className="absolute -right-2 -top-2 text-amber-300" size={22} />
      </div>
      <h2 className="text-3xl font-black text-white sm:text-4xl">{text.complete}</h2>
      <p className="mt-2 text-sm text-slate-300 sm:text-base">{text.completeCopy}</p>
      {isNewBest && (
        <div className="mt-3 rounded-full bg-gradient-to-r from-amber-400 to-rose-400 px-4 py-1 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg">
          ✨ {text.highScore}
        </div>
      )}

      <div className="mt-6 grid w-full grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {[
          [text.score, game.score],
          [text.accuracy, `${accuracy}%`],
          [text.correctWords, game.correctCount],
          [text.maxCombo, `x${game.maxCombo}`],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-md sm:p-4"
          >
            <div className="text-2xl font-black text-white sm:text-3xl">{value}</div>
            <div className="mt-1 text-xs font-bold text-slate-400">{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 w-full rounded-2xl border border-white/10 bg-black/30 p-4 text-left">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm">{text.review}</h3>
          <span className="text-xs font-bold text-slate-400">
            {reviewWords.length} {text.missedWords.toLowerCase()}
          </span>
        </div>
        {reviewWords.length > 0 ? (
          <div className="grid max-h-36 gap-2 overflow-y-auto sm:grid-cols-2 pr-1">
            {reviewWords.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => speakWord(item.word)}
                    className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                    title="Nghe phát âm"
                  >
                    <Volume2 size={16} />
                  </button>
                  <span className="font-extrabold text-cyan-200 truncate">{item.word}</span>
                </div>
                <span className="truncate text-xs text-slate-400">{item.meaning}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm font-bold text-emerald-300">{text.noMissed}</p>
        )}
      </div>

      <div className="mt-5 flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onRestart}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-fuchsia-500 px-7 py-3.5 font-black text-white shadow-xl shadow-indigo-950/40 transition hover:brightness-110 active:scale-98"
        >
          <RotateCcw size={18} /> {text.playAgain}
        </button>
        <button
          type="button"
          onClick={onQuit}
          className="rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 font-bold text-slate-200 transition hover:bg-white/10"
        >
          {text.changeDifficulty}
        </button>
      </div>
      <p className="mt-3 text-xs text-slate-500 font-semibold">
        {text.best}: {bestScore} pts
      </p>
    </motion.div>
  );
}

export default function WordRocketGame({ words, user, locale = 'vi', onPhaseChange, onExit }) {
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
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  useEffect(() => {
    if (state.feedback?.type === 'correct') {
      playExplosionSound();
      playCorrectSound(state.combo);
      if (currentWord?.word) {
        speakWord(currentWord.word);
      }
    } else if (state.feedback?.type === 'wrong') {
      playWrongSound();
    }
  }, [state.feedback?.id, state.feedback?.type, state.combo, currentWord?.word]);

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
      } catch {}
    }
    praiseLearningBot(
      state.correctCount >= 10
        ? 'Nhiệm vụ hoàn thành! Bạn vừa chinh phục một lượt từ vựng rất tuyệt 🚀'
        : 'Bạn đã hoàn thành lượt chơi rồi. Mỗi lần luyện là một lần tiến bộ nhé 💪',
    );
  }, [bestScore, state.correctCount, state.phase, state.score, state.sessionId, user?.id]);

  const progress =
    state.round.length > 0
      ? Math.min(
          100,
          ((state.currentIndex + (state.phase === 'complete' ? 1 : 0)) / state.round.length) * 100,
        )
      : 0;

  const hint = useMemo(
    () => (currentWord && state.hintLevel > 0 ? buildWordHint(currentWord.word, state.hintLevel) : ''),
    [currentWord, state.hintLevel],
  );

  const fallSeconds = getWordFallSeconds({
    difficultyId: state.difficulty,
    currentIndex: state.currentIndex,
    totalWords: state.round.length,
  });

  const speedMultiplier = (DIFFICULTIES[0].startFallSeconds / fallSeconds).toFixed(1);

  const targetLanePercent = useMemo(
    () =>
      getTargetLanePercent({
        sessionId: state.sessionId,
        currentIndex: state.currentIndex,
      }),
    [state.currentIndex, state.sessionId],
  );

  // Dynamic aim angle: ship at 50%, target at targetLanePercent
  const aimAngle = useMemo(() => {
    return Math.max(-28, Math.min(28, (targetLanePercent - 50) * 0.75));
  }, [targetLanePercent]);

  useLayoutEffect(() => {
    if (!sceneRef.current || !targetRef.current || !['playing', 'paused'].includes(state.phase))
      return;
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
      x: targetBounds.left + targetBounds.width / 2 - sceneBounds.left,
      y: targetBounds.top + targetBounds.height / 2 - sceneBounds.top,
    });
  };

  const submit = (event) => {
    event?.preventDefault?.();
    if (!state.answer.trim()) return;
    playLaserSound();
    captureImpactPoint();
    game.submit();
  };

  const missTarget = () => {
    playExplosionSound();
    playWrongSound();
    captureImpactPoint();
    game.miss();
  };

  // Auto-fire when word is completely and accurately typed!
  const handleAnswerChange = (val) => {
    game.setAnswer(val);
    if (
      currentWord &&
      normalizeGameAnswer(val) === normalizeGameAnswer(currentWord.word)
    ) {
      captureImpactPoint();
      playLaserSound();
      game.submit();
    }
  };

  const sceneClassName = isInGame
    ? 'relative h-[44vh] sm:h-[48vh] lg:h-[50vh] max-h-[440px] min-h-[280px] overflow-hidden'
    : 'relative overflow-hidden';

  return (
    <section className="overflow-hidden rounded-[2rem] border border-cyan-500/30 bg-[#0d0722] shadow-[0_24px_80px_rgba(15,8,38,0.5)]">
      {/* Top Cockpit Header */}
      <header className="relative z-20 border-b border-cyan-500/20 bg-[#120b2e]/95 px-3 py-2 backdrop-blur-md sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
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

          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-indigo-600 shadow-lg shadow-cyan-500/30">
              <Rocket size={20} className="-rotate-45 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-black text-white sm:text-base">
                {text.gameName}
              </h2>
              <p className="hidden text-xs text-slate-400 sm:block">
                {difficulty.labels[locale]} · {words.length}{' '}
                {locale === 'vi' ? 'từ trong kho' : 'words in pool'}
              </p>
            </div>
          </div>

          {isInGame && (
            <div className="order-3 grid w-full min-w-0 grid-cols-4 gap-1.5 sm:order-none sm:ml-auto sm:flex sm:w-auto sm:items-center sm:gap-2">
              <StatusPill icon={Trophy} label={text.score} value={state.score} accent="text-amber-300" />
              <StatusPill
                icon={Shield}
                label={text.level}
                value={`${Math.min(state.currentIndex + 1, state.round.length)}/${state.round.length}`}
                accent="text-cyan-300"
              />
              <StatusPill icon={Flame} label={text.combo} value={`x${state.combo}`} accent="text-orange-300" />
              <StatusPill icon={Zap} label={text.speed} value={`${speedMultiplier}x`} accent="text-fuchsia-300" />
            </div>
          )}

          {isInGame && (
            <div className="order-2 ml-auto flex items-center gap-1 sm:order-none sm:ml-0">
              <motion.div
                key={`${state.sessionId}-${state.lives}`}
                initial={
                  state.feedback?.type === 'missed' && !reduceMotion
                    ? { scale: 1.25, x: -6 }
                    : false
                }
                animate={
                  state.feedback?.type === 'missed' && !reduceMotion
                    ? { scale: [1.25, 0.9, 1], x: [-6, 6, -3, 0] }
                    : { scale: 1, x: 0 }
                }
                transition={{ duration: 0.48, ease: 'easeOut' }}
                className="mr-1 flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-black/40 px-2.5 py-1.5"
              >
                {Array.from({ length: 3 }, (_, index) => (
                  <Heart
                    key={index}
                    size={16}
                    className={
                      index < state.lives
                        ? 'fill-rose-400 text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.8)]'
                        : 'text-slate-700'
                    }
                  />
                ))}
              </motion.div>

              <button
                type="button"
                onClick={handleToggleSound}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                title={soundOn ? 'Tắt âm thanh' : 'Bật âm thanh'}
              >
                {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>

              <button
                type="button"
                onClick={state.phase === 'paused' ? game.resume : game.pause}
                disabled={state.phase === 'transition'}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-35"
                title={state.phase === 'paused' ? text.resume : text.pause}
              >
                {state.phase === 'paused' ? <Play size={18} /> : <Pause size={18} />}
              </button>

              <button
                type="button"
                onClick={() => {
                  game.quit();
                  onExit?.();
                }}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-rose-500/20 hover:text-rose-300"
                title={text.quit}
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>

        {isInGame && (
          <div
            className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-cyan-400 via-indigo-500 to-fuchsia-500 transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        )}
      </header>

      {/* Main Game Stage */}
      <div ref={sceneRef} className={sceneClassName}>
        {/* Warp speed space background */}
        <div className="word-rocket-warp" aria-hidden="true" />
        <div className="absolute -left-28 top-1/4 h-80 w-80 rounded-full bg-cyan-600/15 blur-3xl pointer-events-none" />
        <div className="absolute -right-28 top-10 h-80 w-80 rounded-full bg-fuchsia-600/15 blur-3xl pointer-events-none" />

        {/* ========================================================
            STAGE 1: READY / HOLOGRAPHIC HANGAR
        ======================================================== */}
        {state.phase === 'ready' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-20 mx-auto flex w-full max-w-3xl flex-col justify-center px-4 py-5 sm:py-6 sm:px-6"
          >
            {/* Interactive Holographic Warship Radar Display */}
            <div className="relative mx-auto mb-3 flex h-20 w-20 items-center justify-center sm:h-22 sm:w-22">
              {/* Rotating radar ring */}
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-400/35 animate-radar-spin" />
              <div className="absolute inset-1.5 rounded-full border border-cyan-300/20" />
              <div className="absolute inset-3 rounded-full bg-gradient-to-br from-cyan-500/15 to-indigo-900/40 backdrop-blur-xl shadow-[0_0_35px_rgba(34,211,238,0.25)]" />

              {/* Floating Warship with thruster flame */}
              <motion.div
                animate={{ y: [-3, 3, -3], rotate: [-2, 2, -2] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="relative flex items-center justify-center"
              >
                <Rocket
                  size={38}
                  className="-rotate-45 text-cyan-200 fill-cyan-400/20 drop-shadow-[0_0_14px_rgba(103,232,249,0.9)]"
                  strokeWidth={1.85}
                />
                <motion.span
                  animate={{ height: [12, 20, 14], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -bottom-3 left-1/2 w-2.5 -translate-x-1/2 rounded-full bg-gradient-to-b from-cyan-200 via-indigo-500 to-transparent blur-[1px]"
                />
              </motion.div>
            </div>

            {/* Title & Mission Call */}
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-0.5 text-[11px] font-black uppercase tracking-wider text-cyan-300">
                <Radar size={12} /> TRẠM CHỈ HUY KHÔNG GIAN TOEIC
              </span>
              <h3 className="mt-1.5 text-2xl font-black text-white sm:text-3xl tracking-tight">
                {text.readyTitle}
              </h3>
              <p className="mx-auto mt-1 max-w-xl text-xs leading-relaxed text-slate-300 sm:text-sm">
                {text.readyCopy}
              </p>
            </div>

            {/* Tactical Ship Specs */}
            <div className="mx-auto mt-3.5 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
              <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300">
                <Shield size={14} className="text-cyan-400" />
                <span>Khiên: 3 Mạng</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300">
                <Target size={14} className="text-fuchsia-400" />
                <span>Kho đạn: {words.length} từ</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-slate-300">
                <Trophy size={14} className="text-amber-400" />
                <span>Kỷ lục: {bestScore} pts</span>
              </div>
            </div>

            {/* Difficulty Selector */}
            <div className="mt-4">
              <p className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-slate-300">
                {text.difficulty}
              </p>
              <DifficultyPicker
                locale={locale}
                value={state.difficulty}
                onChange={game.setDifficulty}
              />
            </div>

            {/* Big Launch Button */}
            <button
              type="button"
              onClick={() => handleStart(state.difficulty)}
              className="mx-auto mt-4 inline-flex h-11 sm:h-12 w-full max-w-sm items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-fuchsia-500 px-6 text-sm sm:text-base font-black text-white shadow-[0_12px_32px_rgba(99,102,241,0.35)] transition-all hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-98"
            >
              <Rocket size={18} className="-rotate-45" />
              <span>{text.start}</span>
            </button>
            <p className="mt-2 text-center text-[11px] font-semibold text-slate-400">
              💡 Mẹo: Hệ thống tự động khai hỏa khi bạn gõ đúng toàn bộ từ vựng!
            </p>
          </motion.div>
        )}

        {/* ========================================================
            STAGE 2: ACTIVE IN-GAME COMBAT
        ======================================================== */}
        {(state.phase === 'playing' || state.phase === 'paused') && currentWord && (
          <>
            {/* Arcade Combo Callout Milestone */}
            <AnimatePresence>
              {state.combo >= 3 && (
                <motion.div
                  key={`combo-${state.combo}`}
                  initial={{ opacity: 0, scale: 0.7, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute top-4 left-1/2 z-30 -translate-x-1/2 flex items-center gap-2 rounded-full border border-amber-400/40 bg-gradient-to-r from-amber-500/25 to-rose-500/25 px-4 py-1.5 text-xs font-black text-amber-200 backdrop-blur-md shadow-lg shadow-amber-500/25"
                >
                  <Flame size={16} className="text-amber-400 animate-bounce" />
                  <span>
                    {state.combo >= 10
                      ? '🚀 HYPER FRENZY x10!'
                      : state.combo >= 8
                        ? '💥 CHIẾN THẦN x8!'
                        : state.combo >= 5
                          ? '⚡ XUẤT THẦN x5!'
                          : '🔥 COMBO x3!'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Falling Energy Meteor Target */}
            <AnimatePresence mode="wait">
              <motion.div
                ref={targetRef}
                key={`${state.sessionId}-${state.currentIndex}`}
                initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="word-rocket-target absolute top-4 z-20 w-max min-w-48 max-w-[72vw] sm:max-w-[54vw] lg:max-w-md"
                style={{
                  '--fall-distance': `${fallDistance}px`,
                  '--fall-duration': `${fallSeconds}s`,
                  '--fall-play-state': state.phase === 'paused' ? 'paused' : 'running',
                  '--target-x': `${targetLanePercent}%`,
                }}
                onAnimationEnd={(event) => {
                  if (
                    event.target === event.currentTarget &&
                    event.animationName === 'word-rocket-fall'
                  ) {
                    missTarget();
                  }
                }}
              >
                <div className="relative rounded-2xl border-2 border-cyan-400/40 bg-slate-950/90 p-3.5 text-center shadow-2xl backdrop-blur-xl ring-1 ring-cyan-400/20 sm:p-4">
                  {/* Sci-Fi Holographic Reticle Brackets */}
                  <span className="absolute -top-1.5 -left-1.5 font-mono text-sm font-bold text-cyan-400">
                    ⌜
                  </span>
                  <span className="absolute -top-1.5 -right-1.5 font-mono text-sm font-bold text-cyan-400">
                    ⌝
                  </span>
                  <span className="absolute -bottom-1.5 -left-1.5 font-mono text-sm font-bold text-cyan-400">
                    ⌞
                  </span>
                  <span className="absolute -bottom-1.5 -right-1.5 font-mono text-sm font-bold text-cyan-400">
                    ⌟
                  </span>

                  {/* Target Header */}
                  <div className="flex items-center justify-center gap-1.5 mb-1 text-[9px] font-black uppercase tracking-[0.25em] text-cyan-300">
                    <Target size={12} className="text-cyan-400 animate-spin" />
                    <span>
                      MỤC TIÊU #{state.currentIndex + 1} · {currentWord.word.length} KÝ TỰ
                    </span>
                  </div>

                  {/* Prominent Vietnamese Meaning */}
                  <p className="line-clamp-2 text-base font-black leading-snug text-white drop-shadow sm:text-xl">
                    {currentWord.meaning}
                  </p>

                  {/* Revealed Hint */}
                  {hint && (
                    <p className="mt-1.5 font-mono text-xs font-black tracking-widest text-amber-300 sm:text-sm drop-shadow-[0_0_8px_rgba(252,211,77,0.7)]">
                      {hint}
                    </p>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Defense Barrier */}
            <DefenseLine text={text.defense} />

            {/* Aiming Player Warship */}
            <RocketShip
              combo={state.combo}
              aimAngle={aimAngle}
              reduceMotion={reduceMotion}
            />

            {/* Wrong attempt banner */}
            <AnimatePresence>
              {state.feedback?.type === 'wrong' && (
                <motion.div
                  key={state.feedback.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0, x: [0, -6, 6, -3, 3, 0] }}
                  exit={{ opacity: 0 }}
                  className="absolute left-1/2 top-3 z-30 -translate-x-1/2 rounded-full border border-rose-400/40 bg-rose-500/25 px-4 py-2 text-xs font-black text-rose-200 backdrop-blur-md shadow-lg sm:text-sm"
                >
                  {text.wrong}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Paused Overlay */}
            {state.phase === 'paused' && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#09061b]/80 p-5 backdrop-blur-md">
                <div className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-white">
                    <Pause size={30} />
                  </div>
                  <h3 className="mt-4 text-2xl font-black text-white">{text.paused}</h3>
                  <button
                    type="button"
                    onClick={game.resume}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-6 py-3 font-bold text-white transition hover:brightness-110 shadow-lg"
                  >
                    <Play size={18} /> {text.resume}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Transition Sequence */}
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

        {/* Complete Mission Debriefing */}
        {state.phase === 'complete' && (
          <CompleteScreen
            game={state}
            text={text}
            bestScore={bestScore}
            isNewBest={isNewBest}
            onRestart={() => handleStart(state.difficulty)}
            onQuit={() => {
              game.quit();
              onExit?.();
            }}
          />
        )}
      </div>

      {/* ========================================================
          COCKPIT WEAPON COMMAND BAR
      ======================================================== */}
      {isInGame && (
        <div className="relative z-20 border-t border-cyan-500/20 bg-[#120b2e] p-2.5 sm:p-3">
          <form onSubmit={submit} className="mx-auto max-w-3xl space-y-1.5">
            {/* Live Target Lock Slot Preview */}
            {currentWord && (
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-cyan-300">
                  <Crosshair size={13} className="text-cyan-400 animate-pulse" />
                  <span>
                    KHÓA NÒNG PHÁO:{' '}
                    {
                      [...state.answer].filter(
                        (ch, idx) =>
                          ch.toLowerCase() === currentWord.word[idx]?.toLowerCase(),
                      ).length
                    }
                    /{currentWord.word.length}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Phím cách hoặc Enter để bắn
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <input
                  ref={inputRef}
                  value={state.answer}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  readOnly={false}
                  disabled={state.phase !== 'playing'}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck="false"
                  inputMode="text"
                  placeholder={text.placeholder}
                  aria-label={text.placeholder}
                  className="h-11 sm:h-12 w-full rounded-xl border-2 border-cyan-400/40 bg-[#09061b] px-3.5 font-mono text-sm sm:text-base font-black text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-400/20 disabled:opacity-60"
                />
              </div>

              <button
                type="button"
                onClick={game.useHint}
                disabled={state.phase !== 'playing'}
                className="flex h-11 sm:h-12 w-11 sm:w-12 shrink-0 items-center justify-center rounded-xl border border-amber-300/30 bg-amber-400/10 text-amber-300 transition hover:bg-amber-400/20 disabled:opacity-40"
                aria-label={text.hint}
                title={text.hint}
              >
                <Lightbulb size={18} />
              </button>

              <button
                type="submit"
                disabled={state.phase !== 'playing' || !state.answer.trim()}
                className="hidden h-11 sm:h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-fuchsia-500 px-5 font-black text-white transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:flex shadow-lg shadow-indigo-500/25"
              >
                <Zap size={16} /> {text.submit}
              </button>
            </div>
          </form>

          {!coarsePointer && (
            <div className="mx-auto mt-2 max-w-3xl">
              <GameKeyboard
                locale={locale}
                onCharacter={game.appendCharacter}
                onBackspace={game.backspace}
                onSubmit={submit}
                disabled={state.phase !== 'playing'}
                alwaysVisible={false}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
