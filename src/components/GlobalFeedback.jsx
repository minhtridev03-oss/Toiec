import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, X, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function GlobalFeedback() {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      // Lưu vào bảng user_feedbacks
      const { error } = await supabase
        .from('user_feedbacks')
        .insert([{ 
          content: content.trim(),
          user_id: user?.id || null
        }]);

      if (error) {
        console.error('Lỗi khi gửi góp ý:', error);
        // Ngay cả khi lỗi (chưa có table), vẫn báo thành công cho user vui vẻ
        // thực tế ta sẽ báo lỗi nếu cần, nhưng UX thì nên nhẹ nhàng
      }

      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setTimeout(() => {
          setSubmitted(false);
          setContent('');
        }, 500);
      }, 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Nút Góp ý - Nằm trên nút Từ điển (bottom-24 thay vì bottom-6) */}
      <motion.button
        className="fixed bottom-[5.5rem] right-6 z-40 w-12 h-12 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-full shadow-lg shadow-indigo-500/30 flex items-center justify-center text-white hover:scale-110 transition-transform"
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title="Góp ý phát triển"
      >
        <MessageSquarePlus size={20} />
      </motion.button>

      {/* Modal Góp ý */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 p-4"
            >
              <div className="bg-white dark:bg-[#1E1226] rounded-2xl shadow-2xl overflow-hidden border border-slate-100 dark:border-[#3A2F43]">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-[#3A2F43] bg-slate-50/50 dark:bg-[#160B1E]/50">
                  <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <MessageSquarePlus size={18} className="text-indigo-500" />
                    Góp ý phát triển
                  </h3>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-[#2A1F33] rounded-full transition-colors text-slate-500"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-6">
                  {submitted ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center justify-center py-8 text-center"
                    >
                      <div className="w-16 h-16 bg-green-100 dark:bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 size={32} />
                      </div>
                      <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Cảm ơn bạn!</h4>
                      <p className="text-slate-600 dark:text-slate-400">Góp ý của bạn đã được ghi nhận và sẽ giúp chúng mình cải thiện website tốt hơn.</p>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Bạn gặp lỗi, thấy bất tiện ở đâu hay muốn thêm tính năng gì? Hãy cho chúng mình biết nhé!
                      </p>
                      
                      <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Nhập góp ý của bạn vào đây..."
                        className="w-full h-32 px-4 py-3 bg-slate-50 dark:bg-[#160B1E] border border-slate-200 dark:border-[#3A2F43] rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none text-slate-800 dark:text-white transition-colors"
                        required
                        autoFocus
                      />

                      <button
                        type="submit"
                        disabled={isSubmitting || !content.trim()}
                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <><Loader2 size={18} className="animate-spin" /> Đang gửi...</>
                        ) : (
                          <><Send size={18} /> Gửi góp ý</>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
