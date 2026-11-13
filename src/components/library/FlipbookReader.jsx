import { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Maximize2,
  Minimize2,
  Search,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  BookOpen,
  Sun,
  Moon,
  Sparkles,
  Layers,
  FileText,
} from 'lucide-react';

let pdfjsPromise;

const loadPdfJs = () => {
  pdfjsPromise ||= import('pdfjs-dist/legacy/build/pdf.mjs').then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    return pdfjs;
  });
  return pdfjsPromise;
};

const THEMES = {
  clean: {
    id: 'clean',
    name: 'Sáng',
    icon: Sun,
    deskBg: 'bg-slate-100/90 dark:bg-slate-950/90',
    paperBg: 'bg-[#ffffff] text-slate-900 border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.12)]',
    centerSpine: 'from-black/10 via-black/20 to-black/10',
    textColor: 'text-slate-900',
  },
  sepia: {
    id: 'sepia',
    name: 'Dịu mắt',
    icon: Sparkles,
    deskBg: 'bg-[#f4efe6] dark:bg-[#1a1612]',
    paperBg: 'bg-[#fbf7ee] text-[#3e2e1e] border-[#e6dcce] shadow-[0_20px_50px_rgba(62,46,30,0.15)]',
    centerSpine: 'from-[#2e1d0f]/15 via-[#2e1d0f]/25 to-[#2e1d0f]/15',
    textColor: 'text-[#3e2e1e]',
  },
  dark: {
    id: 'dark',
    name: 'Ban đêm',
    icon: Moon,
    deskBg: 'bg-[#0b0f19]',
    paperBg: 'bg-[#161f30] text-slate-100 border-slate-800 shadow-[0_25px_60px_rgba(0,0,0,0.5)]',
    centerSpine: 'from-black/40 via-black/70 to-black/40',
    textColor: 'text-slate-100',
  },
};

