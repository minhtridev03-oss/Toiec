import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Highlighter,
  Volume2,
  VolumeX,
  Clock,
  Flag,
  Check,
  BookOpen,
  Mail,
  FileText,
  Newspaper,
  Sparkles,
  Trophy,
  HelpCircle,
  Zap,
  Award,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { explainReadingMistakes } from '../lib/gemini';
import { praiseLearningBot } from '../lib/learningBot';
import { usePracticeSessionTimer } from '../lib/practiceActivity';
import { readingLessonCache } from '../lib/lessonCache';
import { usePlatform } from '../hooks/usePlatform';
import { playWordAudio, stopWordAudio } from '../lib/audioService';

// Helper to detect genre & icon
const detectGenre = (title = '', content = '') => {
  const text = `${title} ${content}`.toLowerCase();
  if (text.includes('email') || text.includes('dear ') || text.includes('subject:') || text.includes('hi ') || text.includes('regards')) {
    return { name: 'Email / Thư từ', icon: Mail, color: 'text-sky-500 bg-sky-500/10 border-sky-500/20' };
  }
  if (text.includes('memo') || text.includes('memorandum') || text.includes('notice') || text.includes('policy') || text.includes('announcement')) {
    return { name: 'Thông báo / Memo', icon: FileText, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' };
  }
  if (text.includes('article') || text.includes('report') || text.includes('survey') || text.includes('study') || text.includes('news')) {
    return { name: 'Bài báo / Báo cáo', icon: Newspaper, color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20' };
  }
  return { name: 'Đoạn văn đọc hiểu', icon: BookOpen, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' };
};

// Helper to split letter & text from option
const parseOption = (opt, index) => {
  if (!opt) return { letter: String.fromCharCode(65 + index), text: '' };
  const match = opt.match(/^([A-Da-d])[\.\)]\s*(.*)$/);
  if (match) {
    return {
      letter: match[1].toUpperCase(),
      text: match[2]
    };
  }
  return {
    letter: String.fromCharCode(65 + index),
    text: opt
  };
};

export default function ReadingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isNative, isMobile } = usePlatform();
  const cachedData = readingLessonCache.get(id);

  const [lesson, setLesson] = useState(() => cachedData?.lesson || null);
  const [questions, setQuestions] = useState(() => cachedData?.questions || []);
  const [loading, setLoading] = useState(() => !cachedData);
  const [answers, setAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [allCorrect, setAllCorrect] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState({});
  const [showPassagePeek, setShowPassagePeek] = useState(false);

  // Question Tab Carousel State: 0-indexed, default to 0 (Question 1)
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  // Reading Studio Controls
  const [highlight, setHighlight] = useState(false);
  const [highlightColor, setHighlightColor] = useState('yellow'); // 'yellow' | 'green'
  const [fontSize, setFontSize] = useState('base'); // 'sm' | 'base' | 'lg'
  const [readingTheme, setReadingTheme] = useState('default'); // 'default' | 'sepia' | 'focus'
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [mobileTab, setMobileTab] = useState('passage'); // 'passage' | 'questions'

  // AI Explanations
  const [explanations, setExplanations] = useState({});
  const [isEvaluatingAI, setIsEvaluatingAI] = useState(false);
  const [explanationError, setExplanationError] = useState('');

  // Practice session timer for leaderboard
  usePracticeSessionTimer('reading', user, Boolean(lesson && questions.length > 0 && !isEvaluatingAI));

  // Reset states when ID changes
  useEffect(() => {
    setIsSubmitted(false);
    setAnswers({});
    setFlaggedQuestions({});
    setExplanations({});
    setExplanationError('');
    setAllCorrect(false);
    setElapsedSeconds(0);
    setActiveQuestionIndex(0);
    setIsSpeaking(false);
    stopWordAudio();
    fetchLesson();
  }, [id]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopWordAudio();
    };
  }, []);

  // Timer: count seconds until submitted
  useEffect(() => {
    let interval;
    if (!isSubmitted && !loading && lesson) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSubmitted, loading, lesson]);

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const fetchLesson = async () => {
    try {
      if (!readingLessonCache.has(id)) {
        setLoading(true);
      }

      const [lessonRes, questionsRes] = await Promise.all([
        supabase
          .from('reading_lessons')
          .select('id, title, content, level')
          .eq('id', id)
          .single(),
        supabase
          .from('reading_questions')
          .select('id, lesson_id, question, options, correct_answer, explanation')
          .eq('lesson_id', id)
          .order('created_at', { ascending: true }),
      ]);

      if (lessonRes.error) throw lessonRes.error;
      if (questionsRes.error) throw questionsRes.error;

      const lessonData = lessonRes.data;
      const questionsData = questionsRes.data || [];

      readingLessonCache.set(id, {
        lesson: lessonData,
        questions: questionsData,
      });

      setLesson(lessonData);
      setQuestions(questionsData);
    } catch (error) {
      console.error('Error fetching reading details:', error.message);
      if (!lesson) navigate('/reading');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId, option) => {
    if (isSubmitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const toggleFlag = (questionId, e) => {
    if (e) e.stopPropagation();
    setFlaggedQuestions(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const switchQuestion = (index) => {
    setActiveQuestionIndex(index);
    if (mobileTab === 'passage') {
      setMobileTab('questions');
    }
  };

  // Text-To-Speech with audioService
  const toggleSpeech = () => {
    if (isSpeaking) {
      stopWordAudio();
      setIsSpeaking(false);
    } else {
      const cleanText = lesson?.content?.replace(/\n/g, ' ') || '';
      setIsSpeaking(true);
      playWordAudio(cleanText, 'en', () => setIsSpeaking(false));
    }
  };

  // Highlighting logic
  const handleMouseUp = () => {
    if (!highlight) return;
    const selection = window.getSelection();
    if (!selection.rangeCount || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);

    const container = document.getElementById('reading-container');
    if (!container || !container.contains(range.commonAncestorContainer)) return;

    const span = document.createElement('span');
    const colorClass = highlightColor === 'yellow'
      ? 'bg-amber-300/80 dark:bg-amber-400/40 text-amber-950 dark:text-amber-100 border-b-2 border-amber-400'
      : 'bg-emerald-300/80 dark:bg-emerald-400/40 text-emerald-950 dark:text-emerald-100 border-b-2 border-emerald-400';

    span.className = `${colorClass} rounded px-1 cursor-pointer font-medium transition-colors`;
    span.title = 'Nhấp vào để xóa đánh dấu';

    try {
      span.appendChild(range.extractContents());
      range.insertNode(span);
      selection.removeAllRanges();
    } catch (err) {
      console.error('Highlight error:', err);
    }
  };

  const handleMouseClick = (e) => {
    if (!highlight) return;
    if (e.target.tagName === 'SPAN' && (e.target.className.includes('bg-amber') || e.target.className.includes('bg-emerald'))) {
      const parent = e.target.parentNode;
      while (e.target.firstChild) {
        parent.insertBefore(e.target.firstChild, e.target);
      }
      parent.removeChild(e.target);
      parent.normalize();
    }
  };

  // Submit test
  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      const unansweredIdx = questions.findIndex(q => !answers[q.id]);
      if (unansweredIdx !== -1) {
        setActiveQuestionIndex(unansweredIdx);
        if (mobileTab === 'passage') setMobileTab('questions');
      }
      alert(`Bạn còn ${questions.length - Object.keys(answers).length} câu hỏi chưa trả lời. Vui lòng hoàn thành tất cả các câu trước khi nộp bài.`);
      return;
    }

    if (isSpeaking) {
      stopWordAudio();
      setIsSpeaking(false);
    }

    setIsSubmitted(true);

    const incorrectQs = questions.filter(q => answers[q.id] !== q.correct_answer);
    if (incorrectQs.length === 0) {
      setAllCorrect(true);
      praiseLearningBot('Chính xác toàn bộ! Bạn làm Reading rất tốt, tuyệt vời lắm ✨');
      if (user) {
        supabase
          .from('user_reading_progress')
          .upsert({ user_id: user.id, lesson_id: id }, { onConflict: 'user_id, lesson_id' })
          .then(({ error }) => {
            if (error) console.error("Lưu tiến độ đọc lỗi:", error);
          });
      }
    } else {
      setAllCorrect(false);
      setExplanationError('');
      const availableExplanations = {};
      const questionsNeedingExplanation = [];

      incorrectQs.forEach((q) => {
        if (typeof q.explanation === 'string' && q.explanation.trim()) {
          availableExplanations[q.id] = q.explanation.trim();
          return;
        }

        questionsNeedingExplanation.push({
          id: q.id,
          question: q.question,
          options: q.options,
          correctAnswer: q.correct_answer,
          userAnswer: answers[q.id]
        });
      });

      setExplanations(availableExplanations);

      if (questionsNeedingExplanation.length === 0) return;

      setIsEvaluatingAI(true);
      try {
        const result = await explainReadingMistakes(
          lesson.content,
          questionsNeedingExplanation
        );
        const items = Array.isArray(result)
          ? result
          : Array.isArray(result?.explanations)
            ? result.explanations
            : result?.id != null
              ? [result]
              : Object.entries(result || {}).map(([questionId, explanation]) => ({
                  id: questionId,
                  explanation
                }));
        const aiExplanations = {};

        items.forEach((item) => {
          if (item?.id != null && typeof item.explanation === 'string' && item.explanation.trim()) {
            aiExplanations[item.id] = item.explanation.trim();
          }
        });

        setExplanations(prev => ({ ...prev, ...aiExplanations }));
        if (Object.keys(aiExplanations).length < questionsNeedingExplanation.length) {
          setExplanationError('Một số lời giải thích chưa tải được. Vui lòng làm lại để thử lại.');
        }
      } catch (err) {
        console.error("Lỗi khi gọi AI giải thích:", err);
        setExplanationError('Không thể tải lời giải thích lúc này. Vui lòng làm lại để thử lại.');
      } finally {
        setIsEvaluatingAI(false);
      }
    }
  };

  const handleRetry = () => {
    setIsSubmitted(false);
    setAnswers({});
    setFlaggedQuestions({});
    setExplanations({});
    setExplanationError('');
    setAllCorrect(false);
    setElapsedSeconds(0);
    setActiveQuestionIndex(0);
  };

  const handleNextLesson = async () => {
    try {
      const { data, error } = await supabase
        .from('reading_lessons')
        .select('id')
        .eq('level', lesson.level)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true });
      if (data && data.length > 0) {
        const currentIndex = data.findIndex(d => d.id === lesson.id);
        if (currentIndex !== -1 && currentIndex < data.length - 1) {
          navigate(`/reading/${data[currentIndex + 1].id}`);
          return;
        }
      }
      navigate('/reading');
    } catch (error) {
      console.error(error);
      navigate('/reading');
    }
  };

  // Metadata calculations
  const genreInfo = useMemo(() => detectGenre(lesson?.title, lesson?.content), [lesson?.title, lesson?.content]);
  const wordCount = useMemo(() => lesson?.content?.split(/\s+/).filter(Boolean).length || 0, [lesson?.content]);
  const answeredCount = Object.keys(answers).length;
  const correctCount = isSubmitted ? questions.filter(q => answers[q.id] === q.correct_answer).length : 0;
  const GenreIcon = genreInfo.icon;

  // Currently active question object
  const activeQuestion = questions[activeQuestionIndex] || questions[0];

  // Reading Theme classes
  const themeStyles = {
    default: {
      card: 'bg-white/95 dark:bg-slate-900/95 border-white/60 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-2xl backdrop-blur-2xl',
      toolbar: 'bg-slate-100/90 dark:bg-slate-800/90 border-slate-200 dark:border-slate-700/80',
    },
    sepia: {
      card: 'bg-[#fcf5e5] dark:bg-[#231b12] border-[#e8dac0] dark:border-[#3d2e1e] text-[#423220] dark:text-[#ede0ce] shadow-2xl font-serif',
      toolbar: 'bg-[#f4ebd6] dark:bg-[#2f2418] border-[#dfcfb2] dark:border-[#4a3a28]',
    },
    focus: {
      card: 'bg-slate-950 dark:bg-black border-slate-800 text-slate-100 shadow-2xl font-sans',
      toolbar: 'bg-slate-900 border-slate-800',
    }
  };

  const fontClass = fontSize === 'sm'
    ? 'text-base sm:text-lg leading-relaxed'
    : fontSize === 'lg'
      ? 'text-xl sm:text-2xl leading-loose'
      : 'text-lg sm:text-xl leading-relaxed sm:leading-loose';

  if (loading || !lesson) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3 p-8 rounded-3xl bg-white/60 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/40 dark:border-slate-800 shadow-2xl text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Đang tải bài đọc hiểu & câu hỏi...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 flex flex-col bg-transparent text-slate-800 dark:text-white h-full lg:overflow-hidden overflow-auto p-2 sm:p-4 lg:p-5 max-w-7xl mx-auto w-full gap-2.5 sm:gap-4"
      style={{
        paddingTop: isNative ? 'max(env(safe-area-inset-top, 0px), 52px)' : 'max(env(safe-area-inset-top, 0px), 10px)',
      }}
    >
      {/* 1. TOP STUDIO NAVIGATION DOCK (Compact Glass Bar) */}
      <header className="relative z-30 flex items-center justify-between gap-2 sm:gap-3 p-2 sm:px-4 py-2 sm:py-2.5 rounded-2xl sm:rounded-3xl backdrop-blur-2xl bg-white/90 dark:bg-slate-900/90 border border-white/50 dark:border-slate-800 shadow-xl shadow-black/5 shrink-0 transition-colors w-full">
        {/* Left: Back + Genre + Title */}
        <div className="flex items-center min-w-0 pr-1 gap-2 sm:gap-3">
          <button
            onClick={() => navigate('/reading')}
            className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-xl sm:rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 hover:bg-white dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-cyan-400 transition-all cursor-pointer shadow-xs active:scale-95"
            title="Quay lại danh sách bài đọc"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1 sm:gap-1.5 mb-0.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold border whitespace-nowrap shrink-0 ${genreInfo.color}`}>
                <GenreIcon size={11} />
                <span>{genreInfo.name}</span>
                <span className="opacity-30">•</span>
                <span className="uppercase">{lesson.level || 'TOEIC'}</span>
              </span>
            </div>
            <h1 className="text-xs sm:text-sm lg:text-base font-extrabold text-slate-900 dark:text-white leading-tight truncate">
              {lesson.title}
            </h1>
          </div>
        </div>

        {/* Center / Timer: Live Stopwatch visible on mobile & desktop */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs font-extrabold text-slate-700 dark:text-slate-200 shadow-2xs">
            <Clock size={13} className={isSubmitted ? "text-slate-400" : "text-indigo-600 dark:text-cyan-400 animate-pulse"} />
            <span className="font-mono text-[11px] sm:text-xs tracking-wider">{formatTimer(elapsedSeconds)}</span>
          </div>

          {/* Desktop Question Quick Tabs */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-100/60 dark:bg-slate-800/60 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
            {questions.map((q, idx) => {
              const isActive = activeQuestionIndex === idx;
              const isAnswered = Boolean(answers[q.id]);
              const isFlagged = Boolean(flaggedQuestions[q.id]);
              const isCorrect = isSubmitted && answers[q.id] === q.correct_answer;
              const isWrong = isSubmitted && isAnswered && !isCorrect;

              let pillClass = "w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-black text-xs flex items-center justify-center transition-all cursor-pointer relative ";

              if (isActive) {
                pillClass += "bg-gradient-to-tr from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/30 scale-105 ring-2 ring-indigo-400/50 ";
              } else if (!isSubmitted) {
                if (isAnswered) {
                  pillClass += "bg-indigo-600/80 text-white shadow-xs ";
                } else {
                  pillClass += "bg-white/80 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 ";
                }
              } else {
                if (isCorrect) {
                  pillClass += "bg-emerald-600 text-white shadow-xs ";
                } else if (isWrong) {
                  pillClass += "bg-rose-600 text-white shadow-xs ";
                } else {
                  pillClass += "bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-400 ";
                }
              }

              return (
                <button
                  key={q.id}
                  onClick={() => switchQuestion(idx)}
                  className={pillClass}
                  title={`Chuyển tới Câu ${idx + 1}${isFlagged ? ' (Đã gắn cờ)' : ''}`}
                >
                  {isSubmitted ? (
                    isCorrect ? <Check size={14} strokeWidth={3} /> : idx + 1
                  ) : (
                    idx + 1
                  )}
                  {isFlagged && !isSubmitted && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: Submit or Next actions */}
          {!isSubmitted ? (
            <button
              onClick={handleSubmit}
              className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white font-extrabold px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl hover:shadow-lg shadow-md shadow-indigo-500/25 transition-all text-xs sm:text-sm cursor-pointer active:scale-95 flex items-center gap-1.5"
            >
              <span>Nộp bài</span>
              <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] sm:text-[11px] font-mono">
                {answeredCount}/{questions.length}
              </span>
            </button>
          ) : (
            <button
              onClick={handleNextLesson}
              className="px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-xl transition-all flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white hover:shadow-lg cursor-pointer shadow-md shadow-indigo-500/25 text-xs sm:text-sm font-black active:scale-95"
            >
              <span>Tiếp theo</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </header>

      {/* 2. MOBILE RESPONSIVE TABS (Visible only on < lg screens) */}
      <div className="lg:hidden p-1 rounded-2xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-white/40 dark:border-slate-800 shadow-md shrink-0">
        <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl w-full">
          <button
            onClick={() => setMobileTab('passage')}
            className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mobileTab === 'passage'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-cyan-300 shadow-xs'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <BookOpen size={14} />
            <span>Bài đọc ({wordCount} từ)</span>
          </button>
          <button
            onClick={() => setMobileTab('questions')}
            className={`py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              mobileTab === 'questions'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-cyan-300 shadow-xs'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <CheckCircle2 size={14} />
            <span>Câu hỏi ({answeredCount}/{questions.length})</span>
          </button>
        </div>
      </div>

      {/* 3. MAIN SPLIT PANE WORKSPACE */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row lg:overflow-hidden overflow-visible w-full gap-4 sm:gap-5">
        
        {/* ================= LEFT COLUMN: E-READER PASSAGE SHEET ================= */}
        <section
          className={`w-full lg:w-[52%] flex flex-col h-full lg:overflow-hidden overflow-visible transition-all duration-300 ${
            mobileTab === 'questions' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className={`flex-1 flex flex-col rounded-3xl border transition-all duration-300 overflow-hidden ${themeStyles[readingTheme].card}`}>
            
            {/* Reading Toolbar */}
            <div className={`px-4 sm:px-6 py-3 border-b flex flex-wrap items-center justify-between gap-2.5 transition-colors ${themeStyles[readingTheme].toolbar}`}>
              
              {/* Audio Listen & Meta */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSpeech}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border active:scale-95 ${
                    isSpeaking
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/30'
                      : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700'
                  }`}
                  title="Nghe giọng phát âm tiếng Anh bản ngữ toàn bài đọc"
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX size={15} />
                      <span>Dừng đọc</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping ml-1" />
                    </>
                  ) : (
                    <>
                      <Volume2 size={15} className="text-indigo-600 dark:text-cyan-400" />
                      <span>Nghe đọc bài</span>
                    </>
                  )}
                </button>

                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hidden sm:inline-block">
                  ~{Math.max(1, Math.round(wordCount / 130))} phút đọc • {wordCount} từ
                </span>
              </div>

              {/* Reader Controls: Font Size, Theme, Highlight */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                
                {/* Font Size Selector */}
                <div className="flex items-center bg-white/70 dark:bg-slate-800/80 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
                  <button
                    onClick={() => setFontSize('sm')}
                    className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${fontSize === 'sm' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
                    title="Cỡ chữ nhỏ"
                  >
                    A-
                  </button>
                  <button
                    onClick={() => setFontSize('base')}
                    className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${fontSize === 'base' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
                    title="Cỡ chữ chuẩn"
                  >
                    A
                  </button>
                  <button
                    onClick={() => setFontSize('lg')}
                    className={`px-2 py-1 rounded-lg font-bold transition-all cursor-pointer ${fontSize === 'lg' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
                    title="Cỡ chữ lớn"
                  >
                    A+
                  </button>
                </div>

                {/* Theme Selector */}
                <div className="flex items-center bg-white/70 dark:bg-slate-800/80 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
                  <button
                    onClick={() => setReadingTheme('default')}
                    className={`w-6 h-6 rounded-lg font-bold flex items-center justify-center transition-all cursor-pointer ${readingTheme === 'default' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 dark:text-slate-400'}`}
                    title="Chế độ Mặc định (Sạch sẽ)"
                  >
                    S
                  </button>
                  <button
                    onClick={() => setReadingTheme('sepia')}
                    className={`w-6 h-6 rounded-lg font-bold flex items-center justify-center transition-all cursor-pointer ${readingTheme === 'sepia' ? 'bg-[#c59a58] text-white shadow-2xs' : 'text-amber-800 dark:text-amber-400'}`}
                    title="Chế độ Giấy ấm Sepia (Chống mỏi mắt)"
                  >
                    G
                  </button>
                  <button
                    onClick={() => setReadingTheme('focus')}
                    className={`w-6 h-6 rounded-lg font-bold flex items-center justify-center transition-all cursor-pointer ${readingTheme === 'focus' ? 'bg-slate-950 text-white ring-1 ring-slate-600 shadow-2xs' : 'text-slate-600 dark:text-slate-400'}`}
                    title="Chế độ Đen tuyền Focus"
                  >
                    T
                  </button>
                </div>

                {/* Highlight Toggle */}
                <div className="flex items-center bg-white/70 dark:bg-slate-800/80 rounded-xl p-1 border border-slate-200 dark:border-slate-700 gap-1">
                  <button
                    onClick={() => setHighlight(!highlight)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      highlight
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                    }`}
                    title={highlight ? 'Đang bật Highlight: Bôi đen chữ để đánh dấu' : 'Nhấp để bật tính năng Highlight'}
                  >
                    <Highlighter size={13} />
                    <span className="hidden sm:inline">Bút nhớ</span>
                  </button>

                  {highlight && (
                    <div className="flex items-center gap-1 pl-1 border-l border-slate-300 dark:border-slate-700">
                      <button
                        onClick={() => setHighlightColor('yellow')}
                        className={`w-4 h-4 rounded-full bg-amber-400 border transition-transform ${highlightColor === 'yellow' ? 'scale-125 border-slate-900 shadow-2xs' : 'border-transparent opacity-60'}`}
                        title="Màu vàng"
                      />
                      <button
                        onClick={() => setHighlightColor('green')}
                        className={`w-4 h-4 rounded-full bg-emerald-400 border transition-transform ${highlightColor === 'green' ? 'scale-125 border-slate-900 shadow-2xs' : 'border-transparent opacity-60'}`}
                        title="Màu xanh lục"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Reading Passage Body */}
            <div
              id="reading-container"
              onMouseUp={handleMouseUp}
              onClick={handleMouseClick}
              className={`flex-1 p-6 sm:p-8 lg:p-10 overflow-y-auto ${fontClass} whitespace-pre-wrap transition-colors select-text ${
                highlight ? 'cursor-text' : ''
              }`}
            >
              {lesson.content?.replace(/\\n/g, '\n')}
            </div>

            {/* Reading Footer Tip */}
            <div className={`px-4 sm:px-6 py-2.5 border-t text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center justify-between ${themeStyles[readingTheme].toolbar}`}>
              <span>Mẹo: Bạn có thể bật <strong>Bút nhớ</strong> và bôi đen để ghim các câu chứa bằng chứng đáp án.</span>
              <span className="hidden sm:inline font-mono">TOEIC Practice Mode</span>
            </div>
          </div>
        </section>

        {/* ================= RIGHT COLUMN: SINGLE-FRAME STACKED QUESTION CONSOLE ================= */}
        <section
          className={`w-full lg:w-[48%] flex flex-col h-full lg:overflow-y-auto overflow-visible space-y-4 transition-all duration-300 pr-0.5 ${
            mobileTab === 'passage' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Post-submission Result Banner (if submitted) */}
          {isSubmitted && (
            <div className={`p-3 sm:p-4 rounded-2xl sm:rounded-3xl border shadow-lg flex items-center justify-between gap-3 ${
              allCorrect
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200'
            }`}>
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-white shrink-0 ${allCorrect ? 'bg-emerald-600 shadow-emerald-500/30' : 'bg-amber-600 shadow-amber-500/30'}`}>
                  {allCorrect ? <Trophy size={16} /> : <Award size={16} />}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-extrabold truncate">
                    {allCorrect ? '🎉 Xuất sắc! Bạn đúng 100%' : `Kết quả: Đúng ${correctCount}/${questions.length} câu`}
                  </h4>
                  <p className="text-[11px] sm:text-xs opacity-80 truncate">
                    Thời gian: <strong className="font-mono">{formatTimer(elapsedSeconds)}</strong> • Bấm chọn từng câu để xem lại
                  </p>
                </div>
              </div>

              <button
                onClick={handleRetry}
                disabled={isEvaluatingAI}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer shrink-0 active:scale-95 flex items-center gap-1 text-slate-800 dark:text-slate-200"
              >
                <RotateCcw size={12} />
                <span>Làm lại</span>
              </button>
            </div>
          )}

          {/* SINGLE QUESTION FRAME (HỘP DUY NHẤT CHỨA CÂU HỎI ĐƯỢC CHỌN) */}
          {activeQuestion && (
            <div className="flex-1 flex flex-col justify-between rounded-3xl p-4 sm:p-6 md:p-7 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/50 dark:border-slate-800 shadow-2xl transition-all duration-300">
              
              <div>
                {/* 1. MINI QUESTION SELECTOR TABS ON TOP (Câu 1, Câu 2, Câu 3...) */}
                <div className="flex items-center justify-between pb-3 sm:pb-4 mb-4 sm:mb-5 border-b border-slate-200/80 dark:border-slate-800 gap-2">
                  <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 min-w-0">
                    {questions.map((q, idx) => {
                      const isCurrent = activeQuestionIndex === idx;
                      const isAnswered = Boolean(answers[q.id]);
                      const isFlagged = Boolean(flaggedQuestions[q.id]);
                      const isCorrect = isSubmitted && answers[q.id] === q.correct_answer;
                      const isWrong = isSubmitted && isAnswered && !isCorrect;

                      let tabClass = "relative px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1 shrink-0 active:scale-95 ";

                      if (isCurrent) {
                        tabClass += "bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-500/30 scale-105 ";
                      } else if (isSubmitted) {
                        if (isCorrect) {
                          tabClass += "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 ";
                        } else if (isWrong) {
                          tabClass += "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 ";
                        } else {
                          tabClass += "bg-slate-100 dark:bg-slate-800 text-slate-400 ";
                        }
                      } else if (isAnswered) {
                        tabClass += "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-cyan-300 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100/60 ";
                      } else {
                        tabClass += "bg-white/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-slate-600 ";
                      }

                      return (
                        <button
                          key={q.id}
                          onClick={() => switchQuestion(idx)}
                          className={tabClass}
                          title={`Xem Câu ${idx + 1}`}
                        >
                          <span>Câu {idx + 1}</span>
                          
                          {/* Flag dot */}
                          {isFlagged && !isSubmitted && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          )}
                          
                          {/* Answered dot if not currently selected */}
                          {isAnswered && !isCurrent && !isSubmitted && (
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          )}

                          {/* Submission icon */}
                          {isSubmitted && isCorrect && (
                            <Check size={12} strokeWidth={3} className={isCurrent ? "text-white" : "text-emerald-500"} />
                          )}
                          {isSubmitted && isWrong && (
                            <XCircle size={12} className={isCurrent ? "text-white" : "text-rose-500"} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Actions on question header: Quick Peek Passage + Flag */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Quick Peek Button on Mobile */}
                    <button
                      onClick={() => setShowPassagePeek(true)}
                      className="lg:hidden flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-cyan-400 border border-indigo-500/20 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                      title="Xem bài đọc tra cứu"
                    >
                      <BookOpen size={13} />
                      <span className="text-[11px] sm:text-xs">Bài đọc</span>
                    </button>

                    {/* Flag button */}
                    <button
                      onClick={(e) => toggleFlag(activeQuestion.id, e)}
                      className={`p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-bold border ${
                        flaggedQuestions[activeQuestion.id]
                          ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 shadow-xs'
                          : 'bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                      }`}
                      title={flaggedQuestions[activeQuestion.id] ? 'Bỏ gắn cờ xem lại' : 'Gắn cờ để xem lại sau'}
                    >
                      <Flag size={13} fill={flaggedQuestions[activeQuestion.id] ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                </div>

                {/* 2. QUESTION TITLE */}
                <div className="flex items-start gap-3 sm:gap-4 mb-5">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex shrink-0 items-center justify-center font-black text-sm text-white shadow-md transition-transform ${
                      isSubmitted
                        ? (answers[activeQuestion.id] === activeQuestion.correct_answer ? 'bg-emerald-600 shadow-emerald-500/25' : 'bg-rose-600 shadow-rose-500/25')
                        : 'bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-600 shadow-indigo-500/25'
                    }`}
                  >
                    {activeQuestionIndex + 1}
                  </div>

                  <div className="flex-1 min-w-0 pt-1">
                    <h4 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white leading-snug">
                      {activeQuestion.question}
                    </h4>
                  </div>
                </div>

                {/* 3. OPTIONS LIST (A, B, C, D) */}
                <div className="space-y-3">
                  {activeQuestion.options.map((opt, oIdx) => {
                    const { letter, text } = parseOption(opt, oIdx);
                    const selected = answers[activeQuestion.id];
                    const isOptSelected = selected === opt;
                    const isOptCorrect = isSubmitted && opt === activeQuestion.correct_answer;

                    let containerClass = "flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ";
                    let keyClass = "w-8 h-8 sm:w-9 sm:h-9 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center shrink-0 transition-all ";

                    if (!isSubmitted) {
                      if (isOptSelected) {
                        containerClass += "border-indigo-500/90 bg-indigo-50/90 dark:bg-indigo-950/50 text-indigo-950 dark:text-cyan-200 font-bold shadow-md shadow-indigo-500/10 scale-[1.01]";
                        keyClass += "bg-indigo-600 text-white shadow-xs scale-105";
                      } else {
                        containerClass += "border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200";
                        keyClass += "bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600";
                      }
                    } else {
                      if (isOptCorrect) {
                        containerClass += "border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-200 font-bold shadow-md shadow-emerald-500/10";
                        keyClass += "bg-emerald-600 text-white shadow-xs";
                      } else if (isOptSelected && !isOptCorrect) {
                        containerClass += "border-rose-500 bg-rose-50/90 dark:bg-rose-950/50 text-rose-950 dark:text-rose-200 font-semibold shadow-md shadow-rose-500/10";
                        keyClass += "bg-rose-600 text-white shadow-xs";
                      } else {
                        containerClass += "border-transparent opacity-40 text-slate-500";
                        keyClass += "bg-slate-200 dark:bg-slate-800 text-slate-400";
                      }
                    }

                    return (
                      <div
                        key={oIdx}
                        onClick={() => handleSelectOption(activeQuestion.id, opt)}
                        className={containerClass}
                      >
                        <div className={keyClass}>
                          {letter}
                        </div>

                        <span className="text-sm sm:text-base leading-relaxed flex-1 font-medium">
                          {text}
                        </span>

                        {isSubmitted && isOptCorrect && (
                          <CheckCircle2 size={18} className="text-emerald-600 ml-auto shrink-0" />
                        )}
                        {isSubmitted && isOptSelected && !isOptCorrect && (
                          <XCircle size={18} className="text-rose-600 ml-auto shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* 4. AI EXPLANATION (Hiện nếu đã nộp bài và câu này sai) */}
                {isSubmitted && answers[activeQuestion.id] && answers[activeQuestion.id] !== activeQuestion.correct_answer && (
                  <div className="mt-5 p-4 sm:p-5 bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/30 rounded-2xl relative overflow-hidden transition-all">
                    {isEvaluatingAI && !explanations[activeQuestion.id] ? (
                      <div className="flex items-center gap-2.5 text-amber-700 dark:text-amber-300 font-bold text-xs sm:text-sm">
                        <div className="w-4 h-4 border-2 border-amber-600 dark:border-amber-400 border-t-transparent rounded-full animate-spin" />
                        AI đang phân tích ngữ cảnh bài đọc và nguyên nhân đáp án...
                      </div>
                    ) : explanations[activeQuestion.id] ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 font-black text-amber-700 dark:text-amber-300 text-xs uppercase tracking-wider">
                          <Sparkles size={14} />
                          <span>Giải thích chi tiết từ AI cho Câu {activeQuestionIndex + 1}</span>
                        </div>
                        <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-medium text-xs sm:text-sm">
                          {explanations[activeQuestion.id]}
                        </p>
                      </div>
                    ) : explanationError ? (
                      <p className="text-amber-700 dark:text-amber-300 font-semibold text-xs">
                        {explanationError}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>

              {/* 5. CARD FOOTER: CÂU TRƯỚC / TIẾN ĐỘ / CÂU TIẾP HOẶC NỘP BÀI */}
              <div className="mt-6 pt-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                {/* Prev Button */}
                <button
                  onClick={() => switchQuestion(Math.max(0, activeQuestionIndex - 1))}
                  disabled={activeQuestionIndex === 0}
                  className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all active:scale-95 shadow-2xs"
                >
                  <ChevronLeft size={16} />
                  <span>Câu trước</span>
                </button>

                {/* Progress Indicator */}
                <div className="text-xs font-black text-slate-500 dark:text-slate-400 font-mono">
                  Câu {activeQuestionIndex + 1} / {questions.length}
                </div>

                {/* Next or Submit / Next Lesson Button */}
                {activeQuestionIndex < questions.length - 1 ? (
                  <button
                    onClick={() => switchQuestion(Math.min(questions.length - 1, activeQuestionIndex + 1))}
                    className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:shadow-md shadow-indigo-500/20 cursor-pointer transition-all active:scale-95"
                  >
                    <span>Câu tiếp</span>
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  !isSubmitted ? (
                    <button
                      onClick={handleSubmit}
                      className="px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white hover:shadow-lg shadow-indigo-500/25 cursor-pointer transition-all active:scale-95"
                    >
                      <span>Nộp bài & Kiểm tra</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleNextLesson}
                      className="px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white hover:shadow-lg shadow-indigo-500/25 cursor-pointer transition-all active:scale-95"
                    >
                      <span>Bài tiếp theo</span>
                      <ArrowRight size={15} />
                    </button>
                  )
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* 4. QUICK PEEK PASSAGE DRAWER (BOTTOM SHEET FOR MOBILE) */}
      <AnimatePresence>
        {showPassagePeek && (
          <div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 backdrop-blur-xs lg:hidden p-0"
            onClick={() => setShowPassagePeek(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-h-[82vh] h-[80vh] rounded-t-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t border-white/60 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Top Drag Indicator */}
              <div className="pt-3 pb-1 flex justify-center">
                <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              </div>

              {/* Sheet Header */}
              <div className="px-5 py-3 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/25">
                    <BookOpen size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                      Đoạn Văn Bài Đọc
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {lesson.title} • {wordCount} từ
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleSpeech}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      isSpeaking
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    <span>{isSpeaking ? 'Dừng' : 'Nghe'}</span>
                  </button>

                  <button
                    onClick={() => setShowPassagePeek(false)}
                    className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Sheet Passage Content */}
              <div className="flex-1 overflow-y-auto p-5 select-text">
                <div className={`prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 whitespace-pre-wrap ${fontClass}`}>
                  {lesson.content}
                </div>
              </div>

              {/* Sheet Footer */}
              <div className="p-3.5 border-t border-slate-200/60 dark:border-slate-800 text-center">
                <button
                  onClick={() => setShowPassagePeek(false)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold text-xs sm:text-sm hover:opacity-95 shadow-md shadow-indigo-500/25 transition-all cursor-pointer"
                >
                  Đã hiểu, quay lại chọn đáp án
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
