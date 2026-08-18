import { useEffect, useMemo, useState } from 'react';
import { BookOpen, FileText, Search } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import FlipbookReader from '../components/library/FlipbookReader';

const EMPTY_READER = { book: null, url: '', page: 1 };

export default function Library() {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [reader, setReader] = useState(EMPTY_READER);
  const [readerLoading, setReaderLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const loadBooks = async () => {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('library_books')
        .select('id, title, cover_url, file_path, page_count, is_published, created_at')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      if (!active) return;
      if (fetchError) setError('Chưa tải được thư viện tài liệu. Hãy kiểm tra migration Supabase.');
      else setBooks(data || []);
      setLoading(false);
    };
    loadBooks();
    return () => { active = false; };
  }, []);

  const filteredBooks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return books.filter((book) => !normalized || book.title.toLowerCase().includes(normalized));
  }, [books, query]);

  const openReader = async (book) => {
    if (!book.file_path) {
      setError('Sách này chưa được gắn file PDF trong Storage.');
      return;
    }
    setError('');
    setReaderLoading(true);
    const [{ data: signed, error: signedError }, { data: progress }] = await Promise.all([
      supabase.storage.from('library-pdfs').createSignedUrl(book.file_path, 3600),
      supabase.from('user_library_progress').select('current_page').eq('user_id', user?.id).eq('book_id', book.id).maybeSingle(),
    ]);
    if (signedError || !signed?.signedUrl) {
      setError('Không thể mở PDF. Kiểm tra file_path và file trong Storage.');
      setReaderLoading(false);
      return;
    }
    const page = Math.max(1, Number(progress?.current_page || 1));
    setReader({ book, url: signed.signedUrl, page });
    setReaderLoading(false);
  };

  const saveProgress = async (nextPage) => {
    if (!reader.book || !user?.id) return;
    const maxPage = Number(reader.book.page_count || 99999);
    const page = Math.min(maxPage, Math.max(1, Number(nextPage) || 1));
    setReader((current) => ({ ...current, page }));
    await supabase.from('user_library_progress').upsert({
      user_id: user.id,
      book_id: reader.book.id,
      current_page: page,
      last_opened_at: new Date().toISOString(),
    });
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
      <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-fuchsia-600 dark:text-fuchsia-300">Tài liệu học tập</p>
          <h1 className="mt-1 text-3xl font-extrabold text-slate-900 dark:text-white">Thư viện tài liệu</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-300">Đọc sách và PDF theo chế độ lật sách. File chỉ được tải khi bạn mở tài liệu.</p>
        </div>
        <label className="relative w-full md:w-72">
          <Search size={17} className="absolute left-3 top-3 text-slate-400" />
          <input aria-label="Tìm sách" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm sách..." className="w-full rounded-xl border border-pink-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-fuchsia-500 dark:border-fuchsia-900 dark:bg-[#21132b] dark:text-white" />
        </label>
      </div>
      {error && <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</div>}
      {loading ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6"><div className="aspect-[3/4] animate-pulse rounded-2xl bg-slate-200 dark:bg-fuchsia-950/30" /><div className="aspect-[3/4] animate-pulse rounded-2xl bg-slate-200 dark:bg-fuchsia-950/30" /><div className="aspect-[3/4] animate-pulse rounded-2xl bg-slate-200 dark:bg-fuchsia-950/30" /></div> : filteredBooks.length === 0 ? <div className="rounded-2xl border border-dashed border-pink-300 p-12 text-center dark:border-fuchsia-800"><FileText className="mx-auto text-fuchsia-500" size={36} /><p className="mt-3 font-semibold text-slate-700 dark:text-white">Chưa có sách phù hợp</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Admin có thể thêm ảnh bìa, tên sách và file PDF trong Storage.</p></div> : <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">{filteredBooks.map((book) => <button key={book.id} type="button" onClick={() => openReader(book)} className="group text-left"><article className="overflow-hidden rounded-2xl border border-pink-100 bg-white p-2 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-fuchsia-300 hover:shadow-xl dark:border-fuchsia-900/60 dark:bg-[#21132b]"><div className="aspect-[3/4] overflow-hidden rounded-xl bg-pink-50 dark:bg-fuchsia-950/20">{book.cover_url ? <img src={book.cover_url} alt={book.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" /> : <div className="flex h-full items-center justify-center text-fuchsia-400"><BookOpen size={42} /></div>}</div><h2 className="min-h-[4.5rem] whitespace-normal break-words px-1 pb-2 pt-3 text-center text-sm font-bold leading-5 text-slate-800 dark:text-white sm:text-base">{book.title}</h2></article></button>)}</div>}
      {readerLoading && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50"><div className="rounded-xl bg-white px-5 py-4 text-sm dark:bg-[#21132b] dark:text-white">Đang mở PDF…</div></div>}
      {reader.book && reader.url && <FlipbookReader url={reader.url} title={reader.book.title} pageCount={reader.book.page_count} initialPage={reader.page} onPageChange={saveProgress} onClose={() => setReader(EMPTY_READER)} />}
    </div>
  );
}
