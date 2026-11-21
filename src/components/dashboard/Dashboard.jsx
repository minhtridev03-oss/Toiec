import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CalendarCheck2,
  CheckCircle2,
  Compass,
  Flame,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import { useStats } from '../../contexts/StatsContext';
import { getDaysOfCurrentWeek } from '../../lib/attendance';
import { fetchAllSkillsProgress } from '../../lib/progressService';
import AmbientVideoWidget from './AmbientVideoWidget';
import { usePlatform } from '../../hooks/usePlatform';
import fireGif from '../../assets/fire-0nen.gif';

const PracticeActivityChart = lazy(() => import('./PracticeActivityChart'));
const PracticeLeaderboard = lazy(() => import('./PracticeLeaderboard'));

const DashboardWidgetFallback = () => (
  <div className="min-h-40 animate-pulse rounded-3xl bg-white/60 dark:bg-white/5" aria-hidden="true" />
);

const SKILLS_CONFIG = [
  {
    key: 'vocabulary',
    titleKey: 'skillVocab',
    descKey: 'skillVocabDesc',
    path: '/categories',
    fromColor: '#10b981',
    toColor: '#14b8a6',
    badgeColor: 'border-emerald-500/30 text-emerald-800 dark:text-emerald-300 bg-emerald-500/10',
  },
  {
    key: 'grammar',
    titleKey: 'skillGrammar',
    descKey: 'skillGrammarDesc',
    path: '/tenses',
    fromColor: '#8b5cf6',
    toColor: '#6366f1',
    badgeColor: 'border-purple-500/30 text-purple-800 dark:text-purple-300 bg-purple-500/10',
  },
  {
    key: 'dictation',
    titleKey: 'skillDictation',
    descKey: 'skillDictationDesc',
    path: '/dictation',
    fromColor: '#06b6d4',
    toColor: '#3b82f6',
    badgeColor: 'border-sky-500/30 text-sky-800 dark:text-sky-300 bg-sky-500/10',
  },
  {
    key: 'shadowing',
    titleKey: 'skillShadowing',
    descKey: 'skillShadowingDesc',
    path: '/shadowing',
    fromColor: '#f43f5e',
    toColor: '#ec4899',
    badgeColor: 'border-rose-500/30 text-rose-800 dark:text-rose-300 bg-rose-500/10',
  },
  {
    key: 'reading',
    titleKey: 'skillReading',
    descKey: 'skillReadingDesc',
    path: '/reading',
    fromColor: '#f59e0b',
    toColor: '#f97316',
    badgeColor: 'border-amber-500/30 text-amber-800 dark:text-amber-300 bg-amber-500/10',
  },
  {
    key: 'writing',
    titleKey: 'skillWriting',
    descKey: 'skillWritingDesc',
    path: '/writing',
    fromColor: '#6366f1',
    toColor: '#06b6d4',
    badgeColor: 'border-indigo-500/30 text-indigo-800 dark:text-cyan-300 bg-indigo-500/10',
  },
];

