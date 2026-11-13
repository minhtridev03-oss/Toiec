import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Headphones,
  Play,
  Clock,
  ChevronRight,
  ChevronLeft,
  Search,
  Sparkles,
  Trophy,
  Award,
  Layers,
  ArrowRight,
  Filter,
  CheckCircle2,
  X,
  Volume2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import VideoListModal from '../components/VideoListModal';
import { prefetchDictationLesson } from '../lib/lessonCache';

const CACHE_DURATION = 5 * 60 * 1000;
let dictationCache = {};

export const invalidateDictationCache = () => {
  dictationCache = {};
};

const COPY = {
  vi: {
    heroTitle: 'Dictation Studio - Luyện Nghe Chép Chính Tả',
    heroDesc: 'Rèn luyện đôi tai bắt trọn từng âm tiết, ngữ điệu và phát âm chuẩn xác qua video thực tế.',
    allLevels: 'Tất cả cấp độ',
    continueLearning: 'Tiếp tục học dở',
    newLessons: 'Bài học mới cập nhật',
    noLessons: 'Không tìm thấy bài học nào phù hợp.',
    viewMore: 'Xem tất cả',
    progress: 'Tiến độ',
    notStarted: 'Chưa học',
    searchPlaceholder: 'Tìm bài nghe theo tên, chủ đề (IELTS, BBC, Daily...)...',
    completed: 'Đã hoàn thành',
    inProgress: 'Đang học',
    totalLessons: 'Tổng số bài',
  },
  en: {
    heroTitle: 'Dictation Studio - Master Listening & Typing',
    heroDesc: 'Train your ears to capture every syllable, accent, and natural pronunciation through real-world media.',
    allLevels: 'All Levels',
    continueLearning: 'Continue Learning',
    newLessons: 'Recently Added Lessons',
    noLessons: 'No lessons matching your search.',
    viewMore: 'View all',
    progress: 'Progress',
    notStarted: 'Not started',
    searchPlaceholder: 'Search lessons by title, topic (IELTS, BBC, Daily...)...',
    completed: 'Completed',
    inProgress: 'In Progress',
    totalLessons: 'Total Lessons',
  },
};

