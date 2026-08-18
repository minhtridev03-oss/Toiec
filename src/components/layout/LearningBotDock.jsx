import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, BookOpen, MessageSquarePlus, Sparkles, X } from 'lucide-react';
import { praiseLearningBot } from '../../lib/learningBot';
import chatbotImage from '../../assets/chatbot-transparent.png';

const PRAISE_MESSAGES = [
  'Bạn làm tốt lắm! Tiếp tục thêm một chút nữa nhé ✨',
  'Chính xác rồi! Mình thấy bạn đang tiến bộ từng ngày 💖',
  'Tuyệt vời! Một bước nhỏ hôm nay sẽ tạo nên kết quả lớn 🌟',
  'Bạn đang học rất chăm chỉ. Cố lên nhé, mình luôn ở đây cùng bạn 🤖',
];

const HOVER_GREETING = 'Xin chào! Mình là trợ lý T-English.';

const openPanel = (eventName) => {
  window.dispatchEvent(new CustomEvent(eventName));
};

export default function LearningBotDock() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [praise, setPraise] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [hasMascotImage, setHasMascotImage] = useState(true);
  const praiseTimerRef = useRef(null);

  useEffect(() => {
    const handlePraise = (event) => {
      const message = event.detail?.message || PRAISE_MESSAGES[Math.floor(Math.random() * PRAISE_MESSAGES.length)];
      setPraise(message);
      setIsMenuOpen(false);
      window.clearTimeout(praiseTimerRef.current);
      praiseTimerRef.current = window.setTimeout(() => setPraise(''), 5000);
    };

    window.addEventListener('learning-bot:praise', handlePraise);
    return () => {
      window.removeEventListener('learning-bot:praise', handlePraise);
      window.clearTimeout(praiseTimerRef.current);
    };
  }, []);

  const handleMascotEnter = () => {
    setIsHovered(true);
  };

  const handleMascotLeave = () => setIsHovered(false);

  const handlePraise = () => {
    praiseLearningBot();
  };

  return (
    <div className="fixed bottom-5 right-4 z-[60] sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {isHovered && !isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            className="pointer-events-none absolute bottom-[6.7rem] right-0 w-64 rounded-2xl border border-pink-200 bg-white/95 p-3 text-sm font-semibold leading-5 text-slate-700 shadow-xl backdrop-blur dark:border-fuchsia-800 dark:bg-[#21132b]/95 dark:text-slate-100 sm:bottom-[7.3rem] sm:w-72"
            role="status"
          >
            {HOVER_GREETING}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {praise && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="absolute bottom-[6.1rem] right-0 w-64 rounded-2xl border border-pink-200 bg-white p-3 text-sm font-semibold leading-5 text-slate-700 shadow-xl dark:border-fuchsia-800 dark:bg-[#21132b] dark:text-slate-100 sm:bottom-[6.7rem] sm:w-72"
            role="status"
          >
            <button type="button" onClick={() => setPraise('')} className="absolute right-2 top-2 rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10" aria-label="Đóng lời động viên">
              <X size={14} />
            </button>
            <div className="pr-4">{praise}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="absolute bottom-[6.1rem] right-0 flex w-52 flex-col gap-2 rounded-2xl border border-pink-200 bg-white p-2 shadow-xl dark:border-fuchsia-800 dark:bg-[#21132b] sm:bottom-[6.7rem]"
          >
            <button type="button" onClick={() => { openPanel('global-dictionary:open'); setIsMenuOpen(false); }} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-pink-50 dark:text-slate-100 dark:hover:bg-white/10">
              <BookOpen size={18} className="text-fuchsia-600" /> Tra từ nhanh
            </button>
            <button type="button" onClick={() => { openPanel('global-feedback:open'); setIsMenuOpen(false); }} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-pink-50 dark:text-slate-100 dark:hover:bg-white/10">
              <MessageSquarePlus size={18} className="text-indigo-500" /> Góp ý website
            </button>
            <button type="button" onClick={handlePraise} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-pink-50 dark:text-slate-100 dark:hover:bg-white/10">
              <Sparkles size={18} className="text-amber-500" /> Động viên mình
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setIsMenuOpen((value) => !value)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.92 }}
        onMouseEnter={handleMascotEnter}
        onMouseLeave={handleMascotLeave}
        onFocus={handleMascotEnter}
        onBlur={handleMascotLeave}
        className="flex h-20 w-20 items-center justify-center overflow-visible rounded-none border-0 bg-transparent p-0 text-fuchsia-700 drop-shadow-[0_8px_12px_rgba(217,70,239,0.28)] sm:h-24 sm:w-24"
        aria-label={isMenuOpen ? 'Đóng trợ lý T-English' : 'Mở trợ lý T-English'}
        title="Trợ lý T-English"
      >
        {hasMascotImage ? (
          <img
            src={chatbotImage}
            alt=""
            className="h-full w-full object-contain"
            onError={() => setHasMascotImage(false)}
          />
        ) : <Bot size={34} strokeWidth={1.8} aria-hidden="true" />}
      </motion.button>
    </div>
  );
}
