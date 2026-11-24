import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Volume2,
  Bookmark,
  Check,
  X,
  ExternalLink,
  Loader2,
  BookOpen
} from 'lucide-react';
import { fetchQuickWord } from '../lib/quickDictionary';
import { playWordAudio } from '../lib/audioService';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function QuickWordCard() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [wordData, setWordData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const activeReqRef = useRef(0);

  const checkIfSaved = useCallback(async (word) => {
    if (!user || !word) {
      setIsSaved(false);
      return;
    }
    try {
      const { data } = await supabase
        .from('user_vocabulary')
        .select('id')
        .eq('user_id', user.id)
        .ilike('word', word.trim())
        .limit(1);
      setIsSaved(Boolean(data && data.length > 0));
    } catch {
      setIsSaved(false);
    }
  }, [user]);

  const loadWord = useCallback(async (word) => {
    const clean = String(word || '').replace(/[^a-zA-Z\s'-]/g, '').trim();
    if (!clean) return;

    const reqId = ++activeReqRef.current;
    setCurrentWord(clean);
    setIsOpen(true);
    setLoading(true);
    setWordData(null);
    setIsSaved(false);

    checkIfSaved(clean);

    try {
      const result = await fetchQuickWord(clean);
      if (reqId === activeReqRef.current && result) {
        setWordData(result);
      }
    } catch (err) {
      console.warn('Quick word card load error:', err);
    } finally {
      if (reqId === activeReqRef.current) {
        setLoading(false);
      }
    }
  }, [checkIfSaved]);

  useEffect(() => {
    const handleOpen = (e) => {
      const targetWord = e?.detail?.word;
      if (targetWord) {
        loadWord(targetWord);
      }
    };
    window.addEventListener('quick-word:open', handleOpen);
    return () => window.removeEventListener('quick-word:open', handleOpen);
  }, [loadWord]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handlePlayAudio = () => {
    const wordToPlay = wordData?.word || currentWord;
    if (wordToPlay) {
      playWordAudio(wordToPlay, 'en');
    }
  };

  const handleSaveWord = async () => {
    if (!user) {
      alert('Vui lòng đăng nhập để lưu từ vào sổ từ vựng!');
      return;
    }
    const wordToSave = (wordData?.word || currentWord).trim();
    if (!wordToSave || isSaving || isSaved) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from('user_vocabulary').insert([
        {
          user_id: user.id,
          word: wordToSave,
          meaning: wordData?.meaning || '',
          phonetic: wordData?.phonetic || '',
          example_sentence: wordData?.example || '',
          source: 'Luyện nghe & Luyện nhại'
        }
      ]);
      if (!error) {
        setIsSaved(true);
      }
    } catch (err) {
      console.error('Error saving word:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenFullDictionary = () => {
    const word = wordData?.word || currentWord;
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent('global-dictionary:open', { detail: { word } }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] pointer-events-none flex sm:items-end sm:justify-end sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/25 dark:bg-black/40 backdrop-blur-[1px] pointer-events-auto sm:hidden"
        />

        <motion.div
          initial={{ y: 80, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', damping: 25, stiffness: 320 }}
          className="pointer-events-auto fixed inset-x-0 bottom-0 sm:relative sm:inset-auto w-full sm:w-[380px] max-h-[45vh] sm:max-h-[380px] rounded-t-[28px] sm:rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-indigo-500/20 dark:border-white/10 shadow-2xl shadow-indigo-950/20 flex flex-col overflow-hidden"
        >
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mt-2.5 sm:hidden shrink-0" />

          <div className="p-4 sm:p-5 flex flex-col gap-3 overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white capitalize tracking-tight truncate">
                    {wordData?.word || currentWord}
                  </h3>
                  <button
                    type="button"
                    onClick={handlePlayAudio}
                    title="Nghe phát âm chuẩn US"
                    className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-cyan-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all cursor-pointer active:scale-95"
                  >
                    <Volume2 size={16} />
                  </button>
                </div>

                {wordData?.phonetic && (
                  <p className="text-xs font-mono font-bold text-indigo-600 dark:text-cyan-400 mt-0.5">
                    {wordData.phonetic.replace(/#;#.*/g, '').replace(/[#;]+$/g, '').trim()}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleSaveWord}
                  disabled={isSaving || isSaved}
                  title={isSaved ? 'Đã lưu trong sổ từ' : 'Lưu từ vào sổ từ vựng cá nhân'}
                  className={`p-2 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                    isSaved
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-500 hover:bg-amber-500/10'
                  }`}
                >
                  {isSaving ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : isSaved ? (
                    <Check size={15} />
                  ) : (
                    <Bookmark size={15} />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-indigo-50/50 dark:bg-slate-800/50 border border-indigo-500/10 dark:border-white/5 p-3.5 text-xs sm:text-sm">
              {loading ? (
                <div className="space-y-2 py-1">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700/60 rounded-md w-3/4 animate-pulse" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700/60 rounded-md w-1/2 animate-pulse" />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <p className="font-bold text-slate-800 dark:text-slate-100 leading-snug">
                    {wordData?.meaning && !wordData.meaning.startsWith('CQkJ')
                      ? wordData.meaning
                      : 'Đang tra cứu nghĩa...'}
                  </p>
                  {wordData?.example && (
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 italic">
                      "{wordData.example}"
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400 font-medium">
                Tra nhanh • Chạm từ để nghe
              </span>
              <button
                type="button"
                onClick={handleOpenFullDictionary}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-cyan-400 hover:underline cursor-pointer"
              >
                <BookOpen size={13} />
                <span>Xem chi tiết</span>
                <ExternalLink size={11} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
