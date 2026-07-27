import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Plus, Pencil, Trash2, Save, X, ChevronDown, ChevronUp,
  PenTool, GripVertical, AlertCircle, CheckCircle2
} from 'lucide-react';

export default function AdminWriting() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedLessonId, setExpandedLessonId] = useState(null);
  const [sentences, setSentences] = useState([]);
  const [loadingSentences, setLoadingSentences] = useState(false);

  // Form states
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [lessonForm, setLessonForm] = useState({ title: '' });

  const [showSentenceForm, setShowSentenceForm] = useState(false);
  const [editingSentence, setEditingSentence] = useState(null);
  const [sentenceForm, setSentenceForm] = useState({
    text_to_translate: '',
    suggested_translation: '',
    context_before: '',
    context_after: '',
    order_num: 1,
  });

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      const { data, error } = await supabase
        .from('writing_lessons')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setLessons(data || []);
    } catch (err) {
      showToast('Lỗi tải dữ liệu: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSentences = async (lessonId) => {
    setLoadingSentences(true);
    try {
      const { data, error } = await supabase
        .from('writing_sentences')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('order_num', { ascending: true });
      if (error) throw error;
      setSentences(data || []);
    } catch (err) {
      showToast('Lỗi tải câu: ' + err.message, 'error');
    } finally {
      setLoadingSentences(false);
    }
  };

  const toggleLesson = (lessonId) => {
    if (expandedLessonId === lessonId) {
      setExpandedLessonId(null);
      setSentences([]);
    } else {
      setExpandedLessonId(lessonId);
      fetchSentences(lessonId);
    }
  };

  // === LESSON CRUD ===
  const handleSaveLesson = async () => {
    if (!lessonForm.title.trim()) {
      showToast('Vui lòng nhập tiêu đề bài học', 'error');
      return;
    }

    try {
      if (editingLesson) {
        const { error } = await supabase
          .from('writing_lessons')
          .update({ title: lessonForm.title })
          .eq('id', editingLesson.id);
        if (error) throw error;
        showToast('Đã cập nhật bài học!');
      } else {
        const { error } = await supabase
          .from('writing_lessons')
          .insert([{ title: lessonForm.title }]);
        if (error) throw error;
        showToast('Đã tạo bài học mới!');
      }
      setShowLessonForm(false);
      setEditingLesson(null);
      setLessonForm({ title: '' });
      fetchLessons();
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    }
  };

  const handleDeleteLesson = async (id) => {
    if (!window.confirm('Xóa bài học này và tất cả các câu liên quan?')) return;
    try {
      // Delete sentences first
      await supabase.from('writing_sentences').delete().eq('lesson_id', id);
      const { error } = await supabase.from('writing_lessons').delete().eq('id', id);
      if (error) throw error;
      showToast('Đã xóa bài học!');
      if (expandedLessonId === id) {
        setExpandedLessonId(null);
        setSentences([]);
      }
      fetchLessons();
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    }
  };

  // === SENTENCE CRUD ===
  const handleSaveSentence = async () => {
    if (!sentenceForm.text_to_translate.trim() || !sentenceForm.suggested_translation.trim()) {
      showToast('Vui lòng nhập đầy đủ câu gốc và bản dịch', 'error');
      return;
    }

    try {
      const payload = {
        lesson_id: expandedLessonId,
        text_to_translate: sentenceForm.text_to_translate,
        suggested_translation: sentenceForm.suggested_translation,
        context_before: sentenceForm.context_before || null,
        context_after: sentenceForm.context_after || null,
        order_num: sentenceForm.order_num,
      };

      if (editingSentence) {
        const { error } = await supabase
          .from('writing_sentences')
          .update(payload)
          .eq('id', editingSentence.id);
        if (error) throw error;
        showToast('Đã cập nhật câu!');
      } else {
        const { error } = await supabase
          .from('writing_sentences')
          .insert([payload]);
        if (error) throw error;
        showToast('Đã thêm câu mới!');
      }
      setShowSentenceForm(false);
      setEditingSentence(null);
      setSentenceForm({ text_to_translate: '', suggested_translation: '', context_before: '', context_after: '', order_num: sentences.length + 1 });
      fetchSentences(expandedLessonId);
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    }
  };

  const handleDeleteSentence = async (id) => {
    if (!window.confirm('Xóa câu này?')) return;
    try {
      const { error } = await supabase.from('writing_sentences').delete().eq('id', id);
      if (error) throw error;
      showToast('Đã xóa câu!');
      fetchSentences(expandedLessonId);
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-slate-50 dark:bg-[#0F1117]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 bg-slate-50 dark:bg-[#0F1117] min-h-screen transition-colors">
      <div className="max-w-5xl mx-auto">
        {/* Toast */}
        {toast && (
          <div className={`fixed top-6 right-6 z-[100] flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-300 ${
            toast.type === 'error' 
              ? 'bg-red-600 text-white' 
              : 'bg-emerald-600 text-white'
          }`}>
            {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <PenTool size={26} className="text-indigo-600 dark:text-indigo-400" />
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Quản lý Luyện Viết</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{lessons.length} bài học</p>
          </div>
          <button
            onClick={() => {
              setEditingLesson(null);
              setLessonForm({ title: '' });
              setShowLessonForm(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30"
          >
            <Plus size={18} />
            Thêm bài học
          </button>
        </div>

        {/* Lesson Form Modal */}
        {showLessonForm && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#1E1226] rounded-2xl p-6 w-full max-w-md border border-slate-200 dark:border-[#3A2F43] shadow-2xl">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
                {editingLesson ? 'Sửa bài học' : 'Thêm bài học mới'}
              </h3>
              <input
                type="text"
                value={lessonForm.title}
                onChange={(e) => setLessonForm({ title: e.target.value })}
                placeholder="Tiêu đề bài học..."
                className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors mb-4"
                autoFocus
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => { setShowLessonForm(false); setEditingLesson(null); }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#3A2F43] rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveLesson}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Save size={16} />
                  {editingLesson ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sentence Form Modal */}
        {showSentenceForm && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#1E1226] rounded-2xl p-6 w-full max-w-lg border border-slate-200 dark:border-[#3A2F43] shadow-2xl">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
                {editingSentence ? 'Sửa câu' : 'Thêm câu mới'}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Câu gốc (cần dịch) *</label>
                  <textarea
                    value={sentenceForm.text_to_translate}
                    onChange={(e) => setSentenceForm(f => ({ ...f, text_to_translate: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                    rows={2}
                    placeholder="The weather is very nice today."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Bản dịch gợi ý *</label>
                  <textarea
                    value={sentenceForm.suggested_translation}
                    onChange={(e) => setSentenceForm(f => ({ ...f, suggested_translation: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                    rows={2}
                    placeholder="Hôm nay thời tiết rất đẹp."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Ngữ cảnh trước</label>
                    <input
                      type="text"
                      value={sentenceForm.context_before}
                      onChange={(e) => setSentenceForm(f => ({ ...f, context_before: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Ngữ cảnh sau</label>
                    <input
                      type="text"
                      value={sentenceForm.context_after}
                      onChange={(e) => setSentenceForm(f => ({ ...f, context_after: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Thứ tự</label>
                  <input
                    type="number"
                    value={sentenceForm.order_num}
                    onChange={(e) => setSentenceForm(f => ({ ...f, order_num: parseInt(e.target.value) || 1 }))}
                    className="w-24 bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                    min={1}
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-5">
                <button
                  onClick={() => { setShowSentenceForm(false); setEditingSentence(null); }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#3A2F43] rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveSentence}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Save size={16} />
                  {editingSentence ? 'Cập nhật' : 'Thêm'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lessons List */}
        <div className="space-y-3">
          {lessons.length === 0 && (
            <div className="bg-white dark:bg-[#1E1226] rounded-2xl p-10 text-center border border-dashed border-slate-300 dark:border-[#3A2F43] text-slate-500 dark:text-slate-400">
              Chưa có bài học nào. Hãy tạo bài học đầu tiên!
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
                  <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center shrink-0">
                    <PenTool size={16} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate">{lesson.title}</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500">ID: {lesson.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingLesson(lesson);
                      setLessonForm({ title: lesson.title });
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

              {/* Expanded Sentences */}
              {expandedLessonId === lesson.id && (
                <div className="border-t border-slate-100 dark:border-[#3A2F43] bg-slate-50/50 dark:bg-[#0F1117]/50 px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300">
                      Danh sách câu ({sentences.length})
                    </h4>
                    <button
                      onClick={() => {
                        setEditingSentence(null);
                        setSentenceForm({
                          text_to_translate: '',
                          suggested_translation: '',
                          context_before: '',
                          context_after: '',
                          order_num: sentences.length + 1,
                        });
                        setShowSentenceForm(true);
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Plus size={14} />
                      Thêm câu
                    </button>
                  </div>

                  {loadingSentences ? (
                    <div className="py-6 text-center text-slate-400">
                      <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                  ) : sentences.length === 0 ? (
                    <div className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                      Chưa có câu nào trong bài học này.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sentences.map((s, idx) => (
                        <div key={s.id} className="bg-white dark:bg-[#1E1226] rounded-xl px-4 py-3 border border-slate-100 dark:border-[#3A2F43] flex items-start gap-3">
                          <span className="text-xs font-bold text-slate-300 dark:text-slate-600 mt-1 shrink-0 w-6 text-center">
                            {s.order_num || idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-0.5">{s.text_to_translate}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">→ {s.suggested_translation}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setEditingSentence(s);
                                setSentenceForm({
                                  text_to_translate: s.text_to_translate,
                                  suggested_translation: s.suggested_translation,
                                  context_before: s.context_before || '',
                                  context_after: s.context_after || '',
                                  order_num: s.order_num || idx + 1,
                                });
                                setShowSentenceForm(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-colors"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteSentence(s.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-md transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
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
