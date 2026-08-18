import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, RotateCcw, Target, PenTool, ChevronRight, ChevronLeft, AlertCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { evaluateTranslation } from '../lib/gemini';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { usePracticeSessionTimer } from '../lib/practiceActivity';
export default function WritingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lesson, setLesson] = useState(null);
  const [sentences, setSentences] = useState([]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const [userTranslation, setUserTranslation] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [feedback, setFeedback] = useState(null);
  usePracticeSessionTimer('writing', user, Boolean(lesson && sentences.length > 0 && !isEvaluating));
  useEffect(() => {
    setCurrentSentenceIndex(0);
    setUserTranslation('');
    setFeedback(null);
    fetchLessonAndSentences();
  }, [id]);
  const fetchLessonAndSentences = async () => {
    try {
      const { data: lessonData, error: lessonError } = await supabase
        .from('writing_lessons')
        .select('id, title, level, full_content, created_at')
        .eq('id', id)
        .single();

      if (lessonError) throw lessonError;
      setLesson(lessonData);
      const { data: sentencesData, error: sentencesError } = await supabase
        .from('writing_sentences')
        .select('id, lesson_id, text_to_translate, suggested_translation, order_num')
        .eq('lesson_id', id)
        .order('order_num', { ascending: true });

      if (sentencesError) throw sentencesError;
      setSentences(sentencesData || []);
    } catch (error) {
      console.error('Error fetching writing details:', error.message);
      navigate('/writing');
    } finally {
      setLoading(false);
    }
  };
  const currentSentence = sentences[currentSentenceIndex];
  const handleCheck = async () => {
    if (!userTranslation.trim() || !currentSentence) return;

    setIsEvaluating(true);
    setFeedback(null);
    try {
      const result = await evaluateTranslation(
        currentSentence.suggested_translation,
        currentSentence.text_to_translate,
        userTranslation,

        "", // Context before
        "", // Context after
        lesson.title // Pass examType to apply TOEIC or IELTS rubrics
      );
      setFeedback(result);

      // Tối ưu UI (Optimistic): Lưu ngầm tiến độ, không dùng await để hiện feedback ngay lập tức
      if (result && result.accuracy >= 80 && user) {
        supabase
          .from('user_writing_progress')
          .upsert({ user_id: user.id, sentence_id: currentSentence.id }, { onConflict: 'user_id, sentence_id' })
          .then(({ error }) => {
            if (error) console.error("Lưu tiến độ lỗi ngầm:", error);
          });
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setIsEvaluating(false);
    }
  };
  const handleReset = () => {
    setUserTranslation('');
    setFeedback(null);
  };
  const handleNextSentence = () => {
    if (currentSentenceIndex < sentences.length - 1) {
      setCurrentSentenceIndex(prev => prev + 1);
      handleReset();
    }
  };
  const handlePrevSentence = () => {
    if (currentSentenceIndex > 0) {
      setCurrentSentenceIndex(prev => prev - 1);
      handleReset();
    }
  };
  const handleNextLesson = async () => {
    try {
      const { data, error } = await supabase
        .from('writing_lessons')
        .select('id')
        .eq('level', lesson.level)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true });

      if (data && data.length > 0) {
        const currentIndex = data.findIndex(d => d.id === lesson.id);
        if (currentIndex !== -1 && currentIndex < data.length - 1) {
          navigate(`/writing/${data[currentIndex + 1].id}`);
          return;
        }
      }

      // No more lessons in this level, go back to list
      navigate('/writing');
    } catch (error) {
      console.error(error);
      navigate('/writing');
    }
  };
  if (loading || !lesson) {
    return (
      <div className="flex-1 flex items-center justify-center bg-pink-50 dark:bg-[#160B1E] text-slate-800 dark:text-slate-100 transition-colors">
        <div className="w-8 h-8 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  // Helper to format newlines
  const formatText = (text) => {
    if (!text) return null;
    const lines = text.split('\\n');
    return lines.map((line, i) => (
      <span key={i}>
        {line}
        {i < lines.length - 1 && <br />}
      </span>
    ));
  };
  // Helper to highlight the current sentence in the full content
  const renderFullContentWithHighlight = () => {
    if (!lesson.full_content || !currentSentence) return null;

    const escapeRegExp = (string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    const regex = new RegExp(`(${escapeRegExp(currentSentence.text_to_translate)})`, 'i');
    const parts = lesson.full_content.split(regex);

    if (parts.length === 1) {
      // If exact match fails, fallback to rendering just the target text
      return (
        <div className="font-bold text-pink-500 my-4 inline-block">
          {formatText(currentSentence.text_to_translate)}
        </div>
      );
    }
    return (
      <>
        {parts.map((part, index) => {
          if (index % 2 === 0) {
            return <span key={index}>{formatText(part)}</span>;
          } else {
            return (
              <span key={index} className="font-bold text-pink-600 dark:text-pink-400 bg-pink-100/10 px-1 rounded">
                {formatText(part)}
              </span>
            );
          }
        })}
      </>
    );
  };
  return (
    <div className="flex-1 flex flex-col h-full lg:overflow-hidden overflow-auto transition-colors duration-300 bg-pink-50 dark:bg-[#160B1E] text-slate-800 dark:text-slate-100">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10 transition-colors duration-300 bg-white dark:bg-[#1E1226] border-pink-200 dark:border-[#3A2F43] shadow-sm">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/writing')}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors mr-4 hover:bg-pink-100 dark:hover:bg-[#2A1F33] text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold leading-tight">{lesson.title}</h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Dịch câu được in đậm (màu hồng) sang tiếng Anh</p>
          </div>
        </div>

        {/* Toggle Theme & Navigation */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 mr-4">
            <button
              onClick={handlePrevSentence}
              disabled={currentSentenceIndex === 0}
              className={`p-2 rounded-lg transition-colors hover:bg-pink-100 dark:hover:bg-[#2A1F33] cursor-pointer ${currentSentenceIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-medium">Câu {currentSentenceIndex + 1}/{sentences.length}</span>
            <button
              onClick={handleNextSentence}
              disabled={currentSentenceIndex === sentences.length - 1}
              className={`p-2 rounded-lg transition-colors hover:bg-pink-100 dark:hover:bg-[#2A1F33] cursor-pointer ${currentSentenceIndex === sentences.length - 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
      {/* Split Content */}
      <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden overflow-visible p-4 md:p-8 gap-6 max-w-7xl mx-auto w-full">
        {/* Left: Context Passage & Input */}
        <div className="w-full lg:w-1/2 lg:overflow-y-auto overflow-visible flex flex-col gap-6">
          <div className="rounded-2xl p-8 shadow-lg border text-lg leading-loose transition-colors duration-300 bg-white dark:bg-[#1E1226] border-pink-200 dark:border-[#3A2F43] text-slate-700 dark:text-slate-300">
            {lesson.full_content ? renderFullContentWithHighlight() : (
              <div className="font-bold my-4 inline-block text-pink-600 dark:text-pink-400">
                {formatText(currentSentence?.text_to_translate)}
              </div>
            )}
          </div>
          <div className="rounded-2xl p-6 shadow-lg border transition-colors duration-300 bg-white dark:bg-[#1E1226] border-pink-200 dark:border-[#3A2F43]">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <PenTool size={18} className="text-fuchsia-500" /> Bản dịch của bạn
            </h3>
            <textarea
              value={userTranslation}
              onChange={(e) => setUserTranslation(e.target.value)}
              disabled={isEvaluating || feedback}
              placeholder="Nhập câu tiếng Anh vào đây..."
              className="w-full border-2 focus:border-fuchsia-500 rounded-xl p-4 text-lg min-h-[120px] resize-none outline-none transition-colors duration-300 bg-pink-50 dark:bg-[#160B1E] border-pink-200 dark:border-[#3A2F43] text-slate-900 dark:text-white"
            />

            <div className="flex justify-end gap-3 mt-4">
              {!feedback ? (
                <button
                  onClick={handleCheck}
                  disabled={!userTranslation.trim() || isEvaluating}
                  className="bg-fuchsia-600 text-white font-medium px-8 py-2.5 rounded-xl hover:bg-fuchsia-700 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isEvaluating ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Đang kiểm tra AI...</>
                  ) : (
                    'Kiểm tra (AI)'
                  )}
                </button>
              ) : (
                <>
                  <button
                    onClick={handleReset}
                    className="font-medium px-6 py-2.5 rounded-xl transition-colors flex items-center gap-2 bg-slate-200 dark:bg-[#232736] text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-[#3A2F43] cursor-pointer"
                  >
                    <RotateCcw size={18} /> Viết lại
                  </button>
                  {feedback.accuracy >= 80 && (
                    currentSentenceIndex < sentences.length - 1 ? (
                      <button
                        onClick={handleNextSentence}
                        className="font-medium px-8 py-2.5 rounded-xl transition-colors flex items-center gap-2 bg-fuchsia-600 text-white hover:bg-fuchsia-700 cursor-pointer shadow-md shadow-fuchsia-500/20"
                      >
                        Tiếp tục <ArrowRight size={18} />
                      </button>
                    ) : (
                      <button
                        onClick={handleNextLesson}
                        className="font-medium px-8 py-2.5 rounded-xl transition-colors flex items-center gap-2 bg-fuchsia-600 text-white hover:bg-fuchsia-700 cursor-pointer shadow-md shadow-fuchsia-500/20"
                      >
                        Bài tiếp theo <ArrowRight size={18} />
                      </button>
                    )
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        {/* Right: Feedback */}
        <div className="w-full lg:w-1/2 lg:overflow-y-auto overflow-visible pb-10 lg:pb-0">
          <div className="rounded-2xl p-6 shadow-lg border transition-colors duration-300 bg-white dark:bg-[#1E1226] border-pink-200 dark:border-[#3A2F43] h-full flex flex-col">
            {/* Stats */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 rounded-xl p-4 flex flex-col items-center justify-center border transition-colors bg-pink-50 dark:bg-[#160B1E] border-pink-200 dark:border-[#3A2F43]">
                <Target size={24} className={feedback?.is_correct ? "text-green-500 mb-2" : (feedback ? "text-amber-500 mb-2" : "text-slate-400 mb-2")} />
                <span className={`font-bold ${feedback?.is_correct ? "text-green-500" : (feedback ? "text-amber-500" : "text-slate-400")}`}>
                  {feedback ? `${feedback.accuracy}% Accuracy` : '-- Accuracy'}
                </span>
              </div>
            </div>
            <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-white transition-colors">Feedback</h3>
            {feedback ? (
              <div className="rounded-xl p-5 border space-y-4 text-base transition-colors bg-pink-50 dark:bg-[#160B1E] border-pink-200 dark:border-[#3A2F43]">
                <div className={`flex items-center gap-2 font-bold ${feedback.is_correct ? 'text-green-500' : 'text-amber-500'}`}>
                  {feedback.is_correct ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  {feedback.is_correct ? 'Good translation!' : 'Needs improvement'}
                </div>

                <div>
                  <span className="font-bold text-pink-500">Suggestion:</span> <span className="text-slate-700 dark:text-slate-300">{feedback.suggestion}</span>
                </div>
                <div>
                  <span className={`font-bold ${feedback.is_correct ? 'text-green-500' : 'text-amber-500'}`}>Nhận xét:</span> <span className="text-slate-700 dark:text-slate-300">{feedback.feedback}</span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl p-8 border flex-1 flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400 bg-pink-50/50 dark:bg-[#160B1E]/50 border-pink-200/50 dark:border-[#3A2F43]/50 border-dashed">
                <PenTool size={32} className="mb-4 opacity-50" />
                <p>Hãy hoàn thành bài dịch bên trái và bấm <b className="text-fuchsia-500 font-medium">Kiểm tra (AI)</b> để xem nhận xét và điểm số nhé.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
