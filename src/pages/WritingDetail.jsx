import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
  Target,
  PenTool,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Sparkles,
  Volume2,
  Copy,
  Check,
  BookOpen,
  Lightbulb,
  Award,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { evaluateTranslation } from '../lib/gemini';
import { praiseLearningBot } from '../lib/learningBot';
import { useAuth } from '../contexts/AuthContext';
import { usePracticeSessionTimer } from '../lib/practiceActivity';
import { writingLessonCache } from '../lib/lessonCache';
import { usePlatform } from '../hooks/usePlatform';
import { playWordAudio } from '../lib/audioService';

export default function WritingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isNative } = usePlatform();
  const textareaRef = useRef(null);
  const stepperRef = useRef(null);

  const cachedData = writingLessonCache.get(id);
  const [lesson, setLesson] = useState(() => cachedData?.lesson || null);
  const [sentences, setSentences] = useState(() => cachedData?.sentences || []);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [completedSentences, setCompletedSentences] = useState(new Set());
  const [loading, setLoading] = useState(() => !cachedData);

  const [userTranslation, setUserTranslation] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [copied, setCopied] = useState(false);

  usePracticeSessionTimer('writing', user, Boolean(lesson && sentences.length > 0 && !isEvaluating));

  useEffect(() => {
    setCurrentSentenceIndex(0);
    setUserTranslation('');
    setFeedback(null);
    fetchLessonAndSentences();
  }, [id]);

  // Auto-focus textarea when sentence changes
  useEffect(() => {
    if (!isEvaluating && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [currentSentenceIndex, isEvaluating]);

  // Auto-scroll active pill into view inside stepper
  useEffect(() => {
    if (stepperRef.current) {
      const activeEl = stepperRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentSentenceIndex]);

  const fetchLessonAndSentences = async () => {
    try {
      if (!writingLessonCache.has(id)) {
        setLoading(true);
      }

      const [lessonRes, sentencesRes] = await Promise.all([
        supabase
          .from('writing_lessons')
          .select('id, title, level, full_content, created_at')
          .eq('id', id)
          .single(),
        supabase
          .from('writing_sentences')
          .select('id, lesson_id, text_to_translate, suggested_translation, order_num')
          .eq('lesson_id', id)
          .order('order_num', { ascending: true }),
      ]);

      if (lessonRes.error) throw lessonRes.error;
      if (sentencesRes.error) throw sentencesRes.error;

      const lessonData = lessonRes.data;
      const sentencesData = sentencesRes.data || [];

      writingLessonCache.set(id, {
        lesson: lessonData,
        sentences: sentencesData,
      });

      setLesson(lessonData);
      setSentences(sentencesData);

      // Fetch user's completed progress for these sentences
      if (user?.id && sentencesData.length > 0) {
        const sentenceIds = sentencesData.map((s) => s.id);
        const { data: userProgress } = await supabase
          .from('user_writing_progress')
          .select('sentence_id, is_completed, accuracy')
          .eq('user_id', user.id)
          .in('sentence_id', sentenceIds);

        if (userProgress) {
          const completedSet = new Set(
            userProgress
              .filter((p) => p.is_completed || p.accuracy >= 80)
              .map((p) => p.sentence_id)
          );
          setCompletedSentences(completedSet);
        }
      }
    } catch (error) {
      console.error('Error fetching writing details:', error.message);
      if (!lesson) navigate('/writing');
    } finally {
      setLoading(false);
    }
  };

  const currentSentence = sentences[currentSentenceIndex];

  // Word and character count
  const textStats = useMemo(() => {
    const trimmed = userTranslation.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const chars = userTranslation.length;
    return { words, chars };
  }, [userTranslation]);

  // Pronounce English suggested translation using Shared Audio Service
  const handleSpeakEnglish = (text) => {
    if (!text) return;
    playWordAudio(text, 'en');
  };

  // Copy text to clipboard
  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCheck = async () => {
    if (!userTranslation.trim() || !currentSentence || isEvaluating) return;

    if (!user) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth-modal:open', { detail: { mode: 'login' } }));
      }
      setFeedback({
        is_correct: false,
        accuracy: 0,
        feedback: 'Vui lòng đăng nhập để sử dụng tính năng chấm điểm và sửa lỗi bằng AI.',
        suggestion: currentSentence.suggested_translation,
      });
      return;
    }

    setIsEvaluating(true);
    setFeedback(null);
    try {
      const examType = (lesson?.level || '').toUpperCase().includes('TOEIC') ? 'TOEIC' : 'IELTS/TOEIC';
      const result = await evaluateTranslation(
        currentSentence.suggested_translation,
        currentSentence.text_to_translate,
        userTranslation,
        currentSentence.context_before || '',
        currentSentence.context_after || '',
        examType
      );

      setFeedback(result);

      if (result.is_correct || result.accuracy >= 80) {
        praiseLearningBot({
          action: 'completed_practice_unit',
          skill: 'writing',
          score: result.accuracy || 100,
        });

        setCompletedSentences((prev) => new Set([...prev, currentSentence.id]));
      }

      // Save progress if accuracy is reasonable (>= 80%) and user is logged in
      if (user && result.accuracy >= 80) {
        await supabase
          .from('user_writing_progress')
          .upsert(
            {
              user_id: user.id,
              sentence_id: currentSentence.id,
              user_translation: userTranslation,
              accuracy: result.accuracy,
              is_completed: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,sentence_id' }
          );
      }
    } catch (error) {
      console.error('Error evaluating translation:', error);
      setFeedback({
        is_correct: false,
        accuracy: 0,
        feedback: error?.message || 'Đã có lỗi xảy ra khi chấm bài qua AI. Vui lòng thử lại.',
        suggestion: currentSentence.suggested_translation,
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  // Keydown handler: Ctrl + Enter / Cmd + Enter to submit
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleCheck();
    }
  };

  const handleNextSentence = () => {
    if (currentSentenceIndex < sentences.length - 1) {
      setCurrentSentenceIndex((prev) => prev + 1);
      setUserTranslation('');
      setFeedback(null);
    }
  };

  const handlePrevSentence = () => {
    if (currentSentenceIndex > 0) {
      setCurrentSentenceIndex((prev) => prev - 1);
      setUserTranslation('');
      setFeedback(null);
    }
  };

  const handleSelectSentence = (index) => {
    if (index >= 0 && index < sentences.length && index !== currentSentenceIndex) {
      setCurrentSentenceIndex(index);
      setUserTranslation('');
      setFeedback(null);
    }
  };

  const handleReset = () => {
    setUserTranslation('');
    setFeedback(null);
    if (textareaRef.current) textareaRef.current.focus();
  };

  const handleNextLesson = async () => {
    try {
      const { data, error } = await supabase
        .from('writing_lessons')
        .select('id')
        .gt('created_at', lesson.created_at)
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        navigate(`/writing/${data[0].id}`);
      } else {
        navigate('/writing');
      }
    } catch {
      navigate('/writing');
    }
  };

  // Format text helper
  const formatText = (text) => {
    if (!text) return null;
    const lines = text.replace(/\\n/g, '\n').split('\n');
    return lines.map((line, i) => (
      <span key={i}>
        {line}
        {i < lines.length - 1 && <br />}
      </span>
    ));
  };

  // Render full context with highlighted target sentence
  const renderFullContentWithHighlight = () => {
    if (!lesson?.full_content || !currentSentence) return null;

    const escapeRegExp = (string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    const target = currentSentence.text_to_translate.trim();
    const regex = new RegExp(`(${escapeRegExp(target)})`, 'i');
    const parts = lesson.full_content.split(regex);

    if (parts.length === 1) {
      return (
        <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
          {formatText(lesson.full_content)}
        </p>
      );
    }

    return (
      <div className="text-sm sm:text-base leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
        {parts.map((part, index) => {
          if (part.toLowerCase() === target.toLowerCase()) {
            return (
              <mark
                key={index}
                className="bg-blue-500/25 dark:bg-cyan-500/30 text-blue-950 dark:text-cyan-100 font-black px-2 py-0.5 rounded-lg border-b-2 border-blue-500 shadow-xs"
              >
                {formatText(part)}
              </mark>
            );
          }
          return <span key={index}>{formatText(part)}</span>;
        })}
      </div>
    );
  };

  if (loading || !lesson) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3 p-8 rounded-3xl bg-white/60 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/40 dark:border-slate-800 shadow-2xl text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Đang tải bài luyện viết...
          </p>
        </div>
      </div>
    );
  }

  const isCurrentSentenceDone = completedSentences.has(currentSentence?.id);

  return (
    <div
      className="flex-1 flex flex-col bg-transparent text-slate-800 dark:text-white h-full lg:overflow-hidden overflow-auto p-2 sm:p-4 lg:p-5 max-w-7xl mx-auto w-full gap-2.5 sm:gap-4"
      style={{
        paddingTop: isNative ? 'max(env(safe-area-inset-top, 0px), 52px)' : 'max(env(safe-area-inset-top, 0px), 10px)',
      }}
    >
      <header className="relative z-30 flex items-center justify-between gap-2 sm:gap-3 p-2 sm:px-4 py-2 sm:py-2.5 rounded-2xl sm:rounded-3xl backdrop-blur-2xl bg-white/90 dark:bg-slate-900/90 border border-white/50 dark:border-slate-800 shadow-xl shadow-black/5 shrink-0 transition-colors w-full">
        <div className="flex items-center min-w-0 pr-1 gap-2 sm:gap-3">
          <button
            onClick={() => navigate('/writing')}
            className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-xl sm:rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-cyan-400 transition-all cursor-pointer shadow-xs active:scale-95"
            title="Quay lại danh sách bài viết"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold border whitespace-nowrap shrink-0 bg-blue-500/15 dark:bg-cyan-500/20 text-blue-700 dark:text-cyan-300 border-blue-500/25">
                <PenTool size={11} />
                <span>Luyện dịch câu</span>
                <span className="opacity-30">•</span>
                <span className="uppercase">{lesson.level || 'BASIC'}</span>
              </span>
            </div>
            <h1 className="text-xs sm:text-sm lg:text-base font-extrabold text-slate-900 dark:text-white leading-tight truncate">
              {lesson.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs font-extrabold text-slate-700 dark:text-slate-200 shadow-2xs">
            <CheckCircle2 size={13} className="text-emerald-600 dark:text-cyan-400" />
            <span className="font-mono text-[11px] sm:text-xs tracking-wider">
              Câu {currentSentenceIndex + 1}/{sentences.length}
            </span>
          </div>

          <div 
            ref={stepperRef}
            className="flex items-center gap-1 bg-slate-100/60 dark:bg-slate-800/60 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 max-w-[180px] sm:max-w-xs md:max-w-md overflow-x-auto no-scrollbar"
          >
            {sentences.map((sentence, idx) => {
              const isActive = idx === currentSentenceIndex;
              const isDone = completedSentences.has(sentence.id);

              let pillClass = "w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-black text-xs flex items-center justify-center transition-all cursor-pointer relative shrink-0 ";

              if (isActive) {
                pillClass += "bg-gradient-to-tr from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/30 scale-105 ring-2 ring-indigo-400/50 ";
              } else if (isDone) {
                pillClass += "bg-emerald-600/90 text-white shadow-xs ";
              } else {
                pillClass += "bg-white/80 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 ";
              }

              return (
                <button
                  key={sentence.id}
                  type="button"
                  data-active={isActive ? 'true' : undefined}
                  onClick={() => handleSelectSentence(idx)}
                  className={pillClass}
                  title={`Câu ${idx + 1}`}
                >
                  {isDone && !isActive ? (
                    <Check size={13} />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </button>
              );
            })}
          </div>

          {completedSentences.size === sentences.length && sentences.length > 0 ? (
            <button
              onClick={handleNextLesson}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl hover:shadow-lg shadow-md shadow-emerald-500/25 transition-all text-xs sm:text-sm cursor-pointer active:scale-95 flex items-center gap-1.5"
            >
              <span>Hoàn thành</span>
              <CheckCircle2 size={14} />
            </button>
          ) : (
            <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white font-extrabold px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl shadow-md shadow-indigo-500/25 text-xs sm:text-sm flex items-center gap-1.5">
              <span>Đạt</span>
              <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] sm:text-[11px] font-mono">
                {completedSentences.size}/{sentences.length}
              </span>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row lg:overflow-hidden overflow-visible w-full gap-4 sm:gap-5">
        <section className="w-full lg:w-[50%] flex flex-col h-full lg:overflow-y-auto space-y-4 pr-0.5 custom-scrollbar">
          <div className="rounded-3xl p-5 sm:p-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/50 dark:border-slate-800 shadow-xl shadow-black/5 relative overflow-hidden transition-all">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-blue-500/10 via-cyan-400/5 to-transparent rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 dark:bg-cyan-500/20 text-blue-600 dark:text-cyan-400 flex items-center justify-center shadow-xs">
                  <Target size={16} />
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-cyan-300">
                  Câu cần dịch #{currentSentenceIndex + 1}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopy(currentSentence?.text_to_translate)}
                  className="p-2 rounded-xl text-xs font-bold transition-all bg-white/70 hover:bg-white dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-cyan-400 border border-slate-200/80 dark:border-slate-700/60 shadow-xs cursor-pointer active:scale-95"
                  title="Sao chép câu"
                >
                  {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                </button>
              </div>
            </div>

            <div className="relative z-10">
              <p className="text-lg sm:text-xl font-black text-slate-950 dark:text-white leading-relaxed tracking-tight">
                {formatText(currentSentence?.text_to_translate)}
              </p>
            </div>

            {isCurrentSentenceDone && (
              <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/10 flex items-center gap-2 text-xs font-black text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
                <span>Bạn đã hoàn thành câu này đạt chuẩn.</span>
              </div>
            )}
          </div>

          {lesson.full_content && (
            <div className="rounded-3xl p-5 sm:p-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/50 dark:border-slate-800 shadow-xl shadow-black/5 transition-all">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 dark:bg-cyan-500/20 text-blue-600 dark:text-cyan-400 flex items-center justify-center">
                  <BookOpen size={16} />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Ngữ cảnh toàn bài đọc
                </h3>
              </div>

              <div className="max-h-[260px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                {renderFullContentWithHighlight()}
              </div>
            </div>
          )}
        </section>

        <section className="w-full lg:w-[50%] flex flex-col h-full lg:overflow-y-auto space-y-4 pr-0.5 custom-scrollbar">
          <div className="rounded-3xl p-5 sm:p-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/50 dark:border-slate-800 shadow-xl shadow-black/5 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 dark:bg-cyan-500/20 text-blue-600 dark:text-cyan-400 flex items-center justify-center shadow-xs">
                  <PenTool size={16} />
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Bản dịch tiếng Anh của bạn
                </h3>
              </div>

              <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                {textStats.words} từ • {textStats.chars} ký tự
              </div>
            </div>

            <div className="relative">
              <textarea
                ref={textareaRef}
                value={userTranslation}
                onChange={(e) => setUserTranslation(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isEvaluating}
                rows={4}
                placeholder="Nhập câu dịch tiếng Anh của bạn tại đây... (Nhấn Ctrl + Enter để kiểm tra)"
                className="w-full rounded-2xl p-4 text-base sm:text-lg font-semibold leading-relaxed bg-slate-50/80 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200 dark:border-slate-700 text-slate-950 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 dark:focus:border-cyan-400 shadow-inner resize-none transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hidden sm:flex">
                <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">
                  Ctrl + Enter
                </span>
                <span>để kiểm tra nhanh</span>
              </div>

              <div className="flex items-center gap-2.5 ml-auto">
                {userTranslation && (
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={isEvaluating}
                    className="px-3.5 py-2.5 rounded-xl text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <RotateCcw size={14} />
                    <span>Viết lại</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCheck}
                  disabled={!userTranslation.trim() || isEvaluating}
                  className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer shadow-md ${
                    !userTranslation.trim() || isEvaluating
                      ? 'opacity-50 cursor-not-allowed bg-slate-300 dark:bg-slate-700 text-slate-500'
                      : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white shadow-indigo-500/25 hover:shadow-lg hover:opacity-95 active:scale-95'
                  }`}
                >
                  {isEvaluating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Đang chấm điểm AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Kiểm tra (AI)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-3xl p-5 sm:p-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/50 dark:border-slate-800 shadow-xl shadow-black/5 min-h-[220px] flex flex-col justify-between transition-all">
            {feedback ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5 flex-1 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                          feedback.accuracy >= 80
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        <Award size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black text-slate-950 dark:text-white">
                            {feedback.accuracy}%
                          </span>
                          <span
                            className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                              feedback.accuracy >= 80
                                ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-500/35'
                                : 'bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/35'
                            }`}
                          >
                            {feedback.accuracy >= 80 ? 'Xuất sắc • Đạt chuẩn' : 'Cần cải thiện'}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                          Đánh giá phản xạ ngữ pháp và từ vựng
                        </p>
                      </div>
                    </div>

                    {feedback.suggestion && (
                      <button
                        type="button"
                        onClick={() => handleSpeakEnglish(feedback.suggestion)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-cyan-400 border border-slate-200 dark:border-slate-700 transition-all shadow-xs cursor-pointer active:scale-95"
                        title="Nghe phát âm bản dịch gợi ý (Tiếng Anh)"
                      >
                        <Volume2 size={16} />
                      </button>
                    )}
                  </div>

                  {feedback.suggestion && (
                    <div className="p-4 rounded-2xl bg-indigo-500/10 dark:bg-slate-800/80 border border-indigo-500/20 dark:border-slate-700 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-cyan-300">
                          Bản dịch chuẩn gợi ý:
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(feedback.suggestion)}
                          className="text-xs font-bold text-indigo-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Copy size={12} />
                          <span>Sao chép</span>
                        </button>
                      </div>
                      <p className="text-base font-black text-slate-950 dark:text-white leading-relaxed">
                        {feedback.suggestion}
                      </p>
                    </div>
                  )}

                  {feedback.feedback && (
                    <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        Nhận xét chi tiết từ AI:
                      </span>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                        {feedback.feedback}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  >
                    <RotateCcw size={14} />
                    <span>Viết lại</span>
                  </button>

                  {feedback.accuracy >= 80 && (
                    currentSentenceIndex < sentences.length - 1 ? (
                      <button
                        type="button"
                        onClick={handleNextSentence}
                        className="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:opacity-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-500/25 active:scale-95"
                      >
                        <span>Tiếp tục câu sau</span>
                        <ArrowRight size={14} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleNextLesson}
                        className="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:opacity-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/25 active:scale-95"
                      >
                        <span>Hoàn thành bài học</span>
                        <CheckCircle2 size={14} />
                      </button>
                    )
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Lightbulb size={18} />
                    </div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      Mẹo luyện dịch tự nhiên từ AI
                    </h4>
                  </div>

                  <div className="space-y-3 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                      <span className="text-indigo-600 dark:text-cyan-400 font-black">1.</span>
                      <p>
                        <strong>Xác định đúng chủ ngữ & thì</strong>: Câu văn mang tính quy trình thường sử dụng thì hiện tại đơn hoặc thể bị động (Passive Voice).
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                      <span className="text-indigo-600 dark:text-cyan-400 font-black">2.</span>
                      <p>
                        <strong>Mục tiêu hoàn thành</strong>: Đạt độ chính xác từ <strong>80% trở lên</strong> để vượt qua câu này và tích lũy điểm kinh nghiệm EXP.
                      </p>
                    </div>

                    <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                      <span className="text-indigo-600 dark:text-cyan-400 font-black">3.</span>
                      <p>
                        <strong>Phím tắt nhanh</strong>: Nhấn <code>Ctrl + Enter</code> trên bàn phím để nộp bài kiểm tra tức thì.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <Sparkles size={14} className="text-indigo-500" />
                  <span>AI sẽ phân tích câu của bạn ngay sau khi bấm Kiểm tra.</span>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border border-white/50 dark:border-slate-800 shadow-xl shadow-black/5 flex items-center justify-between text-xs">
            <button
              onClick={handlePrevSentence}
              disabled={currentSentenceIndex === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
                currentSentenceIndex === 0
                  ? 'opacity-40 cursor-not-allowed text-slate-400'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer active:scale-95'
              }`}
            >
              <ChevronLeft size={16} />
              <span>Câu trước</span>
            </button>

            <span className="font-mono font-bold text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
              Câu {currentSentenceIndex + 1} / {sentences.length}
            </span>

            <button
              onClick={handleNextSentence}
              disabled={currentSentenceIndex === sentences.length - 1}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all ${
                currentSentenceIndex === sentences.length - 1
                  ? 'opacity-40 cursor-not-allowed text-slate-400'
                  : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25 hover:opacity-95 cursor-pointer active:scale-95'
              }`}
            >
              <span>Câu sau</span>
              <ChevronRight size={16} />
            </button>
          </div>

        </section>

      </div>
    </div>
  );
}
