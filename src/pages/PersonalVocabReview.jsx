import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useStats } from '../contexts/StatsContext';
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Volume2,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Circle,
  Sparkles,
} from 'lucide-react';

export default function PersonalVocabReview() {
  const { index } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshStats } = useStats();

  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(parseInt(index, 10) || 0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const touchStartX = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (user) loadAllWords();
  }, [user]);

  useEffect(() => {
    setCurrentIndex(parseInt(index, 10) || 0);
    setIsFlipped(false);
  }, [index]);

  const loadAllWords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_vocabulary')
        .select('id, word, meaning, phonetic, example_sentence, notes, source, is_learned, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Deduplicate words if any duplicates exist
      const seen = new Set();
      const uniqueWords = [];
      for (const item of data || []) {
        const key = (item.word || '').trim().toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          uniqueWords.push(item);
        }
      }

      setWords(uniqueWords);
    } catch (err) {
      console.error('Error loading personal words:', err);
      showToast('Lỗi khi tải danh sách từ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      navigate(`/my-vocabulary/review/${currentIndex - 1}`, { replace: true });
    }
  }, [currentIndex, navigate]);

  const goToNext = useCallback(() => {
    if (currentIndex < words.length - 1) {
      navigate(`/my-vocabulary/review/${currentIndex + 1}`, { replace: true });
    }
  }, [currentIndex, words.length, navigate]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') goToPrevious();
      else if (e.key === 'ArrowRight') goToNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext]);

  // Swipe handlers
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goToNext();
      else goToPrevious();
    }
    touchStartX.current = null;
  };

  const wordData = words[currentIndex];

  const toggleLearned = async (e) => {
    e?.stopPropagation();
    if (!wordData || !user) return;

    const newStatus = !wordData.is_learned;
    // Optimistic update
    setWords((prev) =>
      prev.map((w, idx) => (idx === currentIndex ? { ...w, is_learned: newStatus } : w))
    );

    try {
      const { error } = await supabase
        .from('user_vocabulary')
        .update({ is_learned: newStatus })
        .eq('id', wordData.id)
        .eq('user_id', user.id);

      if (error) throw error;
      if (typeof refreshStats === 'function') refreshStats();
    } catch (err) {
      console.error('Error updating learned status:', err);
      // Revert on error
      setWords((prev) =>
        prev.map((w, idx) => (idx === currentIndex ? { ...w, is_learned: !newStatus } : w))
      );
    }
  };

  const handleDelete = async (e) => {
    e?.stopPropagation();
    if (!wordData) return;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa "${wordData.word}" khỏi sổ tay?`)) return;

    try {
      const { error } = await supabase
        .from('user_vocabulary')
        .delete()
        .eq('id', wordData.id)
        .eq('user_id', user.id);

      if (error) throw error;
      showToast(`Đã xóa "${wordData.word}"`);
      const newWords = words.filter((w) => w.id !== wordData.id);
      setWords(newWords);

      if (typeof refreshStats === 'function') refreshStats();

      if (newWords.length === 0) {
        navigate('/my-vocabulary');
      } else if (currentIndex >= newWords.length) {
        navigate(`/my-vocabulary/review/${newWords.length - 1}`, { replace: true });
      }
    } catch (err) {
      console.error('Error deleting word:', err);
      showToast('Lỗi khi xóa từ vựng', 'error');
    }
  };

  const speakWord = (e) => {
    e?.stopPropagation();
    if ('speechSynthesis' in window && wordData?.word) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(wordData.word);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 min-h-[70vh]">
        <div className="p-8 rounded-[2rem] bg-white/25 dark:bg-slate-950/40 backdrop-blur-2xl border border-white/60 dark:border-white/15 shadow-xl flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-fuchsia-600 dark:text-fuchsia-400" size={36} />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Đang tải thẻ Flashcard...</span>
        </div>
      </div>
    );
  }

  if (!wordData) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 min-h-[70vh]">
        <div className="p-8 sm:p-12 text-center rounded-[2.5rem] bg-white/25 dark:bg-slate-950/40 backdrop-blur-2xl border border-white/60 dark:border-white/15 shadow-2xl max-w-md w-full">
          <p className="text-slate-950 dark:text-white font-black text-lg mb-4">Không tìm thấy từ vựng trong sổ tay.</p>
          <button
            onClick={() => navigate('/my-vocabulary')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-fuchsia-500/25 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Quay lại sổ tay</span>
          </button>
        </div>
      </div>
    );
  }

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < words.length - 1;
  const isLearned = !!wordData.is_learned;

  return (
    <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full min-h-[85vh] animate-in fade-in duration-300">
      {/* ============================================================ */}
      {/* 1. TOP BAR (Liquid Glass Navigation & Counter Pill) */}
      {/* ============================================================ */}
      <div className="w-full flex items-center justify-between mb-6 sm:mb-8">
        <button
          onClick={() => navigate('/my-vocabulary')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/40 hover:bg-white/75 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white border border-white/60 dark:border-white/15 backdrop-blur-xl text-xs font-black transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),_0_2px_8px_rgba(0,0,0,0.04)] active:scale-95 cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Quay lại sổ tay</span>
        </button>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/35 dark:bg-slate-950/45 border border-white/50 dark:border-white/15 backdrop-blur-xl shadow-xs text-xs font-black text-fuchsia-700 dark:text-fuchsia-300 tracking-wider">
          <span className="w-2 h-2 rounded-full bg-fuchsia-500 dark:bg-fuchsia-400 animate-pulse" />
          <span>
            {currentIndex + 1} / {words.length}
          </span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. MAIN FLASHCARD STAGE WITH FLOATING ORBS */}
      {/* ============================================================ */}
      <div
        className="flex-1 flex items-center justify-center w-full relative my-auto py-2"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Previous Button (Left Floating Liquid Glass Orb) */}
        <div className="hidden sm:flex absolute -left-4 md:-left-8 lg:-left-12 z-20">
          <button
            onClick={goToPrevious}
            disabled={!hasPrev}
            className={`h-13 w-13 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-2xl border ${
              hasPrev
                ? 'bg-white/40 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-fuchsia-500/20 text-slate-800 dark:text-slate-200 hover:text-fuchsia-600 dark:hover:text-fuchsia-400 border-white/60 dark:border-white/20 shadow-[0_8px_25px_rgba(0,0,0,0.08),_inset_0_1px_2px_rgba(255,255,255,0.85)] hover:scale-110 active:scale-95 cursor-pointer'
                : 'opacity-0 pointer-events-none'
            }`}
            title="Từ trước (Mũi tên trái)"
          >
            <ChevronLeft size={26} />
          </button>
        </div>

        {/* Liquid Glass Flashcard Component */}
        <div className="w-full sm:max-w-2xl lg:max-w-3xl" style={{ perspective: '1400px' }}>
          <div
            onClick={() => setIsFlipped((prev) => !prev)}
            className="group relative w-full cursor-pointer transition-transform duration-500 ease-in-out"
            style={{
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              minHeight: '440px',
            }}
          >
            {/* ════ FRONT FACE ════ */}
            <div
              className="absolute inset-0 rounded-[2.5rem] border border-white/60 dark:border-white/15 bg-white/25 dark:bg-slate-950/45 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.08),_inset_0_1px_3px_rgba(255,255,255,0.85),_inset_0_-1px_1px_rgba(0,0,0,0.02)] dark:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.8),_inset_0_1px_2px_rgba(255,255,255,0.3),_inset_0_-1px_1px_rgba(255,255,255,0.05)] backdrop-blur-2xl overflow-hidden flex flex-col justify-between transition-all"
              style={{ backfaceVisibility: 'hidden' }}
            >
              {/* Fluid Caustics Blobs */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2.5rem] -z-0">
                <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-gradient-to-br from-fuchsia-500/20 dark:from-fuchsia-500/25 via-indigo-400/15 dark:via-indigo-400/20 to-transparent blur-3xl animate-liquid-blob" />
                <div
                  className="absolute -bottom-28 -right-28 w-88 h-88 rounded-full bg-gradient-to-tl from-cyan-500/20 dark:from-cyan-600/25 via-violet-400/15 dark:via-purple-500/15 to-transparent blur-3xl animate-liquid-blob"
                  style={{ animationDelay: '-4s' }}
                />
                <div className="absolute top-0 inset-x-12 h-[1.5px] bg-gradient-to-r from-transparent via-white/90 dark:via-white/40 to-transparent" />
              </div>

              {/* Front Body */}
              <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-8 sm:p-12">
                <h2 className="text-4xl sm:text-6xl md:text-7xl font-black text-slate-950 dark:text-white tracking-tight mb-5 text-center select-none break-words drop-shadow-xs">
                  {wordData.word}
                </h2>

                <div className="flex flex-wrap items-center justify-center gap-2.5 mb-8">
                  {wordData.phonetic && (
                    <span className="px-4 py-1.5 bg-fuchsia-500/10 dark:bg-cyan-400/10 border border-fuchsia-500/25 dark:border-cyan-400/30 text-fuchsia-800 dark:text-cyan-300 font-mono text-sm sm:text-base font-bold rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)]">
                      {wordData.phonetic}
                    </span>
                  )}
                  {wordData.source && (
                    <span className="px-3 py-1 bg-white/40 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-white/50 dark:border-white/15 text-xs font-bold rounded-lg shadow-xs">
                      {wordData.source}
                    </span>
                  )}
                </div>

                <button
                  onClick={speakWord}
                  className="h-16 w-16 rounded-2xl bg-white/45 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400 border border-white/70 dark:border-white/20 hover:border-fuchsia-400/50 flex items-center justify-center transition-all duration-300 shadow-[0_8px_20px_rgba(217,70,239,0.15),_inset_0_1px_2px_rgba(255,255,255,0.9)] hover:scale-110 active:scale-95 cursor-pointer"
                  title="Nghe phát âm"
                >
                  <Volume2 size={30} className="transition-transform group-hover:scale-110" />
                </button>
              </div>

              {/* Front Bottom Bar */}
              <div className="relative z-10 flex items-center justify-between px-6 sm:px-8 py-4 bg-white/15 dark:bg-white/[0.02] border-t border-white/30 dark:border-white/10 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleLearned}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      isLearned
                        ? 'bg-emerald-500/25 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border-emerald-500/40 dark:border-emerald-400/40 shadow-[0_0_15px_rgba(16,185,129,0.25),_inset_0_1px_1px_rgba(255,255,255,0.7)]'
                        : 'bg-white/40 dark:bg-white/10 text-slate-700 dark:text-slate-300 border-white/50 dark:border-white/15 hover:bg-white/70 dark:hover:bg-white/20 hover:text-slate-950 dark:hover:text-white'
                    }`}
                  >
                    {isLearned ? (
                      <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Circle size={16} className="text-slate-400" />
                    )}
                    <span>{isLearned ? 'Đã học' : 'Chưa học'}</span>
                  </button>

                  <button
                    onClick={handleDelete}
                    className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-500/10 border border-transparent hover:border-red-400/30 transition-all cursor-pointer"
                    title="Xóa từ khỏi sổ tay"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/30 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-white/40 dark:border-white/10 text-xs font-bold select-none group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400 transition-colors">
                  <RotateCcw size={13} className="transition-transform duration-500 group-hover:-rotate-180" />
                  <span>Nhấn để lật thẻ</span>
                </span>
              </div>
            </div>

            {/* ════ BACK FACE ════ */}
            <div
              className="absolute inset-0 rounded-[2.5rem] border border-white/60 dark:border-white/15 bg-white/25 dark:bg-slate-950/45 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.08),_inset_0_1px_3px_rgba(255,255,255,0.85)] dark:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.8),_inset_0_1px_2px_rgba(255,255,255,0.3)] backdrop-blur-2xl overflow-hidden flex flex-col justify-between transition-all"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              {/* Back Header */}
              <div className="relative z-10 flex items-center justify-between px-6 sm:px-8 py-4 bg-white/15 dark:bg-white/[0.02] border-b border-white/30 dark:border-white/10 shrink-0 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight">
                    {wordData.word}
                  </h3>
                  {wordData.phonetic && (
                    <span className="text-xs font-mono font-bold text-fuchsia-700 dark:text-cyan-300 bg-fuchsia-500/10 dark:bg-cyan-400/10 px-2 py-0.5 rounded-lg border border-fuchsia-500/20">
                      {wordData.phonetic}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={speakWord}
                    className="h-8 w-8 rounded-lg bg-white/40 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400 border border-white/50 dark:border-white/15 flex items-center justify-center transition-all cursor-pointer"
                    title="Nghe phát âm"
                  >
                    <Volume2 size={16} />
                  </button>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/30 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-white/40 dark:border-white/10 text-xs font-bold">
                    <RotateCcw size={12} />
                    <span>Lật lại</span>
                  </span>
                </div>
              </div>

              {/* Back Body */}
              <div
                className="relative z-10 flex-1 overflow-y-auto p-6 sm:px-8 sm:py-7 custom-scrollbar"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col space-y-6">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-fuchsia-700 dark:text-fuchsia-400 mb-2">
                      <Sparkles size={13} />
                      <span>Định nghĩa & Nghĩa</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white leading-relaxed tracking-tight">
                      {wordData.meaning || '(Chưa có định nghĩa)'}
                    </div>
                  </div>

                  {wordData.example_sentence && (
                    <div>
                      <div className="border-t border-white/30 dark:border-white/10 pt-5 mb-2">
                        <span className="text-xs font-black uppercase tracking-widest text-violet-700 dark:text-fuchsia-400">
                          Ví dụ câu
                        </span>
                      </div>
                      <div className="bg-white/30 dark:bg-white/[0.04] p-4 sm:p-5 rounded-2xl border border-white/40 dark:border-white/10 backdrop-blur-sm shadow-xs">
                        <p className="text-base sm:text-lg italic font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
                          "{wordData.example_sentence}"
                        </p>
                      </div>
                    </div>
                  )}

                  {wordData.notes && (
                    <div>
                      <div className="border-t border-white/30 dark:border-white/10 pt-5 mb-2">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
                          Ghi chú cá nhân
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {wordData.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Back Bottom Bar */}
              <div className="relative z-10 flex items-center justify-between px-6 sm:px-8 py-3.5 bg-white/15 dark:bg-white/[0.02] border-t border-white/30 dark:border-white/10 shrink-0 backdrop-blur-md">
                <button
                  onClick={toggleLearned}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    isLearned
                      ? 'bg-emerald-500/25 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border-emerald-500/40 dark:border-emerald-400/40 shadow-[0_0_15px_rgba(16,185,129,0.25),_inset_0_1px_1px_rgba(255,255,255,0.7)]'
                      : 'bg-white/40 dark:bg-white/10 text-slate-700 dark:text-slate-300 border-white/50 dark:border-white/15 hover:bg-white/70 dark:hover:bg-white/20 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  {isLearned ? (
                    <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Circle size={16} className="text-slate-400" />
                  )}
                  <span>{isLearned ? 'Đã học' : 'Chưa học'}</span>
                </button>

                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-500/10 transition-all cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Xóa từ</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Next Button (Right Floating Liquid Glass Orb) */}
        <div className="hidden sm:flex absolute -right-4 md:-right-8 lg:-right-12 z-20">
          <button
            onClick={goToNext}
            disabled={!hasNext}
            className={`h-13 w-13 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-2xl border ${
              hasNext
                ? 'bg-white/40 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-fuchsia-500/20 text-slate-800 dark:text-slate-200 hover:text-fuchsia-600 dark:hover:text-fuchsia-400 border-white/60 dark:border-white/20 shadow-[0_8px_25px_rgba(0,0,0,0.08),_inset_0_1px_2px_rgba(255,255,255,0.85)] hover:scale-110 active:scale-95 cursor-pointer'
                : 'opacity-0 pointer-events-none'
            }`}
            title="Từ tiếp theo (Mũi tên phải)"
          >
            <ChevronRight size={26} />
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. MOBILE CONTROLS & HINTS DOCK */}
      {/* ============================================================ */}
      <div className="flex sm:hidden items-center justify-between gap-3 mt-4 w-full">
        <button
          onClick={goToPrevious}
          disabled={!hasPrev}
          className="flex-1 py-2.5 rounded-2xl bg-white/40 dark:bg-white/10 border border-white/60 dark:border-white/15 text-slate-800 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-black flex items-center justify-center gap-1 backdrop-blur-xl shadow-xs"
        >
          <ChevronLeft size={16} />
          <span>Từ trước</span>
        </button>
        <button
          onClick={goToNext}
          disabled={!hasNext}
          className="flex-1 py-2.5 rounded-2xl bg-white/40 dark:bg-white/10 border border-white/60 dark:border-white/15 text-slate-800 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-black flex items-center justify-center gap-1 backdrop-blur-xl shadow-xs"
        >
          <span>Từ sau</span>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mt-6 hidden sm:flex justify-center">
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/30 dark:bg-slate-950/40 border border-white/50 dark:border-white/15 backdrop-blur-xl text-xs font-bold text-slate-800 dark:text-slate-200 shadow-sm">
          <span>Mẹo: Dùng phím mũi tên</span>
          <kbd className="font-mono px-2 py-0.5 bg-white/60 dark:bg-white/15 border border-white/70 dark:border-white/20 rounded-md shadow-xs text-slate-950 dark:text-white font-black">
            ←
          </kbd>
          <span>và</span>
          <kbd className="font-mono px-2 py-0.5 bg-white/60 dark:bg-white/15 border border-white/70 dark:border-white/20 rounded-md shadow-xs text-slate-950 dark:text-white font-black">
            →
          </kbd>
          <span>để chuyển từ nhanh</span>
        </div>
      </div>

      {/* Liquid Toast */}
      {toast && (
        <div className="fixed bottom-24 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div
            className={`px-5 py-3 rounded-2xl backdrop-blur-2xl border text-sm font-black shadow-2xl flex items-center gap-2 ${
              toast.type === 'error'
                ? 'bg-rose-500/20 dark:bg-rose-950/60 border-rose-500/40 text-rose-800 dark:text-rose-200'
                : 'bg-emerald-500/20 dark:bg-emerald-950/60 border-emerald-500/40 text-emerald-800 dark:text-emerald-200'
            }`}
          >
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
