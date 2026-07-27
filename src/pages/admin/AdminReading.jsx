import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Plus, Pencil, Trash2, Save, X, ChevronDown, ChevronUp,
  BookOpen, AlertCircle, CheckCircle2
} from 'lucide-react';

export default function AdminReading() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedLessonId, setExpandedLessonId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Lesson form
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [lessonForm, setLessonForm] = useState({ title: '', content: '' });

  // Question form
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    question: '',
    options: ['', '', '', ''],
    correct_answer: '',
  });

  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { fetchLessons(); }, []);

  const fetchLessons = async () => {
    try {
      const { data, error } = await supabase
        .from('reading_lessons')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setLessons(data || []);
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async (lessonId) => {
    setLoadingQuestions(true);
    try {
      const { data, error } = await supabase
        .from('reading_questions')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setQuestions(data || []);
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const toggleLesson = (id) => {
    if (expandedLessonId === id) {
      setExpandedLessonId(null);
      setQuestions([]);
    } else {
      setExpandedLessonId(id);
      fetchQuestions(id);
    }
  };

  // === LESSON CRUD ===
  const handleSaveLesson = async () => {
    if (!lessonForm.title.trim() || !lessonForm.content.trim()) {
      showToast('Vui lòng nhập đầy đủ tiêu đề và nội dung', 'error');
      return;
    }
    try {
      if (editingLesson) {
        const { error } = await supabase.from('reading_lessons').update(lessonForm).eq('id', editingLesson.id);
        if (error) throw error;
        showToast('Đã cập nhật bài đọc!');
      } else {
        const { error } = await supabase.from('reading_lessons').insert([lessonForm]);
        if (error) throw error;
        showToast('Đã tạo bài đọc mới!');
      }
      setShowLessonForm(false);
      setEditingLesson(null);
      setLessonForm({ title: '', content: '' });
      fetchLessons();
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    }
  };

  const handleDeleteLesson = async (id) => {
    if (!window.confirm('Xóa bài đọc này và tất cả câu hỏi liên quan?')) return;
    try {
      await supabase.from('reading_questions').delete().eq('lesson_id', id);
      const { error } = await supabase.from('reading_lessons').delete().eq('id', id);
      if (error) throw error;
      showToast('Đã xóa bài đọc!');
      if (expandedLessonId === id) { setExpandedLessonId(null); setQuestions([]); }
      fetchLessons();
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    }
  };

  // === QUESTION CRUD ===
  const handleSaveQuestion = async () => {
    if (!questionForm.question.trim() || !questionForm.correct_answer.trim()) {
      showToast('Vui lòng nhập câu hỏi và đáp án đúng', 'error');
      return;
    }
    const validOptions = questionForm.options.filter(o => o.trim());
    if (validOptions.length < 2) {
      showToast('Cần ít nhất 2 lựa chọn', 'error');
      return;
    }

    try {
      const payload = {
        lesson_id: expandedLessonId,
        question: questionForm.question,
        options: questionForm.options.filter(o => o.trim()),
        correct_answer: questionForm.correct_answer,
      };

      if (editingQuestion) {
        const { error } = await supabase.from('reading_questions').update(payload).eq('id', editingQuestion.id);
        if (error) throw error;
        showToast('Đã cập nhật câu hỏi!');
      } else {
        const { error } = await supabase.from('reading_questions').insert([payload]);
        if (error) throw error;
        showToast('Đã thêm câu hỏi mới!');
      }
      setShowQuestionForm(false);
      setEditingQuestion(null);
      setQuestionForm({ question: '', options: ['', '', '', ''], correct_answer: '' });
      fetchQuestions(expandedLessonId);
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Xóa câu hỏi này?')) return;
    try {
      const { error } = await supabase.from('reading_questions').delete().eq('id', id);
      if (error) throw error;
      showToast('Đã xóa câu hỏi!');
      fetchQuestions(expandedLessonId);
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-slate-50 dark:bg-[#0F1117]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 bg-slate-50 dark:bg-[#0F1117] min-h-screen transition-colors">
      <div className="max-w-5xl mx-auto">
        {/* Toast */}
        {toast && (
          <div className={`fixed top-6 right-6 z-[100] flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-300 ${
            toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
          }`}>
            {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <BookOpen size={26} className="text-blue-600 dark:text-blue-400" />
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Quản lý Luyện Đọc</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{lessons.length} bài đọc</p>
          </div>
          <button
            onClick={() => {
              setEditingLesson(null);
              setLessonForm({ title: '', content: '' });
              setShowLessonForm(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-blue-200 dark:shadow-blue-900/30"
          >
            <Plus size={18} />
            Thêm bài đọc
          </button>
        </div>

        {/* Lesson Form Modal */}
        {showLessonForm && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#1E1226] rounded-2xl p-6 w-full max-w-2xl border border-slate-200 dark:border-[#3A2F43] shadow-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
                {editingLesson ? 'Sửa bài đọc' : 'Thêm bài đọc mới'}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Tiêu đề *</label>
                  <input
                    type="text"
                    value={lessonForm.title}
                    onChange={(e) => setLessonForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="My First Day at Work"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Nội dung bài đọc *</label>
                  <textarea
                    value={lessonForm.content}
                    onChange={(e) => setLessonForm(f => ({ ...f, content: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                    rows={10}
                    placeholder="Today was my first day at the new office..."
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-5">
                <button
                  onClick={() => { setShowLessonForm(false); setEditingLesson(null); }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#3A2F43] rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveLesson}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Save size={16} />
                  {editingLesson ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Question Form Modal */}
        {showQuestionForm && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#1E1226] rounded-2xl p-6 w-full max-w-lg border border-slate-200 dark:border-[#3A2F43] shadow-2xl">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
                {editingQuestion ? 'Sửa câu hỏi' : 'Thêm câu hỏi mới'}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Câu hỏi *</label>
                  <textarea
                    value={questionForm.question}
                    onChange={(e) => setQuestionForm(f => ({ ...f, question: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                    rows={2}
                    placeholder="What did the author do on their first day?"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Các lựa chọn (ít nhất 2)</label>
                  {questionForm.options.map((opt, i) => (
                    <input
                      key={i}
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...questionForm.options];
                        newOpts[i] = e.target.value;
                        setQuestionForm(f => ({ ...f, options: newOpts }));
                      }}
                      className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition-colors mb-2"
                      placeholder={`Lựa chọn ${String.fromCharCode(65 + i)}`}
                    />
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Đáp án đúng *</label>
                  <input
                    type="text"
                    value={questionForm.correct_answer}
                    onChange={(e) => setQuestionForm(f => ({ ...f, correct_answer: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Nhập đáp án đúng (phải trùng với 1 lựa chọn)"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-5">
                <button
                  onClick={() => { setShowQuestionForm(false); setEditingQuestion(null); }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#3A2F43] rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveQuestion}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Save size={16} />
                  {editingQuestion ? 'Cập nhật' : 'Thêm'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lessons List */}
        <div className="space-y-3">
          {lessons.length === 0 && (
            <div className="bg-white dark:bg-[#1E1226] rounded-2xl p-10 text-center border border-dashed border-slate-300 dark:border-[#3A2F43] text-slate-500 dark:text-slate-400">
              Chưa có bài đọc nào. Hãy tạo bài đọc đầu tiên!
            </div>
          )}

          {lessons.map((lesson) => (
            <div key={lesson.id} className="bg-white dark:bg-[#1E1226] rounded-2xl border border-slate-100 dark:border-[#3A2F43] overflow-hidden transition-colors">
              {/* Lesson Header */}
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#232736] transition-colors"
                onClick={() => toggleLesson(lesson.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                    <BookOpen size={16} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate">{lesson.title}</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-xs">{lesson.content?.slice(0, 60)}...</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingLesson(lesson);
                      setLessonForm({ title: lesson.title, content: lesson.content });
                      setShowLessonForm(true);
                    }}
                    className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteLesson(lesson.id); }}
                    className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                  {expandedLessonId === lesson.id ? (
                    <ChevronUp size={18} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={18} className="text-slate-400" />
                  )}
                </div>
              </div>

              {/* Expanded Questions */}
              {expandedLessonId === lesson.id && (
                <div className="border-t border-slate-100 dark:border-[#3A2F43] bg-slate-50/50 dark:bg-[#0F1117]/50 px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300">
                      Câu hỏi ({questions.length})
                    </h4>
                    <button
                      onClick={() => {
                        setEditingQuestion(null);
                        setQuestionForm({ question: '', options: ['', '', '', ''], correct_answer: '' });
                        setShowQuestionForm(true);
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Plus size={14} />
                      Thêm câu hỏi
                    </button>
                  </div>

                  {loadingQuestions ? (
                    <div className="py-6 text-center">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                  ) : questions.length === 0 ? (
                    <div className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                      Chưa có câu hỏi nào.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {questions.map((q, idx) => (
                        <div key={q.id} className="bg-white dark:bg-[#1E1226] rounded-xl px-4 py-3 border border-slate-100 dark:border-[#3A2F43]">
                          <div className="flex items-start gap-3">
                            <span className="text-xs font-bold text-slate-300 dark:text-slate-600 mt-1 shrink-0 w-6 text-center">
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{q.question}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {(q.options || []).map((opt, oi) => (
                                  <span
                                    key={oi}
                                    className={`text-xs px-2 py-0.5 rounded-md ${
                                      opt === q.correct_answer
                                        ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                    }`}
                                  >
                                    {opt}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => {
                                  setEditingQuestion(q);
                                  const opts = [...(q.options || [])];
                                  while (opts.length < 4) opts.push('');
                                  setQuestionForm({
                                    question: q.question,
                                    options: opts,
                                    correct_answer: q.correct_answer,
                                  });
                                  setShowQuestionForm(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-colors"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteQuestion(q.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-md transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