export default function DictationList() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const text = COPY[locale] || COPY.vi;

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeLevel, setActiveLevel] = useState('All'); // 'All', 'A1', 'A2', 'B1', 'B2', 'C1'
  const [searchQuery, setSearchQuery] = useState('');
  const [modalData, setModalData] = useState({ isOpen: false, title: '', videos: [] });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Check cache
        const userIdStr = user ? user.id : 'guest';
        const now = Date.now();
        if (dictationCache[userIdStr] && now - dictationCache[userIdStr].timestamp < CACHE_DURATION) {
          setVideos(dictationCache[userIdStr].data);
          setLoading(false);
          return;
        }

        // 1. Fetch active videos
        const { data: vids, error: vError } = await supabase
          .from('dictation_videos')
          .select('id, title, thumbnail_url, youtube_id, level, category, created_at')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (vError) throw vError;
        const videoIds = (vids || []).map((video) => video.id);

        // 2. Fetch all segments to count totals per video
        const { data: segs } = videoIds.length
          ? await supabase
              .from('dictation_segments')
              .select('video_id')
              .in('video_id', videoIds)
          : { data: [] };

        let totalMap = {};
        if (segs) {
          segs.forEach((s) => {
            totalMap[s.video_id] = (totalMap[s.video_id] || 0) + 1;
          });
        }

        // 3. Fetch user progress
        let completedMap = {};
        if (user && videoIds.length) {
          const { data: prog } = await supabase
            .from('user_dictation_progress')
            .select('video_id')
            .eq('user_id', user.id)
            .in('video_id', videoIds)
            .eq('is_completed', true);

          if (prog) {
            prog.forEach((p) => {
              completedMap[p.video_id] = (completedMap[p.video_id] || 0) + 1;
            });
          }
        }

        // Process data
        const processedVideos = (vids || []).map((v) => {
          const total = totalMap[v.id] || 0;
          const completed = completedMap[v.id] || 0;
          const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
          return {
            ...v,
            totalSegments: total,
            completedSegments: completed,
            progressPercent,
            durationStr: '5 mins',
          };
        });

        dictationCache[userIdStr] = { data: processedVideos, timestamp: now };
        setVideos(processedVideos);
      } catch (err) {
        console.error('Error fetching dictation videos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const handleProgressUpdate = () => {
      dictationCache = {};
      fetchData();
    };
    window.addEventListener('dictation-progress-updated', handleProgressUpdate);
    return () => window.removeEventListener('dictation-progress-updated', handleProgressUpdate);
  }, [user]);

  const getYoutubeThumbnail = (youtubeIdOrUrl) => {
    if (!youtubeIdOrUrl) return '';
    const match = youtubeIdOrUrl.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
    );
    const id = match ? match[1] : youtubeIdOrUrl;

    if (id && id.length !== 11) {
      if (id.includes('actual_listening_2')) return '/assets/listening-covers/ielts-actual-listening-2.png';
      return '/assets/listening-covers/ielts.png';
    }
    return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
  };

  const getLevelColor = (level) => {
    const l = (level || '').toUpperCase();
    if (l === 'A1' || l === 'A2') return 'bg-emerald-500 text-white';
    if (l === 'B1' || l === 'B2') return 'bg-amber-500 text-white';
    if (l === 'C1' || l === 'C2') return 'bg-purple-600 text-white';
    return 'bg-indigo-600 text-white';
  };

  // Filtered videos based on level tab & search query
  const filteredVideos = useMemo(() => {
    return videos.filter((v) => {
      const matchLevel = activeLevel === 'All' || (v.level && v.level.toUpperCase() === activeLevel);
      const matchSearch =
        !searchQuery.trim() ||
        v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.category && v.category.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchLevel && matchSearch;
    });
  }, [videos, activeLevel, searchQuery]);

  // Counts per level
  const levelCounts = useMemo(() => {
    const counts = { All: videos.length, A1: 0, A2: 0, B1: 0, B2: 0, C1: 0 };
    videos.forEach((v) => {
      const lvl = (v.level || '').toUpperCase();
      if (counts[lvl] !== undefined) {
        counts[lvl]++;
      }
    });
    return counts;
  }, [videos]);

  // Overall Stats
  const inProgressVideos = useMemo(
    () => videos.filter((v) => v.progressPercent > 0 && v.progressPercent < 100),
    [videos]
  );
  const completedVideos = useMemo(() => videos.filter((v) => v.progressPercent === 100), [videos]);

  // Groupings for filtered list
  const continueLearning = useMemo(
    () => filteredVideos.filter((v) => v.progressPercent > 0 && v.progressPercent < 100),
    [filteredVideos]
  );
  const newLessons = useMemo(
    () =>
      [...filteredVideos]
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(0, 10),
    [filteredVideos]
  );

  const categoryGroups = useMemo(() => {
    const groups = {};
    filteredVideos.forEach((v) => {
      const cat = v.category || 'Chủ đề tổng hợp';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(v);
    });
    return groups;
  }, [filteredVideos]);

  const levels = ['All', 'A1', 'A2', 'B1', 'B2', 'C1'];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Đang chuẩn bị kho bài nghe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-transparent pb-24">
      {/* 1. HERO STUDIO BANNER */}
      <div className="px-4 md:px-8 pt-6 pb-2">
        <div className="max-w-7xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl p-6 md:p-8 backdrop-blur-2xl bg-white/25 dark:bg-slate-900/30 border border-white/35 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)]">
            {/* Ambient Glow */}
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-gradient-to-br from-indigo-500/15 via-blue-500/10 to-cyan-400/15 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              {/* Left Content */}
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-indigo-500/15 to-blue-500/15 border border-indigo-500/30 text-indigo-700 dark:text-cyan-300 text-xs font-extrabold tracking-wide">
                  <Headphones size={14} className="text-indigo-600 dark:text-cyan-400" />
                  <span>KỸ NĂNG NGHE CHUYÊN SÂU</span>
                </div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight drop-shadow-sm">
                  {text.heroTitle}
                </h1>
                <p className="text-sm md:text-base text-slate-700 dark:text-slate-200 font-semibold leading-relaxed">
                  {text.heroDesc}
                </p>
              </div>

              {/* Right: 3 Stats Cards */}
              <div className="grid grid-cols-3 gap-3 shrink-0">
                <div className="p-4 rounded-2xl bg-white/20 dark:bg-slate-800/25 border border-white/30 dark:border-white/10 shadow-sm text-center min-w-[100px] backdrop-blur-md">
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                    {text.inProgress}
                  </div>
                  <div className="text-xl md:text-2xl font-black text-indigo-600 dark:text-cyan-400">
                    {inProgressVideos.length}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/20 dark:bg-slate-800/25 border border-white/30 dark:border-white/10 shadow-sm text-center min-w-[100px] backdrop-blur-md">
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                    {text.completed}
                  </div>
                  <div className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {completedVideos.length}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/20 dark:bg-slate-800/25 border border-white/30 dark:border-white/10 shadow-sm text-center min-w-[100px] backdrop-blur-md">
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                    {text.totalLessons}
                  </div>
                  <div className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                    {videos.length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FLOATING ROUNDED FILTER & SEARCH DOCK */}
      <div className="sticky top-3 z-20 px-4 md:px-8 py-1 my-3">
        <div className="max-w-7xl mx-auto p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl bg-white/30 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/35 dark:border-white/10 shadow-lg shadow-black/5 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Level Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl sm:rounded-2xl bg-white/20 dark:bg-slate-800/25 border border-white/25 dark:border-white/5 shadow-inner overflow-x-auto w-full md:w-auto hide-scrollbar">
            {levels.map((lvl) => {
              const count = levelCounts[lvl] || 0;
              const isActive = activeLevel === lvl;
              return (
                <button
                  key={lvl}
                  onClick={() => setActiveLevel(lvl)}
                  className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs md:text-sm font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-500/30'
                      : 'text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-cyan-300 hover:bg-white/40 dark:hover:bg-slate-700/40'
                  }`}
                >
                  <span>{lvl === 'All' ? text.allLevels : lvl}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-white/25 text-white' : 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder={text.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 rounded-xl sm:rounded-2xl bg-white/20 dark:bg-slate-800/25 border border-white/25 dark:border-white/10 focus:border-indigo-500 focus:bg-white/45 dark:focus:bg-slate-900/50 focus:ring-4 focus:ring-indigo-500/15 outline-none text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 shadow-sm transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. MAIN CONTENT CONTAINER */}
      <div className="px-4 md:px-8 py-4">
        <div className="max-w-7xl mx-auto space-y-10">
          {/* SPOTLIGHT: TIẾP TỤC HỌC DỞ */}
          {continueLearning.length > 0 && (
            <div className="space-y-4">
              {/* High-Contrast Frosted Glass Header Card */}
              <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-white/30 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/35 dark:border-white/10 shadow-md shadow-black/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/25 shrink-0">
                    <Sparkles size={18} />
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <span>{text.continueLearning}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold">
                      {continueLearning.length} bài
                    </span>
                  </h2>
                </div>
                {continueLearning.length > 1 && (
                  <button
                    onClick={() =>
                      setModalData({
                        isOpen: true,
                        title: text.continueLearning,
                        videos: continueLearning,
                      })
                    }
                    className="text-xs sm:text-sm font-bold text-indigo-600 dark:text-cyan-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>{text.viewMore} ({continueLearning.length})</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>

              {/* Spotlight Hero Card (Bài học gần nhất) */}
              {continueLearning[0] && (
                <div className="rounded-3xl p-5 md:p-6 backdrop-blur-2xl bg-white/25 dark:bg-slate-900/35 border border-white/30 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.06)]">
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    {/* Thumbnail preview */}
                    <div className="relative aspect-video w-full md:w-80 rounded-2xl overflow-hidden shrink-0 group">
                      <img
                        src={
                          continueLearning[0].thumbnail_url ||
                          getYoutubeThumbnail(continueLearning[0].youtube_id)
                        }
                        alt={continueLearning[0].title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                        <Link
                          to={`/dictation/${continueLearning[0].id}`}
                          className="w-14 h-14 rounded-full bg-white/95 text-indigo-600 flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                        >
                          <Play size={24} className="ml-1 fill-current" />
                        </Link>
                      </div>
                      <div className="absolute top-3 left-3">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-extrabold shadow-md ${getLevelColor(
                            continueLearning[0].level
                          )}`}
                        >
                          {(continueLearning[0].level || 'A1').toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Content & Action */}
                    <div className="flex-1 space-y-4 w-full">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-indigo-600 dark:text-cyan-400 uppercase tracking-wider">
                          Đang học dở
                        </span>
                        <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white line-clamp-2">
                          {continueLearning[0].title}
                        </h3>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-600 dark:text-slate-400">
                            Đã chép {continueLearning[0].completedSegments} / {continueLearning[0].totalSegments} câu
                          </span>
                          <span className="text-indigo-600 dark:text-cyan-400 font-extrabold">
                            {continueLearning[0].progressPercent}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 transition-all duration-300"
                            style={{ width: `${continueLearning[0].progressPercent}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="pt-2">
                        <Link
                          to={`/dictation/${continueLearning[0].id}`}
                          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white text-xs md:text-sm font-bold shadow-lg shadow-indigo-500/25 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        >
                          <span>Nghe tiếp ngay</span>
                          <ArrowRight size={16} />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION: BÀI HỌC MỚI */}
          <VideoCarouselSection
            title={text.newLessons}
            icon="sparkles"
            videos={newLessons}
            getYoutubeThumbnail={getYoutubeThumbnail}
            getLevelColor={getLevelColor}
            onViewMore={() =>
              setModalData({ isOpen: true, title: text.newLessons, videos: newLessons })
            }
            text={text}
          />

          {/* SECTIONS: THEO DANH MỤC / CHỦ ĐỀ */}
          {Object.entries(categoryGroups).map(([cat, vids]) => (
            <VideoCarouselSection
              key={cat}
              title={cat}
              count={vids.length}
              icon="layers"
              videos={vids}
              getYoutubeThumbnail={getYoutubeThumbnail}
              getLevelColor={getLevelColor}
              onViewMore={() => setModalData({ isOpen: true, title: cat, videos: vids })}
              text={text}
            />
          ))}

          {/* EMPTY STATE */}
          {filteredVideos.length === 0 && (
            <div className="py-20 text-center rounded-3xl backdrop-blur-2xl bg-white/20 dark:bg-slate-900/30 border border-white/25 dark:border-white/10 p-8 shadow-sm">
              <Search size={40} className="mx-auto mb-3 text-slate-400 opacity-60" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-1">
                {text.noLessons}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Thử thay đổi từ khóa tìm kiếm hoặc chọn cấp độ khác nhé.
              </p>
              <button
                onClick={() => {
                  setActiveLevel('All');
                  setSearchQuery('');
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                Đặt lại bộ lọc
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. MODAL DANH SÁCH CHI TIẾT */}
      <VideoListModal
        isOpen={modalData.isOpen}
        onClose={() => setModalData({ ...modalData, isOpen: false })}
        title={modalData.title}
        videos={modalData.videos}
        getYoutubeThumbnail={getYoutubeThumbnail}
        getLevelColor={getLevelColor}
        linkPrefix="/dictation"
      />
    </div>
  );
}

// Sub-component: VideoCarouselSection với nút trượt ngang mượt mà và Section Header có nền kính làm rõ chữ
function VideoCarouselSection({
  title,
  count,
  icon,
  videos,
  getYoutubeThumbnail,
  getLevelColor,
  onViewMore,
  text,
}) {
  if (!videos || videos.length === 0) return null;

  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Section Header with High-Contrast Frosted Glass Card */}
      <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-white/30 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/35 dark:border-white/10 shadow-md shadow-black/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 shrink-0">
            {icon === 'sparkles' ? <Sparkles size={18} /> : <Layers size={18} />}
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>{title}</span>
            {count > 0 && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-cyan-300 font-bold">
                {count} bài
              </span>
            )}
          </h2>
        </div>

        {/* Controls: Prev / Next + View All */}
        <div className="flex items-center gap-2">
          {videos.length > 4 && (
            <div className="hidden sm:flex items-center gap-1 bg-white/20 dark:bg-slate-800/30 p-1 rounded-xl border border-white/25 dark:border-white/10 shadow-sm">
              <button
                onClick={() => scroll('left')}
                className="p-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                title="Trượt sang trái"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => scroll('right')}
                className="p-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                title="Trượt sang phải"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {videos.length > 5 && (
            <button
              onClick={onViewMore}
              className="text-xs sm:text-sm font-bold text-indigo-600 dark:text-cyan-400 hover:underline cursor-pointer flex items-center gap-1 ml-1"
            >
              <span>{text.viewMore}</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Scroll Grid */}
      <div
        ref={scrollRef}
        className="flex gap-4 md:gap-5 overflow-x-auto pb-3 pt-1 hide-scrollbar scroll-smooth"
      >
        {videos.map((video) => (
          <div key={video.id} className="w-[260px] md:w-[280px] shrink-0">
            <VideoCard
              video={video}
              getYoutubeThumbnail={getYoutubeThumbnail}
              getLevelColor={getLevelColor}
              text={text}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Sub-component: VideoCard 2.0 (Liquid Glass Capsule)
function VideoCard({ video, getYoutubeThumbnail, getLevelColor, text }) {
  const isStarted = video.progressPercent > 0;
  const isCompleted = video.progressPercent === 100;

  return (
    <Link
      to={`/dictation/${video.id}`}
      onMouseEnter={() => prefetchDictationLesson(video.id)}
      className="rounded-3xl overflow-hidden hover:-translate-y-1.5 hover:shadow-xl hover:shadow-indigo-500/15 transition-all duration-300 group border border-white/35 dark:border-white/10 backdrop-blur-2xl bg-white/30 dark:bg-slate-900/35 hover:bg-white/45 dark:hover:bg-slate-900/50 flex flex-col h-full shadow-sm cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={video.thumbnail_url || getYoutubeThumbnail(video.youtube_id)}
          alt={video.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
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

        {/* Play Icon on Hover */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-white/95 text-indigo-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all duration-300 shadow-xl">
            <Play size={20} className="ml-0.5 fill-current" />
          </div>
        </div>
      </div>

      {/* Card Info */}
      <div className="p-4 flex flex-col flex-1 space-y-3">
        <h3 className="text-sm md:text-base font-bold text-slate-800 dark:text-white line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-cyan-400 transition-colors">
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
            <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <span>● {text.notStarted}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
