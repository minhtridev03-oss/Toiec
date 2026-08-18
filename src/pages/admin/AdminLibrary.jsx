import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

const MAX_COVER_SIZE = 10 * 1024 * 1024;
const MAX_PDF_SIZE = 100 * 1024 * 1024;
const EMPTY_FORM = { title: '', coverUrl: '', filePath: '', pageCount: '', isPublished: true };

let pdfjsPromise;

const loadPdfJs = () => {
  pdfjsPromise ||= import('pdfjs-dist/legacy/build/pdf.mjs').then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    return pdfjs;
  });
  return pdfjsPromise;
};

const readPdfPageCount = async (file) => {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;
  await loadingTask.destroy();
  return pageCount;
};

const extractCoverFromPdf = async (file) => {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const pdf = await loadingTask.promise;
  try {
    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(1.5, 1200 / baseViewport.width) });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    const coverBlob = await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Không tạo được ảnh bìa.'))), 'image/jpeg', 0.88);
    });
    return new File([coverBlob], 'cover-from-pdf.jpg', { type: 'image/jpeg' });
  } finally {
    await loadingTask.destroy();
  }
};

const makeId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const safeFileName = (name) => {
  const normalized = String(name || 'file')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return normalized || 'file';
};

const storagePathFromCoverUrl = (url) => {
  const marker = '/storage/v1/object/public/library-covers/';
  const index = String(url || '').indexOf(marker);
  if (index < 0) return null;
  return decodeURIComponent(String(url).slice(index + marker.length).split('?')[0]);
};

const formatSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

