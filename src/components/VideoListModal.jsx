import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Search, Clock, Play, ArrowLeft, Filter, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale } from '../contexts/LocaleContext';

const COPY = {
  vi: { back: 'Quay lại', videos: 'video', search: 'Tìm bài...', sort: 'Sắp xếp:', newest: 'Mới nhất', oldest: 'Cũ nhất', empty: 'Không tìm thấy video nào.', progress: 'Tiến độ', notStarted: 'Chưa bắt đầu' },
  en: { back: 'Back', videos: 'videos', search: 'Search lessons...', sort: 'Sort:', newest: 'Newest', oldest: 'Oldest', empty: 'No videos found.', progress: 'Progress', notStarted: 'Not started' },
};

export default function VideoListModal({ 
  isOpen, 
  onClose, 
  title, 
  videos = [], 
  getYoutubeThumbnail, 
  getLevelColor,
  linkPrefix = '/dictation' // or '/shadowing'
}) {
  const { locale } = useLocale();
  const text = COPY[locale];
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest
  const [isSortOpen, setIsSortOpen] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSortBy('newest');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter & Sort
  const filteredVideos = videos.filter(v => 
    v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.category && v.category.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
    return 0;
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative w-full max-w-[1400px] h-full max-h-[90vh] bg-pink-50 dark:bg-[#160B1E] rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-pink-200 dark:border-white/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 px-6 md:px-8 border-b border-pink-200 dark:border-white/10 bg-fuchsia-600 dark:bg-[#2A173B] text-white">
            <div className="flex items-center gap-4">
              <button 
                onClick={onClose}
                className="flex items-center gap-2 hover:bg-white/20 p-2 rounded-lg transition-colors text-sm font-medium"
              >
                <ArrowLeft size={18} />
                {text.back}
              </button>
              <div className="w-px h-6 bg-white/20 hidden md:block"></div>
              <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3">
                {title}
                <span className="px-2.5 py-1 text-xs font-bold bg-white/20 rounded-lg backdrop-blur-md">
                  {videos.length} {text.videos}
                </span>
              </h2>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Search and Filters */}
          <div className="p-4 px-6 md:px-8 bg-white dark:bg-[#1A0E24] border-b border-pink-100 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder={text.search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:border-fuchsia-500 dark:focus:border-fuchsia-500 text-slate-800 dark:text-white transition-colors"
              />
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto relative">
              <div 
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 cursor-pointer hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
              >
                <Filter size={16} className="text-slate-500 dark:text-slate-400" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{text.sort}</span>
                <div className="flex items-center gap-1 text-sm font-bold text-slate-800 dark:text-white">
                  {sortBy === 'newest' ? text.newest : text.oldest}
                  <ChevronDown size={14} className={`transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
              
              {/* Custom Dropdown Options */}
              <AnimatePresence>
                {isSortOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full right-0 mt-2 w-40 bg-white dark:bg-[#2A173B] border border-pink-100 dark:border-white/10 rounded-xl shadow-xl overflow-hidden z-20"
                  >
                    <button 
                      onClick={() => { setSortBy('newest'); setIsSortOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-fuchsia-50 dark:hover:bg-white/10 transition-colors cursor-pointer ${sortBy === 'newest' ? 'text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-50/50 dark:bg-white/5' : 'text-slate-700 dark:text-slate-300'}`}
                    >
                      {text.newest}
                    </button>
                    <button 
                      onClick={() => { setSortBy('oldest'); setIsSortOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-fuchsia-50 dark:hover:bg-white/10 transition-colors cursor-pointer ${sortBy === 'oldest' ? 'text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-50/50 dark:bg-white/5' : 'text-slate-700 dark:text-slate-300'}`}
                    >
                      {text.oldest}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Video Grid */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            {filteredVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Search size={48} className="mb-4 opacity-50" />
                <p className="text-lg font-medium">{text.empty}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {filteredVideos.map(video => (
                  <ModalVideoCard 
                    key={video.id} 
                    video={video} 
                    getYoutubeThumbnail={getYoutubeThumbnail}
                    getLevelColor={getLevelColor}
                    linkPrefix={linkPrefix}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function ModalVideoCard({ video, getYoutubeThumbnail, getLevelColor, linkPrefix }) {
  const { locale } = useLocale();
  const text = COPY[locale];
  const isStarted = video.progressPercent > 0;
  
  return (
    <Link 
      to={`${linkPrefix}/${video.id}`}
      className="bg-white dark:bg-[#1A0E24] rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-fuchsia-900/20 transition-all duration-300 group border border-pink-100 dark:border-white/5 flex flex-col h-full"
    >
      <div className="relative aspect-video overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img 
          src={video.thumbnail_url || getYoutubeThumbnail(video.youtube_id)}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
        
        {/* Level Badge */}
        <div className="absolute top-3 left-3">
          <span className={`px-2.5 py-1 rounded border-b-[3px] border-black/20 text-xs font-bold shadow-md ${getLevelColor(video.level)}`}>
            {(video.level || 'A1').toUpperCase()}
          </span>
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-md rounded-md text-white text-xs font-medium flex items-center gap-1.5 shadow-sm">
          <Clock size={12} />
          {video.durationStr}
        </div>
        
        {/* Play Icon Hover */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-white/90 text-fuchsia-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all shadow-lg">
            <Play size={20} className="ml-1" />
          </div>
        </div>
      </div>
      
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-base font-bold text-slate-800 dark:text-white mb-3 line-clamp-2 leading-snug group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400 transition-colors">
          {video.title}
        </h3>
        
        <div className="mt-auto">
          {isStarted ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-500 dark:text-slate-400">{text.progress}</span>
                <span className="text-fuchsia-600 dark:text-fuchsia-500">{video.progressPercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-fuchsia-500 rounded-full" 
                  style={{ width: `${video.progressPercent}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="text-xs font-medium text-slate-400 dark:text-slate-500">
              {text.notStarted}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
