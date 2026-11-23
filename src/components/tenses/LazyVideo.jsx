import { useState, useMemo } from 'react';
import { Play, ExternalLink } from 'lucide-react';

export default function LazyVideo({ videoId, title }) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Tự động lấy ID nếu người dùng nhập cả link dài, shorts, youtu.be
  const extractYoutubeId = (urlOrId) => {
    if (!urlOrId) return null;
    const match = String(urlOrId).match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    return match ? match[1] : (urlOrId.length === 11 ? urlOrId : null);
  };

  const cleanVideoId = extractYoutubeId(videoId);

  const embedUrl = useMemo(() => {
    if (!cleanVideoId) return '';
    const params = new URLSearchParams({
      autoplay: '1',
      rel: '0',
      playsinline: '1',
      enablejsapi: '1',
    });
    if (typeof window !== 'undefined' && window.location.origin && !window.location.origin.startsWith('file:')) {
      params.set('origin', window.location.origin);
    }
    return `https://www.youtube-nocookie.com/embed/${cleanVideoId}?${params.toString()}`;
  }, [cleanVideoId]);

  if (!cleanVideoId) {
    return (
      <div className="w-full aspect-video bg-slate-100 dark:bg-slate-800 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700">
        <div className="text-slate-400 dark:text-slate-500 mb-2">
          <Play size={48} className="opacity-50" />
        </div>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Chưa có video cho bài học này</p>
      </div>
    );
  }

  const thumbnailUrl = `https://img.youtube.com/vi/${cleanVideoId}/hqdefault.jpg`;
  const directYoutubeUrl = `https://www.youtube.com/watch?v=${cleanVideoId}`;

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 group shadow-lg">
      {!isPlaying ? (
        <>
          {/* Thumbnail */}
          <img 
            src={thumbnailUrl} 
            alt={title} 
            className="w-full h-full object-cover opacity-80 group-hover:opacity-90 transition-opacity duration-300"
            loading="lazy"
          />
          
          {/* Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/10 transition-colors duration-300">
            <button 
              type="button"
              onClick={() => setIsPlaying(true)}
              className="w-20 h-20 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center text-white shadow-2xl transform group-hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer"
              title="Phát bài giảng video"
            >
              <Play size={32} className="ml-1.5" fill="currentColor" />
            </button>
          </div>

          {/* Quick External Link */}
          <a
            href={directYoutubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-bold transition-all opacity-80 hover:opacity-100"
            title="Xem trên YouTube"
          >
            <ExternalLink size={13} />
            <span className="hidden sm:inline">Mở YouTube</span>
          </a>
        </>
      ) : (
        <div className="relative w-full h-full">
          <iframe
            width="100%"
            height="100%"
            src={embedUrl}
            title={title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
          {/* Fallback overlay button if YouTube restricts embed */}
          <a
            href={directYoutubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/70 hover:bg-black/90 backdrop-blur-md text-white/90 hover:text-white text-[11px] font-bold z-10 transition-all pointer-events-auto"
            title="Xem trực tiếp trên YouTube"
          >
            <ExternalLink size={12} />
            <span>Mở YouTube</span>
          </a>
        </div>
      )}
    </div>
  );
}