function BookFormModal({
  editingBook,
  form,
  setForm,
  coverFile,
  coverPreview,
  pdfFile,
  coverPageLoading,
  pdfPageLoading,
  saving,
  onClose,
  onSubmit,
  onCoverChange,
  onPdfChange,
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4">
      <div className="my-4 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-[#3A2F43] dark:bg-[#1E1226]">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-[#3A2F43]">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editingBook ? 'Sửa thông tin sách' : 'Thêm sách mới'}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#3A2F43]" aria-label="Đóng"><X size={20} /></button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 p-6">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Tên sách <span className="text-rose-500">*</span></span>
            <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required maxLength={300} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-fuchsia-500 dark:border-[#3A2F43] dark:bg-[#120C17] dark:text-white" placeholder="Ví dụ: Destination B2: Grammar & Vocabulary" />
          </label>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Ảnh bìa {!editingBook && <span className="text-rose-500">*</span>}</span>
              <label className="group relative flex aspect-[3/4] cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-fuchsia-200 bg-fuchsia-50 dark:border-fuchsia-900 dark:bg-fuchsia-950/20">
                {coverPreview ? <img src={coverPreview} alt="Xem trước ảnh bìa" className="h-full w-full object-cover" /> : <div className="text-center text-slate-400"><ImagePlus className="mx-auto" size={30} /><span className="mt-2 block text-xs">Chọn JPG hoặc PDF bìa</span></div>}
                <input type="file" accept="image/*,application/pdf,.pdf" onChange={onCoverChange} className="sr-only" />
                {coverPreview && <span className="absolute inset-x-2 bottom-2 rounded-lg bg-slate-950/70 px-2 py-1 text-center text-xs text-white opacity-0 transition group-hover:opacity-100">Đổi ảnh bìa</span>}
              </label>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Có thể chọn ảnh JPG/PNG hoặc PDF bìa; nếu chọn PDF, hệ thống lấy trang đầu làm ảnh.</p>
              {coverFile && <p className="mt-1 truncate text-xs text-slate-500">{coverFile.name} · {formatSize(coverFile.size)}</p>}
              {coverPageLoading && <p className="mt-1 text-xs text-fuchsia-600">Đang trích ảnh bìa từ PDF…</p>}
            </div>

            <div className="space-y-4">
              <div>
                <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">File PDF {!editingBook && <span className="text-rose-500">*</span>}</span>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 p-4 transition hover:border-fuchsia-400 dark:border-[#3A2F43]">
                  <Upload className="shrink-0 text-fuchsia-500" size={24} />
                  <div className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">{pdfFile ? pdfFile.name : editingBook?.file_path ? 'Đổi file PDF hiện tại' : 'Chọn file PDF'}</span>
                    <span className="block truncate text-xs text-slate-500">{pdfPageLoading ? 'Đang đọc số trang PDF…' : pdfFile ? formatSize(pdfFile.size) : editingBook?.file_path || 'Tối đa 100 MB'}</span>
                  </div>
                  <input type="file" accept="application/pdf,.pdf" onChange={onPdfChange} className="sr-only" />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Số trang <span className="font-normal text-slate-400">(tự động từ PDF)</span></span>
                <input type="number" min="1" value={form.pageCount} onChange={(event) => setForm((current) => ({ ...current, pageCount: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-fuchsia-500 dark:border-[#3A2F43] dark:bg-[#120C17] dark:text-white" placeholder="Tự động đọc từ PDF" />
                {pdfPageLoading && <span className="mt-1 block text-xs text-fuchsia-600">Đang đọc số trang PDF…</span>}
              </label>

              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                <input type="checkbox" checked={form.isPublished} onChange={(event) => setForm((current) => ({ ...current, isPublished: event.target.checked }))} className="h-4 w-4 accent-fuchsia-600" />
                Hiển thị sách cho người học
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-[#3A2F43]">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-[#3A2F43] dark:text-slate-300 dark:hover:bg-[#2a1c35]">Hủy</button>
            <button type="submit" disabled={saving || coverPageLoading || pdfPageLoading} className="inline-flex items-center gap-2 rounded-xl bg-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
              {saving ? 'Đang lưu...' : coverPageLoading ? 'Đang tạo ảnh bìa...' : pdfPageLoading ? 'Đang đọc PDF...' : 'Lưu sách'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminLibrary() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [coverFile, setCoverFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [coverPageLoading, setCoverPageLoading] = useState(false);
  const [pdfPageLoading, setPdfPageLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const coverReadRequest = useRef(0);
  const pdfReadRequest = useRef(0);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('library_books').select('id, title, cover_url, file_path, page_count, is_published, created_at').order('created_at', { ascending: false });
    if (error) showToast(`Không tải được danh sách sách: ${error.message}`, 'error');
    else setBooks(data || []);
    setLoading(false);
  }, [showToast]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  const resetForm = () => {
    coverReadRequest.current += 1;
    pdfReadRequest.current += 1;
    if (coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview);
    setShowForm(false);
    setEditingBook(null);
    setForm(EMPTY_FORM);
    setCoverFile(null);
    setPdfFile(null);
    setCoverPreview('');
    setCoverPageLoading(false);
    setPdfPageLoading(false);
  };

  const openCreate = () => {
    coverReadRequest.current += 1;
    pdfReadRequest.current += 1;
    setEditingBook(null);
    setForm(EMPTY_FORM);
    setCoverFile(null);
    setPdfFile(null);
    setCoverPreview('');
    setCoverPageLoading(false);
    setPdfPageLoading(false);
    setShowForm(true);
  };

  const openEdit = (book) => {
    coverReadRequest.current += 1;
    pdfReadRequest.current += 1;
    setEditingBook(book);
    setForm({ title: book.title || '', coverUrl: book.cover_url || '', filePath: book.file_path || '', pageCount: book.page_count || '', isPublished: book.is_published !== false });
    setCoverFile(null);
    setPdfFile(null);
    setCoverPreview(book.cover_url || '');
    setCoverPageLoading(false);
    setPdfPageLoading(false);
    setShowForm(true);
  };

  const handleCoverChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_COVER_SIZE) return showToast('Ảnh bìa tối đa 10 MB.', 'error');

    const requestId = coverReadRequest.current + 1;
    coverReadRequest.current = requestId;
    if (coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview);
    setCoverPageLoading(false);

    if (file.type.startsWith('image/')) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
      return;
    }
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return showToast('Ảnh bìa phải là JPG, PNG hoặc PDF.', 'error');
    }

    setCoverFile(null);
    setCoverPreview('');
    setCoverPageLoading(true);
    extractCoverFromPdf(file)
      .then((nextCoverFile) => {
        if (requestId !== coverReadRequest.current) return;
        setCoverFile(nextCoverFile);
        setCoverPreview(URL.createObjectURL(nextCoverFile));
      })
      .catch((error) => {
        if (requestId === coverReadRequest.current) showToast(`Không trích được ảnh bìa: ${error.message}`, 'error');
      })
      .finally(() => {
        if (requestId === coverReadRequest.current) setCoverPageLoading(false);
      });
  };

  const handlePdfChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return showToast('File tài liệu phải có định dạng PDF.', 'error');
    if (file.size > MAX_PDF_SIZE) return showToast('PDF tối đa 100 MB.', 'error');

    const requestId = pdfReadRequest.current + 1;
    pdfReadRequest.current = requestId;
    setPdfFile(file);
    setForm((current) => ({ ...current, pageCount: '' }));
    setPdfPageLoading(true);
    readPdfPageCount(file)
      .then((pageCount) => {
        if (requestId === pdfReadRequest.current) setForm((current) => ({ ...current, pageCount: String(pageCount) }));
      })
      .catch((error) => {
        if (requestId !== pdfReadRequest.current) return;
        showToast(`Không đọc được số trang PDF: ${error.message}`, 'error');
      })
      .finally(() => {
        if (requestId === pdfReadRequest.current) setPdfPageLoading(false);
      });
  };

  const uploadFile = async (bucket, path, file) => {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: '31536000', contentType: file.type, upsert: false });
    if (error) throw error;
  };

  const removeUploadedFiles = async (files) => {
    await Promise.all(files.map(({ bucket, path }) => supabase.storage.from(bucket).remove([path])));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) return showToast('Vui lòng nhập tên sách.', 'error');
    if (!editingBook && !coverFile) return showToast('Vui lòng chọn ảnh bìa.', 'error');
    if (!editingBook && !pdfFile) return showToast('Vui lòng chọn file PDF.', 'error');
    if (coverPageLoading || pdfPageLoading) return showToast('Đang xử lý file, hãy chờ một chút.', 'error');

    const pageCount = form.pageCount === '' ? null : Number(form.pageCount);
    if (pageCount !== null && (!Number.isInteger(pageCount) || pageCount < 1)) return showToast('Số trang phải là số nguyên lớn hơn 0.', 'error');

    setSaving(true);
    const bookId = editingBook?.id || makeId();
    const uploaded = [];
    const oldCoverPath = storagePathFromCoverUrl(editingBook?.cover_url);
    const oldPdfPath = editingBook?.file_path || null;
    let coverUrl = editingBook?.cover_url || form.coverUrl || '';
    let filePath = editingBook?.file_path || form.filePath || '';

    try {
      if (coverFile) {
        const coverPath = `books/${bookId}/cover-${Date.now()}-${safeFileName(coverFile.name)}`;
        await uploadFile('library-covers', coverPath, coverFile);
        uploaded.push({ bucket: 'library-covers', path: coverPath });
        coverUrl = supabase.storage.from('library-covers').getPublicUrl(coverPath).data.publicUrl;
      }
      if (pdfFile) {
        const nextPdfPath = `books/${bookId}/pdf-${Date.now()}-${safeFileName(pdfFile.name)}`;
        await uploadFile('library-pdfs', nextPdfPath, pdfFile);
        uploaded.push({ bucket: 'library-pdfs', path: nextPdfPath });
        filePath = nextPdfPath;
      }
      if (!coverUrl || !filePath) throw new Error('Sách cần có cả ảnh bìa và file PDF.');

      const payload = { title, cover_url: coverUrl, file_path: filePath, page_count: pageCount, is_published: Boolean(form.isPublished) };
      const query = editingBook ? supabase.from('library_books').update(payload).eq('id', editingBook.id) : supabase.from('library_books').insert({ id: bookId, ...payload });
      const { error } = await query;
      if (error) throw error;

      const staleFiles = [];
      const newCoverPath = uploaded.find((file) => file.bucket === 'library-covers')?.path;
      if (coverFile && oldCoverPath && oldCoverPath !== newCoverPath) staleFiles.push({ bucket: 'library-covers', path: oldCoverPath });
      if (pdfFile && oldPdfPath && oldPdfPath !== filePath) staleFiles.push({ bucket: 'library-pdfs', path: oldPdfPath });
      if (staleFiles.length) await removeUploadedFiles(staleFiles);

      showToast(editingBook ? 'Đã cập nhật sách.' : 'Đã thêm sách mới.');
      resetForm();
      await fetchBooks();
    } catch (error) {
      if (uploaded.length) await removeUploadedFiles(uploaded);
      showToast(`Lỗi lưu sách: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (book) => {
    if (!window.confirm(`Xóa sách “${book.title}”?`)) return;
    setDeletingId(book.id);
    const { error } = await supabase.from('library_books').delete().eq('id', book.id);
    if (error) {
      showToast(`Không thể xóa sách: ${error.message}`, 'error');
      setDeletingId(null);
      return;
    }
    const paths = [{ bucket: 'library-pdfs', path: book.file_path }, { bucket: 'library-covers', path: storagePathFromCoverUrl(book.cover_url) }].filter((file) => file.path);
    if (paths.length) await removeUploadedFiles(paths);
    setBooks((current) => current.filter((item) => item.id !== book.id));
    setDeletingId(null);
    showToast('Đã xóa sách.');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 transition-colors dark:bg-[#0F1117] md:p-10">
      {toast && <div className={`fixed right-6 top-6 z-[100] flex max-w-sm items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-xl ${toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}><span>{toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}</span>{toast.message}</div>}
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div><div className="mb-1 flex items-center gap-3"><BookOpen size={27} className="text-fuchsia-600 dark:text-fuchsia-400" /><h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Quản lý thư viện sách</h1></div><p className="text-sm text-slate-500 dark:text-slate-400">{books.length} sách · đồng bộ ảnh bìa và PDF trong Storage</p></div>
          <button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-fuchsia-600 px-5 py-2.5 font-semibold text-white shadow-lg shadow-fuchsia-200 transition hover:bg-fuchsia-700 dark:shadow-fuchsia-950/40"><Plus size={18} />Thêm sách</button>
        </div>
        {loading ? <div className="flex min-h-48 items-center justify-center"><Loader2 className="animate-spin text-fuchsia-600" size={30} /></div> : books.length === 0 ? <div className="rounded-2xl border border-dashed border-fuchsia-300 bg-white p-12 text-center dark:border-fuchsia-800 dark:bg-[#1E1226]"><BookOpen className="mx-auto text-fuchsia-500" size={38} /><p className="mt-3 font-semibold text-slate-700 dark:text-white">Chưa có sách nào</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Bấm “Thêm sách” để tải ảnh bìa và PDF.</p></div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{books.map((book) => <article key={book.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#3A2F43] dark:bg-[#1E1226]"><div className="aspect-[3/4] bg-fuchsia-50 dark:bg-fuchsia-950/20">{book.cover_url ? <img src={book.cover_url} alt={book.title} className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center text-fuchsia-400"><BookOpen size={42} /></div>}</div><div className="p-4"><div className="flex items-start justify-between gap-3"><h2 className="min-w-0 break-words font-bold text-slate-800 dark:text-white">{book.title}</h2><span title={book.is_published ? 'Đang hiển thị' : 'Đang ẩn'} className={book.is_published ? 'text-emerald-500' : 'text-slate-400'}>{book.is_published ? <Eye size={18} /> : <EyeOff size={18} />}</span></div><p className="mt-2 flex items-center gap-1 truncate text-xs text-slate-500 dark:text-slate-400"><FileText size={14} />{book.file_path?.split('/').pop() || 'Chưa có PDF'}</p><div className="mt-4 flex gap-2"><button type="button" onClick={() => openEdit(book)} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-fuchsia-200 px-3 py-2 text-sm font-semibold text-fuchsia-700 transition hover:bg-fuchsia-50 dark:border-fuchsia-800 dark:text-fuchsia-200 dark:hover:bg-fuchsia-950/40"><Pencil size={15} />Sửa</button><button type="button" onClick={() => handleDelete(book)} disabled={deletingId === book.id} className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40">{deletingId === book.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}Xóa</button></div></div></article>)}</div>}
      </div>
      {showForm && <BookFormModal editingBook={editingBook} form={form} setForm={setForm} coverFile={coverFile} coverPreview={coverPreview} pdfFile={pdfFile} coverPageLoading={coverPageLoading} pdfPageLoading={pdfPageLoading} saving={saving} onClose={resetForm} onSubmit={handleSave} onCoverChange={handleCoverChange} onPdfChange={handlePdfChange} />}
    </div>
  );
}
