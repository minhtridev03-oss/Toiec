import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { useStats } from '../contexts/StatsContext';
import { useSWRConfig } from 'swr';
import { ChevronLeft, ChevronRight, ArrowLeft, Loader2 } from 'lucide-react';
import Flashcard from '../components/vocab/Flashcard';

export default function VocabularyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { locale } = useLocale();
  const { refreshStats } = useStats();
  const { mutate: globalMutate } = useSWRConfig();

  const text = locale === 'vi'
    ? {
        missing: 'Không tìm thấy từ vựng.',
        back: 'Quay lại',
        list: 'Quay lại danh sách',
        hint: 'Mẹo: Dùng phím mũi tên',
        and: 'và',
        toSwitch: 'để chuyển từ nhanh',
        swipeHint: 'Vuốt màn hình qua lại để chuyển từ',
      }
    : {
        missing: 'Vocabulary word not found.',
        back: 'Go back',
        list: 'Back to list',
        hint: 'Tip: Use arrow keys',
        and: 'and',
        toSwitch: 'to switch words quickly',
        swipeHint: 'Swipe left or right to switch words',
      };

  const [wordData, setWordData] = useState(null);
  const [wordIds, setWordIds] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isLearned, setIsLearned] = useState(false);
  const [loading, setLoading] = useState(true);
  const touchStartX = useRef(null);

  useEffect(() => {
    if (user && id) {
      loadWordDetail();
    }
  }, [id, user?.id]);

  const loadWordDetail = async () => {
    setLoading(true);
    try {
      const { data: currentWord, error: wordError } = await supabase
        .from('topic_vocabularies')
        .select('id, word, pro, pos, mean, example, example_mean, sub_category_id')
        .eq('id', id)
        .single();

      if (wordError) throw wordError;
      setWordData(currentWord);

      let currentWordIds = wordIds;
      if (wordIds.length === 0 || !wordIds.includes(currentWord.id)) {
        const { data: siblingWords, error: siblingError } = await supabase
          .from('topic_vocabularies')
          .select('id')
          .eq('sub_category_id', currentWord.sub_category_id)
          .order('word', { ascending: true });

        if (siblingError) throw siblingError;
        currentWordIds = siblingWords.map((w) => w.id);
        setWordIds(currentWordIds);
      }

      const index = currentWordIds.indexOf(currentWord.id);
      setCurrentIndex(index);

      const { data: progressData } = await supabase
        .from('user_topic_vocabularies')
        .select('is_learned')
        .eq('user_id', user.id)
        .eq('vocabulary_id', currentWord.id)
        .maybeSingle();

      setIsLearned(progressData ? progressData.is_learned : false);
    } catch (error) {
      console.error('Lỗi khi tải chi tiết từ vựng:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) navigate(`/vocabularies/${wordIds[currentIndex - 1]}`);
  }, [currentIndex, wordIds, navigate]);

  const goToNext = useCallback(() => {
    if (currentIndex < wordIds.length - 1) navigate(`/vocabularies/${wordIds[currentIndex + 1]}`);
  }, [currentIndex, wordIds, navigate]);

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

  const toggleLearned = async () => {
    if (!wordData || !user) return;
    const newStatus = !isLearned;
    setIsLearned(newStatus);

    const { error } = await supabase
      .from('user_topic_vocabularies')
      .upsert(
        { user_id: user.id, vocabulary_id: wordData.id, is_learned: newStatus },
        { onConflict: 'user_id,vocabulary_id' }
      );

    if (error) {
      console.error('Lỗi khi cập nhật tiến độ:', error);
      setIsLearned(!newStatus);
    } else {
      if (typeof refreshStats === 'function') {
        refreshStats();
      }
      // Revalidate WordList SWR cache so the word list & 'Đã học' tab update immediately
      globalMutate(
        (key) => typeof key === 'string' && key.startsWith(`words_${wordData.sub_category_id}_`),
        undefined,
        { revalidate: true }
      );
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 min-h-[70vh]">
        <div className="p-8 rounded-[2rem] bg-white/25 dark:bg-slate-950/40 backdrop-blur-2xl border border-white/60 dark:border-white/15 shadow-xl flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-indigo-600 dark:text-cyan-400" size={36} />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Đang tải từ vựng...</span>
        </div>
      </div>
    );
  }

  if (!wordData) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 min-h-[70vh]">
        <div className="p-8 sm:p-12 text-center rounded-[2.5rem] bg-white/25 dark:bg-slate-950/40 backdrop-blur-2xl border border-white/60 dark:border-white/15 shadow-2xl max-w-md w-full">
          <p className="text-slate-950 dark:text-white font-black text-lg mb-4">{text.missing}</p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-500/25 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>{text.back}</span>
          </button>
        </div>
      </div>
    );
  }

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < wordIds.length - 1;

  return (
    <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full min-h-[85vh] animate-in fade-in duration-300">
      {/* ============================================================ */}
      {/* 1. TOP BAR (Liquid Glass Navigation & Counter Pill) */}
      {/* ============================================================ */}
      <div className="w-full flex items-center justify-between mb-6 sm:mb-8">
        {/* Back button */}
        <button
          onClick={() => navigate(`/categories/${wordData.sub_category_id}`)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/40 hover:bg-white/75 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white border border-white/60 dark:border-white/15 backdrop-blur-xl text-xs font-black transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),_0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] active:scale-95 cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>{text.list}</span>
        </button>

        {/* Counter Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/35 dark:bg-slate-950/45 border border-white/50 dark:border-white/15 backdrop-blur-xl shadow-xs text-xs font-black text-indigo-700 dark:text-cyan-300 tracking-wider">
          <span className="w-2 h-2 rounded-full bg-indigo-500 dark:bg-cyan-400 animate-pulse" />
          <span>
            {currentIndex + 1} / {wordIds.length}
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
                ? 'bg-white/40 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-cyan-500/20 text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-cyan-300 border-white/60 dark:border-white/20 shadow-[0_8px_25px_rgba(0,0,0,0.08),_inset_0_1px_2px_rgba(255,255,255,0.85)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.6),_inset_0_1px_2px_rgba(255,255,255,0.25)] hover:scale-110 active:scale-95 cursor-pointer'
                : 'opacity-0 pointer-events-none'
            }`}
            title="Từ trước (Mũi tên trái)"
          >
            <ChevronLeft size={26} />
          </button>
        </div>

        {/* Flashcard Component */}
        <div className="w-full sm:max-w-2xl lg:max-w-3xl">
          <Flashcard
            word={wordData}
            isLearned={isLearned}
            onToggleLearned={toggleLearned}
          />
        </div>

        {/* Next Button (Right Floating Liquid Glass Orb) */}
        <div className="hidden sm:flex absolute -right-4 md:-right-8 lg:-right-12 z-20">
          <button
            onClick={goToNext}
            disabled={!hasNext}
            className={`h-13 w-13 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-2xl border ${
              hasNext
                ? 'bg-white/40 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-cyan-500/20 text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-cyan-300 border-white/60 dark:border-white/20 shadow-[0_8px_25px_rgba(0,0,0,0.08),_inset_0_1px_2px_rgba(255,255,255,0.85)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.6),_inset_0_1px_2px_rgba(255,255,255,0.25)] hover:scale-110 active:scale-95 cursor-pointer'
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
      {/* Mobile Next/Prev quick buttons */}
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

      {/* Mobile swipe hint */}
      <p className="sm:hidden text-center text-slate-700 dark:text-slate-300 text-xs mt-3 flex items-center justify-center gap-2">
        <span>←</span>
        <span>{text.swipeHint}</span>
        <span>→</span>
      </p>

      {/* Desktop keyboard hint dock */}
      <div className="mt-6 hidden sm:flex justify-center">
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/30 dark:bg-slate-950/40 border border-white/50 dark:border-white/15 backdrop-blur-xl text-xs font-bold text-slate-800 dark:text-slate-200 shadow-sm">
          <span>{text.hint}</span>
          <kbd className="font-mono px-2 py-0.5 bg-white/60 dark:bg-white/15 border border-white/70 dark:border-white/20 rounded-md shadow-xs text-slate-950 dark:text-white font-black">
            ←
          </kbd>
          <span>{text.and}</span>
          <kbd className="font-mono px-2 py-0.5 bg-white/60 dark:bg-white/15 border border-white/70 dark:border-white/20 rounded-md shadow-xs text-slate-950 dark:text-white font-black">
            →
          </kbd>
          <span>{text.toSwitch}</span>
        </div>
      </div>
    </div>
  );
}