const COPY = {
  vi: {
    tabGreeting: 'Lời chào',
    tabProgress: 'Tiến độ học tập',
    tabChart: 'Biểu đồ học tập',
    tabLeaderboard: 'Bảng xếp hạng',
    eyebrow: 'Học đều từng ngày',
    greeting: (name) => `Chào mừng trở lại, ${name}!`,
    streakTooltip: (s) => `Chuỗi học: ${s} ngày`,
    checkInTitle: 'Điểm danh hàng ngày',
    checkedInTodayMsg: 'Tuyệt vời! Bạn đã duy trì chuỗi lửa hôm nay 🔥',
    notCheckedInMsg: 'Nhấn trực tiếp vào số ngày hôm nay để điểm danh 🔥',
    toastCheckInSuccess: (s) => `Điểm danh thành công! Chuỗi học hiện tại: ${s} ngày 🔥`,
    alreadyCheckedInDay: (num) => `Ngày ${num} đã được điểm danh rồi nhé!`,
    futureDayHint: (num) => `Chưa tới ngày ${num}, hãy quay lại điểm danh vào ngày đó nhé!`,
    pastDayCannotCheckIn: (num) => `Ngày ${num} đã qua rồi, không thể điểm danh bù.`,
    streakLabel: 'Chuỗi học hiện tại',
    days: 'ngày',
    learningLabel: 'Tiến độ học tập',
    complete: 'hoàn thành',
    learningHint: 'Tiến độ trung bình của các chủ đề đang học.',
    learningHintDynamic: (n) => `Tiến độ trung bình của ${n} kỹ năng đang học.`,
    wordsLabel: 'Tổng từ đã học',
    milestone: 'Mốc',
    wordsToGo: (words) => `Còn ${words} từ tới mốc mới`,
    skillsSectionTitle: 'Chi tiết tiến độ từng học phần',
    skillsSectionSubtitle: 'Quy chuẩn thang 0% - 100% dựa trên các chủ đề bạn đang học',
    skillVocab: 'Kho từ vựng',
    skillVocabDesc: 'Học từ vựng theo chủ đề chuyên sâu',
    skillGrammar: 'Ngữ pháp',
    skillGrammarDesc: 'Làm chủ 12 thì và câu hỏi tương tác',
    skillDictation: 'Nghe chép chính tả',
    skillDictationDesc: 'Luyện nghe phản xạ và gõ chính xác từng câu',
    skillShadowing: 'Shadowing (Luyện nhại)',
    skillShadowingDesc: 'Luyện nhại giọng và ngữ điệu người bản ngữ',
    skillReading: 'Luyện đọc',
    skillReadingDesc: 'Nâng cao kỹ năng đọc hiểu và vốn từ',
    skillWriting: 'Luyện viết',
    skillWritingDesc: 'Luyện dịch câu và nâng cao kỹ năng viết',
    activeStatus: (n, unit) => `Đang học ${n} ${unit}`,
    notStartedStatus: 'Chưa bắt đầu',
    continueBtn: 'Tiếp tục học',
    startBtn: 'Bắt đầu học',
    refreshing: 'Đang tải tiến độ...',
  },
  en: {
    tabGreeting: 'Welcome',
    tabProgress: 'Learning Progress',
    tabChart: 'Activity Chart',
    tabLeaderboard: 'Leaderboard',
    eyebrow: 'Learn a little every day',
    greeting: (name) => `Welcome back, ${name}!`,
    streakTooltip: (s) => `Streak: ${s} days`,
    checkInTitle: 'Daily Attendance',
    checkedInTodayMsg: 'Awesome! You kept your streak burning today 🔥',
    notCheckedInMsg: 'Click directly on today\'s number to check in 🔥',
    toastCheckInSuccess: (s) => `Checked in successfully! Current streak: ${s} days 🔥`,
    alreadyCheckedInDay: (num) => `Day ${num} is already checked in! 🔥`,
    futureDayHint: (num) => `Day ${num} has not arrived yet. Please come back then! 😊`,
    pastDayCannotCheckIn: (num) => `Day ${num} has already passed and cannot be checked in retroactively. Remember to check in daily! ⏰`,
    streakLabel: 'Current streak',
    days: 'days',
    learningLabel: 'Learning progress',
    complete: 'complete',
    learningHint: 'Average progress across your active topics.',
    learningHintDynamic: (n) => `Average progress across ${n} active skills.`,
    wordsLabel: 'Total words learned',
    milestone: 'Milestone',
    wordsToGo: (words) => `${words} words to your next milestone`,
    skillsSectionTitle: 'Progress by Learning Skill',
    skillsSectionSubtitle: 'Standardized 0% - 100% scale across active topics',
    skillVocab: 'Vocabulary Archive',
    skillVocabDesc: 'Learn words by specialized topics',
    skillGrammar: 'Grammar',
    skillGrammarDesc: 'Master 12 tenses with interactive exercises',
    skillDictation: 'Dictation Practice',
    skillDictationDesc: 'Train listening and write exact sentences',
    skillShadowing: 'Shadowing Practice',
    skillShadowingDesc: 'Shadow native speaker rhythm and accent',
    skillReading: 'Reading Practice',
    skillReadingDesc: 'Improve comprehension and vocabulary',
    skillWriting: 'Writing Practice',
    skillWritingDesc: 'Translate and practice sentence writing',
    activeStatus: (n, unit) => `${n} ${unit} in progress`,
    notStartedStatus: 'Not started',
    continueBtn: 'Continue learning',
    startBtn: 'Start learning',
    refreshing: 'Updating progress...',
  },
};



