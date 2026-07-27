import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
  Plus, Pencil, Trash2, Save, X, ChevronDown, ChevronRight,
  FileText, AlertCircle, CheckCircle2, Upload, Download,
  FolderOpen, BookOpen, Loader2, Table2, Image as ImageIcon
} from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────
const Toast = ({ toast }) => {
  if (!toast) return null;
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold transition-all
      ${toast.type === 'error'
        ? 'bg-red-500 text-white'
        : toast.type === 'warning'
          ? 'bg-amber-500 text-white'
          : 'bg-emerald-500 text-white'}`}>
      {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
      {toast.message}
    </div>
  );
};

const Badge = ({ children, color = 'slate' }) => {
  const colors = {
    slate: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
    purple: 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
    indigo: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${colors[color]}`}>
      {children}
    </span>
  );
};

// ── parse CSV ─────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map(line => {
    const cols = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQuote = !inQuote; }
      else if (c === ',' && !inQuote) { cols.push(cur.trim()); cur = ''; }
      else { cur += c; }
    }
    cols.push(cur.trim());
    const row = {};
    headers.forEach((h, i) => { row[h] = (cols[i] || '').replace(/^"|"$/g, '').trim(); });
    return row;
  }).filter(r => Object.values(r).some(v => v !== ''));
  return { headers, rows };
}

