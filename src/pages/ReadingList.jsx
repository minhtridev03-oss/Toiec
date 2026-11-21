import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Search,
  X,
  Sparkles,
  Clock,
  Layers,
  Filter,
  Mail,
  FileText,
  Newspaper,
  MessageSquare,
  Compass,
  Flame,
  Award,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { useInfiniteScroll } from '../lib/useInfiniteScroll';
import { prefetchReadingLesson } from '../lib/lessonCache';
import SkillSwitchTabs from '../components/navigation/SkillSwitchTabs';

const LEVELS = ['All', 'Basic', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Toeic', 'IELTS'];
const PAGE_SIZE = 24;
const readingLessonsCache = new Map();
const readingLessonsInflight = new Map();

const LEVEL_BADGES = {
  Basic: 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 border-slate-300/60 dark:border-slate-600/60',
  A1: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  A2: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  B1: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
  B2: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
  C1: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
  C2: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
  Toeic: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  IELTS: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
};

const GENRE_CONFIG = {
  email: {
    label: 'Email / Thư từ',
    icon: Mail,
    color: 'text-sky-600 dark:text-sky-400',
    badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/25',
    iconBg: 'bg-gradient-to-tr from-sky-500 to-blue-600',
  },
  memo: {
    label: 'Thông báo / Memo',
    icon: FileText,
    color: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25',
    iconBg: 'bg-gradient-to-tr from-amber-500 to-orange-600',
  },
  article: {
    label: 'Bài báo / Báo cáo',
    icon: Newspaper,
    color: 'text-indigo-600 dark:text-cyan-400',
    badge: 'bg-indigo-500/15 text-indigo-700 dark:text-cyan-300 border-indigo-500/25',
    iconBg: 'bg-gradient-to-tr from-indigo-600 to-blue-500',
  },
  feedback: {
    label: 'Phản hồi / Khiếu nại',
    icon: MessageSquare,
    color: 'text-rose-600 dark:text-rose-400',
    badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/25',
    iconBg: 'bg-gradient-to-tr from-rose-500 to-pink-600',
  },
  story: {
    label: 'Đoạn văn đọc hiểu',
    icon: BookOpen,
    color: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
    iconBg: 'bg-gradient-to-tr from-emerald-500 to-teal-600',
  },
};

const detectGenre = (title = '', content = '') => {
  const text = (title + ' ' + content).toLowerCase();
  if (text.includes('email') || text.includes('message to') || text.includes('dear ') || text.includes('letter')) {
    return GENRE_CONFIG.email;
  }
  if (text.includes('memo') || text.includes('notice') || text.includes('policy') || text.includes('announcement') || text.includes('office') || text.includes('vacation')) {
    return GENRE_CONFIG.memo;
  }
  if (text.includes('article') || text.includes('study') || text.includes('survey') || text.includes('report') || text.includes('news')) {
    return GENRE_CONFIG.article;
  }
  if (text.includes('complaint') || text.includes('review') || text.includes('feedback') || text.includes('customer')) {
    return GENRE_CONFIG.feedback;
  }
  return GENRE_CONFIG.story;
};

const getReadingLessonsPage = async (level, page) => {
  const cacheKey = `${level}:${page}`;
  const cached = readingLessonsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  if (readingLessonsInflight.has(cacheKey)) return readingLessonsInflight.get(cacheKey);

  let query = supabase
    .from('reading_lessons')
    .select('id, title, content, level, created_at')
    .order('created_at', { ascending: true })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  if (level !== 'All') query = query.ilike('level', level);

  const request = query
    .then(({ data, error }) => {
      if (error) throw error;
      const rows = data || [];
      readingLessonsCache.set(cacheKey, { data: rows, expiresAt: Date.now() + 60_000 });
      return rows;
    })
    .finally(() => readingLessonsInflight.delete(cacheKey));

  readingLessonsInflight.set(cacheKey, request);
  return request;
};

const COPY = {
  vi: {
    heroBadge: 'READING COMPREHENSION STUDIO',
    title: 'Luyện Đọc Hiểu & Từ Vựng Ngữ Cảnh',
    desc: 'Trau dồi kỹ năng đọc hiểu chuyên sâu, mở rộng vốn từ vựng học thuật và phản xạ ngữ cảnh thực tế với kho bài đọc đa dạng chủ đề.',
    allTopics: 'Tất cả bài đọc hiểu',
    completed: 'Đã hoàn thành',
    uncompleted: 'Chưa học',
    allStatus: 'Tất cả trạng thái',
    startPractice: 'Bắt đầu luyện',
    featuredBadge: 'Bài đọc gợi ý hôm nay',
    searchPlaceholder: 'Tìm bài đọc theo tên, chủ đề (email, memo, complaint, holiday...)...',
    totalLessons: 'Tổng bài đọc',
    readingTime: 'Thời lượng đọc',
    noLessonsFound: 'Không tìm thấy bài đọc nào phù hợp với bộ lọc.',
    clearFilters: 'Xóa bộ lọc',
    continueReading: 'Tiếp tục bài đọc dở',
    estTime: 'phút đọc',
    passages: 'bài đã đọc',
    accuracy: 'Tiến độ hoàn thành',
  },
  en: {
    heroBadge: 'READING COMPREHENSION STUDIO',
    title: 'Reading Comprehension Studio',
    desc: 'Sharpen comprehensive reading skills, expand academic vocabulary and master real-world contexts through diverse reading passages.',
    allTopics: 'All Reading Lessons',
    completed: 'Completed',
    uncompleted: 'Uncompleted',
    allStatus: 'All Statuses',
    startPractice: 'Start Reading',
    featuredBadge: 'Featured Daily Reading',
    searchPlaceholder: 'Search passages by title, topic (email, memo, complaint, holiday...)...',
    totalLessons: 'Total Passages',
    readingTime: 'Reading Time',
    noLessonsFound: 'No reading lessons found matching your criteria.',
    clearFilters: 'Reset filters',
    continueReading: 'Continue Reading',
    estTime: 'mins read',
    passages: 'completed',
    accuracy: 'Completion progress',
  },
};

export default function ReadingList() {
  const { locale } = useLocale();
  const text = COPY[locale] || COPY.vi;
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'uncompleted' | 'completed'

  const [lessons, setLessons] = useState([]);
  const [allLevelCounts, setAllLevelCounts] = useState({});
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);
  const [completedLessons, setCompletedLessons] = useState(new Set());

  // 1. Fetch metadata count across levels once
  useEffect(() => {
    supabase
      .from('reading_lessons')
      .select('id, level')
      .then(({ data }) => {
        if (data) {
          const counts = { All: data.length };
          data.forEach((item) => {
            const raw = (item.level || '').trim();
            if (raw) {
              const matched = LEVELS.find((l) => l.toLowerCase() === raw.toLowerCase()) || raw;
              counts[matched] = (counts[matched] || 0) + 1;
            }
          });
          setAllLevelCounts(counts);
          setTotalCount(data.length);
        }
      })
      .catch(() => {});
  }, []);

  // 2. Fetch user progress
  const fetchProgress = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('user_reading_progress')
        .select('lesson_id')
        .eq('user_id', user.id);

      if (error) throw error;
      setCompletedLessons(new Set((data || []).map((d) => d.lesson_id)));
    } catch (error) {
      console.error('Error fetching reading progress:', error.message);
    }
  }, [user?.id]);

  // 3. Fetch lessons page
  const fetchLessons = useCallback(
    async (reset = false) => {
      try {
        if (reset) {
          setLoading(true);
          pageRef.current = 0;
        } else {
          setLoadingMore(true);
        }
        const nextPage = reset ? 0 : pageRef.current + 1;
        const rows = await getReadingLessonsPage(activeTab, nextPage);
        setLessons((current) => (reset ? rows : [...current, ...rows]));
        pageRef.current = nextPage;
        setHasMore(rows.length === PAGE_SIZE);
      } catch (error) {
        console.error('Error fetching reading lessons:', error.message);
      } finally {
        if (reset) setLoading(false);
        else setLoadingMore(false);
      }
    },
    [activeTab]
  );

  useEffect(() => {
    fetchLessons(true);
    if (user) {
      fetchProgress();
    }
  }, [fetchLessons, fetchProgress, user]);

  const loadMore = useCallback(() => fetchLessons(false), [fetchLessons]);
  const sentinelRef = useInfiniteScroll(loadMore, hasMore, loadingMore);

  // 4. Client-side filtering (Search + Status Filter)
  const filteredLessons = useMemo(() => {
    return lessons.filter((lesson) => {
      // Status filter
      const isCompleted = completedLessons.has(lesson.id);
      if (statusFilter === 'completed' && !isCompleted) return false;
      if (statusFilter === 'uncompleted' && isCompleted) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = (lesson.title || '').toLowerCase().includes(q);
        const contentMatch = (lesson.content || '').toLowerCase().includes(q);
        const levelMatch = (lesson.level || '').toLowerCase().includes(q);
        return titleMatch || contentMatch || levelMatch;
      }
      return true;
    });
  }, [lessons, completedLessons, statusFilter, searchQuery]);

  // 5. Featured Daily Reading Lesson
  const featuredLesson = useMemo(() => {
    if (lessons.length === 0) return null;
    // Prefer uncompleted B1/A2 or simply the first uncompleted lesson
    const uncompleted = lessons.find((l) => !completedLessons.has(l.id));
    return uncompleted || lessons[0];
  }, [lessons, completedLessons]);

  const completedCount = completedLessons.size;
  const progressPercent = totalCount > 0 ? Math.min(100, Math.round((completedCount / totalCount) * 100)) : 0;

  return (
    <div className="flex-1 bg-transparent text-slate-800 dark:text-white overflow-y-auto min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-7 space-y-5 sm:space-y-7 pb-20">
        {/* Top Quick Skill Tabs */}
        <SkillSwitchTabs />
        
        {/* 1. HERO GLASS BANNER & DAILY READING SPOTLIGHT */}
        <div className="relative rounded-3xl p-6 sm:p-8 lg:p-10 backdrop-blur-2xl bg-white/30 dark:bg-slate-900/40 border border-white/35 dark:border-white/10 shadow-2xl shadow-indigo-500/5 overflow-hidden">
          {/* Ambient Glow Orbs */}
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-500/15 via-blue-500/10 to-cyan-400/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-gradient-to-tr from-blue-500/15 via-indigo-500/10 to-transparent blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Header Description & Metrics */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/15 to-blue-500/15 border border-indigo-500/30 text-indigo-700 dark:text-cyan-300 text-xs font-black tracking-wider uppercase backdrop-blur-md">
                <BookOpen size={14} className="text-indigo-600 dark:text-cyan-400 animate-pulse" />
                <span>{text.heroBadge}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                {text.title}
              </h1>

              <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl font-medium">
                {text.desc}
              </p>

              {/* Quick Stat Badges */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-white/40 dark:border-white/10 shadow-xs">
                  <Flame size={16} className="text-rose-500" />
                  <span className="text-xs font-black text-slate-800 dark:text-white">
                    {totalCount || lessons.length} {text.totalLessons}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-white/40 dark:border-white/10 shadow-xs">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span className="text-xs font-black text-slate-800 dark:text-white">
                    {completedCount} {text.passages} ({progressPercent}%)
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-white/40 dark:border-white/10 shadow-xs">
                  <Layers size={16} className="text-indigo-500" />
                  <span className="text-xs font-black text-slate-800 dark:text-white">
                    10 Cấp độ (Basic → IELTS)
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Featured Daily Reading Card */}
            {featuredLesson && (() => {
              const genre = detectGenre(featuredLesson.title, featuredLesson.content);
              const GenreIcon = genre.icon;
              const isComp = completedLessons.has(featuredLesson.id);
              const wordsCount = (featuredLesson.content || '').split(/\s+/).filter(Boolean).length;
              const estMins = Math.max(2, Math.ceil(wordsCount / 130));
              const previewText = (featuredLesson.content || '').replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();

              return (
                <div className="lg:col-span-5">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    onMouseEnter={() => prefetchReadingLesson(featuredLesson.id)}
                    onClick={() => navigate(`/reading/${featuredLesson.id}`)}
                    className="relative rounded-3xl p-5 bg-gradient-to-br from-white/60 via-white/40 to-white/20 dark:from-slate-800/70 dark:via-slate-800/50 dark:to-slate-900/60 border border-indigo-500/30 dark:border-indigo-500/20 shadow-xl shadow-indigo-500/10 cursor-pointer group overflow-hidden"
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-cyan-300">
                        <Sparkles size={13} className="text-indigo-500 dark:text-cyan-400" />
                        <span>{text.featuredBadge}</span>
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black border ${LEVEL_BADGES[featuredLesson.level] || LEVEL_BADGES.Basic}`}>
                        {featuredLesson.level || 'Basic'}
                      </span>
                    </div>

                    <div className="flex gap-4 items-center mb-3">
                      <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${genre.iconBg} text-white group-hover:scale-105 transition-transform duration-300`}>
                        <GenreIcon size={26} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-cyan-400 transition-colors">
                          {featuredLesson.title}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${genre.badge}`}>
                            {genre.label}
                          </span>
                          {isComp && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <CheckCircle2 size={11} /> {text.completed}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {previewText && (
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
                        {previewText}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-white/20 dark:border-white/10">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock size={13} /> ~{estMins} {text.estTime}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white text-xs font-extrabold shadow-md shadow-indigo-500/25 group-hover:shadow-lg transition-all">
                        <span>{text.startPractice}</span>
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </motion.div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* 2. FLOATING ROUNDED FILTER & SEARCH DOCK */}
        <div className="sticky top-3 z-30 py-1">
          <div className="p-3 sm:p-3.5 rounded-2xl sm:rounded-3xl bg-white/30 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/35 dark:border-white/10 shadow-lg shadow-black/5 flex flex-col md:flex-row items-center justify-between gap-3">
            
            {/* Level Tabs with Badge Counts */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl sm:rounded-2xl bg-white/20 dark:bg-slate-800/25 border border-white/25 dark:border-white/5 shadow-inner overflow-x-auto w-full md:w-auto hide-scrollbar">
              {LEVELS.map((lvl) => {
                const count = allLevelCounts[lvl] ?? 0;
                const isActive = activeTab === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setActiveTab(lvl)}
                    className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs md:text-sm font-extrabold transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-500/30'
                        : 'text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-cyan-300 hover:bg-white/40 dark:hover:bg-slate-700/40'
                    }`}
                  >
                    <span>{lvl === 'All' ? 'Tất cả' : lvl}</span>
                    {count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          isActive
                            ? 'bg-white/25 text-white'
                            : 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Status Pill + Instant Search Bar */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              {/* Status Filter Dropdown / Pill */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-white/20 dark:bg-slate-800/25 border border-white/25 dark:border-white/5 shrink-0">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-white/70 dark:bg-slate-700/70 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Tất cả bài học"
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('uncompleted')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'uncompleted'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Chỉ xem bài chưa học"
                >
                  Chưa học
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('completed')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === 'completed'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Bài đã hoàn thành"
                >
                  <CheckCircle2 size={13} className="inline mr-1" /> Đã xong
                </button>
              </div>

              {/* Instant Search Bar */}
              <div className="relative flex-1 md:w-72">
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
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. READING PASSAGES GRID */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl backdrop-blur-xl bg-white/60 dark:bg-slate-900/65 border border-white/50 dark:border-white/10 shadow-sm shadow-black/5">
              <span className="p-1.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white shadow-xs">
                <BookOpen size={16} />
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{text.allTopics}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-extrabold bg-indigo-500/15 text-indigo-700 dark:text-cyan-300 border border-indigo-500/25">
                  {filteredLessons.length}
                </span>
              </h2>
            </div>
          </div>

          {loading ? (
            /* Skeleton Loading Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-3xl p-6 bg-white/20 dark:bg-slate-800/20 border border-white/20 dark:border-white/5 space-y-4 animate-pulse"
                >
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 rounded-2xl bg-slate-300/40 dark:bg-slate-700/40" />
                    <div className="w-16 h-6 rounded-lg bg-slate-300/40 dark:bg-slate-700/40" />
                  </div>
                  <div className="h-5 w-3/4 rounded-lg bg-slate-300/40 dark:bg-slate-700/40" />
                  <div className="h-4 w-full rounded-lg bg-slate-300/30 dark:bg-slate-700/30" />
                  <div className="h-4 w-1/2 rounded-lg bg-slate-300/30 dark:bg-slate-700/30" />
                </div>
              ))}
            </div>
          ) : filteredLessons.length === 0 ? (
            /* Empty State */
            <div className="rounded-3xl p-12 text-center backdrop-blur-2xl bg-white/20 dark:bg-slate-900/30 border border-white/25 dark:border-white/10 space-y-3">
              <Compass size={40} className="mx-auto text-slate-400" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                {text.noLessonsFound}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setActiveTab('All');
                }}
                className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors cursor-pointer shadow-md shadow-indigo-600/25"
              >
                {text.clearFilters}
              </button>
            </div>
          ) : (
            /* Cards Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
              {filteredLessons.map((lesson) => {
                const isCompleted = completedLessons.has(lesson.id);
                const genre = detectGenre(lesson.title, lesson.content);
                const GenreIcon = genre.icon;
                const wordsCount = (lesson.content || '').split(/\s+/).filter(Boolean).length;
                const estMins = Math.max(2, Math.ceil(wordsCount / 130));
                const previewSnippet = (lesson.content || '').replace(/\\n/g, ' ').replace(/\s+/g, ' ').trim();

                return (
                  <motion.div
                    key={lesson.id}
                    whileHover={{ y: -5 }}
                    transition={{ duration: 0.2 }}
                    onMouseEnter={() => prefetchReadingLesson(lesson.id)}
                    onFocus={() => prefetchReadingLesson(lesson.id)}
                    onClick={() => navigate(`/reading/${lesson.id}`)}
                    className="defer-render rounded-3xl backdrop-blur-xl bg-white/35 dark:bg-slate-900/45 border border-white/40 dark:border-white/10 shadow-lg shadow-black/5 hover:shadow-2xl hover:border-indigo-500/40 transition-all cursor-pointer group flex flex-col justify-between overflow-hidden p-5 sm:p-6"
                  >
                    <div>
                      {/* Top Header: Genre Icon + Badges */}
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${genre.iconBg} text-white group-hover:scale-108 transition-transform duration-300`}>
                          <GenreIcon size={22} />
                        </div>

                        <div className="flex flex-col items-end gap-1.5">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black border backdrop-blur-sm ${LEVEL_BADGES[lesson.level] || LEVEL_BADGES.Basic}`}>
                            {lesson.level || 'Basic'}
                          </span>

                          {isCompleted && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-2xs">
                              <CheckCircle2 size={11} /> {text.completed}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Genre Tag */}
                      <div className="mb-2">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${genre.badge}`}>
                          {genre.label}
                        </span>
                      </div>

                      {/* Lesson Title */}
                      <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mb-2 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-cyan-400 transition-colors leading-tight">
                        {lesson.title}
                      </h3>

                      {/* Content Preview Teaser */}
                      {previewSnippet && (
                        <p className="text-slate-600 dark:text-slate-400 text-xs line-clamp-2 leading-relaxed mb-4">
                          {previewSnippet}
                        </p>
                      )}
                    </div>

                    {/* Bottom Footer Info & CTA */}
                    <div className="pt-3.5 border-t border-white/20 dark:border-white/10 flex items-center justify-between mt-auto">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock size={12} /> ~{estMins} {text.estTime}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-600 dark:text-cyan-400 group-hover:translate-x-0.5 transition-transform">
                        <span>{text.startPractice}</span>
                        <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </motion.div>
                );
              })}

              {hasMore && <div ref={sentinelRef} className="col-span-full h-8" aria-hidden="true" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
