import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useStats } from '../contexts/StatsContext';
import useSWR, { useSWRConfig } from 'swr';
import { getShortMeaning } from '../utils/dictionaryParser';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Search,
  Volume2,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import WordDetailModal from '../components/vocab/WordDetailModal';

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

// Helper to parse Unit/Topic prefix
const parseUnitName = (fullName = '') => {
  const match = fullName.match(/^(Unit\s+\d+|Topic\s+\d+|Bài\s+\d+|Lesson\s+\d+|Set\s+\d+)[:.-]?\s*(.*)$/i);
  if (match) {
    return {
      unitTag: match[1].trim(),
      title: match[2].trim() || fullName,
    };
  }
  return {
    unitTag: null,
    title: fullName,
  };
};

const PAGE_SIZE = 50;

export default function WordList() {
  const { id: categoryId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshStats } = useStats();
  const { mutate: globalMutate } = useSWRConfig();

  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  const [filterMode, setFilterMode] = useState('all');
  const [selectedWord, setSelectedWord] = useState(null);

  // Reset page when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchQuery, filterMode]);

  // ─── FETCH DỮ LIỆU BẰNG SWR ─────────────────────────────────────────
  const fetchWordsData = async () => {
    if (!user || !categoryId) throw new Error('Missing user or categoryId');

    // 1. Fetch sub category name and main category name
    const { data: subCatData } = await supabase
      .from('sub_categories')
      .select('name, categories(name)')
      .eq('id', categoryId)
      .single();

    let catName = '';
    let groupName = null;
    if (subCatData) {
      catName = subCatData.name;
      groupName = subCatData.categories?.name || null;
    }

    // 2. Fetch all word IDs in this subcategory to accurately compute progress and learned words
    const { data: catWordIdsData, error: catWordsErr } = await supabase
      .from('topic_vocabularies')
      .select('id')
      .eq('sub_category_id', categoryId);

    if (catWordsErr) throw catWordsErr;

    const allCatWordIds = (catWordIdsData || []).map(w => w.id);
    const subCatTotalWords = allCatWordIds.length;

    // 3. Fetch all learned word IDs for this user in this subcategory
    let learnedVocabIds = new Set();
    if (allCatWordIds.length > 0) {
      const { data: learnedData, error: learnedErr } = await supabase
        .from('user_topic_vocabularies')
        .select('vocabulary_id')
        .eq('user_id', user.id)
        .eq('is_learned', true)
        .in('vocabulary_id', allCatWordIds);

      if (!learnedErr && learnedData) {
        learnedVocabIds = new Set(learnedData.map(d => d.vocabulary_id));
      }
    }

    const totalLearnedCount = learnedVocabIds.size;

    // 4. Build Query for Vocabularies with Pagination
    let query = supabase
      .from('topic_vocabularies')
      .select('id, word, pro, pos, mean, example, example_mean', { count: 'exact' })
      .eq('sub_category_id', categoryId)
      .order('word', { ascending: true });

    // Apply Search
    if (debouncedSearchQuery) {
      query = query.ilike('word', `${debouncedSearchQuery}%`);
    }

    // 5. Handle 'learned' filter
    if (filterMode === 'learned') {
      const learnedIdsArray = Array.from(learnedVocabIds);
      if (learnedIdsArray.length === 0) {
        return {
          categoryName: catName,
          mainGroupName: groupName,
          words: [],
          totalCount: 0,
          subCatTotalWords,
          totalLearned: 0,
          learnedMap: {},
        };
      }
      query = query.in('id', learnedIdsArray);
    }

    // Apply pagination range
    query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    const { data: vocabData, count, error: vocabError } = await query;
    if (vocabError) throw vocabError;

    // 6. Build learned map for current page
    let map = {};
    (vocabData || []).forEach(v => {
      map[v.id] = learnedVocabIds.has(v.id);
    });

    return {
      categoryName: catName,
      mainGroupName: groupName,
      words: vocabData || [],
      totalCount: count || 0,
      subCatTotalWords,
      totalLearned: totalLearnedCount,
      learnedMap: map,
    };
  };

  const { data, isLoading, mutate } = useSWR(
    user && categoryId ? `words_${categoryId}_${page}_${debouncedSearchQuery}_${filterMode}_${user.id}` : null,
    fetchWordsData,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      keepPreviousData: true,
      dedupingInterval: 30000,
    }
  );

  const categoryName = data?.categoryName || '';
  const mainGroupName = data?.mainGroupName || null;
  const words = data?.words || [];
  const learnedMap = data?.learnedMap || {};
  const totalCount = data?.totalCount || 0;
  const subCatTotalWords = data?.subCatTotalWords || totalCount;
  const totalLearned = data?.totalLearned || 0;
  const loading = isLoading && !data;

  const parsed = parseUnitName(categoryName);
  const progressPercent = subCatTotalWords > 0 ? Math.round((totalLearned / subCatTotalWords) * 100) : 0;

  const playWordAudio = (wordText) => {
    if (!('speechSynthesis' in window) || !wordText) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(wordText);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const toggleLearned = async (e, vocabId, currentStatus) => {
    e.stopPropagation();
    const newStatus = !currentStatus;
    const diff = newStatus ? 1 : -1;

    // Optimistic update
    mutate(
      prev => {
        if (!prev) return prev;
        const newTotalLearned = Math.max(0, (prev.totalLearned || 0) + diff);
        let updatedWords = prev.words;
        let newTotalCount = prev.totalCount;

        // If in 'learned' filter mode and word is unchecked, remove from current view
        if (filterMode === 'learned' && !newStatus) {
          updatedWords = prev.words.filter(w => w.id !== vocabId);
          newTotalCount = Math.max(0, prev.totalCount - 1);
        }

        return {
          ...prev,
          totalCount: newTotalCount,
          totalLearned: newTotalLearned,
          words: updatedWords,
          learnedMap: { ...prev.learnedMap, [vocabId]: newStatus },
        };
      },
      false
    );

    const { error } = await supabase
      .from('user_topic_vocabularies')
      .upsert(
        {
          user_id: user.id,
          vocabulary_id: vocabId,
          is_learned: newStatus,
        },
        { onConflict: 'user_id,vocabulary_id' }
      );

    if (error) {
      console.error('Lỗi khi cập nhật trạng thái đã học:', error);
      mutate();
    } else {
      // Revalidate other tabs/pages for this subcategory smoothly in the background
      globalMutate(
        (key) => typeof key === 'string' && key.startsWith(`words_${categoryId}_`) && key !== `words_${categoryId}_${page}_${debouncedSearchQuery}_${filterMode}_${user.id}`,
        undefined,
        { revalidate: true }
      );
      if (typeof refreshStats === 'function') {
        refreshStats();
      }
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  const handleBack = () => {
    navigate('/categories');
  };

  // ─── RENDER ──────────────────────────────────────────────────
  return (
    <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-8 max-w-5xl mx-auto w-full min-h-[85vh]">
      {/* ============================================================ */}
      {/* 1. HERO CAPSULE (Ultra-Clear Liquid Glass Banner) */}
      {/* ============================================================ */}
      <div className="relative mb-5 sm:mb-6 overflow-hidden rounded-[1.75rem] sm:rounded-[2.5rem] border border-white/50 dark:border-white/10 bg-white/20 dark:bg-slate-950/35 shadow-[0_20px_50px_rgba(0,0,0,0.06),_inset_0_1px_2px_rgba(255,255,255,0.7),_inset_0_-1px_1px_rgba(0,0,0,0.03)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),_inset_0_1px_2px_rgba(255,255,255,0.25),_inset_0_-1px_1px_rgba(255,255,255,0.05)] backdrop-blur-2xl p-4 sm:p-8 animate-in fade-in duration-300">
        {/* Ambient Fluid Caustics Blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[1.75rem] sm:rounded-[2.5rem] -z-0">
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-gradient-to-br from-indigo-500/20 dark:from-indigo-500/25 via-cyan-400/15 dark:via-cyan-400/20 to-transparent blur-3xl animate-liquid-blob" />
          <div
            className="absolute -bottom-28 -right-28 w-80 h-80 rounded-full bg-gradient-to-tl from-violet-500/20 dark:from-violet-600/25 via-pink-400/15 dark:via-fuchsia-500/15 to-transparent blur-3xl animate-liquid-blob"
            style={{ animationDelay: '-4s' }}
          />
          {/* Specular Rim Light Top Sheen */}
          <div className="absolute top-0 inset-x-10 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/40 to-transparent" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div className="space-y-2 sm:space-y-3">
            {/* Back button */}
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/40 hover:bg-white/75 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white border border-white/60 dark:border-white/15 backdrop-blur-md text-xs font-black transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),_0_2px_6px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] active:scale-95 cursor-pointer w-fit"
            >
              <ArrowLeft size={14} />
              <span>Quay lại {mainGroupName || 'Kho từ vựng'}</span>
            </button>

            {/* Unit Tag + Title */}
            <div>
              <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap mb-1">
                {parsed.unitTag ? (
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider bg-indigo-500/15 dark:bg-cyan-500/15 text-indigo-700 dark:text-cyan-300 border border-indigo-500/25 dark:border-cyan-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)]">
                    {parsed.unitTag}
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider bg-white/40 dark:bg-white/10 text-slate-800 dark:text-slate-300 border border-white/50 dark:border-white/15">
                    Chủ đề
                  </span>
                )}
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 drop-shadow-xs">
                  • {subCatTotalWords} từ vựng
                </span>
              </div>
              <h1 className="text-xl sm:text-3xl lg:text-4xl font-black text-slate-950 dark:text-white tracking-tight drop-shadow-xs">
                {parsed.title}
              </h1>
            </div>
          </div>

          {/* Liquid Plasma Progress Tube */}
          <div className="flex flex-col sm:items-end justify-center gap-2 min-w-[200px] sm:min-w-[220px]">
            <div className="flex items-center justify-between sm:justify-end gap-3 text-xs font-black text-slate-900 dark:text-slate-100">
              <span className="text-indigo-700 dark:text-cyan-300 font-black">
                {progressPercent}% hoàn thành
              </span>
              <span className="text-slate-700 dark:text-slate-300 font-bold">
                ({totalLearned}/{subCatTotalWords} từ)
              </span>
            </div>
            <div className="relative w-full sm:w-60 h-2.5 sm:h-3 rounded-full overflow-hidden bg-slate-300/40 dark:bg-slate-900/70 p-[1.5px] border border-white/50 dark:border-white/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400 transition-all duration-700 relative overflow-hidden shadow-[0_0_12px_rgba(99,102,241,0.35)] dark:shadow-[0_0_12px_rgba(34,211,238,0.5)]"
                style={{ width: `${progressPercent}%` }}
              >
                {/* Shimmer liquid wave */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-liquid-shimmer pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. FLOATING LIQUID CONTROLS (Ultra-Transparent Search & Filter) */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 mb-5 sm:mb-6">
        {/* Search Capsule */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm từ vựng trong chủ đề..."
            className="w-full pl-10 pr-9 py-2.5 bg-white/25 dark:bg-slate-950/35 border border-white/50 dark:border-white/10 focus:bg-white/45 dark:focus:bg-slate-950/60 focus:border-indigo-500/40 dark:focus:border-cyan-400/40 focus:ring-2 focus:ring-indigo-500/15 dark:focus:ring-cyan-400/15 rounded-2xl outline-none text-sm font-bold text-slate-950 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03),_0_8px_20px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.2),_0_10px_25px_-5px_rgba(0,0,0,0.3)] backdrop-blur-2xl transition-all"
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
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth p-1 rounded-2xl bg-white/20 dark:bg-slate-950/35 border border-white/50 dark:border-white/10 backdrop-blur-2xl shrink-0 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]">
          {[
            { key: 'all', label: `Tất cả (${subCatTotalWords})` },
            { key: 'learned', label: `Đã học (${totalLearned})` },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterMode(f.key)}
              className={`px-3.5 sm:px-4 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                filterMode === f.key
                  ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white shadow-[0_4px_15px_-2px_rgba(99,102,241,0.4),_inset_0_1px_1px_rgba(255,255,255,0.4)] scale-[1.02] border border-white/30'
                  : 'text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/10 border border-transparent'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. LIQUID GLASS VOCAB STREAM (Ultra-Transparent Glass Table) */}
      {/* ============================================================ */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div
              key={i}
              className="h-20 bg-white/20 dark:bg-slate-950/35 border border-white/40 dark:border-white/10 rounded-2xl animate-pulse backdrop-blur-2xl"
            />
          ))}
        </div>
      ) : words.length === 0 ? (
        <div className="text-center py-16 sm:py-20 bg-white/20 dark:bg-slate-950/35 rounded-[1.75rem] sm:rounded-[2.5rem] border border-white/50 dark:border-white/10 backdrop-blur-2xl shadow-xl">
          <Search size={44} className="mx-auto text-slate-400 dark:text-slate-500 mb-3" />
          <p className="text-slate-950 dark:text-white font-black text-base">Không tìm thấy từ vựng nào</p>
          <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 font-bold">
            Hãy thử tìm kiếm với từ khóa khác hoặc chuyển sang tab Tất cả.
          </p>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-[1.75rem] sm:rounded-[2.5rem] border border-white/50 dark:border-white/10 bg-white/20 dark:bg-slate-950/35 shadow-[0_20px_50px_rgba(0,0,0,0.06),_inset_0_1px_2px_rgba(255,255,255,0.7),_inset_0_-1px_1px_rgba(0,0,0,0.03)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),_inset_0_1px_2px_rgba(255,255,255,0.25),_inset_0_-1px_1px_rgba(255,255,255,0.05)] backdrop-blur-2xl">
          {/* Specular Rim Light Top Sheen */}
          <div className="absolute top-0 inset-x-12 h-[1px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/40 to-transparent pointer-events-none" />

          {/* Table Header (Desktop) */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto] gap-4 px-6 py-3.5 border-b border-white/25 dark:border-white/10 bg-white/15 dark:bg-white/[0.02] text-[11px] font-black text-indigo-950 dark:text-cyan-300 uppercase tracking-wider backdrop-blur-md">
            <span>Từ vựng & Định nghĩa</span>
            <span className="w-20 text-center">Phát âm</span>
            <span className="w-28 text-center">Trạng thái</span>
          </div>

          {/* Word Rows */}
          <div className="divide-y divide-white/20 dark:divide-white/10">
            {words.map((word) => {
              const isLearned = !!learnedMap[word.id];
              return (
                <div
                  key={word.id}
                  onClick={() => navigate(`/vocabularies/${word.id}`)}
                  className="group/row relative flex items-center justify-between p-3.5 sm:px-6 sm:py-5 hover:bg-white/30 dark:hover:bg-white/[0.04] transition-all duration-200 cursor-pointer"
                >
                  {/* Row hover specular line */}
                  <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/20 dark:via-cyan-400/20 to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity pointer-events-none" />

                  {/* Left Column: Word + IPA + Short Meaning */}
                  <div className="flex-1 min-w-0 mr-2.5 sm:mr-4 space-y-0.5 sm:space-y-1">
                    <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                      <h3 className="text-sm sm:text-lg font-black text-slate-950 dark:text-white group-hover/row:text-indigo-600 dark:group-hover/row:text-cyan-300 transition-colors tracking-tight">
                        {word.word}
                      </h3>
                      {word.pro && (
                        <span className="text-[10px] sm:text-[11px] font-mono text-indigo-700 dark:text-cyan-300 bg-indigo-500/10 dark:bg-cyan-400/10 border border-indigo-500/20 dark:border-cyan-400/25 px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
                          {word.pro.split('#')[0]}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] sm:text-sm text-slate-800 dark:text-slate-200 line-clamp-1 leading-relaxed font-semibold">
                      {getShortMeaning(word)}
                    </p>
                  </div>

                  {/* Audio Button (Liquid Sound Drop) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playWordAudio(word.word);
                    }}
                    className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white/40 dark:bg-white/10 hover:bg-indigo-50/70 dark:hover:bg-cyan-500/20 text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-cyan-300 border border-white/60 dark:border-white/15 hover:border-indigo-400/40 dark:hover:border-cyan-400/40 flex items-center justify-center transition-all cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] active:scale-95 shrink-0 mr-2 sm:mr-3 hidden sm:flex"
                    title="Nghe phát âm"
                  >
                    <Volume2 size={16} />
                  </button>

                  {/* Status Toggle Button (Liquid Pearl) */}
                  <button
                    onClick={(e) => toggleLearned(e, word.id, isLearned)}
                    className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl transition-all cursor-pointer shrink-0 border ${
                      isLearned
                        ? 'bg-emerald-500/25 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border-emerald-500/40 dark:border-emerald-400/40 shadow-[0_0_15px_rgba(16,185,129,0.25),_inset_0_1px_1px_rgba(255,255,255,0.7)] dark:shadow-[0_0_15px_rgba(16,185,129,0.35),_inset_0_1px_1px_rgba(255,255,255,0.4)]'
                        : 'bg-white/30 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-white/40 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-slate-200'
                    }`}
                    title={isLearned ? 'Đã thuộc từ này' : 'Chưa thuộc'}
                  >
                    {isLearned ? (
                      <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Circle size={14} className="text-slate-400" />
                    )}
                    <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider">
                      {isLearned ? 'Đã học' : 'Chưa học'}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* ============================================================ */}
          {/* 4. LIQUID PAGINATION DOCK (High Transparency) */}
          {/* ============================================================ */}
          <div className="px-6 py-4 bg-white/15 dark:bg-white/[0.02] border-t border-white/20 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Hiển thị từ {totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} đến {Math.min(page * PAGE_SIZE, totalCount)} trong số {totalCount} từ
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-9 w-9 rounded-xl border border-white/50 dark:border-white/15 bg-white/40 dark:bg-white/10 hover:bg-white/70 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] active:scale-95"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-1">
                <span className="px-3.5 py-1.5 rounded-xl bg-indigo-500/15 dark:bg-cyan-500/15 text-indigo-700 dark:text-cyan-300 font-black text-xs border border-indigo-500/25 dark:border-cyan-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
                  Trang {page} / {totalPages}
                </span>
              </div>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="h-9 w-9 rounded-xl border border-white/50 dark:border-white/15 bg-white/40 dark:bg-white/10 hover:bg-white/70 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] active:scale-95"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedWord && (
        <WordDetailModal
          word={selectedWord}
          onClose={() => setSelectedWord(null)}
        />
      )}
    </div>
  );
}
