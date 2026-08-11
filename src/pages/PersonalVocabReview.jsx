import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { ChevronLeft, ChevronRight, ArrowLeft, Loader2, Volume2, RotateCcw, Trash2 } from 'lucide-react';

export default function PersonalVocabReview() {
  const { index } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(parseInt(index) || 0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const touchStartX = useRef(null);

  useEffect(() => {
    if (user) loadAllWords();
  }, [user]);

  useEffect(() => {
    setCurrentIndex(parseInt(index) || 0);
    setIsFlipped(false);
  }, [index]);

  const loadAllWords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_vocabulary')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setWords(data || []);
    } catch (err) {
      console.error('Error loading words:', err);
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

  const handleDelete = async () => {
    if (!wordData) return;
    if (!window.confirm("Bạn có chắc chắn muốn xóa từ này khỏi sổ tay?")) return;
    try {
      const { error } = await supabase
        .from('user_vocabulary')
        .delete()
        .eq('id', wordData.id);
      if (error) throw error;
      const newWords = words.filter(w => w.id !== wordData.id);
      setWords(newWords);
      if (newWords.length === 0) {
        navigate('/my-vocabulary');
      } else if (currentIndex >= newWords.length) {
        navigate(`/my-vocabulary/review/${newWords.length - 1}`, { replace: true });
      }
    } catch (err) {
      console.error('Error deleting:', err);
    }
  };

  const speakWord = (e) => {
    e.stopPropagation();
    if ('speechSynthesis' in window && wordData) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(wordData.word);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 transition-colors">
        <Loader2 className="animate-spin text-fuchsia-500" size={40} />
      </div>
    );
  }

  const wordData = words[currentIndex];

  if (!wordData) {
    return (
      <div className="p-8 text-center bg-pink-50 dark:bg-[#160B1E] flex-1 transition-colors">
        <p className="text-slate-500 dark:text-slate-400 transition-colors">Không tìm thấy từ vựng.</p>
        <button onClick={() => navigate('/my-vocabulary')} className="mt-4 text-fuchsia-500 dark:text-fuchsia-400 hover:underline transition-colors">
          Quay lại sổ tay
        </button>
      </div>
    );
  }

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < words.length - 1;

  return (
    <div className="flex-1 flex flex-col bg-pink-50/50 dark:bg-[#160B1E] transition-colors">
      {/* Top Bar Navigation */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between px-4 sm:px-8 py-4 sm:py-8 transition-colors">
        <button
          onClick={() => navigate('/my-vocabulary')}
          className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
          <span className="font-medium hidden sm:inline">Quay lại danh sách</span>
        </button>
        <div className="text-sm font-medium text-slate-400 dark:text-slate-500 bg-white dark:bg-[#1E1226] px-4 py-1.5 rounded-full shadow-sm border border-pink-100 dark:border-[#3A2F43] transition-colors">
          {currentIndex + 1} / {words.length}
        </div>
      </div>

      {/* Main Flashcard Container */}
      <div
        className="flex-1 flex items-center justify-center w-full relative px-0 sm:px-8 md:px-16"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Nút Previous */}
        <div className="hidden sm:flex absolute left-0 z-10">
          <button
            onClick={goToPrevious}
            disabled={!hasPrev}
            className={`p-3 sm:p-4 rounded-full shadow-lg transition-all
              ${hasPrev
                ? 'bg-white dark:bg-[#1E1226] text-slate-700 dark:text-slate-300 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/30 hover:text-fuchsia-600 dark:hover:text-fuchsia-400 hover:scale-110 cursor-pointer'
                : 'opacity-0 pointer-events-none'
              }`}
          >
            <ChevronLeft size={32} />
          </button>
        </div>

        {/* Flashcard */}
        <div className="w-full sm:max-w-3xl">
          <div className="w-full max-w-3xl mx-auto" style={{ perspective: '1200px' }}>
            <div
              onClick={() => setIsFlipped(prev => !prev)}
              className="relative w-full cursor-pointer transition-transform duration-500 ease-in-out"
              style={{
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                minHeight: '420px',
              }}
            >
              {/* ════ FRONT FACE ════ */}
              <div
                className="absolute inset-0 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-[#0D0F17]/50 border border-pink-200 dark:border-[#3A2F43] overflow-hidden flex flex-col transition-colors"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 bg-gradient-to-br from-pink-50 via-white to-fuchsia-50 dark:from-[#1E2333] dark:via-[#1E1226] dark:to-[#181C28] transition-colors">
                  <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-slate-800 dark:text-white tracking-tight mb-5 text-center select-none transition-colors break-words">
                    {wordData.word}
                  </h2>
                  <div className="flex flex-col items-center gap-3 mb-8">
                    {wordData.phonetic && (
                      <span className="px-5 py-2 bg-white/80 dark:bg-black/20 border border-pink-200 dark:border-[#3A2F43] text-slate-500 dark:text-slate-400 font-mono text-lg rounded-2xl shadow-sm select-none transition-colors">
                        {wordData.phonetic}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={speakWord}
                    className="p-4 text-fuchsia-600 dark:text-fuchsia-400 bg-white dark:bg-[#2A1F33] hover:bg-fuchsia-50 dark:hover:bg-[#32263C] border border-fuchsia-100 dark:border-[#3A2F43] hover:border-fuchsia-200 dark:hover:border-fuchsia-500/50 rounded-2xl transition-all shadow-sm group cursor-pointer"
                    title="Nghe phát âm"
                  >
                    <Volume2 size={28} className="group-hover:scale-110 transition-transform" />
                  </button>
                </div>
                <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-[#1E1226] border-t border-pink-100 dark:border-[#3A2F43] transition-colors">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-bold transition-all cursor-pointer bg-white dark:bg-[#2A1F33] border-pink-200 dark:border-[#3A2F43] text-red-400 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-200 dark:hover:border-red-500/30"
                  >
                    <Trash2 size={18} />
                    Xóa từ
                  </button>
                  <span className="text-sm text-slate-400 dark:text-slate-500 font-medium select-none flex items-center gap-1.5">
                    <RotateCcw size={14} />
                    Nhấn để lật thẻ
                  </span>
                </div>
              </div>

              {/* ════ BACK FACE ════ */}
              <div
                className="absolute inset-0 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-[#0D0F17]/50 border border-pink-200 dark:border-[#3A2F43] overflow-hidden flex flex-col bg-white dark:bg-[#1E1226] transition-colors"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 sm:px-8 py-4 bg-pink-50 dark:bg-[#160B1E] border-b border-pink-100 dark:border-[#3A2F43] shrink-0 transition-colors">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white transition-colors">{wordData.word}</h3>
                    {wordData.phonetic && (
                      <span className="text-sm text-slate-400 dark:text-slate-500 font-mono hidden sm:inline">{wordData.phonetic}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={speakWord}
                      className="p-2 text-fuchsia-500 dark:text-fuchsia-400 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-500/10 rounded-lg transition-colors cursor-pointer"
                      title="Nghe phát âm"
                    >
                      <Volume2 size={20} />
                    </button>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-medium select-none flex items-center gap-1">
                      <RotateCcw size={12} />
                      Lật lại
                    </span>
                  </div>
                </div>
                {/* Meaning content */}
                <div
                  className="flex-1 overflow-y-auto p-6 sm:px-8 sm:py-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-col space-y-6 sm:space-y-8">
                    {/* Meaning */}
                    <div>
                      <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                        Nghĩa
                      </div>
                      <div className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white leading-tight">
                        {wordData.meaning}
                      </div>
                    </div>
                    {wordData.example_sentence && (
                      <>
                        <hr className="border-slate-100 dark:border-[#3A2F43]" />
                        {/* Example */}
                        <div>
                          <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                            Ví dụ
                          </div>
                          <div className="text-xl sm:text-2xl italic font-medium text-slate-700 dark:text-slate-200 mb-2">
                            {wordData.example_sentence}
                          </div>
                        </div>
                      </>
                    )}
                    {wordData.notes && (
                      <>
                        <hr className="border-slate-100 dark:border-[#3A2F43]" />
                        <div>
                          <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                            Ghi chú
                          </div>
                          <div className="text-lg text-slate-600 dark:text-slate-300">
                            {wordData.notes}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {/* Bottom bar */}
                <div className="flex items-center justify-between px-6 py-3 bg-pink-50 dark:bg-[#160B1E] border-t border-pink-100 dark:border-[#3A2F43] shrink-0 transition-colors">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all cursor-pointer bg-white dark:bg-[#2A1F33] border-pink-200 dark:border-[#3A2F43] text-red-400 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-200 dark:hover:border-red-500/30"
                  >
                    <Trash2 size={16} />
                    Xóa từ
                  </button>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                    Nguồn: {wordData.source || 'Thêm thủ công'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Nút Next */}
        <div className="hidden sm:flex absolute right-0 z-10">
          <button
            onClick={goToNext}
            disabled={!hasNext}
            className={`p-3 sm:p-4 rounded-full shadow-lg transition-all
              ${hasNext
                ? 'bg-white dark:bg-[#1E1226] text-slate-700 dark:text-slate-300 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/30 hover:text-fuchsia-600 dark:hover:text-fuchsia-400 hover:scale-110 cursor-pointer'
                : 'opacity-0 pointer-events-none'
              }`}
          >
            <ChevronRight size={32} />
          </button>
        </div>
      </div>

      {/* Mobile swipe hint */}
      <p className="sm:hidden text-center text-slate-400 dark:text-slate-500 text-xs mt-4 mb-3 flex items-center justify-center gap-2 transition-colors">
        <span>←</span>
        <span>Vuốt qua lại để chuyển từ khác</span>
        <span>→</span>
      </p>

      {/* Desktop keyboard hints */}
      <p className="text-center text-slate-400 dark:text-slate-500 text-sm mt-6 mb-4 hidden sm:block transition-colors">
        Mẹo: Bạn có thể dùng phím mũi tên <kbd className="font-sans px-2 py-1 bg-white dark:bg-[#1E1226] border border-pink-200 dark:border-[#3A2F43] rounded-lg mx-1 shadow-sm text-slate-700 dark:text-slate-300 transition-colors">←</kbd> và <kbd className="font-sans px-2 py-1 bg-white dark:bg-[#1E1226] border border-pink-200 dark:border-[#3A2F43] rounded-lg mx-1 shadow-sm text-slate-700 dark:text-slate-300 transition-colors">→</kbd> để chuyển từ nhanh
      </p>
    </div>
  );
}