export default function FlipbookReader({
  url,
  title,
  pageCount,
  initialPage = 1,
  onPageChange,
  onClose,
}) {
  const readerRef = useRef(null);
  const paperRef = useRef(null);
  const canvasRefs = useRef([]);
  const renderTasks = useRef([]);
  const renderId = useRef(0);
  const loadingTaskRef = useRef(null);
  const touchStartX = useRef(null);

  const [pdf, setPdf] = useState(null);
  const [page, setPage] = useState(Math.max(1, initialPage));
  const [pageInput, setPageInput] = useState(String(Math.max(1, initialPage)));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [turn, setTurn] = useState('');
  const [turnKey, setTurnKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [twoPage, setTwoPage] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 768);
  const [renderVersion, setRenderVersion] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('flipbook_theme') || 'clean';
  });

  const maxPage = Math.max(1, Number(pdf?.numPages || pageCount || 1));
  const visiblePages = twoPage ? [page, ...(page < maxPage ? [page + 1] : [])] : [page];
  const pageLabel = twoPage && page < maxPage ? `${page}–${page + 1}` : String(page);
  const readingPercent = Math.min(100, Math.round((page / maxPage) * 100));

  const changeTheme = (nextTheme) => {
    setTheme(nextTheme);
    localStorage.setItem('flipbook_theme', nextTheme);
  };

  const zoomIn = () => setZoom((z) => Math.min(1.8, Number((z + 0.15).toFixed(2))));
  const zoomOut = () => setZoom((z) => Math.max(0.7, Number((z - 0.15).toFixed(2))));
  const resetZoom = () => setZoom(1);

  // Load PDF document
  useEffect(() => {
    let active = true;
    setPdf(null);
    setLoading(true);
    setError('');

    loadPdfJs()
      .then(({ getDocument }) => {
        const task = getDocument({ url, disableAutoFetch: false, disableStream: false });
        loadingTaskRef.current = task;
        return task.promise;
      })
      .then((loaded) => {
        if (active) setPdf(loaded);
      })
      .catch((loadError) => {
        if (active) {
          console.error('Flipbook PDF load error:', loadError);
          setError('Không thể tải tài liệu PDF. Vui lòng kiểm tra lại kết nối mạng hoặc file nguồn.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      loadingTaskRef.current?.destroy?.();
      loadingTaskRef.current = null;
    };
  }, [url]);

  // Window resize handler
  useEffect(() => {
    const handleResize = () => {
      setRenderVersion((value) => value + 1);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = document.fullscreenElement === readerRef.current;
      setIsFullscreen(active);
      setRenderVersion((value) => value + 1);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Render pages to canvas
  useEffect(() => {
    if (!pdf || !paperRef.current) return undefined;
    const pagesToRender = twoPage ? [page, ...(page < maxPage ? [page + 1] : [])] : [page];
    let active = true;
    const currentRenderId = renderId.current + 1;
    renderId.current = currentRenderId;
    renderTasks.current.forEach((task) => task?.cancel?.());
    renderTasks.current = [];
    setError('');
    setLoading(true);

    const renderPage = async (pageNumber, index) => {
      const canvas = canvasRefs.current[index];
      if (!canvas) return;
      const pdfPage = await pdf.getPage(Math.min(pageNumber, pdf.numPages));
      const slot = canvas.parentElement;
      const containerWidth =
        Math.max(180, (paperRef.current?.clientWidth || slot?.clientWidth || 720) - 24) / (twoPage ? 2 : 1);
      const containerHeight = Math.max(240, (paperRef.current?.clientHeight || slot?.clientHeight || 680) - 24);
      const baseViewport = pdfPage.getViewport({ scale: 1 });
      const fitScale = Math.min(containerWidth / baseViewport.width, containerHeight / baseViewport.height);
      const finalScale = Math.min(2.5, fitScale * zoom);
      const viewport = pdfPage.getViewport({ scale: Math.max(0.1, finalScale) });
      const ratio = Math.max(window.devicePixelRatio || 1, 1.5);

      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      const context = canvas.getContext('2d');
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const task = pdfPage.render({ canvasContext: context, viewport });
      renderTasks.current[index] = task;
      await task.promise;
    };

    Promise.all(pagesToRender.map((pageNumber, index) => renderPage(pageNumber, index)))
      .catch((renderError) => {
        if (
          !active ||
          currentRenderId !== renderId.current ||
          renderError?.name === 'RenderingCancelledException'
        )
          return;
        console.error('Flipbook PDF render error:', renderError);
        setError('Không thể kết xuất trang PDF này.');
      })
      .finally(() => {
        if (active && currentRenderId === renderId.current) setLoading(false);
      });

    return () => {
      active = false;
      renderTasks.current.forEach((task) => task?.cancel?.());
    };
  }, [pdf, page, twoPage, maxPage, renderVersion, zoom]);

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  const move = (nextPage, direction) => {
    const clampedPage = Math.min(maxPage, Math.max(1, nextPage));
    const safePage = twoPage && clampedPage > 1 && clampedPage % 2 === 0 ? clampedPage - 1 : clampedPage;
    if (safePage === page) return;
    setTurn(direction);
    setTurnKey((value) => value + 1);
    setPage(safePage);
    setPageInput(String(safePage));
    onPageChange?.(safePage);
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        if (page + (twoPage ? 2 : 1) <= maxPage && !loading) {
          move(page + (twoPage ? 2 : 1), 'next');
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        if (page > 1 && !loading) {
          move(page - (twoPage ? 2 : 1), 'prev');
        }
      } else if (e.key === 'Escape') {
        closeReader();
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === '+' || e.key === '=') {
        zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        zoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [page, twoPage, maxPage, loading]);

  // Touch gesture support
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaX = touchStartX.current - touchEndX;

    if (deltaX > 45 && page + (twoPage ? 2 : 1) <= maxPage && !loading) {
      move(page + (twoPage ? 2 : 1), 'next');
    } else if (deltaX < -45 && page > 1 && !loading) {
      move(page - (twoPage ? 2 : 1), 'prev');
    }
    touchStartX.current = null;
  };

  const jumpToPage = () => {
    let target = Math.min(maxPage, Math.max(1, Number(pageInput) || 1));
    if (twoPage && target > 1 && target % 2 === 0) target -= 1;
    setTurn(target >= page ? 'next' : 'prev');
    setTurnKey((value) => value + 1);
    setPage(target);
    setPageInput(String(target));
    onPageChange?.(target);
  };

  const toggleViewMode = () => {
    const nextTwoPage = !twoPage;
    setTwoPage(nextTwoPage);
    if (nextTwoPage && page > 1 && page % 2 === 0) {
      const spreadStart = page - 1;
      setPage(spreadStart);
      setPageInput(String(spreadStart));
      onPageChange?.(spreadStart);
    }
    setRenderVersion((v) => v + 1);
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (readerRef.current?.requestFullscreen) {
        await readerRef.current.requestFullscreen();
      } else {
        setIsFullscreen(!isFullscreen);
      }
    } catch (fullscreenError) {
      console.error('Fullscreen error:', fullscreenError);
      setIsFullscreen(true);
    }
  };

  const closeReader = async () => {
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    onClose();
  };

  const currentTheme = THEMES[theme] || THEMES.clean;

  return (
    <div
      className={`fixed inset-0 z-[69] flex min-w-0 items-center justify-center overflow-x-hidden bg-slate-950/80 backdrop-blur-md transition-all ${
        isFullscreen ? 'p-0' : 'p-2 sm:p-5'
      }`}
    >
      <section
        ref={readerRef}
        className={`box-border flex min-w-0 flex-col overflow-hidden shadow-2xl transition-all ${currentTheme.deskBg} ${
          isFullscreen
            ? 'h-screen w-screen max-w-none rounded-none'
            : 'h-[calc(100vh-1rem)] w-full max-w-[calc(100vw-1rem)] rounded-3xl sm:h-[calc(100vh-2.5rem)] sm:w-[calc(100vw-2.5rem)] sm:max-w-[1700px] border border-white/40 dark:border-white/10'
        }`}
      >
        {/* ======================================================== */}
        {/* 1. HEADER: LIQUID GLASS E-READER STUDIO TOPBAR */}
        {/* ======================================================== */}
        <header className="min-w-0 border-b border-white/60 dark:border-white/10 bg-white/75 dark:bg-slate-900/85 backdrop-blur-2xl px-4 py-3 shrink-0 shadow-xs z-30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            {/* Left: Book Icon & Title & Progress */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-cyan-400 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-2xs">
                <BookOpen size={18} />
              </div>

              <div className="min-w-0">
                <h2
                  title={title}
                  className="truncate text-sm sm:text-base font-black text-slate-950 dark:text-white leading-tight"
                >
                  {title}
                </h2>
                <div className="flex items-center gap-2 mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-blue-600 dark:text-cyan-400">
                    Trang {pageLabel} / {maxPage}
                  </span>
                  <span>•</span>
                  <span>Đã đọc {readingPercent}%</span>
                  <span>•</span>
                  <span className="hidden sm:inline">
                    {twoPage ? 'Chế độ 2 trang' : 'Chế độ 1 trang'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Studio Reading Controls */}
            <div className="flex flex-wrap items-center gap-1.5 shrink-0 self-end md:self-auto">
              
              {/* Theme Picker: Clean / Sepia / Dark */}
              <div className="flex items-center p-0.5 rounded-xl bg-slate-200/60 dark:bg-slate-800/80 border border-white/40 dark:border-white/10 text-xs font-black">
                {Object.values(THEMES).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => changeTheme(t.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      theme === t.id
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-cyan-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title={`Chế độ nền ${t.name}`}
                  >
                    <t.icon size={13} />
                    <span className="hidden lg:inline">{t.name}</span>
                  </button>
                ))}
              </div>

              {/* View Mode Toggle: 1-Page vs 2-Page */}
              <button
                type="button"
                onClick={toggleViewMode}
                className={`p-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer border shadow-2xs ${
                  twoPage
                    ? 'bg-blue-500/15 text-blue-700 dark:text-cyan-300 border-blue-500/30'
                    : 'bg-white/60 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-white/60 dark:border-white/10'
                }`}
                title={twoPage ? 'Chuyển sang đọc 1 trang' : 'Chuyển sang đọc 2 trang song song'}
              >
                <Layers size={16} />
                <span className="hidden xl:inline">{twoPage ? '2 Trang' : '1 Trang'}</span>
              </button>

              {/* Zoom Controls */}
              <div className="flex items-center rounded-xl bg-white/60 dark:bg-slate-800 border border-white/60 dark:border-white/10 shadow-2xs overflow-hidden">
                <button
                  type="button"
                  onClick={zoomOut}
                  disabled={zoom <= 0.7}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer"
                  title="Thu nhỏ (-)"
                >
                  <ZoomOut size={15} />
                </button>
                <button
                  type="button"
                  onClick={resetZoom}
                  className="px-1.5 text-[11px] font-black text-slate-700 dark:text-slate-200 hover:text-blue-600 cursor-pointer"
                  title="Đặt lại cỡ chuẩn 100%"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={zoomIn}
                  disabled={zoom >= 1.8}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30 cursor-pointer"
                  title="Phóng to (+)"
                >
                  <ZoomIn size={15} />
                </button>
              </div>

              {/* Download PDF */}
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                download
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-white/60 dark:bg-slate-800 border border-white/60 dark:border-white/10 shadow-2xs hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
                title="Tải tài liệu PDF về máy"
              >
                <Download size={16} />
              </a>

              {/* Fullscreen Toggle */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-white/60 dark:bg-slate-800 border border-white/60 dark:border-white/10 shadow-2xs hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
                title={isFullscreen ? 'Thu nhỏ (F)' : 'Toàn màn hình (F)'}
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={closeReader}
                className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-500/25 transition-all cursor-pointer shadow-2xs"
                title="Đóng trình đọc sách (Esc)"
              >
                <X size={17} />
              </button>
            </div>

          </div>
        </header>

        {/* ======================================================== */}
        {/* 2. BODY: 3D REALISTIC OPEN BOOK CANVAS ARENA */}
        {/* ======================================================== */}
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-x-hidden p-2 sm:p-5 select-none"
        >
          {/* Side Floating Next/Prev Arrow Bars on Desktop */}
          {page > 1 && !loading && (
            <button
              type="button"
              onClick={() => move(page - (twoPage ? 2 : 1), 'prev')}
              className="absolute left-2 sm:left-4 z-20 w-11 h-11 rounded-full backdrop-blur-xl bg-white/70 dark:bg-slate-900/80 border border-white/60 dark:border-white/20 text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:scale-110 shadow-xl transition-all cursor-pointer hidden md:flex items-center justify-center active:scale-95"
              title="Lật sang trang trước (←)"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          {page + (twoPage ? 2 : 1) <= maxPage && !loading && (
            <button
              type="button"
              onClick={() => move(page + (twoPage ? 2 : 1), 'next')}
              className="absolute right-2 sm:right-4 z-20 w-11 h-11 rounded-full backdrop-blur-xl bg-white/70 dark:bg-slate-900/80 border border-white/60 dark:border-white/20 text-slate-700 dark:text-slate-200 hover:text-blue-600 hover:scale-110 shadow-xl transition-all cursor-pointer hidden md:flex items-center justify-center active:scale-95"
              title="Lật sang trang sau (→)"
            >
              <ChevronRight size={24} />
            </button>
          )}

          {/* Book Spread Paper */}
          <div
            key={turnKey}
            ref={paperRef}
            className={`flipbook-paper relative box-border flex h-full min-h-0 w-full max-w-full min-w-0 items-center justify-center overflow-hidden rounded-2xl border transition-all ${
              currentTheme.paperBg
            } ${twoPage ? 'sm:max-w-[1600px]' : 'sm:max-w-[850px]'}`}
          >
            {error ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-base font-black text-rose-600 dark:text-rose-400">{error}</p>
                <p className="text-xs font-semibold text-slate-500">
                  Hãy thử tải lại trang hoặc kiểm tra file trong cơ sở dữ liệu.
                </p>
              </div>
            ) : (
              <div
                className={`flipbook-spread relative flex h-full min-h-0 min-w-0 items-center justify-center ${
                  turn === 'next' ? 'animate-book-next' : turn === 'prev' ? 'animate-book-prev' : ''
                } ${twoPage ? 'w-full' : 'w-full'}`}
              >
                {/* Realistic Book Spine Center Fold (When 2 pages are open) */}
                {twoPage && visiblePages.length > 1 && (
                  <div
                    className={`absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-4 z-20 pointer-events-none bg-gradient-to-r ${currentTheme.centerSpine}`}
                  />
                )}

                {visiblePages.map((pageNumber, index) => (
                  <div
                    key={pageNumber}
                    className={`flipbook-page relative flex h-full min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden ${
                      twoPage && index === 0
                        ? 'border-r border-black/10 dark:border-white/5 rounded-l-2xl'
                        : ''
                    } ${twoPage && index === 1 ? 'rounded-r-2xl' : ''}`}
                  >
                    <canvas
                      ref={(node) => {
                        canvasRefs.current[index] = node;
                      }}
                      className="block h-auto max-h-full max-w-full object-contain drop-shadow-sm transition-transform"
                      aria-label={`Trang ${pageNumber}`}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Loading Indicator Inside Book Area */}
            {loading && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/60 dark:bg-slate-950/70 backdrop-blur-[2px]">
                <div className="px-5 py-3 rounded-2xl backdrop-blur-xl bg-white/80 dark:bg-slate-900/90 border border-white/60 dark:border-white/15 shadow-xl flex items-center gap-3 text-slate-900 dark:text-white font-black text-xs sm:text-sm">
                  <div className="w-5 h-5 border-3 border-blue-500/30 border-t-blue-600 rounded-full animate-spin shrink-0" />
                  <span>Đang hiển thị trang {pageLabel}...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. FOOTER: LIQUID GLASS PAGE SCRUBBER & DOCK */}
        {/* ======================================================== */}
        <footer className="border-t border-white/60 dark:border-white/10 bg-white/75 dark:bg-slate-900/85 backdrop-blur-2xl px-4 py-3 shrink-0 z-30 shadow-xs">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-5xl mx-auto">
            
            {/* Prev Page Button */}
            <button
              type="button"
              onClick={() => move(page - (twoPage ? 2 : 1), 'prev')}
              disabled={page <= 1 || loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/60 dark:border-white/15 bg-white/60 hover:bg-white/90 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-2xs transition-all cursor-pointer active:scale-95"
            >
              <ChevronLeft size={16} />
              <span>Trang trước</span>
              <span className="text-[10px] opacity-60 hidden md:inline">(←)</span>
            </button>

            {/* Middle: Page Range Scrubber & Jump Input */}
            <div className="flex items-center justify-center gap-3 w-full sm:w-auto flex-1 max-w-md">
              {/* Range Slider for Fast Scrubbing */}
              <input
                type="range"
                min="1"
                max={maxPage}
                value={page}
                onChange={(e) => {
                  const target = Number(e.target.value);
                  move(target, target > page ? 'next' : 'prev');
                }}
                disabled={loading}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                title={`Kéo để chuyển trang nhanh (Trang ${page}/${maxPage})`}
              />

              {/* Jump Input */}
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  min="1"
                  max={maxPage}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && jumpToPage()}
                  className="w-14 rounded-xl border border-white/60 dark:border-white/15 bg-white/70 dark:bg-slate-800 px-2 py-1.5 text-center text-xs sm:text-sm font-black text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">/ {maxPage}</span>
                <button
                  type="button"
                  onClick={jumpToPage}
                  className="px-2.5 py-1.5 rounded-xl bg-blue-500/15 text-blue-700 dark:text-cyan-300 border border-blue-500/20 text-xs font-black hover:bg-blue-500/25 transition-all cursor-pointer shadow-2xs"
                >
                  Đến
                </button>
              </div>
            </div>

            {/* Next Page Button */}
            <button
              type="button"
              onClick={() => move(page + (twoPage ? 2 : 1), 'next')}
              disabled={page + (twoPage ? 2 : 1) > maxPage || loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white text-xs sm:text-sm font-black hover:opacity-95 disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-blue-500/25 transition-all cursor-pointer active:scale-95"
            >
              <span>Trang sau</span>
              <span className="text-[10px] opacity-75 hidden md:inline">(→)</span>
              <ChevronRight size={16} />
            </button>

          </div>
        </footer>
      </section>
    </div>
  );
}