// ── main component ────────────────────────────────────────────────────────────
export default function AdminVocab() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCatId, setExpandedCatId] = useState(null);
  const [expandedSubCatId, setExpandedSubCatId] = useState(null);
  const [vocabularies, setVocabularies] = useState([]);
  const [loadingVocab, setLoadingVocab] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'import'

  // Import CSV state
  const [importTarget, setImportTarget] = useState('vocab'); // 'categories' | 'sub_categories' | 'vocab'
  const [csvData, setCsvData] = useState(null); // { headers, rows }
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importCatId, setImportCatId] = useState(''); // for sub_categories import
  const [importSubCatId, setImportSubCatId] = useState(''); // for vocab import
  const fileInputRef = useRef(null);
  const catImageInputRef = useRef(null);

  // Category modal
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [catForm, setCatForm] = useState({ name: '', img: '', description: '' });
  const [catFile, setCatFile] = useState(null); // File to upload
  const [uploadingImage, setUploadingImage] = useState(false);

  // SubCat modal
  const [showSubCatModal, setShowSubCatModal] = useState(false);
  const [editingSubCat, setEditingSubCat] = useState(null);
  const [subCatForm, setSubCatForm] = useState({ name: '', category_id: null });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => { fetchCategories(); }, []);

  // ── data ──────────────────────────────────────────────────────────────────
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*, sub_categories(*)')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setCategories((data || []).map(cat => ({
        ...cat,
        sub_categories: (cat.sub_categories || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
      })));
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchVocabularies = async (subCategoryId) => {
    setLoadingVocab(true);
    try {
      const { data, error } = await supabase
        .from('topic_vocabularies')
        .select('*')
        .eq('sub_category_id', subCategoryId)
        .order('id', { ascending: true });
      if (error) throw error;
      setVocabularies(data || []);
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    } finally {
      setLoadingVocab(false);
    }
  };

  // ── category CRUD ─────────────────────────────────────────────────────────
  const handleSaveCategory = async () => {
    if (!catForm.name.trim()) { showToast('Nhập tên chủ đề', 'error'); return; }
    setUploadingImage(true);
    try {
      let finalCatId = editingCat?.id;

      // Step 1: Insert or Update text fields
      if (editingCat) {
        const { error } = await supabase.from('categories').update({ name: catForm.name }).eq('id', finalCatId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('categories').insert([{ name: catForm.name }]).select().single();
        if (error) throw error;
        finalCatId = data.id;
      }

      // Step 2: Upload image if selected
      if (catFile && finalCatId) {
        const { error: uploadError } = await supabase.storage
          .from('topic-images')
          .upload(`${finalCatId}.jpg`, catFile, {
            cacheControl: '3600',
            upsert: true,
            contentType: catFile.type
          });
        if (uploadError) throw uploadError;
      }

      showToast(editingCat ? 'Đã cập nhật chủ đề!' : 'Đã tạo chủ đề!');
      closeCatModal();
      fetchCategories();
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const closeCatModal = () => {
    setShowCatModal(false);
    setEditingCat(null);
    setCatForm({ name: '', img: '', description: '' });
    setCatFile(null);
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Xóa chủ đề này và tất cả dữ liệu bên trong?')) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      showToast('Đã xóa chủ đề!');
      if (expandedCatId === id) { setExpandedCatId(null); setExpandedSubCatId(null); setVocabularies([]); }
      fetchCategories();
    } catch (err) { showToast('Lỗi: ' + err.message, 'error'); }
  };

  // ── subcategory CRUD ──────────────────────────────────────────────────────
  const handleSaveSubCategory = async () => {
    if (!subCatForm.name.trim()) { showToast('Nhập tên chủ đề phụ', 'error'); return; }
    try {
      if (editingSubCat) {
        const { error } = await supabase.from('sub_categories').update({ name: subCatForm.name }).eq('id', editingSubCat.id);
        if (error) throw error;
        showToast('Đã cập nhật chủ đề phụ!');
      } else {
        const { error } = await supabase.from('sub_categories').insert([{ name: subCatForm.name, category_id: subCatForm.category_id }]);
        if (error) throw error;
        showToast('Đã tạo chủ đề phụ!');
      }
      closeSubCatModal();
      fetchCategories();
    } catch (err) { showToast('Lỗi: ' + err.message, 'error'); }
  };

  const closeSubCatModal = () => {
    setShowSubCatModal(false);
    setEditingSubCat(null);
    setSubCatForm({ name: '', category_id: null });
  };

  const handleDeleteSubCategory = async (id) => {
    if (!window.confirm('Xóa chủ đề phụ và tất cả từ vựng bên trong?')) return;
    try {
      const { error } = await supabase.from('sub_categories').delete().eq('id', id);
      if (error) throw error;
      showToast('Đã xóa chủ đề phụ!');
      if (expandedSubCatId === id) { setExpandedSubCatId(null); setVocabularies([]); }
      fetchCategories();
    } catch (err) { showToast('Lỗi: ' + err.message, 'error'); }
  };

  const handleDeleteVocab = async (id) => {
    if (!window.confirm('Xóa từ vựng này?')) return;
    try {
      const { error } = await supabase.from('topic_vocabularies').delete().eq('id', id);
      if (error) throw error;
      showToast('Đã xóa từ vựng!');
      setVocabularies(prev => prev.filter(v => v.id !== id));
    } catch (err) { showToast('Lỗi: ' + err.message, 'error'); }
  };

  // ── CSV import ────────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { headers, rows } = parseCSV(ev.target.result);
      setCsvData({ headers, rows });
      setImportResult(null);
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleCatImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCatFile(file);
    }
  };

  const getImportTableInfo = () => {
    if (importTarget === 'categories') return { table: 'categories', label: 'Chủ đề chính (categories)' };
    if (importTarget === 'sub_categories') return { table: 'sub_categories', label: 'Chủ đề phụ (sub_categories)' };
    return { table: 'topic_vocabularies', label: 'Từ vựng (topic_vocabularies)' };
  };

  const handleImport = async () => {
    if (!csvData || csvData.rows.length === 0) { showToast('Chưa có dữ liệu CSV', 'error'); return; }
    const { table } = getImportTableInfo();

    if (importTarget === 'sub_categories' && !importCatId) {
      showToast('Chọn chủ đề chính cho import chủ đề phụ', 'error'); return;
    }
    if (importTarget === 'vocab' && !importSubCatId) {
      showToast('Chọn chủ đề phụ cho import từ vựng', 'error'); return;
    }

    setImporting(true);
    setImportResult(null);
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    try {
      const rows = csvData.rows.map(row => {
        const cleaned = { ...row };
        if (importTarget === 'sub_categories' && !cleaned.category_id) {
          cleaned.category_id = importCatId;
        }
        if (importTarget === 'vocab' && !cleaned.sub_category_id) {
          cleaned.sub_category_id = importSubCatId;
        }
        Object.keys(cleaned).forEach(k => { if (cleaned[k] === '') delete cleaned[k]; });
        return cleaned;
      });

      const CHUNK = 200;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK);
        const { error } = await supabase.from(table).insert(chunk);
        if (error) {
          errorCount += chunk.length;
          errors.push(`Chunk ${Math.floor(i / CHUNK) + 1}: ${error.message}`);
        } else {
          successCount += chunk.length;
        }
      }

      setImportResult({ success: successCount, error: errorCount, errors });
      if (successCount > 0) {
        showToast(`Đã import ${successCount} dòng thành công!`);
        fetchCategories();
      }
      if (errorCount > 0) {
        showToast(`${errorCount} dòng lỗi`, 'error');
      }
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    } finally {
      setImporting(false);
    }
  };

  // ── CSV template download ─────────────────────────────────────────────────
  const downloadTemplate = () => {
    const templates = {
      categories: 'name\n"Chủ đề mẫu"',
      sub_categories: 'name,category_id\n"Chủ đề nhỏ mẫu","<category_uuid>"',
      vocab: 'word,mean,pro,pos,example,example_mean,sub_category_id\n"example","\u00ede d\u1ee5","/\u026a\u0261\u02c8z\u00e6mp\u0259l/","noun","This is an example.","\u0110\u00e2y l\u00e0 m\u1ed9t v\u00ed d\u1ee5.","<sub_category_uuid>"',
    };
    const content = templates[importTarget];
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `template-${importTarget}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ── UI helpers ────────────────────────────────────────────────────────────
  const cardCls = 'bg-white dark:bg-[#1E1226] border border-slate-200 dark:border-[#3A2F43] rounded-2xl transition-colors';
  const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#3A2F43] bg-slate-50 dark:bg-[#160B1E] text-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-colors';
  const btnPrimary = 'flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-purple-200 dark:shadow-purple-900/30 transition-all cursor-pointer';
  const btnDanger = 'p-1.5 rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors cursor-pointer';
  const btnGhost = 'p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#3A2F43] hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer';

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-16">
        <Loader2 className="animate-spin text-purple-500" size={40} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-slate-50 dark:bg-[#0F1117] pb-32 relative">
      <Toast toast={toast} />

      {/* ── Page Header ── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-200 dark:shadow-purple-900/30">
              <BookOpen size={20} className="text-white" />
            </div>
            Quản lý từ vựng
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Duyệt, chỉnh sửa hoặc import CSV vào Supabase</p>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-6 bg-white dark:bg-[#1E1226] border border-slate-200 dark:border-[#3A2F43] p-1 rounded-2xl w-fit shadow-sm">
        {[
          { key: 'browse', label: 'Duyệt dữ liệu', icon: FolderOpen },
          { key: 'import', label: 'Import CSV', icon: Upload },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer
              ${activeTab === tab.key
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
          >
            <tab.icon size={15} /> {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: Browse */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'browse' && (
        <div className="space-y-4 max-w-5xl">
          {/* Add Category button */}
          <div className="flex justify-end">
            <button
              className={btnPrimary}
              onClick={() => { setCatForm({ name: '', img: '', description: '' }); setEditingCat(null); setShowCatModal(true); }}
            >
              <Plus size={16} /> Thêm chủ đề chính
            </button>
          </div>

          {/* Categories list */}
          {categories.length === 0 ? (
            <div className={`${cardCls} p-12 text-center shadow-sm`}>
              <BookOpen size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-400 dark:text-slate-500">Chưa có chủ đề nào. Hãy import CSV hoặc thêm thủ công.</p>
            </div>
          ) : (
            categories.map(cat => (
              <div key={cat.id} className={`${cardCls} shadow-sm overflow-hidden`}>
                {/* Category row */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#2A1F33] transition-colors"
                  onClick={() => {
                    setExpandedCatId(expandedCatId === cat.id ? null : cat.id);
                    setExpandedSubCatId(null); setVocabularies([]);
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {expandedCatId === cat.id ? <ChevronDown size={18} className="text-purple-500 shrink-0" /> : <ChevronRight size={18} className="text-slate-400 shrink-0" />}
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                      <FolderOpen size={18} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-white truncate">{cat.name}</p>
                      <p className="text-xs font-medium text-slate-400 dark:text-slate-500">{cat.sub_categories?.length || 0} chủ đề phụ</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button onClick={e => { e.stopPropagation(); setCatForm({ name: cat.name, img: cat.img || '', description: cat.description || '' }); setEditingCat(cat); setShowCatModal(true); }} className={btnGhost}><Pencil size={16} /></button>
                    <button onClick={e => { e.stopPropagation(); handleDeleteCategory(cat.id); }} className={btnDanger}><Trash2 size={16} /></button>
                  </div>
                </div>

                {/* SubCategories */}
                {expandedCatId === cat.id && (
                  <div className="border-t border-slate-100 dark:border-[#3A2F43]">
                    <div className="px-5 py-3 flex items-center justify-between bg-slate-50/50 dark:bg-[#160B1E]/50">
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Chủ đề phụ</span>
                      <button
                        onClick={() => { setSubCatForm({ name: '', category_id: cat.id }); setEditingSubCat(null); setShowSubCatModal(true); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors cursor-pointer"
                      >
                        <Plus size={14} /> Thêm chủ đề phụ
                      </button>
                    </div>

                    {(cat.sub_categories || []).length === 0 ? (
                      <p className="px-12 py-5 text-sm text-slate-400 dark:text-slate-500 italic">Chưa có chủ đề phụ</p>
                    ) : (
                      <div className="divide-y divide-slate-50 dark:divide-[#2A1F33]">
                        {(cat.sub_categories || []).map(sub => (
                          <div key={sub.id}>
                            <div
                              className="flex items-center justify-between px-8 py-3.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#2A1F33] transition-colors"
                              onClick={() => {
                                if (expandedSubCatId === sub.id) { setExpandedSubCatId(null); setVocabularies([]); }
                                else { setExpandedSubCatId(sub.id); fetchVocabularies(sub.id); }
                              }}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {expandedSubCatId === sub.id ? <ChevronDown size={15} className="text-indigo-500 shrink-0" /> : <ChevronRight size={15} className="text-slate-300 shrink-0" />}
                                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                                  <FileText size={14} className="text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{sub.name}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                <button onClick={e => { e.stopPropagation(); setSubCatForm({ name: sub.name, category_id: cat.id }); setEditingSubCat(sub); setShowSubCatModal(true); }} className={btnGhost}><Pencil size={15} /></button>
                                <button onClick={e => { e.stopPropagation(); handleDeleteSubCategory(sub.id); }} className={btnDanger}><Trash2 size={15} /></button>
                              </div>
                            </div>

                            {/* Vocab list */}
                            {expandedSubCatId === sub.id && (
                              <div className="bg-slate-50/50 dark:bg-[#160B1E]/50 border-y border-slate-100 dark:border-[#3A2F43] py-2">
                                {loadingVocab ? (
                                  <div className="flex justify-center py-6"><Loader2 className="animate-spin text-indigo-400" size={24} /></div>
                                ) : vocabularies.length === 0 ? (
                                  <p className="px-16 py-4 text-sm text-slate-400 dark:text-slate-500 italic">Chưa có từ vựng — Import CSV để thêm nhanh</p>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm min-w-[600px]">
                                      <thead>
                                        <tr className="border-b border-slate-200/50 dark:border-[#3A2F43]">
                                          {['Từ', 'Nghĩa', 'Phiên âm', 'Loại từ', 'Ví dụ', ''].map(h => (
                                            <th key={h} className="px-5 py-3 text-left text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{h}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-200/50 dark:divide-[#3A2F43]">
                                        {vocabularies.map(v => (
                                          <tr key={v.id} className="hover:bg-white dark:hover:bg-[#1E1226] transition-colors">
                                            <td className="px-5 py-3 font-bold text-slate-800 dark:text-white">{v.word}</td>
                                            <td className="px-5 py-3 text-slate-600 dark:text-slate-300 font-medium">{v.mean}</td>
                                            <td className="px-5 py-3 text-slate-400 dark:text-slate-500 font-mono text-xs">{v.pro}</td>
                                            <td className="px-5 py-3"><Badge color="indigo">{v.pos}</Badge></td>
                                            <td className="px-5 py-3 text-slate-500 dark:text-slate-400 text-xs max-w-[200px] truncate">{v.example}</td>
                                            <td className="px-5 py-3">
                                              <button onClick={() => handleDeleteVocab(v.id)} className={btnDanger}><Trash2 size={15} /></button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    <div className="px-5 py-3 text-xs font-semibold text-slate-400 dark:text-slate-500 text-right bg-white dark:bg-[#1E1226] border-t border-slate-200/50 dark:border-[#3A2F43]">
                                      Tổng cộng {vocabularies.length} từ vựng
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* TAB: Import CSV */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'import' && (
        <div className="space-y-6 max-w-4xl">
          {/* Target selector */}
          <div className={`${cardCls} p-6 shadow-sm`}>
            <h2 className="text-base font-bold text-slate-800 dark:text-white mb-5 flex items-center gap-2">
              <Table2 size={20} className="text-purple-500" /> 1. Chọn bảng đích
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { key: 'categories', label: 'Chủ đề chính', desc: 'Bảng categories', icon: FolderOpen, color: 'purple' },
                { key: 'sub_categories', label: 'Chủ đề phụ', desc: 'Bảng sub_categories', icon: FileText, color: 'indigo' },
                { key: 'vocab', label: 'Từ vựng', desc: 'Bảng topic_vocabularies', icon: BookOpen, color: 'indigo' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => { setImportTarget(opt.key); setCsvData(null); setImportResult(null); }}
                  className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer shadow-sm
                    ${importTarget === opt.key
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-purple-100 dark:shadow-none'
                      : 'border-slate-200 dark:border-[#3A2F43] bg-white dark:bg-[#1E1226] hover:border-purple-300 dark:hover:border-purple-700'}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${importTarget === opt.key ? 'bg-purple-200 dark:bg-purple-900/50' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    <opt.icon size={20} className={importTarget === opt.key ? 'text-purple-700 dark:text-purple-400' : 'text-slate-400'} />
                  </div>
                  <p className={`font-bold text-sm ${importTarget === opt.key ? 'text-purple-700 dark:text-purple-300' : 'text-slate-700 dark:text-slate-300'}`}>{opt.label}</p>
                  <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-1">{opt.desc}</p>
                </button>
              ))}
            </div>

            {/* FK selectors */}
            {importTarget === 'sub_categories' && (
              <div className="mt-5 p-4 bg-slate-50 dark:bg-[#160B1E] rounded-xl border border-slate-100 dark:border-[#3A2F43]">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Chủ đề chính (nếu file CSV không có cột category_id)</label>
                <select className={inputCls} value={importCatId} onChange={e => setImportCatId(e.target.value)}>
                  <option value="">— Chọn hoặc để trống nếu CSV đã có —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            {importTarget === 'vocab' && (
              <div className="mt-5 p-4 bg-slate-50 dark:bg-[#160B1E] rounded-xl border border-slate-100 dark:border-[#3A2F43]">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Chủ đề phụ (nếu file CSV không có cột sub_category_id)</label>
                <select className={inputCls} value={importSubCatId} onChange={e => setImportSubCatId(e.target.value)}>
                  <option value="">— Chọn hoặc để trống nếu CSV đã có —</option>
                  {categories.flatMap(c => (c.sub_categories || []).map(s => (
                    <option key={s.id} value={s.id}>{c.name} › {s.name}</option>
                  )))}
                </select>
              </div>
            )}
          </div>

          {/* Upload zone */}
          <div className={`${cardCls} p-6 shadow-sm`}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Upload size={20} className="text-purple-500" /> 2. Upload file CSV
              </h2>
              <button onClick={downloadTemplate} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors cursor-pointer">
                <Download size={14} /> Tải template CSV
              </button>
            </div>

            <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 dark:border-[#3A2F43] bg-slate-50 dark:bg-[#160B1E] hover:border-purple-400 dark:hover:border-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 rounded-2xl p-12 text-center cursor-pointer transition-colors group"
            >
              <div className="w-16 h-16 rounded-2xl bg-white dark:bg-[#1E1226] shadow-sm border border-slate-100 dark:border-[#3A2F43] flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Upload size={28} className="text-slate-400 dark:text-slate-500 group-hover:text-purple-500 transition-colors" />
              </div>
              <p className="text-base font-bold text-slate-600 dark:text-slate-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Click để chọn file CSV
              </p>
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-2">Encoding UTF-8, tối đa 50MB</p>
            </div>
          </div>

          {/* Preview */}
          {csvData && (
            <div className={`${cardCls} shadow-sm overflow-hidden`}>
              <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-[#3A2F43]">
                <h2 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <FileText size={20} className="text-indigo-500" /> 3. Xem trước & Import
                  <Badge color="purple">{csvData.rows.length} dòng</Badge>
                </h2>
                <button onClick={() => { setCsvData(null); setImportResult(null); }} className="p-2 rounded-xl bg-slate-100 dark:bg-[#3A2F43] text-slate-500 hover:text-red-500 transition-colors cursor-pointer"><X size={16} /></button>
              </div>

              <div className="p-6">
                <div className="overflow-x-auto rounded-xl border border-slate-200/60 dark:border-[#3A2F43] shadow-sm mb-6">
                  <table className="w-full text-xs min-w-max">
                    <thead className="bg-slate-50 dark:bg-[#160B1E]">
                      <tr>
                        {csvData.headers.map(h => (
                          <th key={h} className="px-4 py-3 text-left font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200/60 dark:border-[#3A2F43]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#3A2F43]">
                      {csvData.rows.slice(0, 10).map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-[#1E1226]/50">
                          {csvData.headers.map(h => (
                            <td key={h} className="px-4 py-2.5 text-slate-700 dark:text-slate-300 font-medium max-w-[200px] truncate">{row[h] || '—'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {csvData.rows.length > 10 && (
                    <p className="px-4 py-2.5 text-xs font-semibold text-slate-400 dark:text-slate-500 text-center border-t border-slate-100 dark:border-[#3A2F43] bg-slate-50/50 dark:bg-[#160B1E]/50">
                      ... và {csvData.rows.length - 10} dòng nữa
                    </p>
                  )}
                </div>

                {/* Import button */}
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className={`w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-base font-bold rounded-xl shadow-lg shadow-purple-200 dark:shadow-purple-900/30 transition-all cursor-pointer
                    ${importing ? 'opacity-75 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}
                >
                  {importing ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                  {importing ? 'Đang xử lý...' : `Tiến hành Import ${csvData.rows.length} dòng`}
                </button>
              </div>
            </div>
          )}

          {/* Result */}
          {importResult && (
            <div className={`${cardCls} p-6 shadow-sm border-2 ${importResult.error > 0 ? 'border-amber-400 dark:border-amber-600' : 'border-emerald-400 dark:border-emerald-600'}`}>
              <h2 className="text-base font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <CheckCircle2 size={20} className={importResult.error > 0 ? 'text-amber-500' : 'text-emerald-500'} /> Kết quả Import
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-5 text-center">
                  <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{importResult.success}</p>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 font-bold mt-1">Thành công</p>
                </div>
                <div className={`${importResult.error > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700' : 'bg-slate-50 dark:bg-[#1E1226] border-slate-200 dark:border-[#3A2F43]'} border rounded-xl p-5 text-center`}>
                  <p className={`text-4xl font-black ${importResult.error > 0 ? 'text-red-500' : 'text-slate-400'}`}>{importResult.error}</p>
                  <p className={`text-sm font-bold mt-1 ${importResult.error > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>Lỗi</p>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4 mt-4">
                  <p className="text-xs font-bold text-red-600 dark:text-red-400 mb-2 uppercase tracking-wider">Chi tiết lỗi:</p>
                  <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                    {importResult.errors.map((e, i) => (
                      <li key={i} className="text-xs font-medium text-red-700 dark:text-red-300 flex items-start gap-2">
                        <AlertCircle size={14} className="mt-0.5 shrink-0" /> {e}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MODALS */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      {/* Category Modal */}
      {showCatModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1E1226] rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-[#3A2F43] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-[#3A2F43] flex items-center justify-between bg-slate-50 dark:bg-[#160B1E]">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                <FolderOpen size={20} className="text-purple-500" />
                {editingCat ? 'Chỉnh sửa chủ đề chính' : 'Thêm chủ đề chính'}
              </h3>
              <button onClick={closeCatModal} className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 dark:hover:bg-[#3A2F43] transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Tên chủ đề <span className="text-red-500">*</span></label>
                <input className={inputCls} placeholder="VD: Destination C1 & C2" value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} autoFocus />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Ảnh đại diện (Upload)</label>
                <div className="flex items-center gap-3">
                  <input ref={catImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleCatImageChange} />
                  <button
                    type="button"
                    onClick={() => catImageInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 dark:border-[#3A2F43] text-slate-500 dark:text-slate-400 hover:border-purple-400 hover:text-purple-500 bg-slate-50 dark:bg-[#160B1E] font-medium text-sm transition-colors cursor-pointer"
                  >
                    <ImageIcon size={18} /> {catFile ? catFile.name : 'Chọn ảnh để tải lên bucket topic-images'}
                  </button>
                  {catFile && (
                    <button onClick={() => setCatFile(null)} className="p-2.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors cursor-pointer" title="Bỏ chọn ảnh"><Trash2 size={18} /></button>
                  )}
                </div>
                {!catFile && editingCat?.id && (
                  <p className="text-[11px] text-slate-400 mt-2 font-medium">Lưu ý: Nếu không chọn file mới, ảnh hiện tại (nếu có) sẽ được giữ nguyên.</p>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-[#3A2F43] bg-slate-50 dark:bg-[#160B1E] flex gap-3 justify-end">
              <button onClick={closeCatModal} disabled={uploadingImage} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-[#3A2F43] transition-colors cursor-pointer">Hủy</button>
              <button onClick={handleSaveCategory} disabled={uploadingImage} className={`${btnPrimary} min-w-[120px] justify-center ${uploadingImage ? 'opacity-70' : ''}`}>
                {uploadingImage ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {uploadingImage ? 'Đang lưu...' : 'Lưu chủ đề'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SubCategory Modal */}
      {showSubCatModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1E1226] rounded-3xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-[#3A2F43] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-[#3A2F43] flex items-center justify-between bg-slate-50 dark:bg-[#160B1E]">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                <FileText size={20} className="text-indigo-500" />
                {editingSubCat ? 'Chỉnh sửa chủ đề phụ' : 'Thêm chủ đề phụ'}
              </h3>
              <button onClick={closeSubCatModal} className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 dark:hover:bg-[#3A2F43] transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Tên chủ đề phụ <span className="text-red-500">*</span></label>
              <input className={inputCls} placeholder="VD: Unit 1: Present Time" value={subCatForm.name} onChange={e => setSubCatForm(p => ({ ...p, name: e.target.value }))} autoFocus />
            </div>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-[#3A2F43] bg-slate-50 dark:bg-[#160B1E] flex gap-3 justify-end">
              <button onClick={closeSubCatModal} className="px-5 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-[#3A2F43] transition-colors cursor-pointer">Hủy</button>
              <button onClick={handleSaveSubCategory} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer">
                <Save size={16} /> Lưu lại
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
