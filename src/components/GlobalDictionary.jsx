import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  BookOpen,
  Volume2,
  Loader2,
  Clock,
  Bookmark,
  Check,
  Trash2,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { lookupDictionaryWord } from '../lib/gemini';
import { playWordAudio } from '../lib/audioService';
import { supabase } from '../lib/supabaseClient';

const TRENDING_TOEIC_WORDS = [
  { word: 'schedule', meaning: 'lịch trình, thời gian biểu' },
  { word: 'negotiate', meaning: 'đàm phán, thương lượng' },
  { word: 'contract', meaning: 'hợp đồng, giao kèo' },
  { word: 'revenue', meaning: 'doanh thu, lợi nhuận' },
  { word: 'deadline', meaning: 'hạn chót, thời hạn nộp' },
  { word: 'candidate', meaning: 'ứng viên xin việc' },
];

export default function GlobalDictionary({ showTrigger = true }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const inputRef = useRef(null);
  const searchRequestRef = useRef(0);

  useEffect(() => {
    const saved = localStorage.getItem('dictionary_recent');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    const openDictionary = () => setIsOpen(true);
    window.addEventListener('global-dictionary:open', openDictionary);
    return () => window.removeEventListener('global-dictionary:open', openDictionary);
  }, []);

  // Shortcut Ctrl+K / Cmd+K to open dictionary anywhere
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const saveRecentSearch = (word, meaning) => {
    const newRecent = [
      { word, meaning },
      ...recentSearches.filter((item) => item.word.toLowerCase() !== word.toLowerCase()),
    ].slice(0, 6);
    setRecentSearches(newRecent);
    localStorage.setItem('dictionary_recent', JSON.stringify(newRecent));
  };

  const deleteRecentWord = (e, wordToDelete) => {
    e.stopPropagation();
    const updated = recentSearches.filter(
      (item) => item.word.toLowerCase() !== wordToDelete.toLowerCase(),
    );
    setRecentSearches(updated);
    localStorage.setItem('dictionary_recent', JSON.stringify(updated));
  };

  const clearAllRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem('dictionary_recent');
  };

  const handleSearch = async (searchWord) => {
    if (isSearching) return;
    const wordToSearch = (searchWord || query).trim();
    if (!wordToSearch) return;

    const requestId = ++searchRequestRef.current;

    setIsSearching(true);
    setError('');
    setResult(null);
    setIsSaved(false);

    if (searchWord) {
      setQuery(searchWord);
    }

    try {
      const data = await lookupDictionaryWord(wordToSearch);
      if (requestId !== searchRequestRef.current) return;
      if (data && !data.error && data.word) {
        setResult(data);
        const briefMeaning = data.partsOfSpeech?.[0]?.meanings?.[0]?.definition || '';
        saveRecentSearch(data.word, briefMeaning);
      } else {
        setError('Không tìm thấy kết quả hoặc từ không hợp lệ.');
      }
    } catch (err) {
      if (requestId !== searchRequestRef.current) return;
      console.error(err);
      setError('Đã xảy ra lỗi khi tra từ. Vui lòng thử lại.');
    } finally {
      if (requestId === searchRequestRef.current) setIsSearching(false);
    }
  };

  const handleSaveWord = async () => {
    if (!result) return;
    setIsSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert('Vui lòng đăng nhập để lưu từ vựng!');
        return;
      }

      const normalized = (result.word || '').trim();
      const { data: existing } = await supabase
        .from('user_vocabulary')
        .select('id')
        .eq('user_id', user.id)
        .ilike('word', normalized)
        .limit(1);

      if (existing && existing.length > 0) {
        setIsSaved(true);
      } else {
        const briefMeaning = result.partsOfSpeech?.[0]?.meanings?.[0]?.definition || '';
        const example = result.partsOfSpeech?.[0]?.meanings?.[0]?.englishExample || '';

        const { error: insertErr } = await supabase.from('user_vocabulary').insert([
          {
            user_id: user.id,
            word: normalized,
            meaning: briefMeaning,
            phonetic: result.phonetic,
            example_sentence: example,
            source: 'AI Dictionary',
          },
        ]);

        if (insertErr) throw insertErr;
        setIsSaved(true);
      }
    } catch (err) {
      console.error('Lỗi khi lưu từ vựng:', err);
      alert('Không thể lưu từ. Vui lòng thử lại sau.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const playAudio = (text, lang) => {
    if (!text) return;
    playWordAudio(text, lang || 'en');
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [isOpen]);

  return (
    <>
      {/* Floating Action Button */}
      {showTrigger && (
        <motion.button
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-xl shadow-indigo-500/30 transition hover:scale-105 active:scale-95"
          onClick={() => setIsOpen(true)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          title="Tra từ điển nhanh (Ctrl+K)"
        >
          <BookOpen size={24} />
        </motion.button>
      )}

      {/* Dictionary Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-950/55 backdrop-blur-[2px] transition-colors"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 4 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-white/60 bg-white/95 shadow-2xl dark:border-white/10 dark:bg-slate-900/95 transition-colors transform-gpu"
            >
              {/* Search Header Bar (Responsive & Overflow-Safe) */}
              <div className="border-b border-slate-200/80 bg-slate-50/70 p-2.5 sm:p-4 dark:border-white/10 dark:bg-slate-800/50">
                <div className="flex items-center gap-1.5 sm:gap-2.5 rounded-2xl border border-indigo-400/30 bg-white px-2.5 sm:px-3 py-1.5 sm:py-2 shadow-sm transition focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 dark:border-white/10 dark:bg-slate-950">
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                    <Search size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </div>

                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Tra từ tiếng Anh, cụm từ, nghĩa..."
                    className="flex-1 min-w-0 bg-transparent text-xs sm:text-base font-bold text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />

                  {query && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery('');
                        setResult(null);
                        setError('');
                      }}
                      className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      aria-label="Xóa từ"
                    >
                      <X size={14} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleSearch()}
                    disabled={isSearching || !query.trim()}
                    className="shrink-0 inline-flex items-center gap-1 sm:gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-black text-white shadow-md shadow-indigo-500/25 transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSearching ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <>
                        <Sparkles size={13} />
                        <span>Tra từ</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
                    aria-label="Đóng từ điển"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {/* Error State */}
                {error && (
                  <div className="py-8 text-center font-bold text-rose-500 dark:text-rose-400">
                    <p>{error}</p>
                  </div>
                )}

                {/* Loading State */}
                {isSearching && !result && (
                  <div className="flex flex-col items-center justify-center gap-3 py-14 text-indigo-600 dark:text-indigo-400">
                    <Loader2 size={36} className="animate-spin" />
                    <p className="animate-pulse text-sm font-bold">
                      Đang tra từ điển thông minh AI...
                    </p>
                  </div>
                )}

                {/* Rich Result View */}
                {!isSearching && result && !error && (
                  <div className="space-y-6">
                    {/* Word Header Card */}
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-500/20 bg-indigo-50/50 p-4 dark:border-indigo-500/20 dark:bg-indigo-950/20">
                      <div className="flex flex-wrap items-baseline gap-3">
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                          {result.word}
                        </h1>
                        {result.phonetic && (
                          <span className="font-mono text-base font-bold text-indigo-600 dark:text-indigo-300">
                            {result.phonetic}
                          </span>
                        )}
                        {result.level && (
                          <span className="rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-2 py-0.5 text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
                            {result.level}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => playAudio(result.word, 'en-GB')}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
                        >
                          UK <Volume2 size={14} className="text-indigo-500" />
                        </button>
                        <button
                          type="button"
                          onClick={() => playAudio(result.word, 'en-US')}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
                        >
                          US <Volume2 size={14} className="text-indigo-500" />
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveWord}
                          disabled={isSaving || isSaved}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold shadow-sm transition ${
                            isSaved
                              ? 'bg-emerald-500 text-white'
                              : 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95'
                          }`}
                        >
                          {isSaving ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : isSaved ? (
                            <>
                              <Check size={14} /> Đã lưu sổ từ
                            </>
                          ) : (
                            <>
                              <Bookmark size={14} /> Lưu vào sổ từ
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Parts of Speech */}
                    <div className="space-y-6">
                      {result.partsOfSpeech?.map((pos, idx) => (
                        <div
                          key={idx}
                          className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-slate-800/60"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-xs font-black uppercase text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                              {pos.type ? pos.type.charAt(0) : 'n'}
                            </span>
                            <h3 className="text-base font-black capitalize text-indigo-600 dark:text-indigo-400">
                              {pos.type}
                            </h3>
                          </div>

                          <div className="space-y-4 pl-1 sm:pl-2">
                            {pos.meanings?.map((meaning, mIdx) => (
                              <div key={mIdx} className="space-y-1.5">
                                <div className="flex items-start gap-2.5">
                                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                    {mIdx + 1}
                                  </span>
                                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 sm:text-base">
                                    {meaning.definition}
                                  </p>
                                </div>
                                {meaning.englishExample && (
                                  <div className="ml-7 rounded-xl border-l-2 border-indigo-500 bg-indigo-50/40 p-2.5 text-xs dark:bg-indigo-950/20 sm:text-sm">
                                    <p className="font-semibold italic text-indigo-700 dark:text-indigo-300">
                                      "{meaning.englishExample}"
                                    </p>
                                    {meaning.vietnameseExample && (
                                      <p className="mt-1 text-slate-500 dark:text-slate-400">
                                        {meaning.vietnameseExample}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Searches (Redesigned with Audio & Delete) */}
                {!result && !isSearching && !error && (
                  <div className="space-y-5">
                    {recentSearches.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            <Clock size={14} className="text-indigo-500" /> LỊCH SỬ TRA CỨU GẦN ĐÂY
                          </p>
                          <button
                            type="button"
                            onClick={clearAllRecent}
                            className="text-xs font-semibold text-slate-400 transition hover:text-rose-500"
                          >
                            Xóa tất cả
                          </button>
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {recentSearches.map((item, idx) => (
                            <div
                              key={idx}
                              onClick={() => handleSearch(item.word)}
                              className="group flex items-center justify-between gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs transition hover:border-indigo-400 hover:shadow-md hover:scale-[1.01] active:scale-99 dark:border-white/5 dark:bg-slate-800/60 dark:hover:border-indigo-500/40 cursor-pointer"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-slate-800 transition group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400 truncate">
                                    {item.word}
                                  </span>
                                </div>
                                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                                  {item.meaning || 'Chạm để tra chi tiết'}
                                </p>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    playAudio(item.word, 'en-US');
                                  }}
                                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition hover:bg-indigo-100 active:scale-95 dark:bg-indigo-950/40 dark:text-indigo-300"
                                  title="Nghe phát âm"
                                >
                                  <Volume2 size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => deleteRecentWord(e, item.word)}
                                  className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 opacity-50 transition hover:opacity-100 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30"
                                  title="Xóa từ này"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Trending TOEIC Vocabulary Suggestions */}
                    <div className="rounded-2xl border border-indigo-500/15 bg-gradient-to-br from-indigo-50/50 via-purple-50/30 to-transparent p-4 dark:border-white/5 dark:bg-slate-800/30">
                      <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2.5">
                        <TrendingUp size={14} /> TỪ VỰNG TOEIC HAY GẶP TRONG ĐỀ THI
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {TRENDING_TOEIC_WORDS.map((item) => (
                          <button
                            key={item.word}
                            type="button"
                            onClick={() => handleSearch(item.word)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-white/80 bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:border-indigo-400 hover:text-indigo-600 hover:-translate-y-0.5 active:translate-y-0 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:text-indigo-300"
                          >
                            <span>{item.word}</span>
                            <span className="text-[10px] font-normal text-slate-400">· {item.meaning}</span>
                            <ArrowRight size={11} className="opacity-40" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
