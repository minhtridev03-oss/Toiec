import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useStats } from '../contexts/StatsContext';
import useSWR, { useSWRConfig } from 'swr';
import {
  ArrowLeft,
  Search,
  Volume2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  Circle,
  Trash2,
  Sparkles,
  X,
} from 'lucide-react';

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
  const { refreshStats } = useStats();
  const { mutate: globalMutate } = useSWRConfig();

  const [deletingId, setDeletingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  const [page, setPage] = useState(1);
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'learned' | 'unlearned'
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchQuery, filterMode]);

  // Fetch words data & automatically deduplicate
  const fetchWordsData = async () => {
    if (!user?.id) throw new Error('Missing user');

    // 1. Fetch all personal vocabulary items of this user to compute accurate stats & detect duplicates
    const { data: allUserWords, error: allErr } = await supabase
      .from('user_vocabulary')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (allErr) throw allErr;

    const rawList = allUserWords || [];

    // 2. Deduplication check: Keep newest row per word, collect older duplicates for cleanup
    const seenWords = new Map();
    const duplicateIds = [];
    const uniqueWords = [];

    for (const item of rawList) {
      const normalizedWord = (item.word || '').trim().toLowerCase();
      if (!normalizedWord) continue;

      if (seenWords.has(normalizedWord)) {
        duplicateIds.push(item.id);
      } else {
        seenWords.set(normalizedWord, item);
        uniqueWords.push(item);
      }
    }

    // Auto cleanup duplicate rows in the background
    if (duplicateIds.length > 0) {
      supabase
        .from('user_vocabulary')
        .delete()
        .in('id', duplicateIds)
        .then(() => {
          // Invalidate cache quietly once cleaned
          globalMutate((key) => typeof key === 'string' && key.startsWith(`personal_vocab_${user.id}`));
        })
        .catch((err) => console.error('Error auto-cleaning duplicates:', err));
    }

    // 3. Compute accurate counts across all unique items
    const totalCount = uniqueWords.length;
    const learnedCount = uniqueWords.filter((w) => !!w.is_learned).length;
    const unlearnedCount = totalCount - learnedCount;

    // 4. Filter by search query
    let filteredList = uniqueWords;
    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.trim().toLowerCase();
      filteredList = filteredList.filter(
        (w) =>
          (w.word || '').toLowerCase().includes(q) ||
          (w.meaning || '').toLowerCase().includes(q) ||
          (w.phonetic || '').toLowerCase().includes(q)
      );
    }

    // 5. Filter by filterMode
    if (filterMode === 'learned') {
      filteredList = filteredList.filter((w) => !!w.is_learned);
    } else if (filterMode === 'unlearned') {
      filteredList = filteredList.filter((w) => !w.is_learned);
    }

    // 6. Apply pagination
    const totalFiltered = filteredList.length;
    const paginatedWords = filteredList.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return {
      words: paginatedWords,
      totalCount,
      totalFiltered,
      learnedCount,
      unlearnedCount,
    };
  };

  const { data, isLoading, mutate } = useSWR(
    user?.id ? `personal_vocab_${user.id}_${page}_${debouncedSearchQuery}_${filterMode}` : null,
    fetchWordsData,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      keepPreviousData: true,
      dedupingInterval: 10000,
    }
  );

  const words = data?.words || [];
  const totalCount = data?.totalCount || 0;
  const totalFiltered = data?.totalFiltered || 0;
  const learnedCount = data?.learnedCount || 0;
  const unlearnedCount = data?.unlearnedCount || 0;
  const loading = isLoading && !data;

  const progressPercent = totalCount > 0 ? Math.round((learnedCount / totalCount) * 100) : 0;
  const totalPages = Math.ceil(totalFiltered / PAGE_SIZE) || 1;

  // Toggle learned status
  const toggleLearned = async (e, vocabId, currentStatus) => {
    e.stopPropagation();
    if (!user) return;
    const newStatus = !currentStatus;

    // Optimistic update
    mutate(
      (curr) => {
        if (!curr) return curr;
        const delta = newStatus ? 1 : -1;
        const updatedWords = curr.words.map((w) =>
          w.id === vocabId ? { ...w, is_learned: newStatus } : w
        );

        let filteredWords = updatedWords;
        if (filterMode === 'learned' && !newStatus) {
          filteredWords = filteredWords.filter((w) => w.id !== vocabId);
        } else if (filterMode === 'unlearned' && newStatus) {
          filteredWords = filteredWords.filter((w) => w.id !== vocabId);
        }

        return {
          ...curr,
          words: filteredWords,
          learnedCount: Math.max(0, (curr.learnedCount || 0) + delta),
          unlearnedCount: Math.max(0, (curr.unlearnedCount || 0) - delta),
          totalFiltered:
            filterMode !== 'all'
              ? Math.max(0, (curr.totalFiltered || 0) - 1)
              : curr.totalFiltered,
        };
      },
      false
    );

    const { error } = await supabase
      .from('user_vocabulary')
      .update({ is_learned: newStatus })
      .eq('id', vocabId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error toggling learned status:', error);
      mutate();
    } else {
      if (typeof refreshStats === 'function') refreshStats();
      // Invalidate other tabs for personal vocab
      globalMutate(
        (key) =>
          typeof key === 'string' &&
          key.startsWith(`personal_vocab_${user.id}`) &&
          key !== `personal_vocab_${user.id}_${page}_${debouncedSearchQuery}_${filterMode}`,
        undefined,
        { revalidate: true }
      );
    }
  };

  // Delete word from notebook
  const handleDelete = async (e, id, wordText) => {
    e.stopPropagation();
    if (!window.confirm(`Bạn có chắc chắn muốn xóa "${wordText}" khỏi sổ tay từ vựng?`)) return;

    setDeletingId(id);

    // Optimistic delete
    mutate(
      (curr) => {
        if (!curr) return curr;
        const targetWord = curr.words.find((w) => w.id === id);
        const wasLearned = targetWord?.is_learned;
        return {
          ...curr,
          words: curr.words.filter((w) => w.id !== id),
          totalCount: Math.max(0, (curr.totalCount || 0) - 1),
          totalFiltered: Math.max(0, (curr.totalFiltered || 0) - 1),
          learnedCount: wasLearned
            ? Math.max(0, (curr.learnedCount || 0) - 1)
            : curr.learnedCount,
          unlearnedCount: !wasLearned
            ? Math.max(0, (curr.unlearnedCount || 0) - 1)
            : curr.unlearnedCount,
        };
      },
      false
    );

    try {
      const { error } = await supabase
        .from('user_vocabulary')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      showToast(`Đã xóa "${wordText}" khỏi sổ từ vựng`);
      if (typeof refreshStats === 'function') refreshStats();
      // Invalidate Categories badge
      globalMutate(
        (key) => typeof key === 'string' && key.startsWith('categories_'),
        undefined,
        { revalidate: true }
      );
    } catch (error) {
      console.error('Error deleting word:', error);
      showToast('Không thể xóa từ vựng. Vui lòng thử lại.', 'error');
      mutate();
    } finally {
      setDeletingId(null);
    }
  };

  const playAudio = (e, wordText) => {
    e.stopPropagation();
    if (!('speechSynthesis' in window) || !wordText) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(wordText);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto w-full min-h-[85vh] animate-in fade-in duration-300">
      {/* ============================================================ */}
      {/* 1. TOP BAR (Liquid Glass Navigation) */}
      {/* ============================================================ */}
      <button
        onClick={() => navigate('/categories')}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/40 hover:bg-white/75 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white border border-white/60 dark:border-white/15 backdrop-blur-xl text-xs font-black transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),_0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] active:scale-95 cursor-pointer w-fit mb-6"
      >
        <ArrowLeft size={16} />
        <span>Quay lại Kho từ vựng</span>
      </button>

      {/* ============================================================ */}
      {/* 2. HERO CAPSULE (Liquid Glass Banner) */}
      {/* ============================================================ */}
      <div className="relative mb-6 overflow-hidden rounded-[2.5rem] border border-white/50 dark:border-white/10 bg-white/20 dark:bg-slate-950/35 shadow-[0_20px_50px_rgba(0,0,0,0.06),_inset_0_1px_2px_rgba(255,255,255,0.7),_inset_0_-1px_1px_rgba(0,0,0,0.03)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),_inset_0_1px_2px_rgba(255,255,255,0.25),_inset_0_-1px_1px_rgba(255,255,255,0.05)] backdrop-blur-2xl p-6 sm:p-8">
        {/* Ambient Fluid Caustics Blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2.5rem] -z-0">
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-gradient-to-br from-fuchsia-500/20 dark:from-fuchsia-500/25 via-indigo-400/15 dark:via-indigo-400/20 to-transparent blur-3xl animate-liquid-blob" />
          <div
            className="absolute -bottom-28 -right-28 w-80 h-80 rounded-full bg-gradient-to-tl from-cyan-500/20 dark:from-cyan-600/25 via-violet-400/15 dark:via-purple-500/15 to-transparent blur-3xl animate-liquid-blob"
            style={{ animationDelay: '-4s' }}
          />
          {/* Top specular rim light */}
          <div className="absolute top-0 inset-x-10 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/40 to-transparent" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-3 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-500/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)]">
                Cá nhân
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 drop-shadow-xs">
                • {totalCount} từ vựng đã lưu
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-950 dark:text-white tracking-tight drop-shadow-xs flex items-center gap-3">
              <BookOpen className="text-fuchsia-600 dark:text-fuchsia-400" size={32} />
              <span>Sổ tay từ vựng của tôi</span>
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
              Lưu trữ các từ vựng tra cứu từ Từ điển TFlat, bài tập và kho bài đọc để ôn tập thông minh.
            </p>
          </div>

          {/* Progress Tube & Flashcard review launcher */}
          <div className="flex flex-col sm:items-end justify-center gap-3 min-w-[220px]">
            <div className="flex items-center justify-between sm:justify-end gap-3 text-xs font-black text-slate-900 dark:text-slate-100">
              <span className="text-fuchsia-700 dark:text-fuchsia-300 font-black">
                {progressPercent}% đã thuộc
              </span>
              <span className="text-slate-700 dark:text-slate-300 font-bold">
                ({learnedCount}/{totalCount} từ)
              </span>
            </div>
            <div className="relative w-full sm:w-60 h-3 rounded-full overflow-hidden bg-slate-300/40 dark:bg-slate-900/70 p-[1.5px] border border-white/50 dark:border-white/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-fuchsia-600 via-violet-500 to-cyan-400 transition-all duration-700 relative overflow-hidden shadow-[0_0_12px_rgba(217,70,239,0.4)]"
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-liquid-shimmer pointer-events-none" />
              </div>
            </div>

            {totalCount > 0 && (
              <button
                onClick={() => navigate('/my-vocabulary/review/0')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-violet-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-black text-xs shadow-md shadow-fuchsia-500/25 hover:shadow-fuchsia-500/40 hover:scale-102 active:scale-95 transition-all cursor-pointer whitespace-nowrap mt-1"
              >
                <Sparkles size={15} />
                <span>Ôn tập Flashcard ({totalCount})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. FLOATING CONTROLS (Search & Filter Pills) */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search Capsule */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm từ vựng trong sổ tay..."
            className="w-full pl-10 pr-9 py-2.5 bg-white/25 dark:bg-slate-950/35 border border-white/50 dark:border-white/10 focus:bg-white/45 dark:focus:bg-slate-950/60 focus:border-fuchsia-500/40 dark:focus:border-cyan-400/40 focus:ring-2 focus:ring-fuchsia-500/15 dark:focus:ring-cyan-400/15 rounded-2xl outline-none text-sm font-bold text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03),_0_8px_20px_rgba(0,0,0,0.03)] backdrop-blur-2xl transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Pills in Liquid Tray */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/20 dark:bg-slate-950/35 border border-white/50 dark:border-white/10 backdrop-blur-2xl shrink-0 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]">
          {[
            { key: 'all', label: `Tất cả (${totalCount})` },
            { key: 'learned', label: `Đã học (${learnedCount})` },
            { key: 'unlearned', label: `Chưa học (${unlearnedCount})` },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterMode(f.key)}
              className={`px-3.5 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                filterMode === f.key
                  ? 'bg-gradient-to-r from-fuchsia-600 via-violet-600 to-indigo-600 text-white shadow-[0_4px_15px_-2px_rgba(217,70,239,0.4),_inset_0_1px_1px_rgba(255,255,255,0.4)] scale-[1.02] border border-white/30'
                  : 'text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/10 border border-transparent'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. LIQUID GLASS VOCAB STREAM TABLE */}
      {/* ============================================================ */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-20 bg-white/20 dark:bg-slate-950/35 border border-white/40 dark:border-white/10 rounded-2xl animate-pulse backdrop-blur-2xl"
            />
          ))}
        </div>
      ) : words.length === 0 ? (
        <div className="text-center py-20 bg-white/20 dark:bg-slate-950/35 rounded-[2.5rem] border border-white/50 dark:border-white/10 backdrop-blur-2xl shadow-xl">
          <BookOpen size={44} className="mx-auto text-slate-400 dark:text-slate-500 mb-3" />
          <p className="text-slate-950 dark:text-white font-black text-base">
            {searchQuery ? 'Không tìm thấy từ vựng phù hợp' : 'Chưa có từ vựng nào trong sổ tay'}
          </p>
          <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 font-bold max-w-md mx-auto">
            {searchQuery
              ? 'Hãy thử tìm kiếm với từ khóa khác hoặc chuyển sang tab Tất cả.'
              : 'Hãy tra cứu từ mới trong mục Từ điển TFlat hoặc AI Dictionary và nhấn nút "Lưu vào sổ từ" để bắt đầu học!'}
          </p>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-[2.5rem] border border-white/50 dark:border-white/10 bg-white/20 dark:bg-slate-950/35 shadow-[0_20px_50px_rgba(0,0,0,0.06),_inset_0_1px_2px_rgba(255,255,255,0.7),_inset_0_-1px_1px_rgba(0,0,0,0.03)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),_inset_0_1px_2px_rgba(255,255,255,0.25),_inset_0_-1px_1px_rgba(255,255,255,0.05)] backdrop-blur-2xl">
          {/* Specular Rim Light Top Sheen */}
          <div className="absolute top-0 inset-x-12 h-[1px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/40 to-transparent pointer-events-none" />

          {/* Table Header (Desktop) */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto_auto] gap-4 px-6 py-3.5 border-b border-white/25 dark:border-white/10 bg-white/15 dark:bg-white/[0.02] text-[11px] font-black text-fuchsia-950 dark:text-cyan-300 uppercase tracking-wider backdrop-blur-md">
            <span>Từ vựng & Định nghĩa</span>
            <span className="w-16 text-center">Phát âm</span>
            <span className="w-28 text-center">Trạng thái</span>
            <span className="w-14 text-center">Xóa</span>
          </div>

          {/* Word Rows */}
          <div className="divide-y divide-white/20 dark:divide-white/10">
            {words.map((word, index) => {
              const globalIndex = (page - 1) * PAGE_SIZE + index;
              const isLearned = !!word.is_learned;
              const isDeleting = deletingId === word.id;

              return (
                <div
                  key={word.id}
                  onClick={() => navigate(`/my-vocabulary/review/${globalIndex}`)}
                  className="group/row relative flex items-center justify-between p-4 sm:px-6 sm:py-5 hover:bg-white/30 dark:hover:bg-white/[0.04] transition-all duration-200 cursor-pointer"
                >
                  {/* Row hover specular line */}
                  <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-fuchsia-500/20 dark:via-cyan-400/20 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity pointer-events-none" />

                  {/* Left Column: Word + Phonetic + Meaning */}
                  <div className="flex-1 min-w-0 mr-4 space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-base sm:text-lg font-black text-slate-950 dark:text-white group-hover/row:text-fuchsia-600 dark:group-hover/row:text-cyan-300 transition-colors tracking-tight">
                        {word.word}
                      </h3>
                      {word.phonetic && (
                        <span className="text-[11px] font-mono text-fuchsia-800 dark:text-cyan-300 bg-fuchsia-500/10 dark:bg-cyan-400/10 border border-fuchsia-500/20 dark:border-cyan-400/25 px-2 py-0.5 rounded-lg shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                          {word.phonetic}
                        </span>
                      )}
                      {word.source && (
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 px-1.5 py-0.5 rounded-md hidden md:inline">
                          {word.source}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 line-clamp-1 leading-relaxed font-semibold">
                      {word.meaning || '(Chưa có định nghĩa)'}
                    </p>
                  </div>

                  {/* Action Group */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Audio Button */}
                    <button
                      onClick={(e) => playAudio(e, word.word)}
                      className="h-10 w-10 rounded-full bg-white/40 dark:bg-white/10 hover:bg-fuchsia-50/70 dark:hover:bg-cyan-500/20 text-slate-800 dark:text-slate-200 hover:text-fuchsia-600 dark:hover:text-cyan-300 border border-white/60 dark:border-white/15 hover:border-fuchsia-400/40 dark:hover:border-cyan-400/40 flex items-center justify-center transition-all cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] active:scale-95 hidden sm:flex"
                      title="Nghe phát âm"
                    >
                      <Volume2 size={16} />
                    </button>

                    {/* Status Toggle Button */}
                    <button
                      onClick={(e) => toggleLearned(e, word.id, isLearned)}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer border ${
                        isLearned
                          ? 'bg-emerald-500/25 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border-emerald-500/40 dark:border-emerald-400/40 shadow-[0_0_15px_rgba(16,185,129,0.25),_inset_0_1px_1px_rgba(255,255,255,0.7)]'
                          : 'bg-white/30 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-white/40 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-slate-200'
                      }`}
                      title={isLearned ? 'Đã thuộc từ này' : 'Chưa thuộc'}
                    >
                      {isLearned ? (
                        <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Circle size={16} className="text-slate-400" />
                      )}
                      <span className="text-[11px] font-black uppercase tracking-wider">
                        {isLearned ? 'Đã học' : 'Chưa học'}
                      </span>
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={(e) => handleDelete(e, word.id, word.word)}
                      disabled={isDeleting}
                      className="h-9 w-9 rounded-xl bg-white/30 dark:bg-white/5 hover:bg-red-500/15 dark:hover:bg-red-500/20 text-slate-400 hover:text-red-600 dark:hover:text-red-400 border border-white/40 dark:border-white/10 hover:border-red-400/30 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                      title="Xóa khỏi sổ tay"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ============================================================ */}
          {/* 5. LIQUID PAGINATION DOCK */}
          {/* ============================================================ */}
          <div className="px-6 py-4 bg-white/15 dark:bg-white/[0.02] border-t border-white/20 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Hiển thị từ {totalFiltered === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} đến{' '}
              {Math.min(page * PAGE_SIZE, totalFiltered)} trong số {totalFiltered} từ
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-9 w-9 rounded-xl border border-white/50 dark:border-white/15 bg-white/40 dark:bg-white/10 hover:bg-white/70 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] active:scale-95"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-1">
                <span className="px-3.5 py-1.5 rounded-xl bg-fuchsia-500/15 text-fuchsia-800 dark:text-fuchsia-300 font-black text-xs border border-fuchsia-500/25 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)]">
                  Trang {page} / {totalPages}
                </span>
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-9 w-9 rounded-xl border border-white/50 dark:border-white/15 bg-white/40 dark:bg-white/10 hover:bg-white/70 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] active:scale-95"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

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
