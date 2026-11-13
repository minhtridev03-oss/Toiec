import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Search, Clock, Play, ArrowLeft, Filter, ChevronDown, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocale } from '../contexts/LocaleContext';

const COPY = {
  vi: {
    back: 'Quay lại',
    videos: 'video',
    search: 'Tìm kiếm bài học...',
    sort: 'Sắp xếp:',
    newest: 'Mới nhất',
    oldest: 'Cũ nhất',
    empty: 'Không tìm thấy video nào.',
    progress: 'Tiến độ',
    notStarted: 'Chưa bắt đầu',
  },
  en: {
    back: 'Back',
    videos: 'videos',
    search: 'Search lessons...',
    sort: 'Sort:',
    newest: 'Newest',
    oldest: 'Oldest',
    empty: 'No videos found.',
    progress: 'Progress',
    notStarted: 'Not started',
  },
};

export default function VideoListModal({
  isOpen,
  onClose,
  title,
  videos = [],
  getYoutubeThumbnail,
  getLevelColor,
  linkPrefix = '/dictation', // or '/shadowing'
}) {
  const { locale } = useLocale();
  const text = COPY[locale] || COPY.vi;
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
  const filteredVideos = videos
    .filter(
      (v) =>
        v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.category && v.category.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
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
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="relative w-full max-w-[1300px] h-full max-h-[88vh] bg-white/80 dark:bg-slate-950/80 backdrop-blur-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-white/50 dark:border-white/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 px-6 md:px-8 border-b border-white/10 bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white shadow-sm">
            <div className="flex items-center gap-4">
              <button
                onClick={onClose}
                className="flex items-center gap-2 hover:bg-white/20 px-3 py-1.5 rounded-xl transition-all text-xs md:text-sm font-bold cursor-pointer"
              >
                <ArrowLeft size={18} />
                <span>{text.back}</span>
              </button>
              <div className="w-px h-6 bg-white/20 hidden md:block"></div>
              <h2 className="text-lg md:text-xl font-extrabold flex items-center gap-3">
                <span>{title}</span>
                <span className="px-2.5 py-0.5 text-xs font-bold bg-white/20 rounded-full backdrop-blur-md">
                  {videos.length} {text.videos}
                </span>
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
            >
              <X size={22} />
            </button>
          </div>

          {/* Search and Filters Bar */}
          <div className="p-4 px-6 md:px-8 bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200/60 dark:border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder={text.search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 text-xs md:text-sm text-slate-800 dark:text-white transition-all shadow-sm"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto relative">
              <div
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/10 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
              >
                <Filter size={15} className="text-slate-500 dark:text-slate-400" />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{text.sort}</span>
                <div className="flex items-center gap-1 text-xs font-bold text-slate-800 dark:text-white">
                  <span>{sortBy === 'newest' ? text.newest : text.oldest}</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${isSortOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </div>

              {/* Custom Dropdown Options */}
              <AnimatePresence>
                {isSortOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full right-0 mt-2 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden z-20 p-1"
                  >
                    <button
                      onClick={() => {
                        setSortBy('newest');
                        setIsSortOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        sortBy === 'newest'
                          ? 'text-indigo-600 dark:text-cyan-400 bg-indigo-50 dark:bg-indigo-950/50'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {text.newest}
                    </button>
                    <button
                      onClick={() => {
                        setSortBy('oldest');
                        setIsSortOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        sortBy === 'oldest'
                          ? 'text-indigo-600 dark:text-cyan-400 bg-indigo-50 dark:bg-indigo-950/50'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
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
              <div className="flex flex-col items-center justify-center h-full text-slate-500 py-20">
                <Search size={44} className="mb-3 opacity-40" />
                <p className="text-base font-bold text-slate-700 dark:text-slate-300">{text.empty}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                {filteredVideos.map((video) => (
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
  const text = COPY[locale] || COPY.vi;
  const isStarted = video.progressPercent > 0;
  const isCompleted = video.progressPercent === 100;

  return (
    <Link
      to={`${linkPrefix}/${video.id}`}
      className="rounded-3xl overflow-hidden hover:-translate-y-1.5 hover:shadow-xl hover:shadow-indigo-500/15 transition-all duration-300 group border border-white/40 dark:border-white/10 backdrop-blur-2xl bg-white/40 dark:bg-slate-900/40 hover:bg-white/55 dark:hover:bg-slate-900/55 flex flex-col h-full shadow-sm cursor-pointer"
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
        <div className="absolute top-2.5 left-2.5">
          <span
            className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold shadow-md ${getLevelColor(
              video.level
            )}`}
          >
            {(video.level || 'A1').toUpperCase()}
          </span>
        </div>

        {/* Completed Badge */}
        {isCompleted && (
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-emerald-500 text-white text-[10px] font-bold shadow-md flex items-center gap-1">
            <CheckCircle2 size={12} />
            <span>Xong 100%</span>
          </div>
        )}

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 px-2.5 py-0.5 bg-black/70 backdrop-blur-md rounded-lg text-white text-[11px] font-semibold flex items-center gap-1 shadow-sm">
          <Clock size={11} />
          <span>{video.durationStr}</span>
        </div>

        {/* Play Icon Hover */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-white/95 text-indigo-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-300 shadow-xl">
            <Play size={20} className="ml-0.5 fill-current" />
          </div>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1 space-y-3">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-cyan-400 transition-colors">
          {video.title}
        </h3>

        <div className="mt-auto pt-2 border-t border-slate-100 dark:border-white/5">
          {isStarted ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500 dark:text-slate-400">{text.progress}</span>
                <span className="text-indigo-600 dark:text-cyan-400 font-extrabold">
                  {video.progressPercent}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all duration-300"
                  style={{ width: `${video.progressPercent}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="text-xs font-semibold text-slate-400 dark:text-slate-500">
              ● {text.notStarted}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
