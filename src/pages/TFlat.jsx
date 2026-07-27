import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Search, Loader2, BookOpen, ArrowUp } from 'lucide-react';
import TFlatMeaning from '../components/vocab/TFlatMeaning';

const WORD_FIELDS = 'id, word, pro, mean, av';

function getRootWord(mean) {
  if (!mean || typeof mean !== 'string') return '';

  let root = '';
  if (mean.startsWith('(xem)')) {
    root = mean.slice(5);
  } else if (mean.startsWith('@')) {
    root = mean.slice(1);
  }

  return root.trim().replace(/#+$/g, '').replace(/_/g, ' ');
}

function getDisplayPronunciation(pro) {
  if (!pro) return '';
  return pro.split('#;#')[0].trim();
}

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

export default function TFlat() {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 400);
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedWord, setSelectedWord] = useState(null);
  const searchRequestRef = useRef(0);
  const detailRequestRef = useRef(0);
  const detailRef = useRef(null);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'detail'

  useEffect(() => {
    if (debouncedSearchQuery.trim().length > 0) {
      searchWords(debouncedSearchQuery);
    } else {
      searchRequestRef.current += 1;
      detailRequestRef.current += 1;
      setWords([]);
      setSelectedWord(null);
      setLoading(false);
      setDetailLoading(false);
    }
  }, [debouncedSearchQuery]);

  const selectWord = async (word) => {
    const requestId = detailRequestRef.current + 1;
    detailRequestRef.current = requestId;

    setSelectedWord(word);
    setDetailLoading(false);
    setMobileView('detail');

    const rootWord = getRootWord(word?.mean);
    if (!rootWord || word?.av) return;

    setDetailLoading(true);
    try {
      const { data, error } = await supabase
        .from('vocabularies')
        .select(WORD_FIELDS)
        .ilike('word', rootWord)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (detailRequestRef.current !== requestId) return;

      if (data) {
        setSelectedWord({
          ...data,
          _note: `"${word.word}" là dạng biến thể của "${data.word}"`,
        });
      }
    } catch (err) {
      console.error('Error resolving inflection:', err);
    } finally {
      if (detailRequestRef.current === requestId) {
        setDetailLoading(false);
      }
    }
  };

  const searchWords = async (query) => {
    const requestId = searchRequestRef.current + 1;
    searchRequestRef.current = requestId;
    const keyword = query.trim();

    setLoading(true);
    try {
      const { data: prefixData, error: prefixError } = await supabase
        .from('vocabularies')
        .select(WORD_FIELDS)
        .ilike('word', `${keyword}%`)
        .order('word', { ascending: true })
        .limit(50);

      if (prefixError) throw prefixError;

      let results = prefixData || [];

      if (results.length < 50 && keyword.length > 1) {
        const { data: containsData, error: containsError } = await supabase
          .from('vocabularies')
          .select(WORD_FIELDS)
          .ilike('word', `%${keyword}%`)
          .order('word', { ascending: true })
          .limit(50);

        if (containsError) throw containsError;

        const seen = new Set(results.map((item) => item.id));
        const extra = (containsData || []).filter((item) => !seen.has(item.id));
        results = [...results, ...extra].slice(0, 50);
      }

      if (searchRequestRef.current !== requestId) return;

      setWords(results);

      // Auto-select exact match if exists, or first item
      if (results.length > 0) {
        const exactMatch = results.find(w => w.word.toLowerCase() === keyword.toLowerCase());
        selectWord(exactMatch || results[0]);
      } else {
        setSelectedWord(null);
      }
    } catch (err) {
      console.error('Error searching vocab:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full min-h-[calc(100vh-5rem)] bg-pink-50/30 dark:bg-[#160B1E]">
      {/* Sidebar with Search List */}
      <div className={`w-full md:w-1/3 border-r border-slate-200 dark:border-[#3A2F43] bg-white dark:bg-[#1E1226] flex flex-col ${mobileView === 'detail' ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-200 dark:border-[#3A2F43]">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <BookOpen className="text-fuchsia-500" />
            TFlat Dictionary
          </h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Tra cứu từ vựng..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-[#0F1117] border border-transparent dark:border-[#3A2F43] focus:bg-white dark:focus:bg-[#1E1226] focus:border-fuchsia-400 rounded-xl outline-none text-slate-800 dark:text-white transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              spellCheck={false}
              autoComplete="off"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-10rem)]">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="animate-spin text-fuchsia-500" />
            </div>
          ) : words.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-[#3A2F43]/50">
              {words.map((w) => (
                <div
                  key={w.id}
                  onClick={() => selectWord(w)}
                  className={`p-4 cursor-pointer hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/20 transition-colors ${selectedWord?.id === w.id ? 'bg-fuchsia-50/50 dark:bg-fuchsia-900/30' : ''}`}
                >
                  <div className="font-bold text-slate-800 dark:text-white text-lg">{w.word}</div>
                  {getDisplayPronunciation(w.pro) && <div className="text-sm text-slate-500 font-mono mt-0.5">{getDisplayPronunciation(w.pro)}</div>}
                  {w.mean && <div className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">{w.mean}</div>}
                </div>
              ))}
            </div>
          ) : searchQuery.trim().length > 0 ? (
            <div className="p-8 text-center text-slate-500">
              Không tìm thấy kết quả cho "{searchQuery}"
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-3">
              <Search size={32} className="text-slate-300 dark:text-[#3A2F43]" />
              <p>Nhập từ khóa để tra cứu 170.000 từ vựng TFlat</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div ref={detailRef} className={`flex-1 overflow-y-auto bg-white dark:bg-[#1E1226] p-6 lg:p-10 max-h-[calc(100vh-5rem)] ${mobileView === 'list' ? 'hidden md:block' : 'block'}`}>
        {selectedWord ? (
          <div className="max-w-3xl mx-auto">
            {/* Mobile back button */}
            <button
              type="button"
              onClick={() => setMobileView('list')}
              className="mb-4 inline-flex items-center gap-2 rounded-xl bg-fuchsia-100 dark:bg-fuchsia-500/15 px-4 py-2 text-sm font-bold text-fuchsia-700 dark:text-fuchsia-300 transition-colors hover:bg-fuchsia-200 dark:hover:bg-fuchsia-500/25 md:hidden"
            >
              <ArrowUp size={16} className="rotate-[-90deg]" />
              Quay lại danh sách
            </button>

            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-white mb-2">{selectedWord.word}</h1>
            {getDisplayPronunciation(selectedWord.pro) && (
              <span className="inline-block px-3 py-1 bg-slate-100 dark:bg-black/20 text-slate-600 dark:text-slate-400 font-mono rounded-lg text-lg mb-6">
                {getDisplayPronunciation(selectedWord.pro)}
              </span>
            )}

            <div className="bg-pink-50/50 dark:bg-[#2A1F33]/50 p-6 rounded-2xl border border-pink-100 dark:border-[#3A2F43] min-h-[400px]">
              {detailLoading ? (
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Loader2 size={18} className="animate-spin text-fuchsia-500" />
                  <span>Đang tra từ gốc...</span>
                </div>
              ) : selectedWord.av ? (
                <TFlatMeaning word={selectedWord} />
              ) : (
                <p className="text-slate-700 dark:text-slate-300 text-lg">{selectedWord.mean}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[400px]">
            <BookOpen size={64} className="text-slate-200 dark:text-[#3A2F43] mb-4" />
            <p className="text-lg">Chọn một từ vựng để xem chi tiết</p>
          </div>
        )}
      </div>
    </div>
  );
}
