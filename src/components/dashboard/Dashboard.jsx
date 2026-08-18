import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Flame,
  Headphones,
  LibraryBig,
  Play,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import { useStats } from '../../contexts/StatsContext';
import { fetchSuggestedCategories } from '../../lib/api';
const VocabularyReview = lazy(() => import('../quiz/VocabularyReview'));
const PracticeActivityChart = lazy(() => import('./PracticeActivityChart'));
const PracticeLeaderboard = lazy(() => import('./PracticeLeaderboard'));

const DashboardWidgetFallback = () => (
  <div className="min-h-40 animate-pulse rounded-3xl bg-white/60 dark:bg-white/5" aria-hidden="true" />
);

const MOTIVATIONAL_QUOTES = [
  "Học tiếng Anh là mở ra một thế giới mới 🌟",
  "Đừng sợ sai, mỗi lỗi sai là một bài học 💡",
  "Học đều đặn mỗi ngày tốt hơn học dồn một lúc 🐢",
  "Kỷ luật mang lại tự do, hãy giữ vững chuỗi học của bạn 🔥",
  "Practice makes perfect - Luyện tập tạo nên sự hoàn hảo ⭐",
  "Hôm nay đọc một trang, ngày mai bạn sẽ đọc được một cuốn sách 📖",
  "Từ vựng là chìa khóa, hãy thu thập chúng mỗi ngày 🔑",
  "Tiến bộ nhỏ vẫn là tiến bộ. Cứ tiếp tục nhé 🚀",
  "Đầu tư vào tri thức luôn mang lại lợi nhuận cao nhất 📈",
  "Mỗi từ mới bạn học là một viên gạch xây dựng tương lai 🧱"
];

const COPY = {
  vi: {
    eyebrow: 'Học đều từng ngày',
    greeting: (name) => `Chào mừng trở lại, ${name}!`,
    heroText: (words) => `Bạn đã học ${words} từ. Dành vài phút hôm nay để giữ nhịp và tiến gần hơn tới mục tiêu của mình.`,
    continue: 'Tiếp tục học',
    categories: 'Xem chủ đề',
    streakLabel: 'Chuỗi học hiện tại',
    days: 'ngày',
    learningLabel: 'Tiến độ học tập',
    complete: 'hoàn thành',
    learningHint: 'Tiến độ trung bình của các chủ đề đang học.',
    wordsLabel: 'Tổng từ đã học',
    milestone: 'Mốc',
    wordsToGo: (words) => `Còn ${words} từ tới mốc mới`,
    quickTitle: 'Học tiếp ngay',
    quickSubtitle: 'Chọn một hoạt động phù hợp với bạn hôm nay',
    start: 'Bắt đầu',
    actions: [
      { label: 'Ôn nhanh', detail: 'Kiểm tra từ đã học', action: 'quiz' },
      { label: 'Kho từ vựng', detail: 'Mở chủ đề của bạn', action: 'categories' },
      { label: 'Luyện nghe', detail: 'Bắt đầu một video ngắn', action: 'dictation' },
    ],
  },
  en: {
    eyebrow: 'Learn a little every day',
    greeting: (name) => `Welcome back, ${name}!`,
    heroText: (words) => `You have learned ${words} words. Spend a few minutes today to keep your momentum and move closer to your goal.`,
    continue: 'Resume learning',
    categories: 'Browse topics',
    streakLabel: 'Current streak',
    days: 'days',
    learningLabel: 'Learning progress',
    complete: 'complete',
    learningHint: 'Average progress across your active topics.',
    wordsLabel: 'Total words learned',
    milestone: 'Milestone',
    wordsToGo: (words) => `${words} words to your next milestone`,
    quickTitle: 'Keep learning',
    quickSubtitle: 'Pick an activity that fits your day',
    start: 'Start',
    actions: [
      { label: 'Quick review', detail: 'Test learned vocabulary', action: 'quiz' },
      { label: 'Vocabulary library', detail: 'Open your word topics', action: 'categories' },
      { label: 'Listening practice', detail: 'Start a short video', action: 'dictation' },
    ],
  },
};

