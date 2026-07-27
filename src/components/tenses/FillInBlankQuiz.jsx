import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, ArrowRight, Award } from 'lucide-react';
import { normalizeAnswer } from '../../utils/normalize';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

export default function FillInBlankQuiz({ exercises, level, tenseId, completedExerciseIds = [], onComplete, onExerciseUpdate }) {
  const { user } = useAuth();

  const [resetQuiz, setResetQuiz] = useState(false);
  const [initialCompletedIds] = useState(completedExerciseIds);

  // Lọc ra những câu chưa làm TẠI THỜI ĐIỂM component vừa mount
  const activeExercises = resetQuiz
    ? exercises
    : exercises.filter(ex => !initialCompletedIds.includes(ex.id));

  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValues, setInputValues] = useState([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(new Set(completedExerciseIds));

  const inputRef = useRef(null);

  const currentExercise = activeExercises[currentIndex];
  const totalQuestions = activeExercises.length;

  useEffect(() => {
    if (!isSubmitted && !showSummary && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentIndex, isSubmitted, showSummary]);

  const saveProgress = async (exerciseId) => {
    if (!user) return; // Only save if logged in
    try {
      await supabase
        .from('user_tense_exercises')
        .upsert({ user_id: user.id, exercise_id: exerciseId }, { onConflict: 'user_id,exercise_id' });
      setSessionCompleted(prev => new Set([...prev, exerciseId]));
      if (onExerciseUpdate) {
        onExerciseUpdate(exerciseId);
      }
    } catch (err) {
      console.error('Error saving progress:', err);
    }
  };

  const handleSubmit = () => {
    if (isSubmitted) return;

    const blanksCount = currentExercise.question.split('[blank]').length - 1;
    const finalValues = Array(blanksCount).fill('').map((_, i) => inputValues[i] || '');
    const combinedInput = finalValues.join(' ').trim();

    if (!combinedInput) return;

    const normalizedInput = normalizeAnswer(combinedInput);
    const normalizedTarget = normalizeAnswer(currentExercise.answer);

    const correct = normalizedInput === normalizedTarget;
    setIsCorrect(correct);
    if (correct) {
      setScore(prev => prev + 1);
      // Save to Supabase immediately on correct answer
      saveProgress(currentExercise.id);
    }
    setIsSubmitted(true);
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
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

  if (activeExercises.length === 0 && !showSummary) {
    return (
      <div className="bg-white dark:bg-[#1E1226] rounded-3xl p-10 text-center shadow-sm border border-pink-200 dark:border-[#3A2F43] transition-colors">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center mb-6 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20">
          <Award size={40} className="text-white" />
        </div>
        <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 transition-colors">Tuyệt vời!</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-8 transition-colors">Bạn đã hoàn thành 100% bài tập phần này.</p>
        <button
          onClick={() => {
            setResetQuiz(true);
            setCurrentIndex(0);
            setScore(0);
            setInputValues([]);
            setIsSubmitted(false);
          }}
          className="bg-fuchsia-600 text-white font-medium px-8 py-3 rounded-xl hover:bg-fuchsia-700 transition-colors shadow-lg shadow-fuchsia-200 cursor-pointer"
        >
          Làm lại từ đầu
        </button>
      </div>
    );
  }

  if (!currentExercise && !showSummary) {
    return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Đang tải bài tập...</div>;
  }

  // Render question with input — color per-blank based on submission
  const renderQuestion = () => {
    const parts = currentExercise.question.split('[blank]');
    if (parts.length === 1) return <p>{currentExercise.question}</p>;

    const baseClass = 'mx-2 px-3 py-1.5 text-center border-b-2 outline-none bg-transparent min-w-[80px] font-semibold text-lg transition-colors';

    return (
      <div className="text-xl leading-loose text-slate-700 dark:text-slate-300 font-medium" style={{ wordBreak: 'break-word' }}>
        {parts.map((part, index) => {
          // Cải thiện logic tách đáp án: nếu DB không dùng dấu | mà dùng dấu cách cho nhiều ô trống
          let answers = currentExercise.answer.split('|').map(a => a.trim());
          if (answers.length === 1 && parts.length - 1 > 1) {
            answers = currentExercise.answer.split(/\s+/).map(a => a.trim());
          }
          
          const thisAnswer = answers[index] || answers[0] || '';
          const thisInput = inputValues[index] || '';
          
          // Ô trống được coi là đúng nếu TỔNG THỂ đúng, HOẶC bản thân ô đó khớp đáp án
          const thisBlankCorrect = isSubmitted && (isCorrect || normalizeAnswer(thisInput) === normalizeAnswer(thisAnswer));
          const thisBlankWrong = isSubmitted && !thisBlankCorrect;

          let inputClass = baseClass;
          if (!isSubmitted) {
            inputClass += ' border-slate-300 dark:border-slate-600 focus:border-fuchsia-500 text-slate-800 dark:text-slate-200 transition-colors';
          } else if (thisBlankCorrect) {
            inputClass += ' border-green-500 text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-500/10';
          } else if (thisBlankWrong) {
            inputClass += ' border-red-500 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-500/10';
          }

          return (
            <React.Fragment key={index}>
              {part}
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
                  className={inputClass}
                  placeholder="..."
                  autoComplete="off"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  if (showSummary) {
    const finalScore = score;
    const percentage = Math.round((finalScore / totalQuestions) * 100);
    const passed = percentage >= 80;

    return (
      <div className="bg-white dark:bg-[#1E1226] p-8 rounded-3xl shadow-sm border border-pink-200 dark:border-[#3A2F43] text-center transition-colors">
        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 shadow-lg ${passed ? 'bg-gradient-to-br from-green-400 to-emerald-600 shadow-emerald-200 dark:shadow-emerald-900/20'
          : 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-orange-200 dark:shadow-orange-900/20'
          }`}>
          <Award size={40} className="text-white" />
        </div>

        <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 transition-colors">Hoàn thành bài tập!</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-6 transition-colors">Bạn đã hoàn thành bài tập mức độ {level === 'advanced' ? 'Nâng cao' : level === 'mixed' ? 'Tổng hợp' : 'Cơ bản'}</p>

        <div className="flex justify-center items-center gap-8 mb-8">
          <div className="text-center">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Số câu đúng</div>
            <div className={`text-4xl font-extrabold ${passed ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {finalScore}/{totalQuestions}
            </div>
          </div>
          <div className="w-px h-12 bg-slate-200 dark:bg-slate-700"></div>
          <div className="text-center">
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Tỷ lệ</div>
            <div className={`text-4xl font-extrabold ${passed ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {percentage}%
            </div>
          </div>
        </div>

        {level === 'basic' && passed && (
          <div className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 py-3 px-4 rounded-xl text-sm font-medium mb-6 animate-pulse">
            Chúc mừng! Bạn đã mở khóa phần Nâng cao!
          </div>
        )}

        {level === 'basic' && !passed && (
          <div className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 py-3 px-4 rounded-xl text-sm font-medium mb-6">
            Bạn cần đạt từ 80% để mở khóa phần Nâng cao. Hãy làm lại nhé!
          </div>
        )}

        <button
          onClick={() => {
            setResetQuiz(true);
            setCurrentIndex(0);
            setScore(0);
            setInputValues([]);
            setIsSubmitted(false);
            setShowSummary(false);
          }}
          className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium px-8 py-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          Làm lại từ đầu (Ôn tập)
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1E1226] rounded-3xl p-6 md:p-8 shadow-sm border border-pink-200 dark:border-[#3A2F43] transition-colors">
      {/* Header */}
      <div className="flex items-start md:items-center justify-between mb-8 transition-colors">
        <div className="flex flex-wrap gap-1.5 md:gap-2 flex-1 mr-4">
          {activeExercises.map((ex, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-8 bg-fuchsia-600 dark:bg-fuchsia-500' :
                  sessionCompleted.has(ex.id) ? 'w-4 bg-green-400 dark:bg-green-500' :
                    idx < currentIndex ? 'w-4 bg-fuchsia-200 dark:bg-fuchsia-500/30' : 'w-4 bg-pink-100 dark:bg-slate-800'
                }`}
            />
          ))}
        </div>
        <div className="text-sm font-bold text-slate-400 dark:text-slate-500">
          Câu {currentIndex + 1} / {totalQuestions}
        </div>
      </div>

      {/* Question */}
      <div className="mb-10">
        {renderQuestion()}
      </div>

      {/* Result feedback */}
      <AnimatePresence>
        {isSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`p-5 rounded-2xl mb-8 border ${isCorrect ? 'bg-green-50 dark:bg-green-500/10 border-green-100 dark:border-green-500/20' : 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20'}`}
          >
            <div className="flex items-start gap-4">
              <div className="mt-0.5">
                {isCorrect ? (
                  <CheckCircle2 className="text-green-500 dark:text-green-400" size={24} />
                ) : (
                  <XCircle className="text-red-500 dark:text-red-400" size={24} />
                )}
              </div>
              <div>
                <h4 className={`font-bold text-lg mb-1 ${isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                  {isCorrect ? 'Tuyệt vời!' : 'Chưa chính xác'}
                </h4>
                {!isCorrect && (
                  <div className="mb-3">
                    <span className="text-red-600/80 dark:text-red-400/80 text-sm">Đáp án đúng là: </span>
                    <span className="font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-500/20 px-2 py-0.5 rounded ml-1">
                      {currentExercise.answer}
                    </span>
                  </div>
                )}
                {currentExercise.explanation && (
                  <p className={`text-sm ${isCorrect ? 'text-green-700/80 dark:text-green-400/80' : 'text-red-700/80 dark:text-red-400/80'}`}>
                    <span className="font-semibold opacity-70">Giải thích:</span> {currentExercise.explanation}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Button */}
      <div className="flex justify-end">
        {!isSubmitted ? (
          <button
            onClick={handleSubmit}
            disabled={!inputValues.join('').trim()}
            className="flex items-center gap-2 bg-fuchsia-600 text-white font-medium px-6 py-3 rounded-xl hover:bg-fuchsia-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-fuchsia-200 dark:shadow-none"
          >
            Kiểm tra
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 bg-fuchsia-600 text-white font-medium px-6 py-3 rounded-xl hover:bg-fuchsia-700 transition-colors cursor-pointer shadow-lg shadow-fuchsia-200"
          >
            {currentIndex < totalQuestions - 1 ? 'Câu tiếp theo' : 'Xem kết quả'}
            <ArrowRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
