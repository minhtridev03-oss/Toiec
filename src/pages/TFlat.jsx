import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import {
  Search,
  Loader2,
  BookOpen,
  ArrowUp,
  Volume2,
  Bookmark,
  Check,
  Copy,
  Sparkles,
  X,
  History,
  Trash2,
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  Compass,
  ArrowRight,
} from 'lucide-react';
import TFlatMeaning from '../components/vocab/TFlatMeaning';
import bookGif from '../assets/book.gif';

const WORD_FIELDS = 'id, word, pro, mean, av';

// Curated high-yield TOEIC words for quick explore chips
const TRENDING_WORDS = [
  'accommodate',
  'collaborate',
  'negotiate',
  'implement',
  'reimburse',
  'feasible',
  'deadline',
  'initiative',
  'subsidize',
  'renovate',
  'mandatory',
  'perspective',
];

// Curated Word of the Day pool when no word is selected yet
const WORD_OF_THE_DAY_POOL = [
  {
    word: 'collaborate',
    pro: '/kəˈlæb.ə.reɪt/',
    pos: 'ĐỘNG TỪ',
    mean: 'Hợp tác, phối hợp làm việc cùng người khác để đạt mục tiêu chung',
    example: 'The two departments need to collaborate closely to finalize the quarterly report.',
  },
  {
    word: 'accommodate',
    pro: '/əˈkɑː.mə.deɪt/',
    pos: 'ĐỘNG TỪ',
    mean: 'Cung cấp chỗ ở; đáp ứng, giải quyết nhu cầu của khách hàng',
    example: 'The luxury resort can comfortably accommodate up to 600 international delegates.',
  },
  {
    word: 'feasible',
    pro: '/ˈfiː.zə.bəl/',
    pos: 'TÍNH TỪ',
    mean: 'Khả thi, có thể thực hiện được một cách hiệu quả và thực tế',
    example: 'The project manager confirmed that the new deployment plan is technically feasible.',
  },
  {
    word: 'negotiate',
    pro: '/nəˈɡoʊ.ʃi.eɪt/',
    pos: 'ĐỘNG TỪ',
    mean: 'Đàm phán, thương lượng các điều khoản hợp đồng kinh tế',
    example: 'Our sales director successfully negotiated a multi-year supply agreement.',
  },
  {
    word: 'reimburse',
    pro: '/ˌriː.ɪmˈbɜːrs/',
    pos: 'ĐỘNG TỪ',
    mean: 'Hoàn tiền, bồi hoàn chi phí công tác đã ứng trước',
    example: 'The finance division will reimburse all approved travel expenses within two weeks.',
  },
];

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
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 350);
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedWord, setSelectedWord] = useState(null);
  const searchRequestRef = useRef(0);
  const detailRequestRef = useRef(0);
  const detailRef = useRef(null);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'detail'

  // Pronunciation & Action states
  const [isSpeaking, setIsSpeaking] = useState(null); // 'us' | 'uk' | null
  const [isSaved, setIsSaved] = useState(false);
  const [savingWord, setSavingWord] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Toast notification
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  // Recent searches from localStorage
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = localStorage.getItem('toiec_tflat_recents');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const addRecentSearch = useCallback((wordText) => {
    if (!wordText || !wordText.trim()) return;
    const clean = wordText.trim();
    setRecentSearches((prev) => {
      const filtered = prev.filter((w) => w.toLowerCase() !== clean.toLowerCase());
      const updated = [clean, ...filtered].slice(0, 8);
      try {
        localStorage.setItem('toiec_tflat_recents', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const handleClearRecentSearches = () => {
    localStorage.removeItem('toiec_tflat_recents');
    setRecentSearches([]);
  };

  // Word of the day based on day of year
  const wordOfTheDay = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return WORD_OF_THE_DAY_POOL[dayOfYear % WORD_OF_THE_DAY_POOL.length];
  }, []);

  // Check if selected word is in user_vocabulary
  useEffect(() => {
    if (!user?.id || !selectedWord?.word) {
      setIsSaved(false);
      return;
    }
    let active = true;
    supabase
      .from('user_vocabulary')
      .select('id')
      .eq('user_id', user.id)
      .ilike('word', selectedWord.word)
      .maybeSingle()
      .then(({ data }) => {
        if (active) setIsSaved(!!data);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [user?.id, selectedWord?.word]);

  // Audio pronunciation via SpeechSynthesis
  const playPronunciation = (accent = 'us') => {
    if (!('speechSynthesis' in window) || !selectedWord?.word) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(selectedWord.word);
    utterance.lang = accent === 'uk' ? 'en-GB' : 'en-US';
    utterance.rate = 0.88;

    const voices = window.speechSynthesis.getVoices();
    const targetVoice = voices.find((v) =>
      accent === 'uk'
        ? v.lang === 'en-GB' || v.name.includes('UK') || v.name.includes('British')
        : v.lang === 'en-US' || v.name.includes('US') || v.name.includes('American')
    );
    if (targetVoice) utterance.voice = targetVoice;

    setIsSpeaking(accent);
    utterance.onend = () => setIsSpeaking(null);
    utterance.onerror = () => setIsSpeaking(null);
    window.speechSynthesis.speak(utterance);
  };

  // Save or unsave from user_vocabulary
  const handleToggleSave = async () => {
    if (!user?.id) {
      showToast('Vui lòng đăng nhập để lưu vào sổ từ vựng!', 'error');
      return;
    }
    if (!selectedWord) return;

    setSavingWord(true);
    try {
      if (isSaved) {
        const { error } = await supabase
          .from('user_vocabulary')
          .delete()
          .eq('user_id', user.id)
          .ilike('word', selectedWord.word);
        if (error) throw error;
        setIsSaved(false);
        showToast(`Đã bỏ lưu "${selectedWord.word}" khỏi sổ từ vựng`);
      } else {
        // Prevent duplicate word in user_vocabulary
        const normalized = (selectedWord.word || '').trim();
        const { data: existing } = await supabase
          .from('user_vocabulary')
          .select('id')
          .eq('user_id', user.id)
          .ilike('word', normalized)
          .limit(1);

        if (existing && existing.length > 0) {
          setIsSaved(true);
          showToast(`Từ "${normalized}" đã có trong sổ từ vựng cá nhân!`, 'info');
        } else {
          const briefMeaning = selectedWord.mean
            ? selectedWord.mean.replace(/[#;=_*+@-]/g, ' ').slice(0, 150).trim()
            : '';
          const phonetic = getDisplayPronunciation(selectedWord.pro);
          const { error } = await supabase.from('user_vocabulary').insert([
            {
              user_id: user.id,
              word: normalized,
              meaning: briefMeaning,
              phonetic: phonetic,
              example_sentence: '',
              source: 'TFlat Dictionary',
            },
          ]);
          if (error) throw error;
          setIsSaved(true);
          showToast(`Đã thêm "${normalized}" vào sổ từ vựng cá nhân!`, 'success');
        }
      }
    } catch (err) {
      console.error('Lỗi khi lưu từ:', err);
      showToast('Không thể cập nhật sổ từ: ' + err.message, 'error');
    } finally {
      setSavingWord(false);
    }
  };

  // Copy word & definition to clipboard
  const handleCopyWord = async () => {
    if (!selectedWord?.word) return;
    const textToCopy = `${selectedWord.word} ${
      getDisplayPronunciation(selectedWord.pro) ? `[${getDisplayPronunciation(selectedWord.pro)}]` : ''
    }\n${selectedWord.mean || ''}`.trim();

    try {
      await navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      showToast('Đã sao chép từ vựng vào clipboard!');
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      showToast('Không thể sao chép!', 'error');
    }
  };

  // Auto-search effect on debounced query
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

    if (word?.word) {
      addRecentSearch(word.word);
    }

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
        const exactMatch = results.find((w) => w.word.toLowerCase() === keyword.toLowerCase());
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

  const handleQuickSearch = (keyword) => {
    setSearchQuery(keyword);
  };

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 max-w-7xl w-full mx-auto flex flex-col space-y-4 select-none transition-colors">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[100] flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl text-sm font-black animate-in fade-in slide-in-from-top-4 duration-300 border backdrop-blur-xl ${
            toast.type === 'error'
              ? 'bg-rose-500/95 text-white border-rose-400/40 shadow-rose-500/20'
              : 'bg-emerald-500/95 text-white border-emerald-400/40 shadow-emerald-500/20'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Glass Studio Container */}
      <div className="glass-panel rounded-[2.5rem] border border-white/60 dark:border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-2xl flex-1 flex flex-col md:flex-row min-h-[720px]">
        {/* Subtle Ambient Internal Glow Accents */}
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-fuchsia-500/10 dark:bg-purple-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-indigo-500/10 dark:bg-cyan-500/10 blur-3xl pointer-events-none" />

        {/* ============================================================ */}
        {/* LEFT PANE: Search & Discovery Area (35% ~ 400px) */}
        {/* ============================================================ */}
        <div
          className={`w-full md:w-[380px] lg:w-[410px] shrink-0 border-b md:border-b-0 md:border-r border-white/40 dark:border-white/10 flex flex-col relative z-10 ${
            mobileView === 'detail' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header & Search Bar */}
          <div className="p-5 sm:p-6 border-b border-white/40 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-fuchsia-500/15 to-indigo-500/15 border border-white/50 dark:border-white/10 flex items-center justify-center overflow-hidden shadow-md shadow-indigo-500/15 shrink-0">
                  <img
                    src={bookGif}
                    alt="TFlat Dictionary"
                    className="h-9 w-9 object-contain select-none pointer-events-none drop-shadow-sm"
                  />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-2">
                    <span>TFlat Dictionary</span>
                  </h2>
                  <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Kho dữ liệu hơn 170.000 từ vựng
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-cyan-300 border border-indigo-500/20">
                PRO
              </span>
            </div>

            {/* Modern Search Pill Input */}
            <div className="relative group">
              <input
                type="text"
                placeholder="Tra từ tiếng Anh, cụm từ..."
                className="w-full pl-11 pr-10 py-3 bg-white/50 dark:bg-black/25 border border-white/60 dark:border-white/10 focus:bg-white dark:focus:bg-black/40 focus:border-indigo-500/60 dark:focus:border-cyan-400/60 rounded-2xl outline-none text-slate-950 dark:text-white font-bold text-sm shadow-inner transition-all placeholder:text-slate-400 placeholder:font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    searchWords(searchQuery);
                  }
                }}
                spellCheck={false}
                autoComplete="off"
              />
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-cyan-400 transition-colors"
                size={18}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                  title="Xóa tìm kiếm"
                  aria-label="Xóa tìm kiếm"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Results List or Discovery State */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 max-h-[calc(100vh-14rem)] md:max-h-none">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
                <Loader2 className="animate-spin text-indigo-600 dark:text-cyan-400" size={28} />
                <span className="text-xs font-bold">Đang tra cứu cơ sở dữ liệu...</span>
              </div>
            ) : words.length > 0 ? (
              <div className="space-y-1.5">
                <div className="px-2 py-1 flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <span>Kết quả ({words.length})</span>
                  <span>Nhấn để xem</span>
                </div>

                {words.map((w) => {
                  const isSelected = selectedWord?.id === w.id;
                  const phonetic = getDisplayPronunciation(w.pro);

                  return (
                    <div
                      key={w.id}
                      onClick={() => selectWord(w)}
                      className={`p-3.5 rounded-2xl cursor-pointer transition-all duration-200 border flex flex-col justify-between ${
                        isSelected
                          ? 'bg-gradient-to-r from-violet-600/15 via-indigo-600/15 to-transparent border-indigo-500/50 dark:border-cyan-400/50 shadow-sm ring-1 ring-indigo-500/30'
                          : 'bg-white/30 dark:bg-white/5 border-white/40 dark:border-white/5 hover:bg-white/60 dark:hover:bg-white/10 hover:border-white/70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`font-black text-base truncate ${
                            isSelected
                              ? 'text-indigo-600 dark:text-cyan-300'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {w.word}
                        </span>

                        {phonetic && (
                          <span className="text-xs font-mono text-slate-500 dark:text-slate-400 shrink-0">
                            {phonetic}
                          </span>
                        )}
                      </div>

                      {w.mean && (
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400 line-clamp-1 mt-1">
                          {w.mean.replace(/[#;=_*+@-]/g, ' ').trim()}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : searchQuery.trim().length > 0 ? (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <AlertCircle size={32} className="mx-auto text-slate-400 opacity-60" />
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Không tìm thấy từ "{searchQuery}"
                </p>
                <p className="text-xs text-slate-500">
                  Hãy thử kiểm tra lại chính tả hoặc chọn từ gợi ý bên dưới
                </p>
              </div>
            ) : (
              /* Idle / Discovery Hub inside Search Panel */
              <div className="space-y-6 py-2">
                {/* Lịch sử tra cứu gần đây */}
                {recentSearches.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <History size={14} className="text-indigo-500" />
                        <span>Tra gần đây</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleClearRecentSearches}
                        className="text-[11px] font-bold text-slate-400 hover:text-rose-500 flex items-center gap-1 cursor-pointer transition-colors"
                        title="Xóa lịch sử"
                      >
                        <Trash2 size={12} />
                        <span>Xóa</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {recentSearches.map((rec) => (
                        <button
                          key={rec}
                          type="button"
                          onClick={() => handleQuickSearch(rec)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/50 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 border border-white/50 dark:border-white/10 transition-all cursor-pointer shadow-2xs hover:scale-102"
                        >
                          {rec}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Từ vựng TOEIC thịnh hành */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-fuchsia-500" />
                      <span>Từ khóa TOEIC phổ biến</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {TRENDING_WORDS.map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => handleQuickSearch(w)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-cyan-300 border border-indigo-500/20 transition-all cursor-pointer shadow-2xs hover:scale-102"
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Banner mẹo tra từ */}
                <div className="p-4 rounded-2xl bg-gradient-to-tr from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-black text-indigo-600 dark:text-cyan-400 uppercase tracking-wider">
                    <Lightbulb size={15} />
                    <span>Mẹo tra cứu nhanh</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                    Bạn có thể gõ bất kỳ dạng biến thể nào (quá khứ <em>-ed</em>, số nhiều <em>-s</em>, hoặc <em>-ing</em>), TFlat sẽ tự động nhận diện từ gốc cho bạn!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT PANE: Definition Canvas (65%) */}
        {/* ============================================================ */}
        <div
          ref={detailRef}
          className={`flex-1 overflow-y-auto p-6 sm:p-8 lg:p-10 flex flex-col relative z-10 max-h-[calc(100vh-10rem)] md:max-h-none ${
            mobileView === 'list' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {selectedWord ? (
            <div className="max-w-4xl w-full mx-auto space-y-6">
              {/* Mobile Back Button */}
              <button
                type="button"
                onClick={() => setMobileView('list')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/70 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 text-xs font-black text-slate-800 dark:text-slate-200 border border-white/50 dark:border-white/10 shadow-xs md:hidden cursor-pointer"
              >
                <ArrowUp size={15} className="rotate-[-90deg]" />
                <span>Quay lại danh sách tra cứu</span>
              </button>

              {/* Word Hero Showcase Card */}
              <div className="p-6 sm:p-8 rounded-3xl bg-white/40 dark:bg-white/5 border border-white/60 dark:border-white/10 shadow-lg backdrop-blur-xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left: Word, Phonetic, Audio Buttons */}
                  <div className="space-y-3">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 dark:text-white tracking-tight">
                      {selectedWord.word}
                    </h1>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {getDisplayPronunciation(selectedWord.pro) && (
                        <span className="px-3.5 py-1.5 rounded-xl bg-indigo-500/10 dark:bg-cyan-500/15 text-indigo-700 dark:text-cyan-300 font-mono font-bold text-base border border-indigo-500/25 dark:border-cyan-500/25">
                          {getDisplayPronunciation(selectedWord.pro)}
                        </span>
                      )}

                      {/* US Audio Button */}
                      <button
                        type="button"
                        onClick={() => playPronunciation('us')}
                        disabled={isSpeaking === 'us'}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs ${
                          isSpeaking === 'us'
                            ? 'bg-indigo-600 text-white scale-105 ring-2 ring-indigo-400'
                            : 'bg-white/70 dark:bg-white/10 hover:bg-indigo-500 hover:text-white text-slate-800 dark:text-slate-200 border border-white/50 dark:border-white/10'
                        }`}
                        title="Phát âm giọng Mỹ (US)"
                      >
                        <Volume2 size={15} className={isSpeaking === 'us' ? 'animate-bounce' : ''} />
                        <span>US</span>
                      </button>

                      {/* UK Audio Button */}
                      <button
                        type="button"
                        onClick={() => playPronunciation('uk')}
                        disabled={isSpeaking === 'uk'}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs ${
                          isSpeaking === 'uk'
                            ? 'bg-fuchsia-600 text-white scale-105 ring-2 ring-fuchsia-400'
                            : 'bg-white/70 dark:bg-white/10 hover:bg-fuchsia-500 hover:text-white text-slate-800 dark:text-slate-200 border border-white/50 dark:border-white/10'
                        }`}
                        title="Phát âm giọng Anh (UK)"
                      >
                        <Volume2 size={15} className={isSpeaking === 'uk' ? 'animate-bounce' : ''} />
                        <span>UK</span>
                      </button>
                    </div>
                  </div>

                  {/* Right: Bookmark / Save & Copy Action Buttons */}
                  <div className="flex items-center gap-2 self-start">
                    {/* Save to Notebook */}
                    <button
                      type="button"
                      onClick={handleToggleSave}
                      disabled={savingWord}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs ${
                        isSaved
                          ? 'bg-amber-500 text-white shadow-amber-500/25 hover:bg-amber-600'
                          : 'bg-white/70 dark:bg-white/10 hover:bg-white text-slate-800 dark:text-slate-200 border border-white/50 dark:border-white/10'
                      }`}
                    >
                      {savingWord ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Bookmark size={15} className={isSaved ? 'fill-current' : ''} />
                      )}
                      <span>{isSaved ? 'Đã lưu sổ từ' : 'Lưu sổ từ'}</span>
                    </button>

                    {/* Copy Button */}
                    <button
                      type="button"
                      onClick={handleCopyWord}
                      className="p-2.5 rounded-xl bg-white/70 dark:bg-white/10 hover:bg-white text-slate-800 dark:text-slate-200 border border-white/50 dark:border-white/10 shadow-xs transition-all cursor-pointer"
                      title="Sao chép từ và định nghĩa"
                      aria-label="Sao chép"
                    >
                      {isCopied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                {/* Definition Body rendered by TFlatMeaning */}
                <div className="pt-2 border-t border-white/40 dark:border-white/10">
                  {detailLoading ? (
                    <div className="flex items-center gap-2.5 py-6 text-slate-500 dark:text-slate-400">
                      <Loader2 size={20} className="animate-spin text-indigo-600 dark:text-cyan-400" />
                      <span className="text-sm font-bold">Đang tra cứu từ gốc và chi tiết...</span>
                    </div>
                  ) : selectedWord.av ? (
                    <TFlatMeaning word={selectedWord} />
                  ) : (
                    <p className="text-slate-800 dark:text-slate-200 text-base font-semibold leading-relaxed">
                      {selectedWord.mean}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ============================================================ */
            /* EMPTY STATE: Rich Vocabulary Discovery Showcase */
            /* ============================================================ */
            <div className="max-w-3xl w-full mx-auto my-auto py-8 space-y-8 text-center sm:text-left">
              {/* Header greeting */}
              <div className="space-y-2 text-center">
                <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-gradient-to-tr from-fuchsia-500/15 to-indigo-500/15 border border-white/50 dark:border-white/10 shadow-xl shadow-indigo-500/20 mb-2 overflow-hidden backdrop-blur-md">
                  <img
                    src={bookGif}
                    alt="Khám Phá Từ Điển"
                    className="h-16 w-16 object-contain select-none pointer-events-none drop-shadow-md"
                  />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
                  Khám Phá Kho Từ Điển TFlat
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium max-w-md mx-auto">
                  Nhập từ vựng vào thanh tìm kiếm bên trái hoặc chọn từ gợi ý bên dưới để tra cứu nghĩa, phát âm và câu ví dụ.
                </p>
              </div>

              {/* Word of the Day Feature Card */}
              <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/25 dark:border-cyan-400/20 shadow-xl backdrop-blur-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-cyan-400">
                    <Sparkles size={16} />
                    <span>Từ vựng tiêu biểu hôm nay (Word of the Day)</span>
                  </div>

                  <span className="text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-500 text-white shadow-2xs self-start sm:self-auto">
                    {wordOfTheDay.pos}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-baseline gap-3">
                    <h4 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">
                      {wordOfTheDay.word}
                    </h4>
                    <span className="text-sm font-mono font-bold text-slate-600 dark:text-slate-400">
                      {wordOfTheDay.pro}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {wordOfTheDay.mean}
                  </p>
                  <p className="text-xs italic text-slate-600 dark:text-slate-400 pt-1">
                    "{wordOfTheDay.example}"
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleQuickSearch(wordOfTheDay.word)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-black shadow-md shadow-indigo-500/25 transition-all cursor-pointer hover:scale-102"
                  >
                    <span>Xem chi tiết từ này</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* 3 Value Proposition Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 space-y-2 text-left">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
                    170K
                  </div>
                  <h5 className="text-xs font-black text-slate-900 dark:text-white">
                    Kho từ vựng khổng lồ
                  </h5>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    Bao phủ toàn diện từ vựng giao tiếp, học thuật và chuyên ngành kinh tế TOEIC.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 space-y-2 text-left">
                  <div className="h-9 w-9 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-cyan-400 flex items-center justify-center font-black">
                    <Volume2 size={18} />
                  </div>
                  <h5 className="text-xs font-black text-slate-900 dark:text-white">
                    Phát âm US / UK chuẩn xác
                  </h5>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    Nghe trực tiếp phát âm giọng đọc bản xứ để rèn luyện ngữ điệu và phát âm chuẩn.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 space-y-2 text-left">
                  <div className="h-9 w-9 rounded-xl bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400 flex items-center justify-center font-black">
                    <Bookmark size={18} />
                  </div>
                  <h5 className="text-xs font-black text-slate-900 dark:text-white">
                    Lưu vào Sổ từ cá nhân
                  </h5>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                    Một chạm để gom từ mới vào sổ học tập riêng và ôn lại qua Flashcard thông minh.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
