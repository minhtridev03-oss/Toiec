import { useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  FileText,
  Search,
  Sparkles,
  Bookmark,
  Clock,
  ArrowRight,
  CheckCircle2,
  Library as LibraryIcon,
  Flame,
  Layers,
  RefreshCw,
  Eye,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const FlipbookReader = lazy(() => import('../components/library/FlipbookReader'));

const EMPTY_READER = { book: null, url: '', page: 1 };

export default function Library() {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'reading' | 'unread'
  const [reader, setReader] = useState(EMPTY_READER);
  const [readerLoading, setReaderLoading] = useState(false);

  const loadBooks = async () => {
    setLoading(true);
    setError('');
    try {
      const [booksRes, progressRes] = await Promise.all([
        supabase
          .from('library_books')
          .select('id, title, cover_url, file_path, page_count, is_published, created_at')
          .eq('is_published', true)
          .order('created_at', { ascending: false }),
        user?.id
          ? supabase
              .from('user_library_progress')
              .select('book_id, current_page, last_opened_at')
              .eq('user_id', user.id)
          : Promise.resolve({ data: [] }),
      ]);

      if (booksRes.error) {
        setError('Chưa tải được thư viện tài liệu. Hãy kiểm tra kết nối.');
      } else {
        setBooks(booksRes.data || []);
        const pMap = {};
        (progressRes.data || []).forEach((row) => {
          pMap[row.book_id] = row;
        });
        setProgressMap(pMap);
      }
    } catch (err) {
      console.error('Error loading library:', err);
      setError('Đã xảy ra lỗi khi tải sách.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    loadBooks();
    return () => {
      active = false;
    };
  }, [user?.id]);

  // Find recently read book for Spotlight card
  const recentBook = useMemo(() => {
    if (!books.length || !Object.keys(progressMap).length) return null;
    let latest = null;
    let latestTime = 0;
    books.forEach((book) => {
      const p = progressMap[book.id];
      if (p?.last_opened_at) {
        const t = new Date(p.last_opened_at).getTime();
        if (t > latestTime) {
          latestTime = t;
          latest = { book, progress: p };
        }
      }
    });
    return latest;
  }, [books, progressMap]);

  // Filter books based on search query & filterMode
  const filteredBooks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return books.filter((book) => {
      const matchesQuery = !normalized || book.title.toLowerCase().includes(normalized);
      if (!matchesQuery) return false;

      const p = progressMap[book.id];
      if (filterMode === 'reading') return !!p && p.current_page > 1;
      if (filterMode === 'unread') return !p || p.current_page <= 1;
      return true;
    });
  }, [books, query, filterMode, progressMap]);

  const openReader = async (book) => {
    if (!book.file_path) {
      setError('Sách này chưa được gắn file PDF trong kho lưu trữ.');
      return;
    }
    setError('');
    setReaderLoading(true);
    try {
      const [{ data: signed, error: signedError }, { data: progress }] = await Promise.all([
        supabase.storage.from('library-pdfs').createSignedUrl(book.file_path, 3600),
        user?.id
          ? supabase
              .from('user_library_progress')
              .select('current_page')
              .eq('user_id', user.id)
              .eq('book_id', book.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (signedError || !signed?.signedUrl) {
        setError('Không thể mở PDF. Hãy kiểm tra đường dẫn file trong Storage.');
        setReaderLoading(false);
        return;
      }

      const page = Math.max(1, Number(progress?.current_page || 1));
      setReader({ book, url: signed.signedUrl, page });
    } catch (err) {
      console.error('Error opening reader:', err);
      setError('Không thể mở sách lúc này.');
    } finally {
      setReaderLoading(false);
    }
  };

  const saveProgress = async (nextPage) => {
    if (!reader.book || !user?.id) return;
    const maxPage = Number(reader.book.page_count || 99999);
    const page = Math.min(maxPage, Math.max(1, Number(nextPage) || 1));
    setReader((current) => ({ ...current, page }));
    
    // Update local state for snappy feedback
    setProgressMap((prev) => ({
      ...prev,
      [reader.book.id]: {
        ...prev[reader.book.id],
        book_id: reader.book.id,
        current_page: page,
        last_opened_at: new Date().toISOString(),
      },
    }));

    await supabase.from('user_library_progress').upsert({
      user_id: user.id,
      book_id: reader.book.id,
      current_page: page,
      last_opened_at: new Date().toISOString(),
    });
  };

  const readingCount = useMemo(() => {
    return books.filter((b) => progressMap[b.id] && progressMap[b.id].current_page > 1).length;
  }, [books, progressMap]);

  return (
    <div className="flex-1 bg-transparent text-slate-800 dark:text-white overflow-y-auto min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-7 pb-24">
        
        {/* HERO GLASS BANNER & SPOTLIGHT */}
        <div className="relative rounded-[2.5rem] p-6 sm:p-8 lg:p-10 backdrop-blur-2xl bg-white/40 dark:bg-slate-950/45 border border-white/60 dark:border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.08),_inset_0_1.5px_2px_rgba(255,255,255,0.85)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.6),_inset_0_1px_2px_rgba(255,255,255,0.25)] overflow-hidden">
          
          {/* Ambient Glows */}
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-br from-blue-500/20 via-indigo-500/15 to-cyan-400/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-gradient-to-tr from-indigo-500/20 via-sky-500/15 to-transparent blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-cyan-300 text-xs font-black tracking-wider uppercase backdrop-blur-md">
                <Sparkles size={14} className="text-blue-600 dark:text-cyan-400 animate-pulse" />
                <span>Thư viện tài liệu & E-Book TOEIC</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-950 dark:text-white leading-tight">
                Thư viện tài liệu
              </h1>

              <p className="text-slate-700 dark:text-slate-200 text-sm sm:text-base leading-relaxed max-w-xl font-bold">
                Kho tài liệu, giáo trình ngữ pháp và đề thi chất lượng cao. Đọc sách PDF theo hiệu ứng lật trang 3D chân thực, tự động ghi nhớ tiến độ đọc của bạn.
              </p>

              {/* Quick Metrics */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/45 dark:bg-white/10 border border-white/60 dark:border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.04),_inset_0_1px_1px_rgba(255,255,255,0.85)] backdrop-blur-xl">
                  <BookOpen size={16} className="text-blue-600 dark:text-cyan-400" />
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {books.length} Giáo trình sẵn sàng
                  </span>
                </div>

                <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/45 dark:bg-white/10 border border-white/60 dark:border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.04),_inset_0_1px_1px_rgba(255,255,255,0.85)] backdrop-blur-xl">
                  <Bookmark size={16} className="text-indigo-500" />
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {readingCount} Sách đang đọc dở
                  </span>
                </div>

                <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/45 dark:bg-white/10 border border-white/60 dark:border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.04),_inset_0_1px_1px_rgba(255,255,255,0.85)] backdrop-blur-xl">
                  <Layers size={16} className="text-cyan-500" />
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    Lật trang 3D thông minh
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Continue Reading Spotlight Card */}
            <div className="lg:col-span-5">
              {recentBook ? (
                <div className="p-5 rounded-3xl bg-white/45 dark:bg-slate-900/50 border border-white/65 dark:border-white/15 shadow-[0_16px_36px_-10px_rgba(15,23,42,0.05),_inset_0_1.5px_1px_rgba(255,255,255,0.85)] backdrop-blur-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-blue-700 dark:text-cyan-300">
                      <Clock size={14} />
                      <span>Tiếp tục đọc gần đây</span>
                    </span>
                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-cyan-300 border border-blue-500/20">
                      Trang {recentBook.progress.current_page}
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5 pt-1">
                    <div className="w-14 h-20 rounded-xl overflow-hidden shadow-md shrink-0 border border-white/60 dark:border-white/15 bg-slate-100">
                      {recentBook.book.cover_url ? (
                        <img
                          src={recentBook.book.cover_url}
                          alt={recentBook.book.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-blue-500">
                          <BookOpen size={24} />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="text-sm font-black text-slate-950 dark:text-white line-clamp-2 leading-snug">
                        {recentBook.book.title}
                      </h3>
                      {recentBook.book.page_count && (
                        <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round(
                                  (recentBook.progress.current_page / recentBook.book.page_count) * 100
                                )
                              )}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openReader(recentBook.book)}
                    className="w-full mt-2 py-2.5 px-4 rounded-xl text-xs font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white flex items-center justify-between shadow-md shadow-blue-500/20 hover:opacity-95 transition-all cursor-pointer active:scale-95"
                  >
                    <span>Mở đọc tiếp trang {recentBook.progress.current_page}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                <div className="p-5 rounded-3xl bg-white/45 dark:bg-slate-900/50 border border-white/65 dark:border-white/15 shadow-[0_16px_36px_-10px_rgba(15,23,42,0.05),_inset_0_1.5px_1px_rgba(255,255,255,0.85)] backdrop-blur-2xl space-y-2 text-center py-7">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-cyan-400 mx-auto flex items-center justify-center shadow-xs">
                    <BookOpen size={24} />
                  </div>
                  <h3 className="text-sm font-black text-slate-950 dark:text-white">
                    Bắt đầu hành trình đọc sách
                  </h3>
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 max-w-xs mx-auto">
                    Chọn một giáo trình bên dưới để bắt đầu đọc. Hệ thống sẽ tự động lưu lại trang bạn dừng chân!
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ERROR NOTIFICATION */}
        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/15 p-4 text-xs sm:text-sm font-bold text-rose-700 dark:text-rose-300 backdrop-blur-md shadow-sm">
            {error}
          </div>
        )}

        {/* FILTER & SEARCH DOCK */}
        <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-white/40 dark:bg-slate-950/45 backdrop-blur-2xl border border-white/60 dark:border-white/15 shadow-[0_8px_25px_rgba(0,0,0,0.04),_inset_0_1.5px_1px_rgba(255,255,255,0.85)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
                filterMode === 'all'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white/45 hover:bg-white/70 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 border border-white/60 dark:border-white/15'
              }`}
            >
              Tất cả sách ({books.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('reading')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
                filterMode === 'reading'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white/45 hover:bg-white/70 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 border border-white/60 dark:border-white/15'
              }`}
            >
              Đang đọc ({readingCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterMode('unread')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
                filterMode === 'unread'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                  : 'bg-white/45 hover:bg-white/70 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 border border-white/60 dark:border-white/15'
              }`}
            >
              Chưa đọc ({books.length - readingCount})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm kiếm tài liệu, sách..."
              className="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white/60 dark:bg-slate-900/70 border border-white/60 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-2xs backdrop-blur-md transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

        </div>

        {/* BOOK COLLECTION SECTION HEADER */}
        <div className="flex items-center justify-between p-3.5 px-5 rounded-2xl backdrop-blur-2xl bg-white/45 dark:bg-slate-950/50 border border-white/60 dark:border-white/15 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-cyan-400 flex items-center justify-center">
              <BookOpen size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-950 dark:text-white">
                Danh mục sách ({filteredBooks.length})
              </h2>
              <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                Nhấn vào sách để mở chế độ lật trang 3D
              </p>
            </div>
          </div>
          <span className="text-xs font-black px-3 py-1 rounded-full bg-blue-500/15 text-blue-700 dark:text-cyan-300 border border-blue-500/20">
            {filteredBooks.length} cuốn
          </span>
        </div>

        {/* BOOKS GRID */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="rounded-3xl p-3 backdrop-blur-2xl bg-white/40 dark:bg-slate-950/45 border border-white/60 dark:border-white/15 space-y-3 animate-pulse"
              >
                <div className="aspect-[3/4.2] rounded-2xl bg-slate-200 dark:bg-slate-800" />
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-lg w-3/4 mx-auto" />
              </div>
            ))}
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="rounded-3xl border border-white/60 dark:border-white/15 backdrop-blur-2xl bg-white/40 dark:bg-slate-950/45 p-12 text-center space-y-3 shadow-xl">
            <div className="w-16 h-16 rounded-3xl bg-blue-500/15 text-blue-600 dark:text-cyan-400 mx-auto flex items-center justify-center">
              <FileText size={32} />
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-950 dark:text-white">
              Không tìm thấy tài liệu phù hợp
            </h3>
            <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
              Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc để hiển thị toàn bộ sách.
            </p>
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="px-4 py-2 rounded-xl text-xs font-black bg-blue-500/15 text-blue-700 dark:text-cyan-300 border border-blue-500/25 hover:bg-blue-500/25 transition-all cursor-pointer"
              >
                Xóa từ khóa tìm kiếm
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 sm:gap-6">
            {filteredBooks.map((book) => {
              const progress = progressMap[book.id];
              const currentPage = progress?.current_page || 1;
              const hasRead = progress && currentPage > 1;
              const percent = book.page_count
                ? Math.min(100, Math.round((currentPage / book.page_count) * 100))
                : 0;

              return (
                <motion.div
                  key={book.id}
                  whileHover={{ y: -6, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => openReader(book)}
                  className="group relative rounded-3xl p-3.5 backdrop-blur-2xl bg-white/45 dark:bg-slate-950/45 border border-white/65 dark:border-white/15 shadow-[0_12px_30px_rgba(0,0,0,0.06),_inset_0_1.5px_2px_rgba(255,255,255,0.85)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6),_inset_0_1px_2px_rgba(255,255,255,0.2)] hover:border-blue-500/50 dark:hover:border-cyan-400/50 hover:shadow-2xl hover:shadow-blue-500/15 transition-all cursor-pointer flex flex-col justify-between overflow-hidden"
                >
                  {/* Book 3D Cover */}
                  <div className="relative aspect-[3/4.2] overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900 shadow-md group-hover:shadow-xl transition-shadow">
                    
                    {/* Book Spine 3D Shadow Overlay on the left */}
                    <div className="absolute top-0 bottom-0 left-0 w-3 bg-gradient-to-r from-black/35 via-black/15 to-transparent z-10 pointer-events-none" />
                    {/* Book Top Highlight */}
                    <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white/25 to-transparent z-10 pointer-events-none" />

                    {book.cover_url ? (
                      <img
                        src={book.cover_url}
                        alt={book.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center p-4 text-center text-blue-500/70 bg-gradient-to-br from-blue-500/10 to-indigo-500/15">
                        <BookOpen size={44} className="mb-2" />
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 line-clamp-3">
                          {book.title}
                        </span>
                      </div>
                    )}

                    {/* Page Count Glass Pill */}
                    {book.page_count && (
                      <div className="absolute top-2.5 right-2.5 z-20 px-2 py-0.5 rounded-md backdrop-blur-md bg-black/60 text-white text-[10px] font-black shadow-xs">
                        {book.page_count} trang
                      </div>
                    )}

                    {/* Reading Status Pill */}
                    {hasRead && (
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 z-20 p-1.5 rounded-xl backdrop-blur-md bg-black/75 text-white space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-black px-1">
                          <span className="text-cyan-300">Đang đọc ({percent}%)</span>
                          <span>Trang {currentPage}</span>
                        </div>
                        <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Hover Open Overlay */}
                    <div className="absolute inset-0 bg-blue-600/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                      <div className="px-4 py-2 rounded-xl bg-white text-slate-900 font-black text-xs shadow-lg flex items-center gap-1.5 transform scale-90 group-hover:scale-100 transition-transform">
                        <BookOpen size={14} className="text-blue-600" />
                        <span>Mở đọc sách</span>
                      </div>
                    </div>
                  </div>

                  {/* Book Title & Action */}
                  <div className="pt-3 px-1 space-y-1.5">
                    <h3
                      title={book.title}
                      className="text-xs sm:text-sm font-black text-slate-950 dark:text-white line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors"
                    >
                      {book.title}
                    </h3>

                    <div className="flex items-center justify-between pt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <span>{hasRead ? `Trang ${currentPage}` : 'Sách mẫu PDF'}</span>
                      <span className="text-blue-600 dark:text-cyan-400 flex items-center gap-0.5 font-black group-hover:translate-x-1 transition-transform">
                        Đọc <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* STUDY BENEFITS & READING FEATURES DOCK */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="p-5 rounded-3xl backdrop-blur-2xl bg-white/40 dark:bg-slate-950/45 border border-white/60 dark:border-white/15 shadow-sm space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-cyan-400 flex items-center justify-center">
              <Layers size={20} />
            </div>
            <h3 className="text-sm font-black text-slate-950 dark:text-white">
              Hiệu ứng lật trang 3D sống động
            </h3>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
              Trải nghiệm đọc chân thực như sách giấy thật. Tự động chia 2 trang trên máy tính và 1 trang trên điện thoại.
            </p>
          </div>

          <div className="p-5 rounded-3xl backdrop-blur-2xl bg-white/40 dark:bg-slate-950/45 border border-white/60 dark:border-white/15 shadow-sm space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Bookmark size={20} />
            </div>
            <h3 className="text-sm font-black text-slate-950 dark:text-white">
              Tự động lưu trang đang đọc
            </h3>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
              Mỗi khi bạn mở lại sách, hệ thống sẽ tự động đưa bạn về trang đã dừng lại ở phiên học trước.
            </p>
          </div>

          <div className="p-5 rounded-3xl backdrop-blur-2xl bg-white/40 dark:bg-slate-950/45 border border-white/60 dark:border-white/15 shadow-sm space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <h3 className="text-sm font-black text-slate-950 dark:text-white">
              Tối ưu dung lượng & dữ liệu
            </h3>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 leading-relaxed">
              Sách chỉ tải nội dung khi bạn đọc đến trang đó. Hoàn toàn không tốn dung lượng bộ nhớ thiết bị của bạn.
            </p>
          </div>
        </div>

      </div>

      {/* READER LOADING MODAL */}
      <AnimatePresence>
        {readerLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4"
          >
            <div className="p-6 rounded-3xl backdrop-blur-2xl bg-white/70 dark:bg-slate-900/80 border border-white/60 dark:border-white/20 shadow-2xl flex items-center gap-3 text-slate-950 dark:text-white text-sm font-black">
              <div className="w-6 h-6 border-3 border-blue-500/30 border-t-blue-600 rounded-full animate-spin shrink-0" />
              <span>Đang mở tài liệu PDF và đồng bộ trang đọc...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLIPBOOK READER COMPONENT */}
      {reader.book && reader.url && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4">
              <div className="p-6 rounded-3xl backdrop-blur-2xl bg-white/70 dark:bg-slate-900/80 border border-white/60 dark:border-white/20 shadow-2xl flex items-center gap-3 text-slate-950 dark:text-white text-sm font-black">
                <div className="w-6 h-6 border-3 border-blue-500/30 border-t-blue-600 rounded-full animate-spin shrink-0" />
                <span>Đang tải trình lật sách 3D…</span>
              </div>
            </div>
          }
        >
          <FlipbookReader
            url={reader.url}
            title={reader.book.title}
            pageCount={reader.book.page_count}
            initialPage={reader.page}
            onPageChange={saveProgress}
            onClose={() => setReader(EMPTY_READER)}
          />
        </Suspense>
      )}
    </div>
  );
}
