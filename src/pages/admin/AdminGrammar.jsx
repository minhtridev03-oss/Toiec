import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Plus, Pencil, Trash2, Save, X, ChevronDown, ChevronUp,
  BookType, AlertCircle, CheckCircle2
} from 'lucide-react';

export default function AdminGrammar() {
  const [tenses, setTenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTenseId, setExpandedTenseId] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [loadingExercises, setLoadingExercises] = useState(false);

  // Tense form
  const [showTenseForm, setShowTenseForm] = useState(false);
  const [editingTense, setEditingTense] = useState(null);
  const [tenseForm, setTenseForm] = useState({
    name_en: '',
    name_vi: '',
    slug: '',
    video_id: '',
    formula: { affirmative: '', negative: '', interrogative: '' },
    usage: [''],
    signals: ['']
  });

  // Exercise form
  const [showExerciseForm, setShowExerciseForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState(null);
  const [exerciseForm, setExerciseForm] = useState({
    level: 'basic',
    question: '',
    answer: '',
    explanation: ''
  });

  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { fetchTenses(); }, []);

  const fetchTenses = async () => {
    try {
      const { data, error } = await supabase
        .from('tenses')
        .select('*')
        .order('id', { ascending: true });
      if (error) throw error;
      setTenses(data || []);
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchExercises = async (tenseId) => {
    setLoadingExercises(true);
    try {
      const { data, error } = await supabase
        .from('tense_exercises')
        .select('*')
        .eq('tense_id', tenseId)
        .order('id', { ascending: true });
      if (error) throw error;
      setExercises(data || []);
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    } finally {
      setLoadingExercises(false);
    }
  };

  const toggleTense = (id) => {
    if (expandedTenseId === id) {
      setExpandedTenseId(null);
      setExercises([]);
    } else {
      setExpandedTenseId(id);
      fetchExercises(id);
    }
  };

  // === TENSE CRUD ===
  const handleSaveTense = async () => {
    if (!tenseForm.name_en.trim() || !tenseForm.slug.trim()) {
      showToast('Vui lòng nhập tên và slug', 'error');
      return;
    }
    try {
      const payload = {
        ...tenseForm,
        usage: tenseForm.usage.filter(u => u.trim()),
        signals: tenseForm.signals.filter(s => s.trim())
      };

      if (editingTense) {
        const { error } = await supabase.from('tenses').update(payload).eq('id', editingTense.id);
        if (error) throw error;
        showToast('Đã cập nhật thì!');
      } else {
        const { error } = await supabase.from('tenses').insert([payload]);
        if (error) throw error;
        showToast('Đã tạo thì mới!');
      }
      setShowTenseForm(false);
      setEditingTense(null);
      setTenseForm({ name_en: '', name_vi: '', slug: '', video_id: '', formula: { affirmative: '', negative: '', interrogative: '' }, usage: [''], signals: [''] });
      fetchTenses();
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    }
  };

  const handleDeleteTense = async (id) => {
    if (!window.confirm('Xóa thì này và tất cả bài tập liên quan?')) return;
    try {
      await supabase.from('tense_exercises').delete().eq('tense_id', id);
      const { error } = await supabase.from('tenses').delete().eq('id', id);
      if (error) throw error;
      showToast('Đã xóa thì!');
      if (expandedTenseId === id) { setExpandedTenseId(null); setExercises([]); }
      fetchTenses();
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    }
  };

  // === EXERCISE CRUD ===
  const handleSaveExercise = async () => {
    if (!exerciseForm.question.trim() || !exerciseForm.answer.trim()) {
      showToast('Vui lòng nhập câu hỏi và đáp án', 'error');
      return;
    }

    try {
      const payload = {
        tense_id: expandedTenseId,
        level: exerciseForm.level,
        question: exerciseForm.question,
        answer: exerciseForm.answer,
        explanation: exerciseForm.explanation
      };

      if (editingExercise) {
        const { error } = await supabase.from('tense_exercises').update(payload).eq('id', editingExercise.id);
        if (error) throw error;
        showToast('Đã cập nhật bài tập!');
      } else {
        const { error } = await supabase.from('tense_exercises').insert([payload]);
        if (error) throw error;
        showToast('Đã thêm bài tập mới!');
      }
      setShowExerciseForm(false);
      setEditingExercise(null);
      setExerciseForm({ level: 'basic', question: '', answer: '', explanation: '' });
      fetchExercises(expandedTenseId);
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    }
  };

  const handleDeleteExercise = async (id) => {
    if (!window.confirm('Xóa bài tập này?')) return;
    try {
      const { error } = await supabase.from('tense_exercises').delete().eq('id', id);
      if (error) throw error;
      showToast('Đã xóa bài tập!');
      fetchExercises(expandedTenseId);
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-slate-50 dark:bg-[#0F1117]">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 bg-slate-50 dark:bg-[#0F1117] min-h-screen transition-colors">
      <div className="max-w-5xl mx-auto">
        {toast && (
          <div className={`fixed top-6 right-6 z-[100] flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-300 ${
            toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
          }`}>
            {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            {toast.message}
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <BookType size={26} className="text-amber-600 dark:text-amber-400" />
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Quản lý Ngữ pháp (Các Thì)</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{tenses.length} thì tiếng Anh</p>
          </div>
          <button
            onClick={() => {
              setEditingTense(null);
              setTenseForm({ name_en: '', name_vi: '', slug: '', video_id: '', formula: { affirmative: '', negative: '', interrogative: '' }, usage: [''], signals: [''] });
              setShowTenseForm(true);
            }}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-amber-200 dark:shadow-amber-900/30"
          >
            <Plus size={18} />
            Thêm thì mới
          </button>
        </div>

        {/* Tense Form Modal */}
        {showTenseForm && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#1E1226] rounded-2xl p-6 w-full max-w-3xl border border-slate-200 dark:border-[#3A2F43] shadow-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
                {editingTense ? 'Sửa thì' : 'Thêm thì mới'}
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Tên tiếng Anh *</label>
                    <input type="text" value={tenseForm.name_en} onChange={(e) => setTenseForm(f => ({ ...f, name_en: e.target.value }))} className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Tên tiếng Việt</label>
                    <input type="text" value={tenseForm.name_vi} onChange={(e) => setTenseForm(f => ({ ...f, name_vi: e.target.value }))} className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 transition-colors" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Slug (VD: present-simple) *</label>
                    <input type="text" value={tenseForm.slug} onChange={(e) => setTenseForm(f => ({ ...f, slug: e.target.value }))} className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Youtube ID cho video lý thuyết</label>
                    <input type="text" value={tenseForm.video_id} onChange={(e) => setTenseForm(f => ({ ...f, video_id: e.target.value }))} className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500 transition-colors" />
                  </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                  <h4 className="font-semibold text-sm mb-3">Công thức</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Khẳng định (+)</label>
                      <input type="text" value={tenseForm.formula?.affirmative || ''} onChange={(e) => setTenseForm(f => ({ ...f, formula: { ...f.formula, affirmative: e.target.value } }))} className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-2 text-sm text-slate-800 dark:text-slate-200" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Phủ định (-)</label>
                      <input type="text" value={tenseForm.formula?.negative || ''} onChange={(e) => setTenseForm(f => ({ ...f, formula: { ...f.formula, negative: e.target.value } }))} className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-2 text-sm text-slate-800 dark:text-slate-200" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Nghi vấn (?)</label>
                      <input type="text" value={tenseForm.formula?.interrogative || ''} onChange={(e) => setTenseForm(f => ({ ...f, formula: { ...f.formula, interrogative: e.target.value } }))} className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-2 text-sm text-slate-800 dark:text-slate-200" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cách dùng (Usage)</label>
                      <button onClick={() => setTenseForm(f => ({ ...f, usage: [...f.usage, ''] }))} className="text-amber-600 text-xs font-bold">+ Thêm</button>
                    </div>
                    {tenseForm.usage.map((u, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <input type="text" value={u} onChange={(e) => {
                          const newUsage = [...tenseForm.usage];
                          newUsage[i] = e.target.value;
                          setTenseForm(f => ({ ...f, usage: newUsage }));
                        }} className="flex-1 bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-lg px-3 py-1.5 text-sm text-slate-800 dark:text-slate-200" />
                        <button onClick={() => setTenseForm(f => ({ ...f, usage: f.usage.filter((_, idx) => idx !== i) }))} className="text-red-500 p-2"><Trash2 size={14}/></button>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Dấu hiệu nhận biết (Signals)</label>
                      <button onClick={() => setTenseForm(f => ({ ...f, signals: [...f.signals, ''] }))} className="text-amber-600 text-xs font-bold">+ Thêm</button>
                    </div>
                    {tenseForm.signals.map((s, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <input type="text" value={s} onChange={(e) => {
                          const newSignals = [...tenseForm.signals];
                          newSignals[i] = e.target.value;
                          setTenseForm(f => ({ ...f, signals: newSignals }));
                        }} className="flex-1 bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-lg px-3 py-1.5 text-sm text-slate-800 dark:text-slate-200" />
                        <button onClick={() => setTenseForm(f => ({ ...f, signals: f.signals.filter((_, idx) => idx !== i) }))} className="text-red-500 p-2"><Trash2 size={14}/></button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
              <div className="flex gap-3 justify-end mt-5">
                <button onClick={() => { setShowTenseForm(false); setEditingTense(null); }} className="px-4 py-2 text-sm font-medium text-slate-600">Hủy</button>
                <button onClick={handleSaveTense} className="flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg"><Save size={16} />{editingTense ? 'Cập nhật' : 'Tạo mới'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Exercise Form Modal */}
        {showExerciseForm && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#1E1226] rounded-2xl p-6 w-full max-w-lg border border-slate-200 dark:border-[#3A2F43] shadow-2xl">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
                {editingExercise ? 'Sửa bài tập' : 'Thêm bài tập mới'}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Độ khó</label>
                  <select value={exerciseForm.level} onChange={(e) => setExerciseForm(f => ({ ...f, level: e.target.value }))} className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-2.5 text-sm">
                    <option value="basic">Cơ bản (Basic)</option>
                    <option value="advanced">Nâng cao (Advanced)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Câu hỏi *</label>
                  <textarea value={exerciseForm.question} onChange={(e) => setExerciseForm(f => ({ ...f, question: e.target.value }))} className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-3 text-sm resize-none" rows={2} placeholder="Sử dụng [blank] cho ô trống. VD: He [blank] to school every day." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Đáp án *</label>
                  <input type="text" value={exerciseForm.answer} onChange={(e) => setExerciseForm(f => ({ ...f, answer: e.target.value }))} className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-2.5 text-sm" placeholder="Ngăn cách bằng dấu | nếu có nhiều ô trống. VD: goes" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Giải thích (Tùy chọn)</label>
                  <textarea value={exerciseForm.explanation} onChange={(e) => setExerciseForm(f => ({ ...f, explanation: e.target.value }))} className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-3 text-sm resize-none" rows={2} />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-5">
                <button onClick={() => { setShowExerciseForm(false); setEditingExercise(null); }} className="px-4 py-2 text-sm font-medium text-slate-600">Hủy</button>
                <button onClick={handleSaveExercise} className="flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg"><Save size={16} />{editingExercise ? 'Cập nhật' : 'Thêm'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Tenses List */}
        <div className="space-y-3">
          {tenses.length === 0 && (
            <div className="bg-white dark:bg-[#1E1226] rounded-2xl p-10 text-center border border-dashed border-slate-300 dark:border-[#3A2F43] text-slate-500 dark:text-slate-400">
              Chưa có dữ liệu các thì.
            </div>
          )}

          {tenses.map((tense) => (
            <div key={tense.id} className="bg-white dark:bg-[#1E1226] rounded-2xl border border-slate-100 dark:border-[#3A2F43] overflow-hidden transition-colors">
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#232736] transition-colors"
                onClick={() => toggleTense(tense.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
                    <BookType size={16} className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate">{tense.name_en}</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{tense.name_vi}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); setEditingTense(tense); setTenseForm({ name_en: tense.name_en, name_vi: tense.name_vi, slug: tense.slug, video_id: tense.video_id, formula: tense.formula || { affirmative: '', negative: '', interrogative: '' }, usage: tense.usage || [''], signals: tense.signals || [''] }); setShowTenseForm(true); }} className="p-2 text-slate-400 hover:text-blue-600 dark:hover:bg-blue-50/10 rounded-lg"><Pencil size={15} /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteTense(tense.id); }} className="p-2 text-slate-400 hover:text-red-600 dark:hover:bg-red-50/10 rounded-lg"><Trash2 size={15} /></button>
                  {expandedTenseId === tense.id ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </div>
              </div>

              {expandedTenseId === tense.id && (
                <div className="border-t border-slate-100 dark:border-[#3A2F43] bg-slate-50/50 dark:bg-[#0F1117]/50 px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300">Bài tập ({exercises.length})</h4>
                    <button onClick={() => { setEditingExercise(null); setExerciseForm({ level: 'basic', question: '', answer: '', explanation: '' }); setShowExerciseForm(true); }} className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 px-3 py-1.5 rounded-lg"><Plus size={14} />Thêm bài tập</button>
                  </div>

                  {loadingExercises ? (
                    <div className="py-6 text-center"><div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
                  ) : exercises.length === 0 ? (
                    <div className="py-6 text-center text-sm text-slate-400">Chưa có bài tập nào.</div>
                  ) : (
                    <div className="space-y-2">
                      {exercises.map((ex, idx) => (
                        <div key={ex.id} className="bg-white dark:bg-[#1E1226] rounded-xl px-4 py-3 border border-slate-100 dark:border-[#3A2F43] flex items-start gap-3">
                          <span className="text-xs font-bold text-slate-300 dark:text-slate-600 mt-1 shrink-0 w-6 text-center">{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="mb-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${ex.level === 'basic' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'}`}>
                                {ex.level}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-0.5">{ex.question}</p>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Đáp án: {ex.answer}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => { setEditingExercise(ex); setExerciseForm({ level: ex.level, question: ex.question, answer: ex.answer, explanation: ex.explanation || '' }); setShowExerciseForm(true); }} className="p-1.5 text-slate-400 hover:text-blue-600"><Pencil size={13} /></button>
                            <button onClick={() => handleDeleteExercise(ex.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={13} /></button>
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
