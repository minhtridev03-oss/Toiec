import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Bot,
  Heart,
  MessageSquarePlus,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { playBotCheerSound, playPopSound } from '../../features/games/gameAudio';
import { getRandomCheer } from '../../lib/learningBot';
import chatbotImage from '../../assets/chatbot-transparent.png';

const HOVER_GREETING = 'Chào bạn! Mình là bé bot trợ lý T-English. Cần tra từ, góp ý hay nạp năng lượng cứ gọi mình nha! 🌸';

const openPanel = (eventName) => {
  window.dispatchEvent(new CustomEvent(eventName));
};

export default function LearningBotDock() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentCheer, setCurrentCheer] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [hasMascotImage, setHasMascotImage] = useState(true);
  const [botExpression, setBotExpression] = useState('idle'); // 'idle' | 'cheer' | 'heart'
  const [heartCount, setHeartCount] = useState(0);
  const cheerTimerRef = useRef(null);
  const isDraggingRef = useRef(false);

  // Trigger cheerful confetti celebration from bot position
  const fireCheerConfetti = () => {
    try {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { x: 0.92, y: 0.88 },
        colors: ['#f43f5e', '#ec4899', '#a855f7', '#6366f1', '#eab308', '#10b981'],
        ticks: 120,
        gravity: 1.1,
        scalar: 0.9,
      });
    } catch {}
  };

  const showCheer = (cheerData) => {
    const data = cheerData || getRandomCheer();
    setCurrentCheer(data);
    setIsMenuOpen(false);
    setBotExpression('cheer');
    playBotCheerSound();
    fireCheerConfetti();

    // Auto reset bot jump expression after 1.2s
    setTimeout(() => {
      setBotExpression('idle');
    }, 1200);

    // Auto dismiss cheer card after 10s if not interacted
    window.clearTimeout(cheerTimerRef.current);
    cheerTimerRef.current = window.setTimeout(() => {
      setCurrentCheer(null);
    }, 12000);
  };

  useEffect(() => {
    const handlePraise = (event) => {
      showCheer(event.detail);
    };

    window.addEventListener('learning-bot:praise', handlePraise);
    return () => {
      window.removeEventListener('learning-bot:praise', handlePraise);
      window.clearTimeout(cheerTimerRef.current);
    };
  }, []);

  const handleToggleMenu = () => {
    if (isDraggingRef.current) return;
    playPopSound();
    setIsMenuOpen((prev) => !prev);
  };

  const handleMascotEnter = () => {
    setIsHovered(true);
  };

  const handleMascotLeave = () => {
    setIsHovered(false);
  };

  const handleSendHeart = () => {
    playPopSound();
    setHeartCount((c) => c + 1);
    setBotExpression('heart');
    fireCheerConfetti();
    setTimeout(() => setBotExpression('idle'), 1500);
  };

  const handleNextCheer = () => {
    showCheer(getRandomCheer());
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.08}
      onDragStart={() => {
        isDraggingRef.current = true;
      }}
      onDragEnd={() => {
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 150);
      }}
      className="fixed bottom-[5.5rem] right-3 z-[60] sm:bottom-6 sm:right-6 select-none touch-none cursor-grab active:cursor-grabbing"
    >
      {/* 1. Mascot Hover Tooltip Greeting */}
      <AnimatePresence>
        {isHovered && !isMenuOpen && !currentCheer && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: 'bottom right' }}
            className="pointer-events-none absolute bottom-[5.8rem] right-0 w-64 rounded-2xl border border-pink-200/80 bg-white/95 p-3.5 text-xs font-bold leading-relaxed text-slate-700 shadow-xl backdrop-blur-xl dark:border-pink-500/20 dark:bg-slate-900/95 dark:text-slate-200 sm:bottom-[6.5rem] sm:w-72"
            role="status"
          >
            <div className="flex items-center gap-1.5 text-pink-500 text-[11px] font-black uppercase tracking-wider mb-1">
              <Sparkles size={13} /> TRỢ LÝ T-ENGLISH
            </div>
            {HOVER_GREETING}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Interactive Motivation & Fortune Cookie Card */}
      <AnimatePresence>
        {currentCheer && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: 'bottom right' }}
            className="absolute bottom-[5.8rem] right-0 w-72 rounded-3xl border border-pink-400/30 bg-gradient-to-b from-white via-pink-50/70 to-purple-50/80 p-4 shadow-2xl backdrop-blur-2xl dark:border-pink-500/30 dark:from-slate-900 dark:via-slate-900/95 dark:to-purple-950/40 sm:bottom-[6.5rem] sm:w-80"
            role="status"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setCurrentCheer(null)}
              className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-200/60 text-slate-500 transition hover:bg-slate-300 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
              aria-label="Đóng lời động viên"
            >
              <X size={14} />
            </button>

            {/* Category Pill */}
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 text-sm shadow-sm shadow-pink-500/30">
                {currentCheer.category?.icon || '✨'}
              </span>
              <div>
                <span className="block text-[10px] font-black uppercase tracking-wider text-pink-600 dark:text-pink-400">
                  {currentCheer.category?.badge || 'ĐỘNG VIÊN TOEIC'}
                </span>
                <span className="text-xs font-black text-slate-800 dark:text-white">
                  {currentCheer.category?.name || 'Tiếp Thêm Năng Lượng'}
                </span>
              </div>
            </div>

            {/* Motivational message quote */}
            <div className="mt-3 rounded-2xl border border-white/60 bg-white/70 p-3 shadow-inner backdrop-blur-sm dark:border-white/5 dark:bg-slate-800/60">
              <p className="text-xs font-semibold leading-relaxed text-slate-800 dark:text-slate-100 sm:text-sm">
                {currentCheer.message}
              </p>
            </div>

            {/* Bottom Interactive Toolbar: Gieo quẻ khác & Thả tim */}
            <div className="mt-3 flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-white/10">
              <button
                type="button"
                onClick={handleNextCheer}
                className="inline-flex items-center gap-1.5 rounded-xl border border-purple-300/40 bg-purple-500/10 px-2.5 py-1.5 text-xs font-bold text-purple-700 transition hover:bg-purple-500/20 active:scale-95 dark:text-purple-300"
                title="Đổi câu động viên khác"
              >
                <RotateCcw size={13} />
                <span>Quẻ khác 🔄</span>
              </button>

              <button
                type="button"
                onClick={handleSendHeart}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-3 py-1.5 text-xs font-extrabold text-white shadow-md shadow-pink-500/25 transition hover:brightness-110 active:scale-95"
              >
                <Heart size={13} className="fill-white" />
                <span>Thả tim ({heartCount})</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Mascot Action Glass Dock Menu (Image 1 Redesign) */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: 'bottom right' }}
            className="absolute bottom-[5.8rem] right-0 flex w-60 flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/85 p-2 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/90 sm:bottom-[6.5rem] sm:w-64"
          >
            {/* Header dock */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200/60 dark:border-white/10 mb-1">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-xs font-black text-slate-800 dark:text-white">
                  Bé Bot T-English
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-400">Trợ lý học tập</span>
            </div>

            {/* Menu Items */}
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => {
                  playPopSound();
                  openPanel('global-dictionary:open');
                  setIsMenuOpen(false);
                }}
                className="group flex items-center justify-between rounded-2xl px-3 py-2.5 text-left transition hover:bg-indigo-50/80 active:scale-98 dark:hover:bg-indigo-950/40"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 shadow-sm transition group-hover:scale-110 dark:bg-indigo-500/20 dark:text-indigo-400">
                    <BookOpen size={17} />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 sm:text-sm">
                      Tra từ nhanh
                    </span>
                    <span className="text-[10px] text-slate-400">Từ điển & phát âm chuẩn</span>
                  </div>
                </div>
                <span className="rounded-lg bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  Ctrl+K
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playPopSound();
                  openPanel('global-feedback:open');
                  setIsMenuOpen(false);
                }}
                className="group flex items-center justify-between rounded-2xl px-3 py-2.5 text-left transition hover:bg-purple-50/80 active:scale-98 dark:hover:bg-purple-950/40"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 shadow-sm transition group-hover:scale-110 dark:bg-purple-500/20 dark:text-purple-400">
                    <MessageSquarePlus size={17} />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 sm:text-sm">
                      Góp ý website
                    </span>
                    <span className="text-[10px] text-slate-400">Báo lỗi & gửi ý kiến</span>
                  </div>
                </div>
                <span className="text-xs text-purple-500 opacity-0 transition group-hover:opacity-100">
                  →
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  showCheer();
                }}
                className="group relative flex items-center justify-between overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-500/10 via-pink-500/10 to-purple-500/10 px-3 py-2.5 text-left transition hover:border-amber-400/60 hover:from-amber-500/20 active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-pink-500 text-white shadow-sm shadow-amber-500/30 transition group-hover:scale-110">
                    <Sparkles size={17} />
                  </div>
                  <div>
                    <span className="block text-xs font-black text-amber-700 dark:text-amber-300 sm:text-sm">
                      Động viên mình ✨
                    </span>
                    <span className="text-[10px] text-slate-400">Gieo quẻ & tiếp năng lượng</span>
                  </div>
                </div>
                <span className="flex h-5 items-center rounded-full bg-amber-400/20 px-1.5 text-[10px] font-black text-amber-600 dark:text-amber-300">
                  HOT
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Mascot Floating Avatar Button */}
      <motion.button
        type="button"
        onClick={handleToggleMenu}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        animate={
          botExpression === 'cheer'
            ? { y: [-10, 0, -6, 0], rotate: [-6, 6, -3, 0] }
            : botExpression === 'heart'
              ? { scale: [1, 1.15, 1] }
              : { y: [0, -4, 0] }
        }
        transition={
          botExpression === 'cheer'
            ? { duration: 0.6 }
            : botExpression === 'heart'
              ? { duration: 0.4 }
              : { duration: 3.5, repeat: Infinity, ease: 'easeInOut' }
        }
        onMouseEnter={handleMascotEnter}
        onMouseLeave={handleMascotLeave}
        className="relative flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center overflow-visible border-0 bg-transparent p-0 drop-shadow-[0_12px_24px_rgba(236,72,153,0.35)] cursor-pointer focus:outline-none"
        aria-label={isMenuOpen ? 'Đóng menu trợ lý' : 'Mở menu trợ lý T-English'}
        title="Trợ lý T-English (Kéo thả để di chuyển)"
      >
        {hasMascotImage ? (
          <img
            src={chatbotImage}
            alt="Mascot T-English"
            className="h-full w-full object-contain pointer-events-none"
            onError={() => setHasMascotImage(false)}
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white shadow-xl shadow-pink-500/40">
            <Bot size={30} strokeWidth={1.8} />
          </div>
        )}

        {/* Ambient status ring glow */}
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-pink-500 to-purple-600 shadow-md dark:border-slate-900">
          <Sparkles size={10} className="text-white animate-pulse" />
        </span>
      </motion.button>
    </motion.div>
  );
}
