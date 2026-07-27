import { useState } from 'react';
import { Play } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LazyVideo({ videoId, title }) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Tự động lấy ID nếu người dùng nhập cả link dài
  const extractYoutubeId = (urlOrId) => {
    if (!urlOrId) return null;
    const match = urlOrId.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    return match ? match[1] : urlOrId;
  };

  const cleanVideoId = extractYoutubeId(videoId);

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

  const thumbnailUrl = cleanVideoId && cleanVideoId.length !== 11 
    ? (cleanVideoId.includes('actual_listening_2') ? '/assets/listening-covers/ielts-actual-listening-2.png' : '/assets/listening-covers/ielts.png')
    : `https://img.youtube.com/vi/${cleanVideoId}/hqdefault.jpg`;

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
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-colors duration-300">
            <button 
              onClick={() => setIsPlaying(true)}
              className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center text-white shadow-xl transform group-hover:scale-110 transition-transform duration-300 cursor-pointer"
            >
              <Play size={32} className="ml-2" fill="currentColor" />
            </button>
          </div>
        </>
      ) : (
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${cleanVideoId}?autoplay=1&rel=0`}
          title={title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0"
        ></iframe>
      )}
    </div>
  );
}
