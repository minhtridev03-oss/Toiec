import { useEffect, useState } from 'react';
import { Activity, Clock3, Crown, Trophy } from 'lucide-react';
import { useLocale } from '../../contexts/LocaleContext';
import { useAuth } from '../../contexts/AuthContext';
import { fetchPracticeLeaderboard } from '../../lib/practiceActivity';

const COPY = {
  vi: {
    eyebrow: 'Cộng đồng học tập',
    title: 'Bảng xếp hạng',
    subtitle: 'Xếp theo thời gian luyện tập thực tế',
    week: 'Tuần',
    month: '30 ngày',
    time: 'Thời gian luyện',
    active: 'ngày luyện',
    you: 'Bạn',
    loading: 'Đang tải bảng xếp hạng...',
    empty: 'Chưa có phiên luyện tập trong khoảng thời gian này.',
  },
  en: {
    eyebrow: 'Learning community',
    title: 'Leaderboard',
    subtitle: 'Ranked by real practice time',
    week: 'Week',
    month: '30 days',
    time: 'Practice time',
    active: 'active days',
    you: 'You',
    loading: 'Loading the leaderboard...',
    empty: 'No practice sessions have been recorded for this period.',
  },
};

const formatDuration = (totalSeconds, locale) => {
  const seconds = Number(totalSeconds) || 0;
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) return locale === 'vi' ? `${hours} giờ ${minutes} phút` : `${hours}h ${minutes}m`;
  return locale === 'vi' ? `${Math.max(1, totalMinutes)} phút` : `${Math.max(1, totalMinutes)}m`;
};

const getInitial = (name) => (name || 'L').trim().charAt(0).toUpperCase();

const RankMark = ({ rank }) => {
  if (rank === 1) return <Crown size={17} className="text-amber-500" aria-label="Rank 1" />;
  if (rank === 2) return <span className="text-sm font-extrabold text-slate-400 dark:text-slate-300">2</span>;
  if (rank === 3) return <span className="text-sm font-extrabold text-amber-700 dark:text-amber-500">3</span>;
  return <span className="text-sm font-bold text-slate-400 dark:text-slate-500">{rank}</span>;
};

export default function PracticeLeaderboard() {
  const [period, setPeriod] = useState('week');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const { locale } = useLocale();
  const { user } = useAuth();
  const text = COPY[locale];

  useEffect(() => {
    let cancelled = false;

    const loadLeaderboard = async () => {
      setLoading(true);
      const data = await fetchPracticeLeaderboard(period, 10);
      if (!cancelled) {
        setEntries(data);
        setLoading(false);
      }
    };

    loadLeaderboard();
    return () => {
      cancelled = true;
    };
  }, [period]);

  return (
    <section className="overflow-hidden rounded-2xl border border-pink-200/80 bg-white shadow-sm dark:border-[#3A2F43] dark:bg-[#160B1E]">
      <div className="flex flex-col gap-4 border-b border-pink-100 px-5 py-5 dark:border-[#3A2F43] sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-pink-600 dark:text-pink-300">{text.eyebrow}</p>
          <div className="mt-1 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
              <Trophy size={19} />
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">{text.title}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{text.subtitle}</p>
            </div>
          </div>
        </div>

        <div className="inline-flex w-fit items-center rounded-xl bg-pink-50 p-1 dark:bg-[#2A1724]" role="group" aria-label={text.title}>
          {[
            { id: 'week', label: text.week },
            { id: 'month', label: text.month },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setPeriod(option.id)}
              className={`rounded-lg px-3.5 py-2 text-sm font-bold transition-colors cursor-pointer ${period === option.id ? 'bg-[#DC4E99] text-white shadow-sm shadow-pink-500/30' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
              aria-pressed={period === option.id}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-4 sm:px-6">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <Clock3 size={15} className="text-pink-500" /> {text.time}
        </div>

        {loading ? (
          <div className="space-y-3" aria-label={text.loading}>
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-[58px] animate-pulse rounded-xl bg-pink-50 dark:bg-white/5" />)}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-pink-200 px-6 text-center text-sm text-slate-500 dark:border-[#4A3044] dark:text-slate-400">
            {text.empty}
          </div>
        ) : (
          <ol className="space-y-1.5">
            {entries.map((entry) => {
              const label = entry.is_current_user ? text.you : entry.display_name;
              const avatarUrl = entry.is_current_user 
                ? (user?.user_metadata?.custom_avatar_url || user?.user_metadata?.avatar_url || entry.avatar_url)
                : entry.avatar_url;

              return (
                <li
                  key={entry.user_id}
                  className={`flex items-center gap-3 rounded-xl px-2.5 py-2.5 sm:px-3 ${entry.is_current_user ? 'bg-pink-50 ring-1 ring-pink-200 dark:bg-pink-500/10 dark:ring-pink-400/25' : ''}`}
                >
                  <span className="flex h-8 w-6 shrink-0 items-center justify-center"><RankMark rank={entry.leaderboard_rank} /></span>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fuchsia-100 text-sm font-extrabold text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300">
                      {getInitial(label === text.you ? (user?.user_metadata?.custom_full_name || user?.user_metadata?.full_name || 'U') : label)}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-extrabold text-slate-800 dark:text-white">{label}</span>
                    <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <Activity size={12} className="text-orange-500" /> {entry.active_days} {text.active}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-lg bg-emerald-100 px-2.5 py-1.5 text-xs font-extrabold text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300">
                    {formatDuration(entry.total_seconds, locale)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
