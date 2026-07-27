import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { getShortMeaning } from '../utils/dictionaryParser';
import { ArrowLeft, CheckCircle2, Circle, Search, Volume2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
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

const PAGE_SIZE = 50;

export default function WordList() {
  const { id: categoryId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [categoryName, setCategoryName] = useState('');
  const [words, setWords] = useState([]);
  const [learnedMap, setLearnedMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedWord, setSelectedWord] = useState(null);
  
  const [mainGroupName, setMainGroupName] = useState(null);
  
  // States for search and pagination
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'learned'
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Reset page when filter or search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchQuery, filterMode]);

  // ─── FETCH DỮ LIỆU ─────────────────────────────────────────
  useEffect(() => {
    if (user && categoryId) {
      fetchWordsAndProgress();
    }
  }, [categoryId, user, page, debouncedSearchQuery, filterMode]);

  const fetchWordsAndProgress = async () => {
    setLoading(true);

    try {
      // 1. Fetch sub category name and main category name
      const { data: subCatData } = await supabase
        .from('sub_categories')
        .select('name, categories(name)')
        .eq('id', categoryId)
        .single();

      if (subCatData) {
        setCategoryName(subCatData.name);
        setMainGroupName(subCatData.categories?.name || null);
      }

      // 2. Build Query for Vocabularies with Pagination
      let query = supabase
        .from('topic_vocabularies')
        .select('id, word, pro, pos, mean, example, example_mean', { count: 'exact' })
        .eq('sub_category_id', categoryId)
        .order('word', { ascending: true })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      // Apply Search
      if (debouncedSearchQuery) {
        query = query.ilike('word', `${debouncedSearchQuery}%`);
      }

      // 3. Handle 'learned' filter
      if (filterMode === 'learned') {
        const { data: learnedData } = await supabase
          .from('user_topic_vocabularies')
          .select('vocabulary_id, topic_vocabularies!inner(sub_category_id)')
          .eq('user_id', user.id)
          .eq('is_learned', true)
          .eq('topic_vocabularies.sub_category_id', categoryId);
          
        const learnedIds = learnedData ? learnedData.map(d => d.vocabulary_id) : [];
        
        if (learnedIds.length === 0) {
          setWords([]);
          setTotalCount(0);
          setLoading(false);
          return;
        } else {
          query = query.in('id', learnedIds);
        }
      }

      const { data: vocabData, count, error: vocabError } = await query;

      if (vocabError) throw vocabError;
      setWords(vocabData || []);
      setTotalCount(count || 0);

      // 4. Fetch learned status for the current page's words
      if (vocabData && vocabData.length > 0) {
        const vocabIds = vocabData.map(v => v.id);
        const { data: progressData, error: progressError } = await supabase
          .from('user_topic_vocabularies')
          .select('vocabulary_id, is_learned')
          .eq('user_id', user.id)
          .in('vocabulary_id', vocabIds);

        if (!progressError && progressData) {
          const map = {};
          progressData.forEach(p => {
            map[p.vocabulary_id] = p.is_learned;
          });
          setLearnedMap(map);
        }
      } else {
        setLearnedMap({});
      }
    } catch (err) {
      console.error('Lỗi khi tải từ vựng:', err);
    } finally {
      setLoading(false);
    }
  };

  // ─── TOGGLE "ĐÃ HỌC" ───────────────────────
  const toggleLearned = async (e, vocabId, currentStatus) => {
    e.stopPropagation();
    const newStatus = !currentStatus;

    setLearnedMap(prev => ({ ...prev, [vocabId]: newStatus }));

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
      console.error('Lỗi khi cập nhật trạng thái:', error);
      setLearnedMap(prev => ({ ...prev, [vocabId]: currentStatus }));
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  const handleBack = () => {
    navigate('/categories');
  };

  // ─── RENDER ──────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto w-full">
      {/* Nút quay lại */}
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 mb-6 transition-colors cursor-pointer w-fit"
      >
        <ArrowLeft size={20} />
        <span className="font-medium">Back to {mainGroupName || 'Categories'}</span>
      </button>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">
          {categoryName || 'Topic'}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Showing {totalCount} words
        </p>
      </div>

      {/* Toolbar: Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm từ vựng trong chủ đề..."
            className="block w-full pl-10 pr-3 py-2.5 border border-pink-200 dark:border-[#3A2F43] rounded-xl bg-white dark:bg-[#1E1226] placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:border-fuchsia-500 text-sm text-slate-800 dark:text-slate-200 transition-colors"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 bg-pink-100 dark:bg-[#160B1E] border border-pink-200 dark:border-[#3A2F43] p-1 rounded-xl shrink-0 transition-colors">
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'learned', label: 'Đã học' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilterMode(f.key)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all cursor-pointer
                ${filterMode === f.key
                  ? 'bg-white dark:bg-[#2A1F33] text-slate-800 dark:text-slate-200 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Danh sách từ vựng */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-[72px] bg-pink-100 dark:bg-[#2A1F33] animate-pulse rounded-xl transition-colors"></div>
          ))}
        </div>
      ) : words.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#1E1226] rounded-2xl border border-pink-200 dark:border-[#3A2F43] transition-colors">
          <Search size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Không tìm thấy từ phù hợp</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#1E1226] rounded-2xl shadow-sm border border-pink-200 dark:border-[#3A2F43] overflow-hidden transition-colors">
          {/* Header bảng (ẩn trên mobile) */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto] gap-4 px-5 py-3 bg-pink-50 dark:bg-[#160B1E] border-b border-pink-100 dark:border-[#3A2F43] text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider transition-colors">
            <span>Từ vựng</span>
            <span className="w-20 text-center">Phát âm</span>
            <span className="w-24 text-center">Trạng thái</span>
          </div>

          <div className="divide-y divide-pink-100 dark:divide-[#3A2F43] transition-colors">
            {words.map(word => {
              const isLearned = !!learnedMap[word.id];
              return (
                  <div
                    key={word.id}
                    onClick={() => navigate(`/vocabularies/${word.id}`)}
                    className="flex items-center justify-between p-4 sm:p-5 hover:bg-pink-50 dark:hover:bg-[#2A1F33] transition-colors cursor-pointer group"
                  >
                    {/* Cột trái: Từ + Nghĩa */}
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400 transition-colors truncate">
                          {word.word}
                        </h3>
                      {word.pro && (
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-mono hidden sm:inline shrink-0">
                          {word.pro.split('#')[0]}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                      {getShortMeaning(word)}
                    </p>
                  </div>

                  {/* Nút phát âm */}
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
                    className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer shrink-0 min-w-[60px]
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

          {/* Footer phân trang */}
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

      {selectedWord && (
        <WordDetailModal
          word={selectedWord}
          onClose={() => setSelectedWord(null)}
        />
      )}
    </div>
  );
}
