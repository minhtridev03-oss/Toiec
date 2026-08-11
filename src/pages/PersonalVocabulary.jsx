import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import useSWR from 'swr';
import { ArrowLeft, Search, Volume2, Loader2, ChevronLeft, ChevronRight, BookOpen, CheckCircle2, Circle } from 'lucide-react';

const PAGE_SIZE = 50;

// Custom hook for debounce
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function PersonalVocabulary() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [deletingId, setDeletingId] = useState(null);
  
  // Search & pagination
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchQuery]);

  const fetchWordsData = async () => {
    if (!user) throw new Error('Missing user');
    let query = supabase
      .from('user_vocabulary')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (debouncedSearchQuery) {
      query = query.ilike('word', `%${debouncedSearchQuery}%`);
    }

    const { data, count, error } = await query;
    if (error) throw error;
    
    return {
      words: data || [],
      totalCount: count || 0
    };
  };

  const { data, isLoading, mutate } = useSWR(
    user ? `personal_vocab_${user.id}_${page}_${debouncedSearchQuery}` : null,
    fetchWordsData,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      keepPreviousData: true,
      dedupingInterval: 60000,
    }
  );

  const words = data?.words || [];
  const totalCount = data?.totalCount || 0;
  const loading = isLoading && !data;

  const toggleLearned = async (e, vocabId, currentStatus) => {
    e.stopPropagation();
    const newStatus = !currentStatus;

    // Optimistic update
    mutate(
      data => ({ ...data, words: data.words.map(w => w.id === vocabId ? { ...w, is_learned: newStatus } : w) }),
      false
    );

    const { error } = await supabase
      .from('user_vocabulary')
      .update({ is_learned: newStatus })
      .eq('id', vocabId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error toggling learned status:', error);
      // Revert on error
      mutate(
        data => ({ ...data, words: data.words.map(w => w.id === vocabId ? { ...w, is_learned: currentStatus } : w) }),
        false
      );
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Bạn có chắc chắn muốn xóa từ này khỏi sổ tay?")) return;
    
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('user_vocabulary')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setWords(prev => prev.filter(w => w.id !== id));
      setTotalCount(prev => prev - 1);
    } catch (error) {
      console.error('Error deleting word:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto w-full">
      {/* Nút quay lại */}
      <button
        onClick={() => navigate('/categories')}
        className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 mb-6 transition-colors cursor-pointer w-fit"
      >
        <ArrowLeft size={20} />
        <span className="font-medium">Quay lại chủ đề</span>
      </button>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
          <BookOpen className="text-fuchsia-500" size={28} />
          Sổ tay từ vựng của tôi
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          {totalCount} từ đã lưu
        </p>
      </div>

      {/* Toolbar: Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm từ vựng trong sổ tay..."
            className="block w-full pl-10 pr-3 py-2.5 border border-pink-200 dark:border-[#3A2F43] rounded-xl bg-white dark:bg-[#1E1226] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:border-fuchsia-500 text-sm text-slate-800 dark:text-slate-200 transition-colors"
          />
        </div>

        {/* Start review button */}
        {totalCount > 0 && (
          <button
            onClick={() => navigate('/my-vocabulary/review/0')}
            className="px-5 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer shrink-0 shadow-sm"
          >
            Ôn tập Flashcard
          </button>
        )}
      </div>

      {/* Word list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-[72px] bg-pink-100 dark:bg-[#2A1F33] animate-pulse rounded-xl transition-colors"></div>
          ))}
        </div>
      ) : words.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#1E1226] rounded-2xl border border-pink-200 dark:border-[#3A2F43] transition-colors">
          <BookOpen size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            {searchQuery ? 'Không tìm thấy từ phù hợp' : 'Chưa có từ vựng nào. Hãy tra từ bằng AI Dictionary và bấm "Lưu lại" để thêm từ vào sổ tay.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1E1226] rounded-2xl shadow-sm border border-pink-200 dark:border-[#3A2F43] overflow-hidden transition-colors">
          {/* Table header (hidden on mobile) */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto] gap-4 px-5 py-3 bg-pink-50 dark:bg-[#160B1E] border-b border-pink-100 dark:border-[#3A2F43] text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider transition-colors">
            <span>Từ vựng</span>
            <span className="w-20 text-center">Phát âm</span>
            <span className="w-24 text-center">Trạng thái</span>
          </div>

          <div className="divide-y divide-pink-100 dark:divide-[#3A2F43] transition-colors">
            {words.map((word, index) => {
              // Calculate global index for flashcard navigation
              const globalIndex = (page - 1) * PAGE_SIZE + index;
              const isLearned = !!word.is_learned;
              return (
                <div
                  key={word.id}
                  onClick={() => navigate(`/my-vocabulary/review/${globalIndex}`)}
                  className="flex items-center justify-between p-4 sm:p-5 hover:bg-pink-50 dark:hover:bg-[#2A1F33] transition-colors cursor-pointer group"
                >
                  {/* Left: Word + Meaning */}
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400 transition-colors truncate">
                        {word.word}
                      </h3>
                      {word.phonetic && (
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-mono hidden sm:inline shrink-0">
                          {word.phonetic}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                      {word.meaning}
                    </p>
                  </div>

                  {/* Play audio button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if ('speechSynthesis' in window) {
                        window.speechSynthesis.cancel();
                        const utterance = new SpeechSynthesisUtterance(word.word);
                        utterance.lang = 'en-US';
                        window.speechSynthesis.speak(utterance);
                      }
                    }}
                    className="p-2 text-slate-300 dark:text-slate-600 hover:text-fuchsia-500 dark:hover:text-fuchsia-400 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-500/10 rounded-lg transition-colors cursor-pointer shrink-0 mr-2 hidden sm:flex"
                    title="Nghe phát âm"
                  >
                    <Volume2 size={18} />
                  </button>

                  {/* Checkbox "Đã học" */}
                  <button
                    onClick={(e) => toggleLearned(e, word.id, isLearned)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer shrink-0 min-w-[60px] mr-2
                      ${isLearned
                        ? 'text-green-500 dark:text-green-400 bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20'
                        : 'text-slate-300 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-300 hover:bg-pink-100 dark:hover:bg-[#3A2F43]'
                      }`}
                    title={isLearned ? 'Đã học' : 'Chưa học'}
                  >
                    {isLearned
                      ? <CheckCircle2 size={24} />
                      : <Circle size={24} />
                    }
                    <span className="text-[10px] font-semibold mt-1 uppercase tracking-wide">
                      {isLearned ? 'Đã học' : 'Chưa học'}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer pagination */}
          <div className="px-5 py-4 bg-pink-50 dark:bg-[#160B1E] border-t border-pink-100 dark:border-[#3A2F43] flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Hiển thị từ {(page - 1) * PAGE_SIZE + 1} đến {Math.min(page * PAGE_SIZE, totalCount)} trong số {totalCount} từ
            </span>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-pink-200 dark:border-[#3A2F43] text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-[#1E1226] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft size={18} />
              </button>
              
              <div className="flex items-center gap-1">
                <span className="px-3 py-1.5 rounded-lg bg-fuchsia-50 dark:bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 font-semibold text-sm border border-fuchsia-100 dark:border-fuchsia-500/20 transition-colors">
                  Trang {page} / {totalPages}
                </span>
              </div>

              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 rounded-lg border border-pink-200 dark:border-[#3A2F43] text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-[#1E1226] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
