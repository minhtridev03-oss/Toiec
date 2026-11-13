import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  PenTool,
  ArrowRight,
  CheckCircle2,
  Search,
  X,
  Sparkles,
  Clock,
  Layers,
  Filter,
  Mail,
  Briefcase,
  Compass,
  MapPin,
  Flame,
  Award,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { prefetchWritingLesson } from '../lib/lessonCache';

const LEVELS = ['All', 'Basic', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Toeic'];

const LEVEL_BADGES = {
  Basic: 'bg-slate-200/85 dark:bg-slate-800/85 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-600',
  A1: 'bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 border border-emerald-500/35',
  A2: 'bg-sky-500/20 text-sky-900 dark:text-sky-200 border border-sky-500/35',
  B1: 'bg-indigo-500/20 text-indigo-900 dark:text-indigo-200 border border-indigo-500/35',
  B2: 'bg-blue-500/20 text-blue-900 dark:text-blue-200 border border-blue-500/35',
  C1: 'bg-cyan-500/20 text-cyan-900 dark:text-cyan-200 border border-cyan-500/35',
  C2: 'bg-teal-500/20 text-teal-900 dark:text-teal-200 border border-teal-500/35',
  Toeic: 'bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/35',
};

const TOPIC_CONFIG = {
  letter: {
    labelVi: 'Thư từ & Email',
    labelEn: 'Letters & Emails',
    icon: Mail,
    gradient: 'from-sky-500 to-blue-600',
    color: 'text-sky-700 dark:text-sky-300',
    badge: 'bg-sky-500/20 text-sky-800 dark:text-sky-200 border-sky-500/30',
  },
  work: {
    labelVi: 'Công sở & Nghề nghiệp',
    labelEn: 'Business & Career',
    icon: Briefcase,
    gradient: 'from-blue-600 to-indigo-600',
    color: 'text-indigo-700 dark:text-indigo-300',
    badge: 'bg-indigo-500/20 text-indigo-800 dark:text-indigo-200 border-indigo-500/30',
  },
  hotel: {
    labelVi: 'Du lịch & Dịch vụ',
    labelEn: 'Travel & Hospitality',
    icon: Compass,
    gradient: 'from-teal-500 to-emerald-600',
    color: 'text-teal-700 dark:text-teal-300',
    badge: 'bg-teal-500/20 text-teal-800 dark:text-teal-200 border-teal-500/30',
  },
  direction: {
    labelVi: 'Đời sống & Di chuyển',
    labelEn: 'Daily Life & Navigation',
    icon: MapPin,
    gradient: 'from-cyan-500 to-blue-600',
    color: 'text-cyan-700 dark:text-cyan-300',
    badge: 'bg-cyan-500/20 text-cyan-800 dark:text-cyan-200 border-cyan-500/30',
  },
  general: {
    labelVi: 'Giao tiếp hàng ngày',
    labelEn: 'Daily Communication',
    icon: PenTool,
    gradient: 'from-blue-500 to-cyan-500',
    color: 'text-blue-700 dark:text-cyan-300',
    badge: 'bg-blue-500/20 text-blue-800 dark:text-cyan-200 border-blue-500/30',
  },
};

const detectTopic = (title = '') => {
  const t = title.toLowerCase();
  if (t.includes('letter') || t.includes('mail') || t.includes('thư') || t.includes('thank you') || t.includes('cảm ơn') || t.includes('xin lỗi')) {
    return TOPIC_CONFIG.letter;
  }
  if (t.includes('bản thân') || t.includes('công') || t.includes('job') || t.includes('work') || t.includes('interview') || t.includes('phỏng vấn') || t.includes('office') || t.includes('báo cáo')) {
    return TOPIC_CONFIG.work;
  }
  if (t.includes('khách sạn') || t.includes('hotel') || t.includes('room') || t.includes('đặt phòng') || t.includes('booking') || t.includes('restaurant') || t.includes('nhà hàng') || t.includes('travel')) {
    return TOPIC_CONFIG.hotel;
  }
  if (t.includes('đường') || t.includes('direction') || t.includes('hỏi') || t.includes('map') || t.includes('bus') || t.includes('airport') || t.includes('sân bay')) {
    return TOPIC_CONFIG.direction;
  }
  return TOPIC_CONFIG.general;
};

let cachedWritingLessons = null;
let cachedWritingProgress = {};

const COPY = {
  vi: {
    heroBadge: 'AI Writing Studio • Phản hồi câu thời gian thực',
    title: 'Luyện Viết & Biên Dịch Tự Nhiên',
    desc: 'Rèn luyện phản xạ chuyển ngữ và viết câu tự nhiên chuẩn phong cách bản xứ với sự hỗ trợ phân tích tức thì từ AI.',
    totalLessons: 'Bài học',
    sentencesDone: 'Câu đã dịch',
    completedRate: 'Đã hoàn thành',
    continueLearning: 'Tiếp tục bài đang dở',
    featuredLesson: 'Gợi ý học tập',
    allTopics: 'Tất cả chủ đề',
    allTopicsSub: 'Chọn chủ đề bên dưới để luyện tập phản xạ dịch và viết câu chuẩn ngữ pháp',
    searchPlaceholder: 'Tìm bài viết, chủ đề (email, phỏng vấn, khách sạn...)...',
    all: 'Tất cả',
    statusAll: 'Tất cả trạng thái',
    statusInProgress: 'Đang học',
    statusCompleted: 'Đã xong',
    statusUnstarted: 'Chưa học',
    completed: 'Đã hoàn thành',
    inProgress: 'Đang học',
    unstarted: 'Chưa học',
    startPractice: 'Bắt đầu luyện',
    continuePractice: 'Tiếp tục luyện',
    reviewPractice: 'Ôn tập lại',
    sentencesUnit: 'câu',
    estimatedTime: 'phút',
    noLessonsFound: 'Không tìm thấy bài viết nào phù hợp với bộ lọc.',
    clearFilters: 'Xóa bộ lọc',
    level: 'Cấp độ',
  },
  en: {
    heroBadge: 'AI Writing Studio • Real-time AI Feedback',
    title: 'Writing & Natural Translation Practice',
    desc: 'Master natural English sentence construction and translation with instant AI-powered guidance and score analysis.',
    totalLessons: 'Lessons',
    sentencesDone: 'Sentences Translated',
    completedRate: 'Completed',
    continueLearning: 'Resume Lesson',
    featuredLesson: 'Recommended Lesson',
    allTopics: 'All Topics',
    allTopicsSub: 'Select a topic below to practice natural translation and sentence structure',
    searchPlaceholder: 'Search lessons by title, topic (email, interview, hotel...)...',
    all: 'All',
    statusAll: 'All Statuses',
    statusInProgress: 'In Progress',
    statusCompleted: 'Completed',
    statusUnstarted: 'Unstarted',
    completed: 'Completed',
    inProgress: 'In Progress',
    unstarted: 'Unstarted',
    startPractice: 'Start Practice',
    continuePractice: 'Continue',
    reviewPractice: 'Review',
    sentencesUnit: 'sentences',
    estimatedTime: 'mins',
    noLessonsFound: 'No writing lessons found matching your filters.',
    clearFilters: 'Clear Filters',
    level: 'Level',
  },
};

export default function WritingList() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const text = COPY[locale] || COPY.vi;
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'in_progress', 'completed', 'unstarted'
  const [searchQuery, setSearchQuery] = useState('');
  const [lessons, setLessons] = useState(() => cachedWritingLessons || []);
  const [progressData, setProgressData] = useState(() => cachedWritingProgress || {});
  const [loading, setLoading] = useState(() => !cachedWritingLessons);

  useEffect(() => {
    fetchLessons();
  }, [user?.id]);

  const fetchLessons = async () => {
    try {
      if (!cachedWritingLessons) {
        setLoading(true);
      }

      const [lessonsRes, progressRes, sentencesRes] = await Promise.all([
        supabase
          .from('writing_lessons')
          .select('id, title, level, created_at')
          .order('created_at', { ascending: true }),
        user?.id
          ? supabase.rpc('get_writing_progress', { p_user_id: user.id })
          : Promise.resolve({ data: null, error: null }),
        supabase
          .from('writing_sentences')
          .select('id, lesson_id'),
      ]);

      if (lessonsRes.error) throw lessonsRes.error;
      const lessonsData = lessonsRes.data || [];
      setLessons(lessonsData);

      // Sentence count map per lesson
      const sentenceCountMap = {};
      if (sentencesRes?.data && Array.isArray(sentencesRes.data)) {
        sentencesRes.data.forEach((s) => {
          sentenceCountMap[s.lesson_id] = (sentenceCountMap[s.lesson_id] || 0) + 1;
        });
      }

      const progressMap = {};
      lessonsData.forEach((l) => {
        const total = sentenceCountMap[l.id] || 0;
        progressMap[l.id] = { total, completed: 0, percentage: 0 };
      });

      if (!progressRes.error && Array.isArray(progressRes.data)) {
        progressRes.data.forEach((row) => {
          const total = Number(row.total_count) || sentenceCountMap[row.lesson_id] || 0;
          const completed = Number(row.completed_count) || 0;
          progressMap[row.lesson_id] = {
            total,
            completed,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
          };
        });
      } else if (user) {
        // Dự phòng nếu RPC chưa được tạo
        const completedRes = await supabase
          .from('user_writing_progress')
          .select('sentence_id')
          .eq('user_id', user.id);

        if (completedRes.data) {
          const completedSet = new Set(completedRes.data.map((c) => c.sentence_id));
          if (sentencesRes?.data) {
            sentencesRes.data.forEach((s) => {
              if (progressMap[s.lesson_id] && completedSet.has(s.id)) {
                progressMap[s.lesson_id].completed++;
              }
            });
            Object.keys(progressMap).forEach((key) => {
              const data = progressMap[key];
              if (data.total > 0) {
                data.percentage = Math.round((data.completed / data.total) * 100);
              }
            });
          }
        }
      }

      setProgressData(progressMap);
      cachedWritingLessons = lessonsData;
      cachedWritingProgress = progressMap;
    } catch (error) {
      console.error('Error fetching writing lessons:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Metrics calculation
  const stats = useMemo(() => {
    const totalLessons = lessons.length;
    let completedCount = 0;
    let inProgressCount = 0;
    let totalSentencesCompleted = 0;

    lessons.forEach((l) => {
      const p = progressData[l.id];
      if (p) {
        totalSentencesCompleted += p.completed || 0;
        if (p.percentage === 100 && p.total > 0) {
          completedCount++;
        } else if (p.percentage > 0) {
          inProgressCount++;
        }
      }
    });

    const completionRate = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

    return {
      totalLessons,
      completedCount,
      inProgressCount,
      totalSentencesCompleted,
      completionRate,
    };
  }, [lessons, progressData]);

  // Dynamic count for each level tab
  const levelCounts = useMemo(() => {
    const counts = { All: lessons.length };
    LEVELS.forEach((lvl) => {
      if (lvl !== 'All') {
        counts[lvl] = lessons.filter((l) => (l.level || 'basic').toLowerCase() === lvl.toLowerCase()).length;
      }
    });
    return counts;
  }, [lessons]);

  // Spotlight lesson: preferentially pick an in-progress lesson, or next uncompleted lesson
  const spotlightLesson = useMemo(() => {
    if (lessons.length === 0) return null;
    const inProgress = lessons.find((l) => {
      const p = progressData[l.id];
      return p && p.percentage > 0 && p.percentage < 100;
    });
    if (inProgress) return { lesson: inProgress, type: 'resume' };

    const uncompleted = lessons.find((l) => {
      const p = progressData[l.id];
      return !p || p.percentage === 0;
    });
    if (uncompleted) return { lesson: uncompleted, type: 'featured' };

    return { lesson: lessons[0], type: 'featured' };
  }, [lessons, progressData]);

  // Filter lessons by level, search query, and status
  const filteredLessons = useMemo(() => {
    return lessons.filter((lesson) => {
      // 1. Level filter
      if (activeTab !== 'All') {
        const lessonLevel = (lesson.level || 'basic').toLowerCase();
        if (lessonLevel !== activeTab.toLowerCase()) return false;
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = (lesson.title || '').toLowerCase().includes(query);
        const topic = detectTopic(lesson.title || '');
        const topicMatchVi = topic.labelVi.toLowerCase().includes(query);
        const topicMatchEn = topic.labelEn.toLowerCase().includes(query);
        if (!titleMatch && !topicMatchVi && !topicMatchEn) return false;
      }

      // 3. Status filter
      if (statusFilter !== 'all') {
        const p = progressData[lesson.id] || { total: 0, completed: 0, percentage: 0 };
        const isCompleted = p.percentage === 100 && p.total > 0;
        const isInProgress = p.percentage > 0 && p.percentage < 100;
        const isUnstarted = p.percentage === 0 || p.completed === 0;

        if (statusFilter === 'completed' && !isCompleted) return false;
        if (statusFilter === 'in_progress' && !isInProgress) return false;
        if (statusFilter === 'unstarted' && !isUnstarted) return false;
      }

      return true;
    });
  }, [lessons, activeTab, searchQuery, statusFilter, progressData]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh] bg-transparent">
        <div className="relative flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-600 rounded-full animate-spin"></div>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 animate-pulse">
            Đang tải dữ liệu bài viết...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-transparent text-slate-800 dark:text-white overflow-y-auto min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-7 pb-24">
        
        {/* ================= 1. HERO GLASS BANNER & SPOTLIGHT ================= */}
        <div className="relative rounded-[2.5rem] p-6 sm:p-8 lg:p-10 backdrop-blur-2xl bg-white/40 dark:bg-slate-950/45 border border-white/60 dark:border-white/15 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.08),_inset_0_1.5px_2px_rgba(255,255,255,0.85)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.6),_inset_0_1px_2px_rgba(255,255,255,0.25)] overflow-hidden">
          {/* Ambient Glow Orbs in Blue / Indigo / Cyan */}
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-br from-blue-500/20 via-indigo-500/15 to-cyan-400/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-gradient-to-tr from-indigo-500/20 via-sky-500/15 to-transparent blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Header Description & Quick Metrics */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-cyan-300 text-xs font-black tracking-wider uppercase backdrop-blur-md shadow-2xs">
                <Sparkles size={14} className="text-blue-600 dark:text-cyan-400 animate-pulse" />
                <span>{text.heroBadge}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-950 dark:text-white leading-tight">
                {text.title}
              </h1>

              <p className="text-slate-700 dark:text-slate-200 text-sm sm:text-base leading-relaxed max-w-2xl font-bold">
                {text.desc}
              </p>

              {/* Quick Stat Badges */}
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/45 dark:bg-white/10 border border-white/60 dark:border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.04),_inset_0_1px_1px_rgba(255,255,255,0.85)] backdrop-blur-xl">
                  <Flame size={16} className="text-rose-500" />
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {stats.totalLessons} {text.totalLessons}
                  </span>
                </div>

                <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/45 dark:bg-white/10 border border-white/60 dark:border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.04),_inset_0_1px_1px_rgba(255,255,255,0.85)] backdrop-blur-xl">
                  <PenTool size={16} className="text-blue-600 dark:text-cyan-400" />
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {stats.totalSentencesCompleted} {text.sentencesDone}
                  </span>
                </div>

                <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/45 dark:bg-white/10 border border-white/60 dark:border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.04),_inset_0_1px_1px_rgba(255,255,255,0.85)] backdrop-blur-xl">
                  <Award size={16} className="text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {stats.completedCount}/{stats.totalLessons} {text.completedRate} ({stats.completionRate}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Quick Spotlight / Resume Lesson Card */}
            {spotlightLesson && (
              <div className="lg:col-span-5">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  onMouseEnter={() => prefetchWritingLesson(spotlightLesson.lesson.id)}
                  onClick={() => navigate(`/writing/${spotlightLesson.lesson.id}`)}
                  className="relative rounded-3xl p-5 sm:p-6 bg-white/45 dark:bg-slate-900/50 border border-white/65 dark:border-white/15 shadow-[0_16px_36px_-10px_rgba(15,23,42,0.05),_inset_0_1.5px_1px_rgba(255,255,255,0.85)] cursor-pointer group overflow-hidden backdrop-blur-2xl"
                >
                  {/* Top row */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-cyan-300">
                      <Sparkles size={13} className="text-blue-500 dark:text-cyan-400" />
                      <span>{spotlightLesson.type === 'resume' ? text.continueLearning : text.featuredLesson}</span>
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black border uppercase tracking-wide ${
                        LEVEL_BADGES[spotlightLesson.lesson.level] || LEVEL_BADGES.Basic
                      }`}
                    >
                      {spotlightLesson.lesson.level || 'Basic'}
                    </span>
                  </div>

                  {/* Body */}
                  {(() => {
                    const topic = detectTopic(spotlightLesson.lesson.title || '');
                    const TopicIcon = topic.icon;
                    const p = progressData[spotlightLesson.lesson.id] || { total: 0, completed: 0, percentage: 0 };
                    const isDone = p.percentage === 100 && p.total > 0;

                    return (
                      <>
                        <div className="flex items-center gap-4 mb-3">
                          <div
                            className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${topic.gradient} text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform duration-300`}
                          >
                            <TopicIcon size={26} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">
                              {spotlightLesson.lesson.title}
                            </h2>
                            <p className="text-xs text-slate-600 dark:text-slate-300 font-bold truncate mt-0.5">
                              {locale === 'en' ? topic.labelEn : topic.labelVi} • {p.total || 5} {text.sentencesUnit}
                            </p>
                          </div>
                        </div>

                        {/* Progress line */}
                        {user && p.total > 0 && (
                          <div className="space-y-1.5 mb-4">
                            <div className="flex justify-between items-center text-xs font-black text-slate-800 dark:text-slate-200">
                              <span>Tiến độ bài học</span>
                              <span className="text-blue-600 dark:text-cyan-400 font-black">{p.percentage}%</span>
                            </div>
                            <div className="w-full bg-slate-200/80 dark:bg-slate-700/80 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 h-full rounded-full transition-all duration-700"
                                style={{ width: `${p.percentage}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Bottom action */}
                        <div className="flex items-center justify-between pt-3 border-t border-white/50 dark:border-white/10">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                            <Clock size={13} /> ~{Math.max(2, Math.round((p.total || 5) * 0.6))} {text.estimatedTime}
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white text-xs font-black shadow-md shadow-blue-500/25 group-hover:shadow-lg transition-all active:scale-95">
                            <span>{isDone ? text.reviewPractice : p.percentage > 0 ? text.continuePractice : text.startPractice}</span>
                            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </motion.div>
              </div>
            )}
          </div>
        </div>

        {/* ================= 2. STICKY FILTER & SEARCH DOCK ================= */}
        <div className="sticky top-3 z-30 py-1">
          <div className="p-3 sm:p-3.5 rounded-2xl sm:rounded-3xl bg-white/40 dark:bg-slate-950/45 backdrop-blur-2xl border border-white/60 dark:border-white/15 shadow-[0_8px_25px_rgba(0,0,0,0.04),_inset_0_1.5px_1px_rgba(255,255,255,0.85)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            
            {/* CEFR Level Tabs with Dynamic Counts in Blue Gradient */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl sm:rounded-2xl bg-white/30 dark:bg-slate-900/40 border border-white/40 dark:border-white/10 shadow-inner overflow-x-auto w-full md:w-auto hide-scrollbar">
              {LEVELS.map((lvl) => {
                const count = levelCounts[lvl] ?? 0;
                const isActive = activeTab === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setActiveTab(lvl)}
                    className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white shadow-md shadow-blue-500/30'
                        : 'text-slate-800 dark:text-slate-200 hover:text-blue-600 dark:hover:text-cyan-300 hover:bg-white/60 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span>{lvl === 'All' ? text.all : lvl}</span>
                    {count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                          isActive
                            ? 'bg-white/25 text-white'
                            : 'bg-white/60 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right Controls: Status Filter & Search Input */}
            <div className="flex items-center gap-2.5 w-full md:w-auto">
              
              {/* Status Filter */}
              <div className="relative shrink-0">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="appearance-none pl-8 pr-8 py-2 rounded-xl text-xs sm:text-sm font-black bg-white/50 dark:bg-slate-900/60 border border-white/60 dark:border-white/10 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer shadow-xs backdrop-blur-md"
                >
                  <option value="all" className="dark:bg-slate-900">{text.statusAll}</option>
                  <option value="in_progress" className="dark:bg-slate-900">{text.statusInProgress}</option>
                  <option value="completed" className="dark:bg-slate-900">{text.statusCompleted}</option>
                  <option value="unstarted" className="dark:bg-slate-900">{text.statusUnstarted}</option>
                </select>
                <Filter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>

              {/* Search Bar */}
              <div className="relative flex-1 md:w-64">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={text.searchPlaceholder}
                  className="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white/50 dark:bg-slate-900/60 border border-white/60 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-xs transition-all backdrop-blur-md"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* ================= 3. LESSON CARDS GRID ================= */}
        <div className="space-y-5">
          {/* Section Header Card with Liquid Glass */}
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl backdrop-blur-2xl bg-white/40 dark:bg-slate-950/45 border border-white/60 dark:border-white/15 shadow-[0_8px_25px_rgba(0,0,0,0.04),_inset_0_1.5px_1px_rgba(255,255,255,0.85)] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/15 dark:bg-cyan-500/20 text-blue-600 dark:text-cyan-400 flex items-center justify-center shrink-0 shadow-xs border border-blue-500/20">
                <Layers size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-lg sm:text-xl font-black text-slate-950 dark:text-white leading-none">
                    {text.allTopics}
                  </h2>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-800 dark:text-cyan-300 border border-blue-500/25">
                    {filteredLessons.length} bài
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-1 hidden sm:block">
                  {text.allTopicsSub}
                </p>
              </div>
            </div>

            {(searchQuery || statusFilter !== 'all' || activeTab !== 'All') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setActiveTab('All');
                }}
                className="text-xs font-black px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-cyan-300 transition-all flex items-center gap-1.5 cursor-pointer border border-blue-500/20 shrink-0"
              >
                <RotateCcw size={13} />
                <span>{text.clearFilters}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredLessons.map((lesson) => {
                const progress = progressData[lesson.id] || { total: 0, completed: 0, percentage: 0 };
                const isCompleted = progress.percentage === 100 && progress.total > 0;
                const isInProgress = progress.percentage > 0 && progress.percentage < 100;
                const topic = detectTopic(lesson.title || '');
                const TopicIcon = topic.icon;

                return (
                  <motion.div
                    key={lesson.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    whileHover={{ y: -5 }}
                    transition={{ duration: 0.2 }}
                    onMouseEnter={() => prefetchWritingLesson(lesson.id)}
                    onFocus={() => prefetchWritingLesson(lesson.id)}
                    onClick={() => navigate(`/writing/${lesson.id}`)}
                    className={`rounded-3xl p-6 backdrop-blur-2xl transition-all duration-300 cursor-pointer group flex flex-col relative overflow-hidden ${
                      isCompleted
                        ? 'bg-white/40 dark:bg-slate-950/45 border-2 border-emerald-500/40 dark:border-emerald-500/40 shadow-[0_16px_36px_-10px_rgba(16,185,129,0.1),_inset_0_1.5px_1px_rgba(255,255,255,0.85)] hover:border-emerald-500 hover:shadow-emerald-500/20'
                        : 'bg-white/40 dark:bg-slate-950/45 border border-white/60 dark:border-white/15 shadow-[0_16px_36px_-10px_rgba(15,23,42,0.05),_inset_0_1.5px_1px_rgba(255,255,255,0.85)] dark:shadow-[0_16px_36px_-10px_rgba(0,0,0,0.5),_inset_0_1px_1px_rgba(255,255,255,0.1)] hover:border-blue-500/50 dark:hover:border-cyan-400/50 hover:shadow-2xl hover:shadow-blue-500/15'
                    }`}
                  >
                    {/* Top Row: Icon + Level Badge + Status Chip */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div
                        className={`w-13 h-13 rounded-2xl bg-gradient-to-tr ${topic.gradient} text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300`}
                      >
                        <TopicIcon size={24} />
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        {/* CEFR Level Badge */}
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider shadow-2xs ${
                            LEVEL_BADGES[lesson.level] || LEVEL_BADGES.Basic
                          }`}
                        >
                          {lesson.level || 'Basic'}
                        </span>

                        {/* Status Chip */}
                        {user && progress.total > 0 && (
                          <div>
                            {isCompleted ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-black bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-500/40 shadow-2xs">
                                <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                                <span>{text.completed}</span>
                              </span>
                            ) : isInProgress ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-black bg-blue-500/20 text-blue-800 dark:text-cyan-200 border border-blue-500/40 shadow-2xs">
                                <span>{progress.percentage}%</span>
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Lesson Title */}
                    <h3 className="text-lg font-black text-slate-950 dark:text-white mb-1.5 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors leading-snug">
                      {lesson.title}
                    </h3>

                    {/* Topic Name */}
                    <p className="text-xs font-extrabold text-slate-600 dark:text-slate-300 mb-4">
                      {locale === 'en' ? topic.labelEn : topic.labelVi}
                    </p>

                    {/* Meta Info Row: Sentences & Estimate Time */}
                    <div className="flex items-center gap-2 text-xs font-black mb-4 mt-auto">
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/15 dark:bg-white/10 text-blue-800 dark:text-cyan-300 border border-blue-500/25 dark:border-white/10 shadow-2xs">
                        <PenTool size={13} className="text-blue-600 dark:text-cyan-400" />
                        <span>{progress.total || 5} {text.sentencesUnit}</span>
                      </span>
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/45 dark:bg-white/10 text-slate-800 dark:text-slate-200 border border-white/60 dark:border-white/10 shadow-2xs">
                        <Clock size={13} className="text-slate-600 dark:text-slate-400" />
                        <span>~{Math.max(2, Math.round((progress.total || 5) * 0.6))} {text.estimatedTime}</span>
                      </span>
                    </div>

                    {/* Progress Bar (if in progress or completed) */}
                    {user && progress.total > 0 && (
                      <div className="w-full space-y-1 mb-4">
                        <div className="w-full bg-slate-200/80 dark:bg-slate-700/80 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              isCompleted
                                ? 'bg-emerald-500'
                                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500'
                            }`}
                            style={{ width: `${progress.percentage}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Card Footer CTA */}
                    <div className="flex items-center justify-between border-t border-white/40 dark:border-white/10 pt-3.5 mt-auto">
                      <span className="text-xs font-black text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">
                        {isCompleted
                          ? text.reviewPractice
                          : isInProgress
                          ? text.continuePractice
                          : text.startPractice}
                      </span>
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm ${
                          isCompleted
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 group-hover:bg-emerald-600 group-hover:text-white'
                            : 'bg-white/50 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-white/60 dark:border-white/15 group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-cyan-600 group-hover:text-white group-hover:border-transparent group-hover:scale-105'
                        }`}
                      >
                        {isCompleted ? <RotateCcw size={14} /> : <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Empty State */}
            {filteredLessons.length === 0 && (
              <div className="col-span-full py-16 px-6 rounded-[2.5rem] backdrop-blur-2xl bg-white/40 dark:bg-slate-950/45 border border-white/60 dark:border-white/15 text-center space-y-4 shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-cyan-400 flex items-center justify-center mx-auto border border-blue-500/20">
                  <BookOpen size={32} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {text.noLessonsFound}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto font-medium">
                    Thử chọn cấp độ khác hoặc kiểm tra lại từ khóa tìm kiếm của bạn.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setActiveTab('All');
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-black shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
                >
                  <RotateCcw size={14} />
                  <span>{text.clearFilters}</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