const ACTION_ICONS = [CheckCircle2, LibraryBig, Headphones];
const ACTION_COLORS = [
  'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300',
  'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
];

function ProgressRing({ value }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (circumference * value) / 100;

  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-pink-100 dark:text-pink-300/15" />
        <circle cx="32" cy="32" r={radius} fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="text-[#DC4E99] transition-all duration-700" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-pink-700 dark:text-pink-200">{value}%</span>
    </div>
  );
}

export default function Dashboard() {
  const [showQuiz, setShowQuiz] = useState(false);
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { locale } = useLocale();
  const { streak, learnedWords, refreshStats } = useStats();
  const text = COPY[locale];

  const displayName = user?.user_metadata?.custom_full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';

  const categoryProgress = useMemo(() => {
    if (!categories.length) return 0;
    return Math.round(categories.reduce((sum, category) => sum + (Number(category.progress) || 0), 0) / categories.length);
  }, [categories]);

  const nextMilestone = Math.max(100, Math.ceil((learnedWords + 1) / 100) * 100);
  const milestoneProgress = Math.min(100, Math.round((learnedWords / nextMilestone) * 100));
  const wordsToMilestone = Math.max(0, nextMilestone - learnedWords);

  useEffect(() => {
    let cancelled = false;

    const loadDashboardData = async () => {
      if (!user?.id) return;
      try {
        const categoriesData = await fetchSuggestedCategories(user.id);
        if (!cancelled) {
          setCategories(categoriesData);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    };

    loadDashboardData();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleQuickAction = (action) => {
    if (action === 'quiz') {
      setShowQuiz(true);
      return;
    }
    navigate(`/${action}`);
  };

  if (showQuiz) {
    return (
      <Suspense fallback={<DashboardWidgetFallback />}>
        <VocabularyReview onBack={() => setShowQuiz(false)} />
      </Suspense>
    );
  }

  return (
    <>
      {/* Full-width Marquee Quotes */}
      <div className="grid w-full overflow-hidden py-4 [mask-image:_linear-gradient(to_right,transparent_0,_black_128px,_black_calc(100%-128px),transparent_100%)]">
        <div className="min-w-0">
          <div className="flex w-max animate-marquee items-center text-sm font-medium text-slate-600 dark:text-slate-300">
            <div className="flex shrink-0 items-center gap-4 px-2">
            {MOTIVATIONAL_QUOTES.map((quote, idx) => (
              <div key={`quote1-${idx}`} className="flex items-center gap-2 rounded-xl border border-slate-200/60 bg-white px-4 py-2 shadow-sm dark:border-slate-700/50 dark:bg-[#211126]">
                <Sparkles size={16} className="text-pink-500" />
                <span>{quote}</span>
              </div>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-4 px-2" aria-hidden="true">
            {MOTIVATIONAL_QUOTES.map((quote, idx) => (
              <div key={`quote2-${idx}`} className="flex items-center gap-2 rounded-xl border border-slate-200/60 bg-white px-4 py-2 shadow-sm dark:border-slate-700/50 dark:bg-[#211126]">
                <Sparkles size={16} className="text-pink-500" />
                <span>{quote}</span>
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>

      <main className="mx-auto min-w-0 w-[92%] max-w-[1450px] py-7 sm:w-[90%] sm:py-8">
      <div className="grid grid-cols-12 gap-5 lg:gap-6">
        <section className="relative col-span-12 min-h-[330px] overflow-hidden rounded-[28px] border border-pink-300/30 bg-[#211126] shadow-xl shadow-pink-950/20 lg:col-span-8">
          <img src="/assets/dashboard_banner.png" alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" loading="eager" />
          <div className="absolute inset-0 bg-[#251033]/75" />
          <div className="relative z-10 flex min-h-[330px] flex-col justify-center p-7 sm:p-10">
            <p className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-pink-100"><Sparkles size={16} /> {text.eyebrow}</p>
            <h1 className="app-display max-w-3xl text-3xl font-extrabold leading-tight text-white sm:text-4xl xl:text-5xl">{text.greeting(displayName)}</h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-pink-50 sm:text-lg">{text.heroText(learnedWords)}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={() => setShowQuiz(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#DC4E99] px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-pink-950/30 transition-colors hover:bg-[#c83f87] cursor-pointer">
                <Play size={18} fill="currentColor" /> {text.continue}
              </button>
              <button type="button" onClick={() => navigate('/categories')} className="rounded-xl border border-pink-100/45 bg-[#1c1025]/35 px-5 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/15 cursor-pointer">
                {text.categories}
              </button>
            </div>
          </div>
        </section>

        <aside className="col-span-12 grid gap-4 sm:grid-cols-3 lg:col-span-4 lg:grid-cols-1">
          <section className="flex items-center justify-between rounded-2xl border border-pink-200/80 bg-white p-5 shadow-sm dark:border-[#3A2F43] dark:bg-[#160B1E]">
            <div className="flex items-center gap-3.5">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300"><Flame size={25} /></span>
              <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{text.streakLabel}</p><p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-white">{streak} <span className="text-base">{text.days}</span></p></div>
            </div>
            <ArrowRight size={20} className="text-pink-300 dark:text-pink-300/50" />
          </section>

          <section className="rounded-2xl border border-pink-200/80 bg-white p-5 shadow-sm dark:border-[#3A2F43] dark:bg-[#160B1E]">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{text.learningLabel}</p><p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-white">{categoryProgress}% <span className="text-base">{text.complete}</span></p></div>
              <ProgressRing value={categoryProgress} />
            </div>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{text.learningHint}</p>
          </section>

          <section className="rounded-2xl border border-pink-200/80 bg-white p-5 shadow-sm dark:border-[#3A2F43] dark:bg-[#160B1E]">
            <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{text.wordsLabel}</p><p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-white">{learnedWords}</p></div><span className="text-sm font-bold text-pink-600 dark:text-pink-300">{text.milestone} {nextMilestone}</span></div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-pink-100 dark:bg-pink-400/15"><div className="h-full rounded-full bg-[#DC4E99]" style={{ width: `${milestoneProgress}%` }} /></div>
            <p className="mt-2 text-right text-xs text-slate-500 dark:text-slate-400">{text.wordsToGo(wordsToMilestone)}</p>
          </section>
        </aside>

        <Suspense fallback={<DashboardWidgetFallback />}>
          <section className="col-span-12 lg:col-span-8"><PracticeActivityChart userId={user?.id} streak={streak} learnedWords={learnedWords} /></section>
        </Suspense>
        <Suspense fallback={<DashboardWidgetFallback />}>
          <aside className="col-span-12 lg:col-span-4"><PracticeLeaderboard /></aside>
        </Suspense>

        <section className="col-span-12 pt-1">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-xl font-extrabold text-slate-800 dark:text-white">{text.quickTitle}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{text.quickSubtitle}</p></div></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {text.actions.map((action, index) => {
              const Icon = ACTION_ICONS[index];
              return (
                <button key={action.action} type="button" onClick={() => handleQuickAction(action.action)} className="group flex items-center gap-4 rounded-2xl border border-pink-200/80 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-pink-300 hover:shadow-md dark:border-[#3A2F43] dark:bg-[#160B1E] cursor-pointer">
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${ACTION_COLORS[index]}`}><Icon size={24} /></span>
                  <span className="min-w-0 flex-1"><span className="block font-extrabold text-slate-800 dark:text-white">{action.label}</span><span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">{action.detail}</span></span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-pink-500 transition-colors group-hover:bg-pink-100 dark:text-pink-300 dark:group-hover:bg-pink-400/15"><ArrowRight size={19} /></span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </main>
    </>
  );
}
