import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import {
  BookType,
  ArrowRight,
  CheckCircle2,
  Lock,
  Unlock,
  PlayCircle,
  Star,
  Sparkles,
  Search,
  Zap,
  Award,
  Flame,
  Check,
  RotateCcw,
  BookOpen,
  Filter,
  X,
  Clock,
  ChevronRight,
  Target,
  Trophy,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import useSWR from 'swr';
import SkillSwitchTabs from '../components/navigation/SkillSwitchTabs';

const COPY = {
  vi: {
    title: 'Làm chủ 12 Thì Tiếng Anh',
    desc: 'Hệ thống ngữ pháp cốt lõi với công thức tóm tắt, ví dụ thực chiến và bài tập tương tác chuẩn TOEIC.',
    badge: '12 THÌ CỐT LÕI & CHUYÊN ĐỀ',
    presentTenses: 'Các thì Hiện Tại',
    pastTenses: 'Các thì Quá Khứ',
    futureTenses: 'Các thì Tương Lai',
    completed: 'Đã hoàn thành',
    inProgress: 'Đang học',
    notStarted: 'Chưa học',
    learnNow: 'Học ngay',
    practiceNow: 'Làm bài tập',
    resumeLearning: 'Học tiếp bài dở',
    masteryStats: 'Tiến độ làm chủ',
    completedTenses: 'Thì đã hoàn thành',
    totalTenses: 'Tổng số thì',
    lockedTitle: 'Hoàn thành 12 thì để mở khóa',
    lockedDesc: 'Hãy hoàn thành 100% tất cả 12 thì cơ bản phía trên để mở khóa Đấu trường 100 câu hỏi nhé!',
    lockedRemain: (count) => `Cần hoàn thành thêm ${count} thì nữa để mở khóa!`,
    advancedTenses: 'Ngữ pháp Nâng cao & TOEIC',
    testTitle: 'Đấu trường Thử thách: 100 Câu Hỏi Hỗn Hợp',
    requires100: 'Yêu cầu hoàn thành 12 thì (100%)',
    unlocked: 'Đã mở khóa',
    challengeTitle: 'Đấu Trường: 100 Câu Hỏi Hỗn Hợp 12 Thì',
    challengeDesc: 'Thử thách toàn diện khả năng phản xạ và nắm vững 12 thì tiếng Anh trong các ngữ cảnh đề thi TOEIC thực tế.',
    otherTopics: 'Chuyên đề Ngữ pháp Trọng tâm',
    searchPlaceholder: 'Tìm kiếm thì, công thức, ngữ pháp...',
    tabAll: 'Tất cả (12 Thì)',
    tabPresent: 'Hiện Tại',
    tabPast: 'Quá Khứ',
    tabFuture: 'Tương Lai',
    tabTopics: 'Chuyên đề TOEIC',
    tabMastered: 'Đã hoàn thành',
    noResultsTitle: 'Không tìm thấy kết quả phù hợp',
    noResultsDesc: 'Thử thay đổi từ khóa tìm kiếm hoặc chọn danh mục khác.',
    formulaLabel: 'Công thức:',
  },
  en: {
    title: 'Master 12 English Tenses',
    desc: 'Core grammar mastery with quick formulas, real-world examples, and interactive TOEIC practice.',
    badge: '12 CORE TENSES & ADVANCED TOPICS',
    presentTenses: 'Present Tenses',
    pastTenses: 'Past Tenses',
    futureTenses: 'Future Tenses',
    completed: 'Completed',
    inProgress: 'In Progress',
    notStarted: 'Not Started',
    learnNow: 'Learn Now',
    practiceNow: 'Practice',
    resumeLearning: 'Continue Lesson',
    masteryStats: 'Mastery Progress',
    completedTenses: 'Tenses Mastered',
    totalTenses: 'Total Tenses',
    lockedTitle: 'Complete 12 tenses to unlock',
    lockedDesc: 'Complete 100% of all 12 core tenses above to unlock the 100-Question Arena!',
    lockedRemain: (count) => `Complete ${count} more tense(s) to unlock!`,
    advancedTenses: 'Advanced & TOEIC Grammar',
    testTitle: 'Mastery Arena: 100 Mixed Questions',
    requires100: 'Requires 12 Tenses at 100%',
    unlocked: 'Unlocked',
    challengeTitle: 'Mastery Arena: 100 Mixed Tense Questions',
    challengeDesc: 'Comprehensive test challenging your grammar reflexes and mastery across all 12 English tenses.',
    otherTopics: 'Key Grammar Focus Topics',
    searchPlaceholder: 'Search tenses, formulas, grammar...',
    tabAll: 'All (12 Tenses)',
    tabPresent: 'Present',
    tabPast: 'Past',
    tabFuture: 'Future',
    tabTopics: 'TOEIC Topics',
    tabMastered: 'Mastered',
    noResultsTitle: 'No matching tenses found',
    noResultsDesc: 'Try adjusting your search keyword or selecting a different tab.',
    formulaLabel: 'Formula:',
  },
};

// Summary formulas for tenses
const TENSE_METADATA = {
  'present-simple': {
    formula: 'S + V(s/es) | S + am/is/are',
    tag: 'Hiện Tại Đơn',
    color: 'emerald',
    icon: '⚡',
  },
  'present-continuous': {
    formula: 'S + am/is/are + V-ing',
    tag: 'Hiện Tại Tiếp Diễn',
    color: 'emerald',
    icon: '⏳',
  },
  'present-perfect': {
    formula: 'S + have/has + V3/ed',
    tag: 'Hiện Tại Hoàn Thành',
    color: 'emerald',
    icon: '✨',
  },
  'present-perfect-continuous': {
    formula: 'S + have/has + been + V-ing',
    tag: 'Hiện Tại HTTD',
    color: 'emerald',
    icon: '🔄',
  },
  'past-simple': {
    formula: 'S + V2/ed | S + was/were',
    tag: 'Quá Khứ Đơn',
    color: 'amber',
    icon: '📜',
  },
  'past-continuous': {
    formula: 'S + was/were + V-ing',
    tag: 'Quá Khứ Tiếp Diễn',
    color: 'amber',
    icon: '🕰️',
  },
  'past-perfect': {
    formula: 'S + had + V3/ed',
    tag: 'Quá Khứ Hoàn Thành',
    color: 'amber',
    icon: '💎',
  },
  'past-perfect-continuous': {
    formula: 'S + had + been + V-ing',
    tag: 'Quá Khứ HTTD',
    color: 'amber',
    icon: '🔁',
  },
  'future-simple': {
    formula: 'S + will + V-inf',
    tag: 'Tương Lai Đơn',
    color: 'cyan',
    icon: '🚀',
  },
  'future-continuous': {
    formula: 'S + will + be + V-ing',
    tag: 'Tương Lai Tiếp Diễn',
    color: 'cyan',
    icon: '🛰️',
  },
  'future-perfect': {
    formula: 'S + will + have + V3/ed',
    tag: 'Tương Lai Hoàn Thành',
    color: 'cyan',
    icon: '🪐',
  },
  'future-perfect-continuous': {
    formula: 'S + will + have + been + V-ing',
    tag: 'Tương Lai HTTD',
    color: 'cyan',
    icon: '🌌',
  },
  'near-future': {
    formula: 'S + am/is/are + going to + V',
    tag: 'Tương Lai Gần',
    color: 'cyan',
    icon: '🎯',
  },
  // TOEIC & Other topics
  'passive-voice': { formula: 'S + be + V3/ed (by O)', icon: '🔄', color: 'purple' },
  'conditionals': { formula: 'If clause, Main clause', icon: '🔀', color: 'purple' },
  'reported-speech': { formula: 'S + said (that) + clause', icon: '💬', color: 'purple' },
  'relative-clauses': { formula: 'who / which / that / where', icon: '🔗', color: 'purple' },
  'gerunds-infinitives': { formula: 'V-ing vs To-V', icon: '📝', color: 'purple' },
  'comparisons': { formula: 'adj-er / more + adj', icon: '⚖️', color: 'purple' },
  'modal-verbs': { formula: 'can / could / should / must + V', icon: '⚡', color: 'purple' },
  'articles': { formula: 'a / an / the / ∅', icon: '🔤', color: 'purple' },
  // Advanced
  'inversion': { formula: 'Negative Adv + Aux + S + V', icon: '🔃', color: 'rose' },
  'reduced-clauses': { formula: 'V-ing / V3-ed participle', icon: '✂️', color: 'rose' },
  'subjunctive-mood': { formula: 'S + suggest + that + S + (should) V', icon: '💭', color: 'rose' },
  'cleft-sentences': { formula: 'It is/was ... that ...', icon: '🎯', color: 'rose' },
  'subject-verb-agreement': { formula: 'Singular / Plural Rules', icon: '🤝', color: 'rose' },
  'causative-form': { formula: 'have/get sth done', icon: '🛠️', color: 'rose' },
  'tag-questions': { formula: 'Statement, Aux + pronoun?', icon: '❓', color: 'rose' },
  'connectors': { formula: 'However / Although / Because...', icon: '🪢', color: 'rose' },
};

export default function TenseList() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const text = COPY[locale] || COPY.vi;
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'present' | 'past' | 'future' | 'topics' | 'mastered'
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTensesData = async () => {
    const { data: tensesData, error: tensesError } = await supabase
      .from('tenses')
      .select('*')
      .order('id', { ascending: true });

    if (tensesError) throw tensesError;

    let progressMap = {};
    (tensesData || []).forEach((t) => {
      progressMap[t.id] = { total: 0, completed: 0, percentage: 0 };
    });

    if (user) {
      const { data: exercisesData } = await supabase
        .from('tense_exercises')
        .select('id, tense_id');

      const { data: completedData } = await supabase
        .from('user_tense_exercises')
        .select('exercise_id')
        .eq('user_id', user.id);

      if (exercisesData) {
        const completedSet = new Set((completedData || []).map((c) => c.exercise_id));

        exercisesData.forEach((ex) => {
          if (progressMap[ex.tense_id]) {
            progressMap[ex.tense_id].total++;
            if (completedSet.has(ex.id)) {
              progressMap[ex.tense_id].completed++;
            }
          }
        });

        Object.keys(progressMap).forEach((key) => {
          const item = progressMap[key];
          item.percentage = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;
        });
      }
    }

    return {
      tenses: tensesData || [],
      progressData: progressMap,
    };
  };

  const { data, isLoading } = useSWR(
    `tenses_data_${user?.id || 'guest'}`,
    fetchTensesData,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      keepPreviousData: true,
      dedupingInterval: 120000,
    }
  );

  const tenses = data?.tenses || [];
  const progressData = data?.progressData || {};
  const loading = isLoading && !data;

  // Split into categories
  const core12Tenses = useMemo(() => tenses.filter((t) => t.id >= 1 && t.id <= 12), [tenses]);
  const presentTenses = useMemo(() => core12Tenses.filter((t) => t.name_vi.includes('Hiện Tại')), [core12Tenses]);
  const pastTenses = useMemo(() => core12Tenses.filter((t) => t.name_vi.includes('Quá Khứ')), [core12Tenses]);
  const futureTenses = useMemo(
    () => tenses.filter((t) => (t.id >= 9 && t.id <= 13) || t.name_vi.includes('Tương Lai')),
    [tenses]
  );
  const otherTopics = useMemo(
    () => tenses.filter((t) => (t.id >= 100 && t.id < 300) && t.id !== 999),
    [tenses]
  );

  // Statistics
  const completed12Count = useMemo(
    () => core12Tenses.filter((t) => (progressData[t.id]?.percentage || 0) === 100).length,
    [core12Tenses, progressData]
  );
  const overall12Percent = Math.round((completed12Count / 12) * 100);
  const all12Tenses100 = completed12Count === 12;

  // Suggest next tense to continue
  const nextTenseToLearn = useMemo(() => {
    return (
      core12Tenses.find((t) => (progressData[t.id]?.percentage || 0) > 0 && (progressData[t.id]?.percentage || 0) < 100) ||
      core12Tenses.find((t) => (progressData[t.id]?.percentage || 0) === 0) ||
      core12Tenses[0]
    );
  }, [core12Tenses, progressData]);

  // Search filtering
  const searchNormalized = searchQuery.trim().toLowerCase();

  const filterList = (list) => {
    if (!searchNormalized) return list;
    return list.filter((item) => {
      const meta = TENSE_METADATA[item.slug] || {};
      return (
        (item.name_vi || '').toLowerCase().includes(searchNormalized) ||
        (item.name_en || '').toLowerCase().includes(searchNormalized) ||
        (meta.formula || '').toLowerCase().includes(searchNormalized) ||
        (item.slug || '').toLowerCase().includes(searchNormalized)
      );
    });
  };

  const filteredPresent = filterList(presentTenses);
  const filteredPast = filterList(pastTenses);
  const filteredFuture = filterList(futureTenses);
  const filteredTopics = filterList(otherTopics);

  const masteredTenses = useMemo(
    () => filterList(tenses.filter((t) => (progressData[t.id]?.percentage || 0) === 100)),
    [tenses, progressData, searchNormalized]
  );

  const filteredAll = useMemo(() => {
    if (!searchNormalized) return [];
    return filterList(tenses);
  }, [tenses, searchNormalized]);

  // Check if search yields anything
  const hasAnyResults = searchNormalized ? filteredAll.length > 0 : true;

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-4 border-fuchsia-500/30 border-t-fuchsia-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="text-fuchsia-500 animate-pulse" size={20} />
          </div>
        </div>
        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Đang tải dữ liệu 12 Thì Tiếng Anh...
        </p>
      </div>
    );
  }

  // Render a Circular Glass Progress Card (clean with gradient ring border)
  const renderTenseCard = (tense, themeColor = 'purple', index = 0) => {
    const progress = progressData[tense.id] || { total: 0, completed: 0, percentage: 0 };
    const validValue = Math.min(100, Math.max(0, Number(progress.percentage) || 0));
    const meta = TENSE_METADATA[tense.slug] || {
      formula: '',
      color: themeColor,
      tag: tense.name_vi,
    };

    const radius = 44;
    const strokeWidth = 5.5;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (circumference * validValue) / 100;
    const gradId = `tense-grad-${tense.id || tense.slug}`;

    return (
      <Link
        key={tense.id}
        to={`/tenses/${tense.slug}`}
        className="group relative w-full max-w-[260px] sm:max-w-[275px] aspect-square rounded-full glass-panel shadow-xl flex flex-col items-center justify-center p-6 text-center select-none border border-white/60 dark:border-white/10 hover:scale-[1.05] active:scale-95 hover:shadow-[0_0_30px_rgba(79,70,229,0.35)] transition-all duration-300 cursor-pointer overflow-hidden mx-auto"
      >
        {/* Outer SVG Progress Ring wrapping the perimeter with vibrant theme gradient (indigo -> blue -> cyan) */}
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 h-full w-full -rotate-90 pointer-events-none p-1.5"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>

          {/* Outer track circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-200/60 dark:text-white/10 group-hover:text-indigo-500/20 transition-colors duration-300"
          />

          {/* Outer active progress arc with dynamic sweep */}
          {validValue > 0 && (
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: offset,
                transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          )}
        </svg>

        {/* Center Content: Percentage & Title */}
        <div className="z-10 flex flex-col items-center justify-center px-4 max-w-[85%] text-center">
          <span className="text-4xl sm:text-5xl font-black tracking-tight text-slate-950 dark:text-white transition-transform group-hover:scale-105 duration-300">
            {validValue}%
          </span>
          <h3 className="mt-3 text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-cyan-400 transition-colors leading-snug">
            {locale === 'vi' ? tense.name_vi : tense.name_en}
          </h3>
        </div>
      </Link>
    );
  };

  // Section Group Renderer with liquid glass title card and circular cards
  const renderSection = (title, items, icon, colorTheme, countText) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="mb-14">
        {/* Section Title with Liquid Glass Background for maximum legibility */}
        <div className="mb-7 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/70 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/80 dark:border-white/15 shadow-lg shadow-black/5 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-3.5 h-8 sm:h-9 rounded-full bg-gradient-to-b from-blue-500 via-indigo-500 to-cyan-400 shadow-[0_0_12px_rgba(79,70,229,0.5)] flex-shrink-0" />
            <div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                {title}
              </h3>
              <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">
                {countText || `${items.length} chủ đề`}
              </p>
            </div>
          </div>
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/60 dark:bg-white/10 border border-white/60 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 backdrop-blur-md">
            <span>{items.length} chủ đề</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item, idx) => renderTenseCard(item, colorTheme, idx))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-full flex-1 p-4 sm:p-6 md:p-8 lg:p-10 transition-colors pb-20">
      <div className="w-full max-w-7xl mx-auto space-y-4">
        {/* Top Quick Skill Tabs */}
        <SkillSwitchTabs />

        {/* ============================================================ */}
        {/* 1. HERO MASTERY BANNER (LIQUID GLASS) */}
        {/* ============================================================ */}
        <div className="relative rounded-[2.5rem] bg-white/25 dark:bg-slate-950/35 backdrop-blur-2xl border border-white/50 dark:border-white/10 p-6 sm:p-8 md:p-10 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] mb-8 overflow-hidden">
          {/* Ambient Lighting Orbs */}
          <div className="pointer-events-none absolute -top-20 -left-20 w-80 h-80 rounded-full bg-gradient-to-br from-indigo-500/25 to-blue-600/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-20 w-96 h-96 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/15 blur-3xl" />

          {/* Specular top reflection */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/15 dark:bg-indigo-500/20 border border-indigo-500/30 text-indigo-700 dark:text-cyan-300 text-xs font-black tracking-wider uppercase mb-3.5 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)]">
                <Sparkles size={13} className="text-indigo-600 dark:text-cyan-400" />
                <span>{text.badge}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-3">
                {text.title}
              </h1>

              <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 font-medium leading-relaxed mb-6">
                {text.desc}
              </p>

              {/* Quick Action Button - synchronized with website's blue/indigo theme */}
              {nextTenseToLearn && (
                <button
                  onClick={() => navigate(`/tenses/${nextTenseToLearn.slug}`)}
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-sm flex items-center gap-2.5 shadow-lg shadow-indigo-500/35 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                >
                  <PlayCircle size={18} />
                  <span>
                    {text.resumeLearning}:{' '}
                    <span className="font-bold underline">
                      {locale === 'vi' ? nextTenseToLearn.name_vi : nextTenseToLearn.name_en}
                    </span>
                  </span>
                  <ArrowRight size={16} />
                </button>
              )}
            </div>

            {/* Right: Liquid Progress Ring & Stats */}
            <div className="w-full lg:w-80 rounded-3xl bg-white/40 dark:bg-white/[0.03] border border-white/60 dark:border-white/10 p-6 backdrop-blur-xl shadow-inner flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  {text.masteryStats}
                </span>
                <span className="text-xs font-extrabold px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                  {completed12Count}/12 Thì
                </span>
              </div>

              {/* Big percent indicator */}
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                  {overall12Percent}%
                </span>
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                  đã thành thạo
                </span>
              </div>

              {/* Progress liquid bar */}
              <div className="w-full h-3 rounded-full bg-slate-900/10 dark:bg-white/10 overflow-hidden p-[1px] mb-4">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-1000 shadow-[0_0_12px_rgba(79,70,229,0.5)]"
                  style={{ width: `${overall12Percent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span>Chưa hoàn thành: {12 - completed12Count} thì</span>
                <span className="text-indigo-600 dark:text-cyan-400 font-black">
                  {all12Tenses100 ? '🎉 Hoàn tất 100%' : 'Mục tiêu: 100%'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. LIQUID NAVIGATION DOCK (TABS & SEARCH) */}
        {/* ============================================================ */}
        <div className="sticky top-4 z-20 mb-10 p-3 sm:p-4 rounded-2xl sm:rounded-3xl bg-white/70 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/80 dark:border-white/15 shadow-xl shadow-slate-950/5 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3.5">
          {/* Filter Pills: with flex-wrap so tabs are never clipped into single letters */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {[
              { id: 'all', label: text.tabAll, count: 12 },
              { id: 'present', label: text.tabPresent, count: presentTenses.length, color: 'emerald' },
              { id: 'past', label: text.tabPast, count: pastTenses.length, color: 'amber' },
              { id: 'future', label: text.tabFuture, count: futureTenses.length, color: 'cyan' },
              { id: 'topics', label: text.tabTopics, count: otherTopics.length, color: 'purple' },
              { id: 'mastered', label: text.tabMastered, count: completed12Count, color: 'emerald' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-500/30 scale-105'
                      : 'bg-white/60 dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 border border-white/60 dark:border-white/10'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-900/10 dark:bg-white/10 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box: comfortable width, clear text, never squished or obscured */}
          <div className="relative w-full xl:w-80 shrink-0">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={text.searchPlaceholder}
              className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-white/70 dark:bg-slate-950/60 border border-white/70 dark:border-white/15 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 backdrop-blur-md transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. CONTENT AREA BY ACTIVE TAB OR SEARCH */}
        {/* ============================================================ */}
        {!hasAnyResults && (
          <div className="rounded-3xl p-12 bg-white/25 dark:bg-slate-950/30 backdrop-blur-xl border border-white/40 dark:border-white/10 text-center max-w-lg mx-auto my-12">
            <div className="w-16 h-16 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4 text-2xl">
              🔍
            </div>
            <h4 className="text-lg font-black text-slate-900 dark:text-white mb-1">
              {text.noResultsTitle}
            </h4>
            <p className="text-xs text-slate-800 dark:text-slate-200 mb-6 font-medium">
              {text.noResultsDesc}
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveTab('all');
              }}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-500/30 hover:bg-indigo-500 transition-all cursor-pointer"
            >
              Xem tất cả 12 thì
            </button>
          </div>
        )}

        {/* Unified Search View */}
        {searchNormalized && hasAnyResults && (
          <div className="mb-14">
            <div className="mb-7 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/70 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/80 dark:border-white/15 shadow-lg shadow-black/5 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-3.5 h-8 sm:h-9 rounded-full bg-gradient-to-b from-blue-500 via-indigo-500 to-cyan-400 shadow-[0_0_12px_rgba(79,70,229,0.5)] flex-shrink-0" />
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    Kết quả tìm kiếm cho "{searchQuery}" ({filteredAll.length})
                  </h3>
                  <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">
                    Hiển thị tất cả các thì và chuyên đề ngữ pháp phù hợp
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredAll.map((item, idx) => renderTenseCard(item, 'purple', idx))}
            </div>
          </div>
        )}

        {/* Regular Tabs View when not searching */}
        {!searchNormalized && (
          <>
            {/* Tab 'mastered': Show only mastered items */}
            {activeTab === 'mastered' && (
              <div className="mb-12">
                <div className="mb-7 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/70 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/80 dark:border-white/15 shadow-lg shadow-black/5 flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-3.5 h-8 sm:h-9 rounded-full bg-gradient-to-b from-blue-500 via-indigo-500 to-cyan-400 shadow-[0_0_12px_rgba(79,70,229,0.5)] flex-shrink-0" />
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        Các thì đã thành thạo ({masteredTenses.length})
                      </h3>
                      <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">
                        Tuyệt vời! Bạn đã hoàn thành 100% các chủ đề này.
                      </p>
                    </div>
                  </div>
                </div>
                {masteredTenses.length === 0 ? (
                  <div className="rounded-3xl p-10 bg-white/20 dark:bg-white/[0.02] border border-white/40 dark:border-white/10 text-center backdrop-blur-xl">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">
                      Bạn chưa hoàn thành 100% thì nào. Hãy bắt đầu ngay với thì Hiện Tại Đơn!
                    </p>
                    <button
                      onClick={() => setActiveTab('all')}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-black text-xs hover:bg-indigo-500"
                    >
                      Khám phá 12 Thì
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {masteredTenses.map((item, idx) => renderTenseCard(item, 'emerald', idx))}
                  </div>
                )}
              </div>
            )}

            {/* Render sections depending on active tab */}
            {(activeTab === 'all' || activeTab === 'present') &&
              renderSection(
                text.presentTenses,
                filteredPresent,
                '⏳',
                'emerald',
                '4 thì diễn tả hành động hiện tại & lặp lại'
              )}

            {(activeTab === 'all' || activeTab === 'past') &&
              renderSection(
                text.pastTenses,
                filteredPast,
                '📜',
                'amber',
                '4 thì diễn tả hành động đã kết thúc trong quá khứ'
              )}

            {(activeTab === 'all' || activeTab === 'future') &&
              renderSection(
                text.futureTenses,
                filteredFuture,
                '🚀',
                'cyan',
                '5 thì diễn tả dự định, kế hoạch & tương lai'
              )}

            {/* ============================================================ */}
            {/* 4. ARENA CHALLENGE BANNER (100 QUESTIONS) - ONLY ON 'ALL' TAB */}
            {/* ============================================================ */}
            {activeTab === 'all' && (
              <div className="mb-14 mt-12">
                <div className="mb-7 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/70 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/80 dark:border-white/15 shadow-lg shadow-black/5 flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <span className="text-3xl">🏆</span>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                        {text.testTitle}
                      </h3>
                      <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">
                        Đấu trường tổng hợp kiến thức chuyên sâu 12 thì tiếng Anh
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() => all12Tenses100 && navigate('/tenses/final-tense-test')}
                  className={`relative rounded-[2.5rem] p-6 sm:p-8 md:p-10 transition-all duration-500 overflow-hidden backdrop-blur-2xl border ${
                    all12Tenses100
                      ? 'bg-gradient-to-br from-indigo-600/90 via-blue-600/90 to-violet-600/90 text-white cursor-pointer hover:shadow-[0_20px_50px_rgba(79,70,229,0.35)] hover:scale-[1.01] border-white/30'
                      : 'bg-white/25 dark:bg-slate-950/40 border-white/50 dark:border-white/10 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {/* Specular highlight */}
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent pointer-events-none" />

                  {/* Locked Overlay if not 100% */}
                  {!all12Tenses100 && (
                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                      <div className="flex items-start gap-4 sm:gap-6">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
                          <Lock size={32} />
                        </div>
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-500/30 text-xs font-black uppercase tracking-wider mb-2">
                            <Lock size={12} />
                            <span>{text.requires100}</span>
                          </div>
                          <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-2">
                            {text.challengeTitle}
                          </h4>
                          <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 max-w-xl leading-relaxed mb-4">
                            {text.challengeDesc}
                          </p>
                          <p className="text-xs font-black text-indigo-600 dark:text-cyan-400 flex items-center gap-1.5">
                            <Flame size={14} className="animate-bounce" />
                            <span>{text.lockedRemain(12 - completed12Count)}</span>
                          </p>
                        </div>
                      </div>

                      <div className="w-full md:w-auto shrink-0">
                        <div className="px-5 py-3 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 text-center">
                          <span className="block text-2xl font-black text-slate-900 dark:text-white">
                            {completed12Count} / 12
                          </span>
                          <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                            Thì đã hoàn thành
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Unlocked State */}
                  {all12Tenses100 && (
                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/20 text-white border border-white/30 text-xs font-black tracking-wider uppercase mb-3 backdrop-blur-md">
                          <Unlock size={14} />
                          <span>{text.unlocked} • CHÚC MỪNG BẠN!</span>
                        </div>
                        <h4 className="text-2xl sm:text-3xl font-black text-white mb-2">
                          {text.challengeTitle}
                        </h4>
                        <p className="text-sm text-indigo-100 max-w-2xl leading-relaxed">
                          {text.challengeDesc}
                        </p>
                      </div>

                      <button className="px-8 py-4 rounded-2xl bg-white text-indigo-700 hover:bg-indigo-50 font-black text-sm flex items-center gap-2 shadow-2xl shadow-indigo-950/40 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0">
                        <Trophy size={18} className="text-amber-500" />
                        <span>VÀO THI NGAY (100 CÂU)</span>
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* 5. TOEIC & ADVANCED GRAMMAR TOPICS */}
            {/* ============================================================ */}
            {(activeTab === 'all' || activeTab === 'topics') && (
              <div className="mb-14">
                <div className="mb-7 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white/70 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/80 dark:border-white/15 shadow-lg shadow-black/5 flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-3.5 h-8 sm:h-9 rounded-full bg-gradient-to-b from-blue-500 via-indigo-500 to-cyan-400 shadow-[0_0_12px_rgba(79,70,229,0.5)] flex-shrink-0" />
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        {text.otherTopics} & {text.advancedTenses}
                      </h3>
                      <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">
                        Các chủ đề ngữ pháp thường gặp nhất trong đề thi TOEIC Reading Part 5 & 6
                      </p>
                    </div>
                  </div>
                  <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/60 dark:bg-white/10 border border-white/60 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 backdrop-blur-md">
                    <span>{filteredTopics.length} chủ đề</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {filteredTopics.map((item, idx) => renderTenseCard(item, 'purple', idx))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
