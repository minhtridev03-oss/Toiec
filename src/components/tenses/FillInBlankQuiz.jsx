import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  Award,
  Sparkles,
  RotateCcw,
  Volume2,
  Flame,
  Trophy,
  Target,
  Zap,
  Check,
  HelpCircle,
  RefreshCw,
  Lightbulb,
} from 'lucide-react';
import { normalizeAnswer } from '../../utils/normalize';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

export default function FillInBlankQuiz({
  exercises = [],
  level = 'basic',
  tenseId,
  completedExerciseIds = [],
  onComplete,
  onExerciseUpdate,
}) {
  const { user } = useAuth();

  // Mode: null (mặc định), 'all' (làm lại tất cả), 'wrong' (chỉ luyện lại câu sai)
  const [quizMode, setQuizMode] = useState(null);
  const [initialCompletedIds] = useState(completedExerciseIds);
  const [wrongExercises, setWrongExercises] = useState([]);

  // Danh sách câu hỏi đang làm
  const activeExercises = useMemo(() => {
    if (quizMode === 'wrong') {
      return wrongExercises;
    }
    if (quizMode === 'all') {
      return exercises;
    }
    // Lần đầu mount: lọc ra những câu chưa làm
    return exercises.filter((ex) => !initialCompletedIds.includes(ex.id));
  }, [quizMode, exercises, initialCompletedIds, wrongExercises]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValues, setInputValues] = useState([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(new Set(completedExerciseIds));

  const inputRef = useRef(null);

  const currentExercise = activeExercises[currentIndex];
  const totalQuestions = activeExercises.length;

  // Tự động focus vào ô trống đầu tiên khi chuyển câu
  useEffect(() => {
    if (!isSubmitted && !showSummary && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentIndex, isSubmitted, showSummary]);

  // Lưu tiến trình lên Supabase khi trả lời đúng
  const saveProgress = async (exerciseId) => {
    if (!user) return;
    try {
      await supabase
        .from('user_tense_exercises')
        .upsert({ user_id: user.id, exercise_id: exerciseId }, { onConflict: 'user_id,exercise_id' });
      setSessionCompleted((prev) => new Set([...prev, exerciseId]));
      if (onExerciseUpdate) {
        onExerciseUpdate(exerciseId);
      }
    } catch (err) {
      console.error('Error saving progress:', err);
    }
  };

  // Phát âm câu hỏi qua SpeechSynthesis
  const speakQuestion = (question, answer) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const textToRead = isSubmitted && answer
      ? question.replace(/\[blank\]/g, ` ${answer} `)
      : question.replace(/\[blank\]/g, ' ... ');
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'en-US';
    utterance.rate = 0.88;
    window.speechSynthesis.speak(utterance);
  };

  // Nộp bài và kiểm tra đáp án
  const handleSubmit = () => {
    if (isSubmitted || !currentExercise) return;

    const blanksCount = currentExercise.question.split('[blank]').length - 1;
    const finalValues = Array(blanksCount).fill('').map((_, i) => inputValues[i] || '');
    const combinedInput = finalValues.join(' ').trim();

    if (!combinedInput) return;

    const normalizedInput = normalizeAnswer(combinedInput);
    const normalizedTarget = normalizeAnswer(currentExercise.answer);

    const correct = normalizedInput === normalizedTarget;
    setIsCorrect(correct);

    if (correct) {
      setScore((prev) => prev + 1);
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      if (nextStreak > bestStreak) setBestStreak(nextStreak);
      saveProgress(currentExercise.id);
    } else {
      setStreak(0);
      setWrongExercises((prev) =>
        prev.some((e) => e.id === currentExercise.id) ? prev : [...prev, currentExercise]
      );
    }

    setIsSubmitted(true);
  };

  // Chuyển sang câu kế tiếp hoặc hiển thị tổng kết
  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
      setInputValues([]);
      setIsSubmitted(false);
      setIsCorrect(false);
    } else {
      setShowSummary(true);
      if (onComplete) {
        onComplete(score + (isCorrect ? 1 : 0), totalQuestions);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (isSubmitted) {
        handleNext();
      } else {
        handleSubmit();
      }
    }
  };

  // 1. MÀN HÌNH HOÀN THÀNH 100% (Khi vào bài mà đã làm hết các câu)
  if (activeExercises.length === 0 && !showSummary) {
    return (
      <div className="relative overflow-hidden rounded-3xl p-8 md:p-12 text-center backdrop-blur-2xl bg-white/50 dark:bg-slate-900/50 border border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.08)]">
        {/* Glow trang trí phía trên */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-br from-indigo-500/20 via-cyan-400/20 to-emerald-400/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Huy hiệu vinh danh 3D */}
        <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping"></div>
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-400 via-teal-500 to-cyan-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/30 transform hover:scale-105 transition-transform">
            <Trophy size={40} className="drop-shadow-md" />
          </div>
        </div>

        {/* Tiêu đề & Thông điệp */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-3">
          <Sparkles size={14} />
          <span>THÀNH TỰU XUẤT SẮC</span>
        </div>
        <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white mb-2">
          Tuyệt vời! Hoàn thành 100%
        </h3>
        <p className="text-slate-600 dark:text-slate-300 max-w-md mx-auto mb-8 text-sm md:text-base leading-relaxed">
          Bạn đã hoàn thành toàn bộ bài tập của phần này. Hãy làm lại để rèn luyện phản xạ chuẩn xác và ghi nhớ công thức lâu hơn!
        </p>

        {/* Mini Scoreboard */}
        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mb-8 p-3 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-white/60 dark:border-white/10 backdrop-blur-md">
          <div className="p-2 text-center">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Độ chính xác</div>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">100%</div>
          </div>
          <div className="p-2 text-center border-x border-slate-200 dark:border-slate-700/60">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tổng câu</div>
            <div className="text-lg font-black text-indigo-600 dark:text-cyan-400">{exercises.length} câu</div>
          </div>
          <div className="p-2 text-center">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cấp độ</div>
            <div className="text-lg font-black text-slate-800 dark:text-slate-100">
              {level === 'advanced' ? 'Nâng cao' : 'Cơ bản'}
            </div>
          </div>
        </div>

        {/* Nút hành động chính */}
        <button
          onClick={() => {
            setQuizMode('all');
            setCurrentIndex(0);
            setScore(0);
            setStreak(0);
            setInputValues([]);
            setIsSubmitted(false);
            setWrongExercises([]);
          }}
          className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:opacity-95 text-white font-bold py-3.5 px-8 rounded-2xl shadow-xl shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2 mx-auto"
        >
          <RotateCcw size={18} />
          <span>Làm lại từ đầu (Luyện phản xạ)</span>
        </button>
      </div>
    );
  }

  if (!currentExercise && !showSummary) {
    return (
      <div className="p-12 text-center rounded-3xl backdrop-blur-xl bg-white/40 dark:bg-slate-900/40 border border-white/20">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Đang chuẩn bị câu hỏi...</p>
      </div>
    );
  }

  // 2. MÀN HÌNH TỔNG KẾT SAU LƯỢT LÀM BÀI (Summary Screen)
  if (showSummary) {
    const finalScore = score;
    const percentage = Math.round((finalScore / totalQuestions) * 100);
    const passed = percentage >= 80;

    return (
      <div className="relative overflow-hidden rounded-3xl p-8 md:p-10 text-center backdrop-blur-2xl bg-white/50 dark:bg-slate-900/50 border border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.08)]">
        {/* Glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-br from-indigo-500/20 via-blue-500/15 to-emerald-400/20 rounded-full blur-3xl pointer-events-none"></div>

        {/* Badge Icon */}
        <div className="relative w-24 h-24 mx-auto mb-6 flex items-center justify-center">
          <div
            className={`w-20 h-20 rounded-3xl flex items-center justify-center text-white shadow-xl ${
              passed
                ? 'bg-gradient-to-tr from-emerald-400 via-teal-500 to-cyan-500 shadow-emerald-500/30'
                : 'bg-gradient-to-tr from-amber-400 to-orange-500 shadow-orange-500/30'
            }`}
          >
            {passed ? <Trophy size={40} /> : <Target size={40} />}
          </div>
        </div>

        <h3 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white mb-2">
          {passed ? 'Xuất sắc! Hoàn thành bài tập' : 'Cố gắng lên! Hãy kiên trì nhé'}
        </h3>
        <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base max-w-md mx-auto mb-8">
          Bạn vừa hoàn thành lượt bài tập mức độ{' '}
          <span className="font-bold text-indigo-600 dark:text-cyan-400">
            {level === 'advanced' ? 'Nâng cao' : level === 'mixed' ? 'Tổng hợp' : 'Cơ bản'}
          </span>
          .
        </p>

        {/* 3 Thống kê chi tiết */}
        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mb-8 p-3 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-white/60 dark:border-white/10 backdrop-blur-md">
          <div className="p-2 text-center">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Số câu đúng</div>
            <div className={`text-xl md:text-2xl font-black ${passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {finalScore}/{totalQuestions}
            </div>
          </div>
          <div className="p-2 text-center border-x border-slate-200 dark:border-slate-700/60">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tỷ lệ chính xác</div>
            <div className={`text-xl md:text-2xl font-black ${passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {percentage}%
            </div>
          </div>
          <div className="p-2 text-center">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Chuỗi cao nhất</div>
            <div className="text-xl md:text-2xl font-black text-amber-500 flex items-center justify-center gap-1">
              <Flame size={18} />
              <span>{bestStreak}</span>
            </div>
          </div>
        </div>

        {/* Thông báo mở khóa hoặc khích lệ */}
        {level === 'basic' && passed && (
          <div className="max-w-md mx-auto bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 py-3.5 px-5 rounded-2xl text-xs md:text-sm font-bold mb-8 flex items-center justify-center gap-2">
            <Sparkles size={16} />
            <span>Chúc mừng! Bạn đã mở khóa thành công phần Nâng cao!</span>
          </div>
        )}

        {level === 'basic' && !passed && (
          <div className="max-w-md mx-auto bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 py-3.5 px-5 rounded-2xl text-xs md:text-sm font-semibold mb-8">
            💡 Bạn cần đạt từ <span className="font-bold underline">80%</span> để mở khóa phần Nâng cao. Hãy ôn tập lại nhé!
          </div>
        )}

        {/* Các nút hành động thông minh */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
          {wrongExercises.length > 0 && (
            <button
              onClick={() => {
                setQuizMode('wrong');
                setCurrentIndex(0);
                setScore(0);
                setStreak(0);
                setInputValues([]);
                setIsSubmitted(false);
                setShowSummary(false);
              }}
              className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-amber-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2 text-sm"
            >
              <Target size={16} />
              <span>Luyện lại {wrongExercises.length} câu sai</span>
            </button>
          )}

          <button
            onClick={() => {
              setQuizMode('all');
              setCurrentIndex(0);
              setScore(0);
              setStreak(0);
              setInputValues([]);
              setIsSubmitted(false);
              setShowSummary(false);
              setWrongExercises([]);
            }}
            className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:opacity-95 text-white font-bold py-3 px-6 rounded-2xl shadow-lg shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2 text-sm"
          >
            <RotateCcw size={16} />
            <span>Làm lại tất cả câu hỏi</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. GIAO DIỆN CÂU HỎI & Ô ĐIỀN TỪ TƯƠNG TÁC
  const renderQuestion = () => {
    const parts = currentExercise.question.split('[blank]');
    if (parts.length === 1) {
      return <p className="text-lg md:text-xl font-medium">{currentExercise.question}</p>;
    }

    return (
      <div
        className="text-lg md:text-2xl leading-loose md:leading-loose text-slate-800 dark:text-slate-100 font-semibold select-text"
        style={{ wordBreak: 'break-word' }}
      >
        {parts.map((part, index) => {
          let answers = currentExercise.answer.split('|').map((a) => a.trim());
          if (answers.length === 1 && parts.length - 1 > 1) {
            answers = currentExercise.answer.split(/\s+/).map((a) => a.trim());
          }

          const thisAnswer = answers[index] || answers[0] || '';
          const thisInput = inputValues[index] || '';

          const thisBlankCorrect =
            isSubmitted &&
            (isCorrect || normalizeAnswer(thisInput) === normalizeAnswer(thisAnswer));
          const thisBlankWrong = isSubmitted && !thisBlankCorrect;

          let capsuleStyle =
            'inline-block mx-1.5 px-4 py-1.5 text-center rounded-2xl outline-none font-mono font-bold text-base md:text-xl transition-all min-w-[120px] max-w-[240px] shadow-sm';

          if (!isSubmitted) {
            capsuleStyle +=
              ' border-2 border-dashed border-indigo-300 dark:border-indigo-500/40 bg-white/80 dark:bg-slate-800/80 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/20 text-indigo-700 dark:text-cyan-300 shadow-indigo-500/5';
          } else if (thisBlankCorrect) {
            capsuleStyle +=
              ' border-2 border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-4 ring-emerald-500/20';
          } else if (thisBlankWrong) {
            capsuleStyle +=
              ' border-2 border-rose-500 bg-rose-50/90 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 ring-4 ring-rose-500/20 line-through';
          }

          return (
            <React.Fragment key={index}>
              <span>{part}</span>
              {index < parts.length - 1 && (
                <input
                  ref={index === 0 ? inputRef : null}
                  type="text"
                  value={inputValues[index] || ''}
                  onChange={(e) => {
                    const newVals = [...inputValues];
                    newVals[index] = e.target.value;
                    setInputValues(newVals);
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={isSubmitted}
                  className={capsuleStyle}
                  placeholder="nhập từ..."
                  autoComplete="off"
                  spellCheck="false"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  return (
    <div className="rounded-3xl p-6 md:p-8 backdrop-blur-2xl bg-white/50 dark:bg-slate-900/50 border border-white/40 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.08)] transition-all">
      {/* 1. Header: Tiến độ & Streak */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4 mb-2">
          {/* Tag câu hỏi & streak */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-cyan-400 border border-indigo-200/50 dark:border-indigo-800/40">
              Câu {currentIndex + 1} / {totalQuestions}
            </span>

            {streak >= 2 && (
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="flex items-center gap-1 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-extrabold shadow-sm"
              >
                <Flame size={14} className="fill-amber-500 text-amber-500" />
                <span>Streak x{streak}</span>
              </motion.div>
            )}
          </div>

          {/* Nút Nghe câu hỏi */}
          <button
            onClick={() => speakQuestion(currentExercise.question, currentExercise.answer)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/70 dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-white/60 dark:border-white/10 shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Nghe giọng đọc AI cả câu"
          >
            <Volume2 size={15} className="text-indigo-500" />
            <span className="hidden sm:inline">Nghe câu</span>
          </button>
        </div>

        {/* Thanh Energy Progress Bar */}
        <div className="relative w-full h-2.5 rounded-full bg-slate-200/60 dark:bg-slate-800/60 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 relative"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/60 rounded-full blur-[1px]"></div>
          </motion.div>
        </div>
      </div>

      {/* 2. Vùng hiển thị Câu hỏi */}
      <div className="my-8 p-6 md:p-8 rounded-3xl bg-white/40 dark:bg-slate-900/40 border border-white/50 dark:border-white/5 backdrop-blur-md shadow-inner text-center">
        {renderQuestion()}
      </div>

      {/* 3. Khối Phản hồi Kết quả & Giải thích */}
      <AnimatePresence>
        {isSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`rounded-2xl p-5 mb-6 border transition-all ${
              isCorrect
                ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40'
                : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/40'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5 shrink-0">
                {isCorrect ? (
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/25">
                    <CheckCircle2 size={20} />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/25">
                    <XCircle size={20} />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h4
                    className={`font-bold text-base ${
                      isCorrect ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    {isCorrect ? 'Chính xác! Rất xuất sắc 🎉' : 'Chưa chính xác'}
                  </h4>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Phản xạ ngữ pháp
                  </span>
                </div>

                {!isCorrect && (
                  <div className="flex flex-wrap items-center gap-2 text-sm pt-1">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">Đáp án chuẩn là:</span>
                    <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-900/60 px-3 py-1 rounded-xl border border-emerald-300/50">
                      {currentExercise.answer}
                    </span>
                  </div>
                )}

                {currentExercise.explanation && (
                  <div className="text-xs md:text-sm text-slate-700 dark:text-slate-300 pt-2 border-t border-slate-200/50 dark:border-white/5 flex items-start gap-1.5 leading-relaxed">
                    <Lightbulb size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900 dark:text-slate-100">Giải thích: </strong>
                      <span>{currentExercise.explanation}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Footer & Nút Hành Động */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="text-xs text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1.5">
          <kbd className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-mono border border-slate-300 dark:border-slate-700">
            Enter ↵
          </kbd>
          <span>để {isSubmitted ? 'chuyển câu tiếp' : 'kiểm tra đáp án'}</span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {!isSubmitted ? (
            <button
              onClick={handleSubmit}
              disabled={!inputValues.join('').trim()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white font-bold px-7 py-3 rounded-2xl hover:opacity-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-indigo-500/25 hover:scale-105 active:scale-95 text-sm"
            >
              <Sparkles size={16} />
              <span>Kiểm tra</span>
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white font-bold px-7 py-3 rounded-2xl hover:opacity-95 transition-all cursor-pointer shadow-lg shadow-indigo-500/25 hover:scale-105 active:scale-95 text-sm"
            >
              <span>{currentIndex < totalQuestions - 1 ? 'Câu tiếp theo' : 'Xem tổng kết'}</span>
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
