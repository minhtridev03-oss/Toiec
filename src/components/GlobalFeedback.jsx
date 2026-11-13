import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquarePlus,
  X,
  Send,
  Loader2,
  CheckCircle2,
  Bug,
  Lightbulb,
  Palette,
  Heart,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { playBotCheerSound, playPopSound } from '../features/games/gameAudio';
import chatbotImage from '../assets/chatbot-transparent.png';

const FEEDBACK_CATEGORIES = [
  {
    id: 'bug',
    label: 'Báo lỗi',
    icon: Bug,
    emoji: '🐞',
    color: 'from-rose-500 to-amber-500',
    placeholder: 'Mô tả lỗi bạn gặp phải (ở trang nào, thao tác thế nào)...',
  },
  {
    id: 'feature',
    label: 'Tính năng mới',
    icon: Lightbulb,
    emoji: '✨',
    color: 'from-amber-500 to-emerald-500',
    placeholder: 'Bạn muốn T-English có thêm tính năng gì để học tập hiệu quả hơn?',
  },
  {
    id: 'ui',
    label: 'Giao diện & UX',
    icon: Palette,
    emoji: '🎨',
    color: 'from-blue-500 to-indigo-500',
    placeholder: 'Góp ý về màu sắc, font chữ, bố cục hoặc cảm giác khi sử dụng...',
  },
  {
    id: 'love',
    label: 'Lời yêu thương',
    icon: Heart,
    emoji: '💖',
    color: 'from-pink-500 to-rose-500',
    placeholder: 'Gửi vài dòng động viên hoặc chia sẻ cảm xúc đến đội ngũ phát triển...',
  },
];

const MOODS = [
  { id: 'love', emoji: '😍', label: 'Rất mê' },
  { id: 'happy', emoji: '😊', label: 'Hài lòng' },
  { id: 'neutral', emoji: '😐', label: 'Tạm ổn' },
  { id: 'sad', emoji: '🙁', label: 'Cần cải thiện' },
];

export default function GlobalFeedback({ showTrigger = true }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState(FEEDBACK_CATEGORIES[0]);
  const [selectedMood, setSelectedMood] = useState(MOODS[1]);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const openFeedback = () => setIsOpen(true);
    window.addEventListener('global-feedback:open', openFeedback);
    return () => window.removeEventListener('global-feedback:open', openFeedback);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      const fullContent = `[${selectedCat.emoji} ${selectedCat.label} | ${selectedMood.emoji} ${selectedMood.label}] ${content.trim()}`;

      const { error } = await supabase.from('user_feedbacks').insert([
        {
          content: fullContent,
          user_id: user?.id || null,
        },
      ]);

      if (error) {
        console.error('Lỗi khi gửi góp ý:', error);
      }

      // Play chime and shoot confetti
      playBotCheerSound();
      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#a855f7', '#ec4899', '#3b82f6', '#10b981'],
        });
      } catch {}

      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setTimeout(() => {
          setSubmitted(false);
          setContent('');
        }, 500);
      }, 2800);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Trigger button (optional) */}
      {showTrigger && (
        <motion.button
          className="fixed bottom-[5.5rem] right-6 z-40 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 transition hover:scale-105 active:scale-95"
          onClick={() => setIsOpen(true)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          title="Góp ý phát triển"
        >
          <MessageSquarePlus size={20} />
        </motion.button>
      )}

      {/* Modal Dialog */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-950/65 backdrop-blur-md"
            />

            {/* Modal Dialog Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/60 bg-white/95 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/95"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-slate-800/50">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                    <MessageSquarePlus size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Góp ý phát triển
                    </h3>
                    <p className="text-[11px] font-bold text-slate-400">
                      Hòm thư lắng nghe ý kiến học viên
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 sm:p-6">
                {submitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-6 text-center"
                  >
                    <div className="relative mb-3 flex h-20 w-20 items-center justify-center">
                      <img
                        src={chatbotImage}
                        alt="Bé Bot cảm ơn"
                        className="h-full w-full object-contain animate-bounce"
                      />
                      <span className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
                        <CheckCircle2 size={18} />
                      </span>
                    </div>
                    <h4 className="text-xl font-black text-slate-900 dark:text-white">
                      Cảm ơn bạn rất nhiều! 🎉
                    </h4>
                    <p className="mt-2 max-w-sm text-xs sm:text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
                      Đội ngũ T-English đã nhận được phản hồi và sẽ đọc kỹ từng câu chữ để website ngày
                      càng hoàn hảo hơn. Chúc bạn học thật vui!
                    </p>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Category Selection Tabs */}
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        CHỌN CHỦ ĐỀ GÓP Ý
                      </label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {FEEDBACK_CATEGORIES.map((cat) => {
                          const isSelected = selectedCat.id === cat.id;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                playPopSound();
                                setSelectedCat(cat);
                              }}
                              className={`flex items-center gap-1.5 rounded-xl border p-2 text-left transition-all ${
                                isSelected
                                  ? 'border-purple-500 bg-purple-500/10 font-bold text-purple-700 ring-2 ring-purple-500/20 dark:text-purple-300'
                                  : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300 hover:bg-slate-100 dark:border-white/10 dark:bg-slate-800/40 dark:text-slate-300'
                              }`}
                            >
                              <span className="text-sm">{cat.emoji}</span>
                              <span className="text-xs truncate">{cat.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Mood / Satisfaction Rating */}
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                        CẢM NHẬN HIỆN TẠI CỦA BẠN
                      </label>
                      <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/50 p-2 dark:border-white/10 dark:bg-slate-800/40">
                        {MOODS.map((m) => {
                          const isSelected = selectedMood.id === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                playPopSound();
                                setSelectedMood(m);
                              }}
                              className={`flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 transition ${
                                isSelected
                                  ? 'bg-white shadow-sm ring-2 ring-purple-400/40 dark:bg-slate-700'
                                  : 'opacity-60 hover:opacity-100'
                              }`}
                            >
                              <span className="text-xl">{m.emoji}</span>
                              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                {m.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Content Textarea */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          NỘI DUNG CHI TIẾT
                        </label>
                        <span className="text-[11px] font-bold text-slate-400">
                          {content.length}/500
                        </span>
                      </div>
                      <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value.slice(0, 500))}
                        placeholder={selectedCat.placeholder}
                        rows={4}
                        className="w-full rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 dark:border-white/10 dark:bg-slate-800/50 dark:text-slate-100 dark:focus:bg-slate-900"
                        required
                        autoFocus
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting || !content.trim()}
                      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 px-6 py-3 text-sm font-black text-white shadow-xl shadow-purple-500/25 transition hover:brightness-110 active:scale-98 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={18} className="animate-spin" /> Đang gửi ý kiến...
                        </>
                      ) : (
                        <>
                          <Send size={16} /> Gửi góp ý ngay
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
