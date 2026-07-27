import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { useStats } from '../contexts/StatsContext';
import { ChevronLeft, ChevronRight, ArrowLeft, Loader2 } from 'lucide-react';
import Flashcard from '../components/vocab/Flashcard';
export default function VocabularyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { locale } = useLocale();
  const text = locale === 'vi'
    ? { missing: 'Không tìm thấy từ vựng.', back: 'Quay lại', list: 'Quay lại danh sách', hint: 'Mẹo: Bạn có thể dùng phím mũi tên', and: 'và', toSwitch: 'để chuyển từ nhanh', swipeHint: 'Vuốt qua lại để chuyển từ khác' }
    : { missing: 'Vocabulary word not found.', back: 'Go back', list: 'Back to list', hint: 'Tip: You can use the arrow keys', and: 'and', toSwitch: 'to move between words quickly', swipeHint: 'Swipe left or right to navigate' };
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
        currentWordIds = siblingWords.map(w => w.id);
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

  const { refreshStats } = useStats();
  const toggleLearned = async () => {
    if (!wordData) return;
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
      refreshStats();
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 transition-colors">
        <Loader2 className="animate-spin text-fuchsia-500" size={40} />
      </div>
    );
  }
  if (!wordData) {
    return (
      <div className="p-8 text-center bg-pink-50 dark:bg-[#160B1E] flex-1 transition-colors">
        <p className="text-slate-500 dark:text-slate-400 transition-colors">{text.missing}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-fuchsia-500 dark:text-fuchsia-400 hover:underline transition-colors">{text.back}</button>
      </div>
    );
  }

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < wordIds.length - 1;

  return (
    <div className="flex-1 flex flex-col bg-pink-50/50 dark:bg-[#160B1E] transition-colors">
      {/* Top Bar Navigation */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between px-4 sm:px-8 py-4 sm:py-8 transition-colors">
        <button
          onClick={() => navigate(`/categories/${wordData.sub_category_id}`)}
          className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
          <span className="font-medium hidden sm:inline">{text.list}</span>
        </button>
        <div className="text-sm font-medium text-slate-400 dark:text-slate-500 bg-white dark:bg-[#1E1226] px-4 py-1.5 rounded-full shadow-sm border border-pink-100 dark:border-[#3A2F43] transition-colors">
          {currentIndex + 1} / {wordIds.length}
        </div>
      </div>

      {/* Main Flashcard Container */}
      <div
        className="flex-1 flex items-center justify-center w-full relative px-0 sm:px-8 md:px-16"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Nút Previous — ẩn trên mobile */}
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

        {/* Component Flashcard — edge-to-edge trên mobile */}
        <div className="w-full sm:max-w-3xl">
          <Flashcard
            word={wordData}
            isLearned={isLearned}
            onToggleLearned={toggleLearned}
          />
        </div>

        {/* Nút Next — ẩn trên mobile */}
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
        <span>{text.swipeHint}</span>
        <span>→</span>
      </p>

      {/* Desktop keyboard hints */}
      <p className="text-center text-slate-400 dark:text-slate-500 text-sm mt-6 mb-4 hidden sm:block transition-colors">
        {text.hint} <kbd className="font-sans px-2 py-1 bg-white dark:bg-[#1E1226] border border-pink-200 dark:border-[#3A2F43] rounded-lg mx-1 shadow-sm text-slate-700 dark:text-slate-300 transition-colors">←</kbd> {text.and} <kbd className="font-sans px-2 py-1 bg-white dark:bg-[#1E1226] border border-pink-200 dark:border-[#3A2F43] rounded-lg mx-1 shadow-sm text-slate-700 dark:text-slate-300 transition-colors">→</kbd> {text.toSwitch}
      </p>
    </div>
  );
}