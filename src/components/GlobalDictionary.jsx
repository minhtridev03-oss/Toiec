import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, BookOpen, Volume2, Loader2, Clock, Bookmark, Check } from 'lucide-react';
import { lookupDictionaryWord } from '../lib/gemini';
import { supabase } from '../lib/supabaseClient';

export default function GlobalDictionary() {
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
    // Load recent searches from local storage
    const saved = localStorage.getItem('dictionary_recent');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const saveRecentSearch = (word, meaning) => {
    const newRecent = [{ word, meaning }, ...recentSearches.filter(item => item.word.toLowerCase() !== word.toLowerCase())].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem('dictionary_recent', JSON.stringify(newRecent));
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
        // Extract a brief meaning for the recent searches list
        const briefMeaning = data.partsOfSpeech?.[0]?.meanings?.[0]?.definition || '';
        saveRecentSearch(data.word, briefMeaning);
      } else {
        setError('Không tìm thấy kết quả hoặc từ không hợp lệ.');
      }
    } catch (err) {
      if (requestId !== searchRequestRef.current) return;
      setError('Đã xảy ra lỗi khi tra từ. Vui lòng thử lại.');
    } finally {
      if (requestId === searchRequestRef.current) setIsSearching(false);
    }
  };

  const handleSaveWord = async () => {
    if (!result) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Vui lòng đăng nhập để lưu từ vựng!");
        return;
      }
      
      const briefMeaning = result.partsOfSpeech?.[0]?.meanings?.[0]?.definition || '';
      const example = result.partsOfSpeech?.[0]?.meanings?.[0]?.englishExample || '';

      const { error } = await supabase
        .from('user_vocabulary')
        .insert([{
          user_id: user.id,
          word: result.word,
          meaning: briefMeaning,
          phonetic: result.phonetic,
          example_sentence: example,
          source: 'AI Dictionary'
        }]);
        
      if (error) throw error;
      setIsSaved(true);
    } catch (err) {
      console.error("Lỗi khi lưu từ vựng:", err);
      alert("Không thể lưu từ. Vui lòng thử lại sau.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const playAudio = (text, lang) => {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-tr from-pink-500 to-fuchsia-600 rounded-full shadow-lg shadow-pink-500/40 flex items-center justify-center text-white hover:scale-110 transition-transform"
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <BookOpen size={24} />
      </motion.button>

      {/* Dictionary Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-[10%] left-1/2 -translate-x-1/2 w-[90%] max-w-3xl bg-white dark:bg-[#1E1226] border border-pink-200 dark:border-fuchsia-900/30 rounded-3xl shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[80vh] transition-colors"
            >
              {/* Search Header */}
              <div className="p-4 border-b border-fuchsia-900/30 flex items-center gap-3">
                <Search size={20} className="text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Tra bất kỳ từ nào..."
                  className="flex-1 bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium transition-colors"
                />
                {query && (
                  <button onClick={() => { setQuery(''); setResult(null); setError(''); }} className="text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer">
                    <X size={18} />
                  </button>
                )}
                <button 
                  onClick={() => handleSearch()}
                  disabled={isSearching || !query.trim()}
                  className="px-4 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors cursor-pointer"
                >
                  {isSearching ? <Loader2 size={16} className="animate-spin" /> : 'Tra từ'}
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6">
                
                {/* Error State */}
                {error && (
                  <div className="text-center text-red-400 py-8 font-medium">
                    {error}
                  </div>
                )}

                {/* Loading State */}
                {isSearching && !result && (
                  <div className="flex flex-col items-center justify-center py-12 gap-4 text-fuchsia-400">
                    <Loader2 size={32} className="animate-spin" />
                    <p className="font-medium animate-pulse">Đang tra từ điển...</p>
                  </div>
                )}

                {/* Rich Result View */}
                {!isSearching && result && !error && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Word Header */}
                    <div className="flex flex-wrap items-end gap-4 border-b border-pink-100 dark:border-[#3A2F43] pb-4 transition-colors">
                      <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-white transition-colors">{result.word}</h1>
                      {result.level && (
                        <span className="px-2.5 py-1 bg-blue-500/20 border border-blue-500/50 text-blue-400 text-xs font-extrabold rounded-md uppercase tracking-wider">
                          {result.level}
                        </span>
                      )}
                      {result.phonetic && (
                        <span className="text-slate-400 font-medium text-lg font-mono">{result.phonetic}</span>
                      )}
                      
                      <div className="flex gap-2 ml-auto">
                        <button 
                          onClick={() => playAudio(result.word, 'en-GB')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-[#3A2F43] hover:bg-slate-200 dark:hover:bg-[#32263C] text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          UK <Volume2 size={14} className="text-fuchsia-500 dark:text-fuchsia-400 transition-colors" />
                        </button>
                        <button 
                          onClick={() => playAudio(result.word, 'en-US')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-[#3A2F43] hover:bg-slate-200 dark:hover:bg-[#32263C] text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          US <Volume2 size={14} className="text-fuchsia-500 dark:text-fuchsia-400 transition-colors" />
                        </button>
                        <button
                          onClick={handleSaveWord}
                          disabled={isSaving || isSaved}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isSaved 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                              : 'bg-fuchsia-100 dark:bg-fuchsia-900/30 hover:bg-fuchsia-200 dark:hover:bg-fuchsia-900/50 text-fuchsia-600 dark:text-fuchsia-400'
                          }`}
                        >
                          {isSaving ? <Loader2 size={14} className="animate-spin" /> : (isSaved ? <Check size={14} /> : <Bookmark size={14} />)}
                          {isSaved ? 'Đã lưu' : 'Lưu lại'}
                        </button>
                      </div>
                    </div>

                    {/* Parts of Speech */}
                    <div className="space-y-8">
                      {result.partsOfSpeech?.map((pos, idx) => (
                        <div key={idx} className="space-y-4">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-fuchsia-900/50 flex items-center justify-center text-fuchsia-400 font-bold text-sm shrink-0">
                              v.
                            </span>
                            <h3 className="text-lg font-bold text-fuchsia-300">{pos.type}</h3>
                          </div>
                          
                          <div className="space-y-6 pl-4 md:pl-11">
                            {pos.meanings?.map((meaning, mIdx) => (
                              <div key={mIdx} className="space-y-2">
                                <div className="flex gap-3">
                                  <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-[#3A2F43] flex items-center justify-center text-slate-600 dark:text-slate-400 text-xs font-bold shrink-0 mt-0.5 transition-colors">
                                    {mIdx + 1}
                                  </span>
                                  <p className="text-slate-800 dark:text-white font-bold text-base md:text-lg transition-colors">
                                    {meaning.definition}
                                  </p>
                                </div>
                                {meaning.englishExample && (
                                  <div className="pl-9 border-l-2 border-slate-200 dark:border-[#3A2F43] ml-3 py-1 transition-colors">
                                    <p className="text-fuchsia-600 dark:text-fuchsia-300/90 italic font-medium transition-colors">"{meaning.englishExample}"</p>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 transition-colors">{meaning.vietnameseExample}</p>
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

                {/* Recent Searches */}
                {!result && !isSearching && !error && recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Clock size={14} /> Gần đây
                      </p>
                      <button 
                        onClick={() => { setRecentSearches([]); localStorage.removeItem('dictionary_recent'); }}
                        className="text-xs text-slate-500 hover:text-fuchsia-400 transition-colors"
                      >
                        Xóa
                      </button>
                    </div>
                    <div className="space-y-2">
                      {recentSearches.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSearch(item.word)}
                          className="w-full text-left p-3 rounded-xl bg-slate-50 dark:bg-[#3A2F43]/30 hover:bg-slate-100 dark:hover:bg-[#3A2F43] transition-colors border border-transparent hover:border-slate-200 dark:hover:border-[#3A2F43] group cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{item.word}</span>
                            <span className="text-xs text-slate-500 group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400 transition-colors">Tra lại ↵</span>
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400 truncate mt-1 transition-colors">{item.meaning}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Empty State */}
                {!result && !isSearching && !error && recentSearches.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                    <BookOpen size={48} className="mb-4 opacity-20" />
                    <p>Nhập từ vựng tiếng Anh bạn muốn tra cứu</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
