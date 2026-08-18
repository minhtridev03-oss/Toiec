import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, ArrowRight, RotateCcw, Highlighter } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { explainReadingMistakes } from '../lib/gemini';
import { usePracticeSessionTimer } from '../lib/practiceActivity';
const MemoizedContent = React.memo(({ content }) => {
  return (
    <div className="bg-white dark:bg-[#1E1226] rounded-2xl p-8 shadow-sm border border-pink-200 dark:border-[#3A2F43] text-lg text-slate-800 dark:text-slate-200 leading-loose whitespace-pre-wrap transition-colors">
      {content?.replace(/\\n/g, '\n')}
    </div>
  );
});
export default function ReadingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lesson, setLesson] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [highlight, setHighlight] = useState(false);
  // Thêm state mới
  const [explanations, setExplanations] = useState({});
  const [isEvaluatingAI, setIsEvaluatingAI] = useState(false);
  const [explanationError, setExplanationError] = useState('');
  const [allCorrect, setAllCorrect] = useState(false);
  // Tính thời gian luyện đọc vào leaderboard
  usePracticeSessionTimer('reading', user, Boolean(lesson && questions.length > 0 && !isEvaluatingAI));
  useEffect(() => {
    setIsSubmitted(false);
    setAnswers({});
    setExplanations({});
    setExplanationError('');
    setAllCorrect(false);
    fetchLesson();
  }, [id]);
  const fetchLesson = async () => {
    try {
      const { data: lessonData, error: lessonError } = await supabase
        .from('reading_lessons')
        .select('id, title, content, level')
        .eq('id', id)
        .single();
      if (lessonError) throw lessonError;
      setLesson(lessonData);
      const { data: qData, error: qError } = await supabase
        .from('reading_questions')
        .select('id, lesson_id, question, options, correct_answer, explanation')
        .eq('lesson_id', id)
        .order('created_at', { ascending: true });
      if (qError) throw qError;
      setQuestions(qData || []);
    } catch (error) {
      console.error('Error fetching reading details:', error.message);
      navigate('/reading');
    } finally {
      setLoading(false);
    }
  };
  const handleSelectOption = (questionId, option) => {
    if (isSubmitted) return;
    setAnswers(prev => ({ ...prev, [questionId]: option }));
  };
  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      alert("Vui lòng trả lời tất cả các câu hỏi trước khi kiểm tra.");
      return;
    }
    setIsSubmitted(true);
    // Check correctness
    const incorrectQs = questions.filter(q => answers[q.id] !== q.correct_answer);
    if (incorrectQs.length === 0) {
      setAllCorrect(true);
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
    setExplanations({});
    setExplanationError('');
    setAllCorrect(false);
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
  const handleMouseUp = (e) => {
    if (!highlight) return;
    const selection = window.getSelection();
    if (!selection.rangeCount || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    // Ensure selection is inside the reading container
    const container = document.getElementById('reading-container');
    if (!container || !container.contains(range.commonAncestorContainer)) return;
    const span = document.createElement('span');
    span.className = 'bg-yellow-200 dark:bg-yellow-500/40 text-slate-900 dark:text-yellow-50 rounded px-1 cursor-pointer';
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
    if (e.target.tagName === 'SPAN' && e.target.className.includes('bg-yellow-200')) {
      const parent = e.target.parentNode;
      while (e.target.firstChild) {
        parent.insertBefore(e.target.firstChild, e.target);
      }
      parent.removeChild(e.target);
      parent.normalize();
    }
  };
  if (loading || !lesson) {
    return (
      <div className="flex-1 flex items-center justify-center bg-pink-50 transition-colors">
        <div className="w-8 h-8 border-4 border-fuchsia-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col bg-pink-50 dark:bg-[#160B1E] h-full lg:overflow-hidden overflow-auto transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-[#1E1226] border-b border-pink-200 dark:border-[#3A2F43] px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm transition-colors">
        <div className="flex items-center flex-1 min-w-0 pr-4">
          <button
            onClick={() => navigate('/reading')}
            className="w-10 h-10 shrink-0 rounded-full hover:bg-pink-100 dark:hover:bg-[#2A1F33] flex items-center justify-center text-slate-600 dark:text-slate-400 transition-colors mr-3 sm:mr-4 cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white leading-tight transition-colors truncate">{lesson.title}</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium transition-colors truncate hidden sm:block">Đọc kĩ bài viết và trả lời các câu hỏi!</p>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 shrink-0">
          <div className="hidden lg:flex items-center gap-4">
            {!isSubmitted ? (
              <button
                onClick={handleSubmit}
                disabled={isSubmitted}
                className="bg-fuchsia-600 text-white font-medium px-6 py-2.5 rounded-xl hover:bg-fuchsia-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
              >
                Kiểm tra
              </button>
            ) : (
              <>
                {allCorrect ? (
                  <button
                    onClick={handleNextLesson}
                    className="font-medium px-6 py-2.5 rounded-xl transition-colors flex items-center gap-2 bg-fuchsia-600 text-white hover:bg-fuchsia-700 cursor-pointer shadow-md shadow-fuchsia-500/20"
                  >
                    Bài tiếp theo <ArrowRight size={18} />
                  </button>
                ) : (
                  <button
                    onClick={handleRetry}
                    disabled={isEvaluatingAI}
                    className="font-medium px-6 py-2.5 rounded-xl transition-colors flex items-center gap-2 bg-slate-200 dark:bg-[#232736] text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-[#3A2F43] cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw size={18} /> Làm lại
                  </button>
                )}
              </>
            )}
          </div>
          <label className="flex items-center gap-2 cursor-pointer shrink-0" title="Bật để bôi đen highlight các đoạn văn. Nhấp vào đoạn đã bôi để xóa.">
            <Highlighter size={18} className={highlight ? 'text-fuchsia-500' : 'text-slate-400 dark:text-slate-500'} />
            <div className={`w-11 h-6 shrink-0 rounded-full p-1 transition-colors relative ${highlight ? 'bg-fuchsia-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
              <div className={`w-4 h-4 bg-white rounded-full transition-transform absolute top-1 ${highlight ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </div>
            <input type="checkbox" className="hidden" checked={highlight} onChange={(e) => setHighlight(e.target.checked)} />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 select-none transition-colors whitespace-nowrap hidden sm:block">
              Highlight
            </span>
          </label>
        </div>
      </div>
      {/* Split Content */}
      <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden overflow-visible">
        {/* Left: Reading Passage */}
        <div
          id="reading-container"
          onMouseUp={handleMouseUp}
          onClick={handleMouseClick}
          className={`w-full lg:w-1/2 p-4 md:p-8 lg:overflow-y-auto overflow-visible bg-pink-50 dark:bg-[#160B1E] transition-colors ${highlight ? 'cursor-text' : ''}`}
        >
          <MemoizedContent content={lesson.content} />
        </div>
        {/* Right: Questions */}
        <div className="w-full lg:w-1/2 p-4 md:p-8 lg:overflow-y-auto overflow-visible border-t lg:border-t-0 lg:border-l border-pink-200 dark:border-[#3A2F43] bg-white dark:bg-[#1E1226] transition-colors pb-10 lg:pb-8">
          <div className="max-w-2xl mx-auto space-y-10">
            {questions.map((q, idx) => {
              const selected = answers[q.id];
              const isCorrect = isSubmitted && selected === q.correct_answer;
              const isWrong = isSubmitted && selected !== q.correct_answer;
              return (
                <div key={q.id} className="relative">
                  <div className="flex gap-4">
                    <div className={`w-8 h-8 rounded-full flex shrink-0 items-center justify-center font-bold text-white transition-colors ${isCorrect ? 'bg-green-500' : isWrong ? 'bg-red-500' : 'bg-fuchsia-500'
                      }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-4">{q.question}</h4>
                      <div className="space-y-3">
                        {q.options.map((opt, oIdx) => {
                          const isOptSelected = selected === opt;
                          const isOptCorrect = isSubmitted && opt === q.correct_answer;
                          let optClass = "flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ";
                          if (!isSubmitted) {
                            optClass += isOptSelected ? "border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-500/10" : "border-transparent hover:bg-pink-50 dark:hover:bg-[#2A1F33]";
                          } else {
                            if (isOptCorrect) {
                              optClass += "border-green-500 bg-green-50 dark:bg-green-500/10";
                            } else if (isOptSelected && !isOptCorrect) {
                              optClass += "border-red-500 bg-red-50 dark:bg-red-500/10";
                            } else {
                              optClass += "border-transparent opacity-50";
                            }
                          }
                          return (
                            <div key={oIdx} onClick={() => handleSelectOption(q.id, opt)} className={optClass}>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isOptSelected ? (isSubmitted ? (isOptCorrect ? 'border-green-500' : 'border-red-500') : 'border-fuchsia-500') : 'border-slate-300 dark:border-slate-600'
                                }`}>
                                {isOptSelected && <div className={`w-2.5 h-2.5 rounded-full transition-colors ${isSubmitted ? (isOptCorrect ? 'bg-green-500' : 'bg-red-500') : 'bg-fuchsia-500'}`} />}
                              </div>
                              <span className={`text-base ${isOptCorrect ? 'font-bold text-green-700 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'}`}>{opt}</span>
                              {isSubmitted && isOptCorrect && <CheckCircle2 size={18} className="text-green-500 dark:text-green-400 ml-auto" />}
                              {isSubmitted && isOptSelected && !isOptCorrect && <XCircle size={18} className="text-red-500 dark:text-red-400 ml-auto" />}
                            </div>
                          );
                        })}
                      </div>
                      {/* AI Explanation for Incorrect Answers */}
                      {isSubmitted && isWrong && (
                        <div className="mt-4 p-5 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl relative overflow-hidden transition-all">
                          {isEvaluatingAI && !explanations[q.id] ? (
                            <div className="flex items-center gap-3 text-orange-600 dark:text-orange-400 font-medium">
                              <div className="w-5 h-5 border-2 border-orange-600 dark:border-orange-400 border-t-transparent rounded-full animate-spin"></div>
                              AI đang phân tích lỗi sai...
                            </div>
                          ) : explanations[q.id] ? (
                            <div>
                              <div className="flex items-center gap-2 mb-3 font-bold text-orange-700 dark:text-orange-400 text-lg border-b border-orange-200 dark:border-orange-500/20 pb-2">
                                Giải thích đáp án
                              </div>
                              <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                                {explanations[q.id]}
                              </p>
                            </div>
                          ) : explanationError ? (
                            <p className="text-orange-700 dark:text-orange-400 font-medium">
                              {explanationError}
                            </p>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Action Buttons for Mobile */}
            <div className="lg:hidden mt-8 flex flex-col gap-3">
              {!isSubmitted ? (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitted}
                  className="w-full bg-fuchsia-600 text-white font-bold px-6 py-4 rounded-xl hover:bg-fuchsia-700 transition-colors disabled:opacity-50 shadow-sm cursor-pointer text-lg text-center"
                >
                  Kiểm tra
                </button>
              ) : (
                <>
                  {allCorrect ? (
                    <button
                      onClick={handleNextLesson}
                      className="w-full font-bold px-6 py-4 rounded-xl transition-colors flex items-center justify-center gap-2 bg-fuchsia-600 text-white hover:bg-fuchsia-700 cursor-pointer shadow-md shadow-fuchsia-500/20 text-lg"
                    >
                      Bài tiếp theo <ArrowRight size={20} />
                    </button>
                  ) : (
                    <button
                      onClick={handleRetry}
                      disabled={isEvaluatingAI}
                      className="w-full font-bold px-6 py-4 rounded-xl transition-colors flex items-center justify-center gap-2 bg-slate-200 dark:bg-[#232736] text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-[#3A2F43] cursor-pointer disabled:opacity-50 text-lg"
                    >
                      <RotateCcw size={20} /> Làm lại
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