function SkillCircularCard({ cfg, skillData, text, index = 0 }) {
  const hasActive = skillData.activeTopics > 0;
  const radius = 46;
  const strokeWidth = 4;
  const circumference = 2 * Math.PI * radius;
  const validValue = Math.min(100, Math.max(0, Number(skillData.percentage) || 0));
  const offset = circumference - (circumference * validValue) / 100;
  const gradId = `skill-grad-${cfg.key}`;

  return (
    <Link
      to={cfg.path}
      className="group relative w-full max-w-[260px] sm:max-w-[290px] aspect-square rounded-full glass-panel shadow-xl flex flex-col items-center justify-between p-5 sm:p-7 text-center select-none border border-white/60 dark:border-white/10 hover:scale-[1.04] active:scale-95 transition-all duration-300 cursor-pointer overflow-hidden mx-auto"
    >
      {/* Outer SVG Progress Ring wrapping the perimeter of the circle */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full -rotate-90 pointer-events-none p-1"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={cfg.fromColor} />
            <stop offset="100%" stopColor={cfg.toColor} />
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
          className="text-slate-200/70 dark:text-white/10"
        />

        {/* Outer active progress arc with dynamic sweep & pull-back animation */}
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
            '--circle-circumference': `${circumference}px`,
            '--circle-target-offset': `${offset}px`,
            animationDelay: `${index * 85}ms`,
          }}
          className={validValue > 0 ? 'skill-progress-arc' : 'skill-progress-arc-zero'}
        />
      </svg>

      {/* Top: Status Badge */}
      <div className="z-10 mt-3 sm:mt-4">
        <span
          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border shadow-2xs ${hasActive
            ? cfg.badgeColor
            : 'border-slate-300/60 dark:border-white/10 text-slate-500 dark:text-slate-400 bg-slate-200/50 dark:bg-white/5'
            }`}
        >
          {hasActive
            ? text.activeStatus(skillData.activeTopics, skillData.topicUnit || 'chủ đề')
            : text.notStartedStatus}
        </span>
      </div>

      {/* Center: Percentage, Title, Item Count */}
      <div className="z-10 flex flex-col items-center justify-center my-auto px-4 max-w-[85%]">
        <span className="text-3xl sm:text-4xl font-black tracking-tight text-slate-950 dark:text-white">
          {validValue}%
        </span>
        <h3 className="mt-1 text-sm sm:text-base font-black text-slate-950 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-cyan-400 transition-colors leading-tight text-center">
          {text[cfg.titleKey]}
        </h3>
        <p className="mt-1 text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-400 leading-tight">
          {skillData.completedItems} / {skillData.totalItems} {skillData.itemUnit}
        </p>
      </div>

      {/* Bottom: Action Pill */}
      <div className="z-10 mb-3 sm:mb-4">
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full glass-panel text-[11px] font-black text-slate-800 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-cyan-300 shadow-2xs border border-white/60 dark:border-white/10 group-hover:scale-105 transition-all">
          <span>{hasActive ? text.continueBtn : text.startBtn}</span>
          <ArrowRight size={11} className="group-hover:translate-x-1 transition-transform" />
        </span>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { isNative } = usePlatform();
  const [activeTab, setActiveTab] = useState('greeting');
  const [skillsProgress, setSkillsProgress] = useState(null);
  const [checkInToast, setCheckInToast] = useState(null);
  const { user, openAuthModal } = useAuth();
  const { locale } = useLocale();
  const {
    streak,
    checkInDates,
    isCheckedInToday,
    isCheckingIn,
    checkIn,
  } = useStats();
  const text = COPY[locale];

  const displayName = user?.user_metadata?.custom_full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || (locale === 'vi' ? 'Bạn mới' : 'Learner');

  const weekDays = useMemo(
    () => getDaysOfCurrentWeek(new Date(), checkInDates),
    [checkInDates]
  );

  const handleDayClick = async (day) => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (day.isCheckedIn) {
      setCheckInToast(text.alreadyCheckedInDay(day.dayNum));
      setTimeout(() => setCheckInToast(null), 3000);
      return;
    }

    if (day.isFuture) {
      setCheckInToast(text.futureDayHint(day.dayNum));
      setTimeout(() => setCheckInToast(null), 3000);
      return;
    }

    if (day.isPast) {
      setCheckInToast(text.pastDayCannotCheckIn(day.dayNum));
      setTimeout(() => setCheckInToast(null), 3000);
      return;
    }

    const res = await checkIn(day.dateStr);
    if (res?.success) {
      setCheckInToast(text.toastCheckInSuccess(res.streak));
      setTimeout(() => setCheckInToast(null), 3500);
    } else if (res?.message) {
      setCheckInToast(res.message);
      setTimeout(() => setCheckInToast(null), 3000);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadSkills = async () => {
      if (!user?.id) return;
      try {
        const prog = await fetchAllSkillsProgress(user.id);
        if (!cancelled) {
          setSkillsProgress(prog);
        }
      } catch (err) {
        console.error('Error loading skills progress:', err);
      }
    };

    loadSkills();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Always fetch real-time fresh progress when user navigates to Progress tab
  useEffect(() => {
    if (activeTab === 'progress' && user?.id) {
      let cancelled = false;
      fetchAllSkillsProgress(user.id, true)
        .then((prog) => {
          if (!cancelled && prog) {
            setSkillsProgress(prog);
          }
        });
      return () => {
        cancelled = true;
      };
    }
  }, [activeTab, user?.id]);

  return (
    <main className="mx-auto min-w-0 w-[95%] sm:w-[90%] max-w-[1450px] py-4 sm:py-7">
      {/* Top Tab Bar Navigation */}
      <div className="mb-5 sm:mb-6 w-full select-none overflow-x-auto no-scrollbar py-0.5">
        <div className="inline-flex min-w-max items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-2xl glass-panel shadow-xs dark:bg-black/40 dark:border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('greeting')}
            className={`flex shrink-0 items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${activeTab === 'greeting'
              ? 'glass-pill-active text-indigo-900 font-black shadow-xs dark:bg-black dark:text-cyan-400 dark:border dark:border-cyan-500/30'
              : 'text-slate-900 hover:text-slate-950 hover:bg-white/60 dark:text-slate-200 dark:hover:text-white dark:hover:bg-white/5'
              }`}
          >
            <Sparkles size={15} />
            <span>{text.tabGreeting}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('progress')}
            className={`flex shrink-0 items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${activeTab === 'progress'
              ? 'glass-pill-active text-indigo-900 font-black shadow-xs dark:bg-black dark:text-cyan-400 dark:border dark:border-cyan-500/30'
              : 'text-slate-900 hover:text-slate-950 hover:bg-white/60 dark:text-slate-200 dark:hover:text-white dark:hover:bg-white/5'
              }`}
          >
            <Compass size={15} />
            <span>{text.tabProgress}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('chart')}
            className={`flex shrink-0 items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${activeTab === 'chart'
              ? 'glass-pill-active text-indigo-900 font-black shadow-xs dark:bg-black dark:text-cyan-400 dark:border dark:border-cyan-500/30'
              : 'text-slate-900 hover:text-slate-950 hover:bg-white/60 dark:text-slate-200 dark:hover:text-white dark:hover:bg-white/5'
              }`}
          >
            <BarChart3 size={15} />
            <span>{text.tabChart}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`flex shrink-0 items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${activeTab === 'leaderboard'
              ? 'glass-pill-active text-indigo-900 font-black shadow-xs dark:bg-black dark:text-cyan-400 dark:border dark:border-cyan-500/30'
              : 'text-slate-900 hover:text-slate-950 hover:bg-white/60 dark:text-slate-200 dark:hover:text-white dark:hover:bg-white/5'
              }`}
          >
            <Trophy size={15} />
            <span>{text.tabLeaderboard}</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Lời chào Kính lỏng Lơ lửng & Đảo điều khiển Right Control Island */}
      {activeTab === 'greeting' && (
        <div className="animate-in fade-in duration-300">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-5 sm:gap-6 py-1 sm:py-2">
            {/* Cột trái: Lời chào & Khung Điểm danh Kính lỏng */}
            <div className="flex-1 flex flex-col justify-center min-w-0 w-full">
              {/* Eyebrow badge */}
              <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full glass-panel mb-2.5 sm:mb-3 text-xs sm:text-sm font-black text-indigo-700 dark:text-cyan-300 shadow-xs border border-white/50 dark:border-white/10 w-fit">
                <Sparkles size={14} className="sm:w-[15px] sm:h-[15px]" />
                <span>{text.eyebrow}</span>
              </div>

              {/* Tên người dùng & Chuỗi lửa nhỏ đẹp động sáng */}
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 mb-3.5 sm:mb-4">
                <h1 className="app-display text-xl sm:text-3xl xl:text-4xl font-black text-slate-900 dark:text-white drop-shadow-xs dark:drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)] tracking-tight break-words">
                  {text.greeting(displayName)}
                </h1>

                {/* Chuỗi lửa nhỏ đẹp động sáng */}
                <div
                  className="streak-glow-pill inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full border border-orange-400/60 transition-all duration-300 hover:scale-105 active:scale-95 select-none cursor-default shrink-0"
                  title={text.streakTooltip(streak || 0)}
                >
                  <span className="streak-fire-wrapper flex items-center justify-center shrink-0">
                    <img
                      src={fireGif}
                      alt="Streak Flame"
                      className="streak-fire-gif h-5 w-5 sm:h-7 sm:w-7 object-contain pointer-events-none select-none"
                      loading="eager"
                    />
                  </span>
                  <span className="text-xs sm:text-base font-black text-white tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                    {streak || 0}
                  </span>
                </div>
              </div>

              {/* Box ngày điểm danh kính lỏng siêu mỏng lơ lửng */}
              <div className="glass-panel rounded-[1.75rem] sm:rounded-[2rem] p-4 sm:p-6 shadow-xl max-w-xl w-full transition-all">
                <div className="flex items-center gap-2.5 sm:gap-3 mb-3.5 sm:mb-4">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl glass-panel text-indigo-700 dark:text-cyan-400 shadow-xs">
                    <CalendarCheck2 size={18} className="sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-base font-black text-slate-950 dark:text-white tracking-wide truncate">
                      {text.checkInTitle}
                    </h3>
                    <p className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-slate-300 line-clamp-1">
                      {isCheckedInToday ? text.checkedInTodayMsg : text.notCheckedInMsg}
                    </p>
                  </div>
                </div>

                {/* Dãy 7 ngày trong tuần - Chỉ cho phép điểm danh ngày hôm nay */}
                <div className="grid grid-cols-7 gap-1 sm:gap-2.5 pt-3 border-t border-slate-300/60 dark:border-white/10">
                  {weekDays.map((day) => {
                    const isClickable = day.isToday && !day.isCheckedIn;
                    return (
                      <button
                        key={day.dateStr}
                        type="button"
                        onClick={() => handleDayClick(day)}
                        disabled={isCheckingIn}
                        className={`flex flex-col items-center gap-1 sm:gap-1.5 transition-all outline-hidden ${isClickable
                          ? 'cursor-pointer hover:scale-105 active:scale-95'
                          : day.isCheckedIn
                            ? 'cursor-default'
                            : 'cursor-not-allowed'
                          }`}
                        title={
                          day.isCheckedIn
                            ? `Ngày ${day.dayNum} - Đã điểm danh 🔥`
                            : day.isToday
                              ? `Ngày ${day.dayNum} (Hôm nay) - Nhấn để điểm danh!`
                              : day.isFuture
                                ? `Ngày ${day.dayNum} (Chưa tới)`
                                : `Ngày ${day.dayNum} (Đã qua - Không thể điểm danh lại)`
                        }
                      >
                        <span className={`text-[10px] sm:text-[11px] font-black ${day.isToday ? 'text-indigo-900 dark:text-cyan-300' : 'text-slate-950 dark:text-slate-300'
                          }`}>
                          {day.label}
                        </span>
                        <div
                          className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl text-[11px] sm:text-sm font-black transition-all duration-200 ${day.isCheckedIn
                            ? 'bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-600/30 ring-1 ring-white/40 hover:scale-105 active:scale-95'
                            : day.isToday
                              ? 'border-2 border-dashed border-indigo-600 dark:border-cyan-400 bg-white/80 dark:bg-cyan-500/15 text-indigo-950 dark:text-cyan-200 shadow-xs animate-pulse hover:border-solid hover:bg-white hover:scale-110 active:scale-95 cursor-pointer'
                              : day.isPast
                                ? 'bg-slate-200/40 dark:bg-white/5 text-slate-400 dark:text-slate-600 shadow-2xs border border-dashed border-slate-300/40 dark:border-white/5 opacity-60'
                                : 'bg-white/55 dark:bg-white/5 text-slate-600 dark:text-slate-400 shadow-xs border border-white/60 dark:border-white/5 opacity-80'
                            }`}
                        >
                          {day.isCheckedIn ? (
                            <Flame size={14} className="sm:w-4 sm:h-4" fill="currentColor" />
                          ) : (
                            <span>{day.dayNum}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Phản hồi khi vừa điểm danh thành công */}
                {checkInToast && (
                  <div className="mt-3.5 py-2 px-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-300">
                    <CheckCircle2 size={15} />
                    <span>{checkInToast}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Cột phải: Khung điều khiển Video nền (Ẩn hoàn toàn trên App APK) */}
            {!isNative && (
              <div className="w-full lg:w-[340px] xl:w-[380px] shrink-0 select-none">
                <AmbientVideoWidget />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Tiến độ học tập */}
      {activeTab === 'progress' && (
        <div className="animate-in fade-in duration-200">
          {/* 6 Skills Circular Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 justify-items-center">
            {SKILLS_CONFIG.map((cfg, index) => {
              const skillData = skillsProgress?.skills?.[cfg.key] || {
                percentage: 0,
                activeTopics: 0,
                totalTopics: 0,
                completedItems: 0,
                totalItems: 0,
                itemUnit: 'mục',
                topicUnit: 'bài',
              };

              return (
                <SkillCircularCard
                  key={cfg.key}
                  index={index}
                  cfg={cfg}
                  skillData={skillData}
                  text={text}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Biểu đồ học tập */}
      {activeTab === 'chart' && (
        <div className="animate-in fade-in duration-200">
          <Suspense fallback={<DashboardWidgetFallback />}>
            <PracticeActivityChart userId={user?.id} />
          </Suspense>
        </div>
      )}

      {/* Tab 4: Bảng xếp hạng */}
      {activeTab === 'leaderboard' && (
        <div className="max-w-4xl mx-auto animate-in fade-in duration-200">
          <Suspense fallback={<DashboardWidgetFallback />}>
            <PracticeLeaderboard />
          </Suspense>
        </div>
      )}
    </main>
  );
}
