import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Loader2, Maximize2, Minimize2, Search, X } from 'lucide-react';

let pdfjsPromise;

const loadPdfJs = () => {
  pdfjsPromise ||= import('pdfjs-dist/legacy/build/pdf.mjs').then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    return pdfjs;
  });
  return pdfjsPromise;
};

export default function FlipbookReader({ url, title, pageCount, initialPage = 1, onPageChange, onClose }) {
  const readerRef = useRef(null);
  const paperRef = useRef(null);
  const canvasRefs = useRef([]);
  const renderTasks = useRef([]);
  const renderId = useRef(0);
  const loadingTaskRef = useRef(null);
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

  const maxPage = Math.max(1, Number(pdf?.numPages || pageCount || 1));
  const visiblePages = twoPage ? [page, ...(page < maxPage ? [page + 1] : [])] : [page];
  const pageLabel = twoPage && page < maxPage ? `${page}–${page + 1}` : String(page);

  useEffect(() => {
    let active = true;
    setPdf(null);
    setLoading(true);
    setError('');
    loadPdfJs().then(({ getDocument }) => {
      const task = getDocument({ url, disableAutoFetch: false, disableStream: false });
      loadingTaskRef.current = task;
      return task.promise;
    }).then((loaded) => {
      if (active) setPdf(loaded);
    }).catch((loadError) => {
      if (active) {
        console.error('Flipbook PDF load error:', loadError);
        setError('Không thể tải tài liệu PDF.');
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
      loadingTaskRef.current?.destroy?.();
      loadingTaskRef.current = null;
    };
  }, [url]);

  useEffect(() => {
    const handleResize = () => {
      setRenderVersion((value) => value + 1);
      setTwoPage(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = document.fullscreenElement === readerRef.current;
      const shouldShowTwoPages = window.innerWidth >= 768;
      setIsFullscreen(active);
      setTwoPage(shouldShowTwoPages);
      if (shouldShowTwoPages && page > 1 && page % 2 === 0) {
        const spreadStart = page - 1;
        setPage(spreadStart);
        setPageInput(String(spreadStart));
        onPageChange?.(spreadStart);
      }
      setRenderVersion((value) => value + 1);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [onPageChange, page]);

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
      const containerWidth = Math.max(180, (paperRef.current?.clientWidth || slot?.clientWidth || 720) - 24) / (twoPage ? 2 : 1);
      const containerHeight = Math.max(240, (paperRef.current?.clientHeight || slot?.clientHeight || 680) - 24);
      const baseViewport = pdfPage.getViewport({ scale: 1 });
      const scale = Math.min(1.5, containerWidth / baseViewport.width, containerHeight / baseViewport.height);
      const viewport = pdfPage.getViewport({ scale: Math.max(0.1, scale) });
      const ratio = window.devicePixelRatio || 1;
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
        if (!active || currentRenderId !== renderId.current || renderError?.name === 'RenderingCancelledException') return;
        console.error('Flipbook PDF render error:', renderError);
        setError('Không thể hiển thị trang PDF này.');
      })
      .finally(() => {
        if (active && currentRenderId === renderId.current) setLoading(false);
      });

    return () => {
      active = false;
      renderTasks.current.forEach((task) => task?.cancel?.());
    };
  }, [pdf, page, twoPage, maxPage, renderVersion]);

  useEffect(() => { setPageInput(String(page)); }, [page]);

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

  const jumpToPage = () => {
    let target = Math.min(maxPage, Math.max(1, Number(pageInput) || 1));
    if (twoPage && target > 1 && target % 2 === 0) target -= 1;
    setTurn(target >= page ? 'next' : 'prev');
    setTurnKey((value) => value + 1);
    setPage(target);
    setPageInput(String(target));
    onPageChange?.(target);
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (readerRef.current?.requestFullscreen) {
        await readerRef.current.requestFullscreen();
      } else {
        const next = !isFullscreen;
        const shouldShowTwoPages = window.innerWidth >= 768;
        setIsFullscreen(next);
        setTwoPage(shouldShowTwoPages);
        if (shouldShowTwoPages && page > 1 && page % 2 === 0) {
          const spreadStart = page - 1;
          setPage(spreadStart);
          setPageInput(String(spreadStart));
          onPageChange?.(spreadStart);
        }
      }
    } catch (fullscreenError) {
      console.error('Fullscreen error:', fullscreenError);
      setIsFullscreen(true);
      setTwoPage(window.innerWidth >= 768);
    }
  };

  const closeReader = async () => {
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    onClose();
  };

  return (
    <div className={`fixed inset-0 z-[69] flex min-w-0 items-center justify-center overflow-x-hidden bg-slate-950/80 ${isFullscreen ? 'p-0' : 'p-2 sm:p-5'}`}>
      <section ref={readerRef} className={`box-border flex min-w-0 flex-col overflow-hidden bg-[#f7f3ee] shadow-2xl dark:bg-[#21132b] ${isFullscreen ? 'h-screen w-screen max-w-none rounded-none' : 'h-[calc(100vh-1rem)] w-full max-w-[calc(100vw-1rem)] rounded-2xl sm:h-[calc(100vh-2.5rem)] sm:w-[calc(100vw-2.5rem)] sm:max-w-[1800px]'}`}>
        <header className="min-w-0 border-b border-slate-200 bg-white/90 px-3 py-3 dark:border-fuchsia-900 dark:bg-[#21132b]/95 sm:px-4">
          <div className="flex min-w-0 items-center justify-between gap-2"><div className="min-w-0"><h2 className="truncate font-bold text-slate-900 dark:text-white">{title}</h2><p className="text-xs text-slate-500 dark:text-slate-400">Trang {pageLabel} / {maxPage} · Chế độ {twoPage ? '2 trang' : 'lật sách'}</p></div><div className="flex shrink-0 items-center gap-1"><a href={url} target="_blank" rel="noreferrer" download className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-fuchsia-900/50" title="Tải PDF"><Download size={18} /></a><button type="button" onClick={toggleFullscreen} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-fuchsia-900/50" title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'} aria-label={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}>{isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button><button type="button" onClick={closeReader} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-fuchsia-900/50" aria-label="Đóng"><X size={19} /></button></div></div>
          <div className="mt-3 flex items-center gap-2 md:hidden"><label htmlFor="flipbook-page-search" className="text-xs font-medium text-slate-500 dark:text-slate-300">Tìm trang</label><input id="flipbook-page-search" type="number" min="1" max={maxPage} value={pageInput} onChange={(event) => setPageInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && jumpToPage()} className="w-20 rounded-lg border border-fuchsia-200 bg-white px-2 py-1.5 text-center text-sm outline-none focus:border-fuchsia-500 dark:border-fuchsia-800 dark:bg-[#160B1E] dark:text-white" /><span className="text-xs text-slate-400">/ {maxPage}</span><button type="button" onClick={jumpToPage} className="inline-flex items-center gap-1 rounded-lg bg-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white"><Search size={14} /> Mở</button></div>
        </header>
        <div className={`relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-x-hidden p-2 sm:p-6 ${isFullscreen ? 'overflow-y-hidden bg-[#ece4d9] dark:bg-[#160c1f]' : 'overflow-y-auto'}`}>
          <div key={turnKey} ref={paperRef} className={`flipbook-paper relative box-border flex h-full min-h-0 w-full max-w-full min-w-0 items-center justify-center overflow-hidden rounded-xl border border-[#d9cbbd] p-2 sm:p-3 ${twoPage ? 'sm:max-w-[1600px]' : 'sm:max-w-[900px]'}`}>
            {error ? <p className="p-8 text-center text-sm text-rose-600">{error}</p> : <div className={`flipbook-spread flex h-full min-h-0 min-w-0 items-center justify-center ${turn === 'next' ? 'animate-book-next' : turn === 'prev' ? 'animate-book-prev' : ''} ${twoPage ? 'w-full gap-1 sm:gap-2' : 'w-full'}`}>{visiblePages.map((pageNumber, index) => <div key={pageNumber} className={`flipbook-page flex h-full min-h-0 min-w-0 flex-1 items-center justify-center ${twoPage && index === 0 ? 'rounded-l-lg' : ''} ${twoPage && index === 1 ? 'rounded-r-lg' : ''}`}><canvas ref={(node) => { canvasRefs.current[index] = node; }} className="block h-auto max-h-full max-w-full object-contain" aria-label={`Trang ${pageNumber}`} /></div>)}</div>}
            {loading && <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-[#21132b]/70"><Loader2 className="animate-spin text-fuchsia-600" size={28} /></div>}
          </div>
        </div>
        <footer className="hidden items-center justify-center gap-4 border-t border-slate-200 bg-white/90 px-4 py-3 dark:border-fuchsia-900 dark:bg-[#21132b]/95 md:flex"><button type="button" onClick={() => move(page - (twoPage ? 2 : 1), 'prev')} disabled={page <= 1 || loading} className="inline-flex items-center gap-1 rounded-xl border border-fuchsia-300 px-4 py-2 text-sm font-semibold text-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-fuchsia-700 dark:text-fuchsia-200"><ChevronLeft size={18} /> Trang trước</button><button type="button" onClick={() => move(page + (twoPage ? 2 : 1), 'next')} disabled={page + (twoPage ? 2 : 1) > maxPage || loading} className="inline-flex items-center gap-1 rounded-xl bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><ChevronRight size={18} /> Trang sau</button></footer>
      </section>
    </div>
  );
}
