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

export default function WritingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const textareaRef = useRef(null);

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

  // Pronounce English suggested translation using Web Speech API
  const handleSpeakEnglish = (text) => {
    if (!('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
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
        feedback: 'Đã có lỗi xảy ra khi chấm bài qua AI. Vui lòng thử lại.',
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
      <div className="flex-1 flex flex-col items-center justify-center bg-transparent text-slate-800 dark:text-slate-100 min-h-[60vh] gap-3">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin"></div>
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 animate-pulse">
          Đang tải bài luyện viết...
        </span>
      </div>
    );
  }

  const isCurrentSentenceDone = completedSentences.has(currentSentence?.id);

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent text-slate-800 dark:text-slate-100 overflow-y-auto min-h-screen">
      
      {/* ================= 1. STUDIO IMMERSIVE TOPBAR CAPSULE ================= */}
      <div 
        className="sticky top-0 z-30 px-3 sm:px-6 lg:px-8 py-2 max-w-7xl mx-auto w-full backdrop-blur-xl bg-white/95 dark:bg-[#0c0d14]/95 border-b border-slate-200/80 dark:border-white/10 shadow-xs"
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px), 36px)',
        }}
      >
        <header className="rounded-2xl px-2 sm:px-4 py-1.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 transition-all">
          
          {/* Left: Back button & Lesson Title */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => navigate('/writing')}
              className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all bg-white/45 dark:bg-white/10 border border-white/65 dark:border-white/15 hover:bg-white/70 dark:hover:bg-white/20 hover:border-blue-500 text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-cyan-400 shadow-[0_2px_8px_rgba(0,0,0,0.04),_inset_0_1px_1px_rgba(255,255,255,0.85)] cursor-pointer shrink-0"
              title="Quay lại danh sách bài viết"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-500/15 dark:bg-cyan-500/20 text-blue-800 dark:text-cyan-200 border border-blue-500/25">
                  {lesson.level || 'Basic'}
                </span>
                <h1 className="text-base sm:text-lg font-black text-slate-950 dark:text-white truncate">
                  {lesson.title}
                </h1>
              </div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 truncate mt-0.5">
                Rèn luyện chuyển ngữ câu tự nhiên với phản hồi AI thời gian thực
              </p>
            </div>
          </div>

          {/* Center/Right: Sentence Stepper & Navigation */}
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
            
            {/* Step Pills */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/30 dark:bg-slate-900/40 border border-white/50 dark:border-white/10 backdrop-blur-xl shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] overflow-x-auto max-w-[280px] sm:max-w-none hide-scrollbar">
              {sentences.map((sentence, idx) => {
                const isActive = idx === currentSentenceIndex;
                const isDone = completedSentences.has(sentence.id);

                return (
                  <button
                    key={sentence.id}
                    type="button"
                    onClick={() => handleSelectSentence(idx)}
                    className={`h-8 min-w-[32px] px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/30'
                        : isDone
                        ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-500/35'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/60'
                    }`}
                    title={`Câu ${idx + 1}`}
                  >
                    {isDone && !isActive ? (
                      <Check size={13} className="text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Prev / Next buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handlePrevSentence}
                disabled={currentSentenceIndex === 0}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all bg-white/45 dark:bg-white/10 border border-white/60 dark:border-white/15 backdrop-blur-md ${
                  currentSentenceIndex === 0
                    ? 'opacity-40 cursor-not-allowed text-slate-400'
                    : 'text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 cursor-pointer shadow-xs'
                }`}
                title="Câu trước"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleNextSentence}
                disabled={currentSentenceIndex === sentences.length - 1}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all bg-white/45 dark:bg-white/10 border border-white/60 dark:border-white/15 backdrop-blur-md ${
                  currentSentenceIndex === sentences.length - 1
                    ? 'opacity-40 cursor-not-allowed text-slate-400'
                    : 'text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 cursor-pointer shadow-xs'
                }`}
                title="Câu sau"
              >
                <ChevronRight size={16} />
              </button>
            </div>

          </div>

        </header>
      </div>

      {/* ================= 2. LIQUID GLASS 2-COLUMN WORKSPACE ================= */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-20">
          
          {/* ================= CỘT TRÁI: NGỮ CẢNH & CÂU CẦN DỊCH ================= */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* 1. FOCUS CARD: CÂU CẦN DỊCH (LIQUID GLASS PANEL) */}
            <div className="rounded-[2rem] p-6 sm:p-7 backdrop-blur-2xl bg-white/35 dark:bg-slate-950/45 border-2 border-blue-500/40 dark:border-cyan-500/35 shadow-[0_20px_50px_rgba(0,0,0,0.06),_inset_0_1.5px_2px_rgba(255,255,255,0.85),_inset_0_-1px_1px_rgba(0,0,0,0.03)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.6),_inset_0_1px_2px_rgba(255,255,255,0.25)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-blue-500/15 via-cyan-400/10 to-transparent rounded-full blur-2xl pointer-events-none" />

              {/* Card Header (Nút loa đã được xóa theo yêu cầu) */}
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
                    className="p-2 rounded-xl text-xs font-bold transition-all bg-white/45 hover:bg-white/70 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-cyan-400 border border-white/60 dark:border-white/15 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.85)] cursor-pointer"
                    title="Sao chép câu"
                  >
                    {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                  </button>
                </div>
              </div>

              {/* Target Vietnamese Sentence */}
              <div className="relative z-10">
                <p className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white leading-relaxed tracking-tight">
                  {formatText(currentSentence?.text_to_translate)}
                </p>
              </div>

              {/* Status pill if completed */}
              {isCurrentSentenceDone && (
                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/10 flex items-center gap-2 text-xs font-black text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
                  <span>Bạn đã hoàn thành câu này đạt chuẩn.</span>
                </div>
              )}
            </div>

            {/* 2. CONTEXT PASSAGE CARD: NGỮ CẢNH TOÀN BÀI (LIQUID GLASS PANEL) */}
            {lesson.full_content && (
              <div className="rounded-[2rem] p-6 backdrop-blur-2xl bg-white/30 dark:bg-slate-950/40 border border-white/55 dark:border-white/15 shadow-[0_16px_36px_-10px_rgba(15,23,42,0.05),_inset_0_1.5px_1px_rgba(255,255,255,0.85)] dark:shadow-[0_16px_36px_-10px_rgba(0,0,0,0.5),_inset_0_1px_1px_rgba(255,255,255,0.1)]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/15 dark:bg-cyan-500/20 text-blue-600 dark:text-cyan-400 flex items-center justify-center">
                    <BookOpen size={15} />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Ngữ cảnh toàn bài đọc
                  </h3>
                </div>

                {/* Scrollable passage container */}
                <div className="max-h-[240px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                  {renderFullContentWithHighlight()}
                </div>
              </div>
            )}

          </div>

          {/* ================= CỘT PHẢI: KHU VỰC LÀM BÀI & AI FEEDBACK ================= */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* 1. Ô NHẬP BẢN DỊCH (LIQUID GLASS WORKSPACE) */}
            <div className="rounded-[2rem] p-6 sm:p-7 backdrop-blur-2xl bg-white/35 dark:bg-slate-950/45 border border-white/55 dark:border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.06),_inset_0_1.5px_2px_rgba(255,255,255,0.85)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.6),_inset_0_1px_2px_rgba(255,255,255,0.2)]">
              
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 dark:bg-cyan-500/20 text-blue-600 dark:text-cyan-400 flex items-center justify-center shadow-xs">
                    <PenTool size={16} />
                  </div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    Bản dịch tiếng Anh của bạn
                  </h3>
                </div>

                {/* Word & Char counter */}
                <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  {textStats.words} từ • {textStats.chars} ký tự
                </div>
              </div>

              {/* Textarea with crystal glass translucency */}
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={userTranslation}
                  onChange={(e) => setUserTranslation(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isEvaluating}
                  rows={4}
                  placeholder="Nhập câu dịch tiếng Anh của bạn tại đây... (Nhấn Ctrl + Enter để kiểm tra)"
                  className="w-full rounded-2xl p-4 text-base sm:text-lg font-semibold leading-relaxed bg-white/40 dark:bg-slate-900/50 backdrop-blur-xl border border-white/60 dark:border-white/10 text-slate-950 dark:text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 dark:focus:border-cyan-400 shadow-[inset_0_1.5px_2px_rgba(0,0,0,0.03)] resize-none transition-all"
                />
              </div>

              {/* Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hidden sm:flex">
                  <span className="px-1.5 py-0.5 rounded bg-white/60 dark:bg-slate-800/80 border border-white/60 dark:border-white/10 font-mono text-[10px] shadow-2xs">
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
                      className="px-3.5 py-2.5 rounded-xl text-xs font-black text-slate-700 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
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
                        : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-blue-500/25 hover:shadow-lg hover:opacity-95 active:scale-95'
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

            {/* 2. KẾT QUẢ & GÓP Ý AI (LIQUID GLASS FEEDBACK STUDIO) */}
            <div className="rounded-[2rem] p-6 sm:p-7 backdrop-blur-2xl bg-white/35 dark:bg-slate-950/45 border border-white/55 dark:border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.06),_inset_0_1.5px_2px_rgba(255,255,255,0.85)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.6),_inset_0_1px_2px_rgba(255,255,255,0.2)] min-h-[260px] flex flex-col justify-between">
              
              {feedback ? (
                /* Có kết quả Feedback */
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-5 flex-1 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    
                    {/* Score & Accuracy Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-white/40 dark:border-white/10">
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
                          className="p-2 rounded-xl bg-white/45 hover:bg-white/70 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-cyan-400 border border-white/60 dark:border-white/15 backdrop-blur-md shadow-xs"
                          title="Nghe phát âm bản dịch gợi ý (Tiếng Anh)"
                        >
                          <Volume2 size={16} />
                        </button>
                      )}
                    </div>

                    {/* Reference / Suggested Translation */}
                    {feedback.suggestion && (
                      <div className="p-4 rounded-2xl bg-blue-500/15 dark:bg-slate-900/60 border border-blue-500/25 dark:border-slate-700/60 backdrop-blur-md space-y-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)]">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider text-blue-700 dark:text-cyan-300">
                            Bản dịch chuẩn gợi ý:
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(feedback.suggestion)}
                            className="text-xs font-bold text-blue-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
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

                    {/* AI Feedback Analysis */}
                    {feedback.feedback && (
                      <div className="p-4 rounded-2xl bg-white/35 dark:bg-slate-900/40 border border-white/45 dark:border-white/10 backdrop-blur-md space-y-1">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                          Nhận xét chi tiết từ AI:
                        </span>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                          {feedback.feedback}
                        </p>
                      </div>
                    )}

                  </div>

                  {/* Feedback Action Buttons */}
                  <div className="pt-4 mt-4 border-t border-white/40 dark:border-white/10 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-4 py-2 rounded-xl text-xs font-black bg-white/45 hover:bg-white/70 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-white/60 dark:border-white/10 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <RotateCcw size={14} />
                      <span>Viết lại</span>
                    </button>

                    {feedback.accuracy >= 80 && (
                      currentSentenceIndex < sentences.length - 1 ? (
                        <button
                          type="button"
                          onClick={handleNextSentence}
                          className="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white hover:opacity-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/25 active:scale-95"
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
                /* Chưa có Feedback: Hiển thị Thẻ Mẹo AI thông minh với kính lỏng */
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
                      <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-white/50 dark:border-white/10 backdrop-blur-md shadow-2xs">
                        <span className="text-blue-600 dark:text-cyan-400 font-black">1.</span>
                        <p>
                          <strong>Xác định đúng chủ ngữ & thì</strong>: Câu văn mang tính quy trình thường sử dụng thì hiện tại đơn hoặc thể bị động (Passive Voice).
                        </p>
                      </div>

                      <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-white/50 dark:border-white/10 backdrop-blur-md shadow-2xs">
                        <span className="text-cyan-600 dark:text-cyan-400 font-black">2.</span>
                        <p>
                          <strong>Mục tiêu hoàn thành</strong>: Đạt độ chính xác từ <strong>80% trở lên</strong> để vượt qua câu này và tích lũy điểm kinh nghiệm EXP.
                        </p>
                      </div>

                      <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-white/50 dark:border-white/10 backdrop-blur-md shadow-2xs">
                        <span className="text-indigo-600 dark:text-cyan-400 font-black">3.</span>
                        <p>
                          <strong>Phím tắt nhanh</strong>: Nhấn <code>Ctrl + Enter</code> trên bàn phím để nộp bài kiểm tra tức thì.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/40 dark:border-white/10 flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <Sparkles size={14} className="text-blue-500" />
                    <span>AI sẽ phân tích câu của bạn ngay sau khi bấm Kiểm tra.</span>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      </main>

    </div>
  );
}
