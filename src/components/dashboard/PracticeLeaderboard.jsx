import { useEffect, useState } from 'react';
import { Activity, Clock3, Crown, Medal, Trophy } from 'lucide-react';
import { useLocale } from '../../contexts/LocaleContext';
import { useAuth } from '../../contexts/AuthContext';
import { fetchPracticeLeaderboard, formatPracticeDuration } from '../../lib/practiceActivity';
import rankGif from '../../assets/rank.gif';

const COPY = {
  vi: {
    eyebrow: 'Cộng đồng học tập',
    title: 'Bảng xếp hạng',
    subtitle: 'Xếp theo thời gian luyện tập thực tế',
    week: 'Tuần này',
    month: '30 ngày',
    time: 'Thời gian luyện',
    active: 'ngày luyện',
    you: 'Bạn',
    yourRank: 'Vị trí của bạn',
    unranked: 'Chưa xếp hạng',
    leadMessage: 'Bạn đang dẫn đầu bảng vàng! Hãy tiếp tục duy trì nhé 🔥',
    climbHint: (time, rank) => `Chỉ còn ${time} nữa để vươn lên hạng #${rank}!`,
    unrankedHint: 'Hãy hoàn thành một bài luyện tập hôm nay để thắp sáng tên bạn ✨',
    loading: 'Đang tải bảng xếp hạng...',
    empty: 'Chưa có phiên luyện tập nào được ghi nhận cho giai đoạn này.',
    emptyHint: 'Hãy luyện tập ngay để trở thành người đầu tiên ghi danh trên bảng vàng 🏆',
    topLearners: 'Top người học chăm chỉ',
  },
  en: {
    eyebrow: 'Learning Community',
    title: 'Leaderboard',
    subtitle: 'Ranked by real practice time',
    week: 'This Week',
    month: '30 Days',
    time: 'Practice Time',
    active: 'active days',
    you: 'You',
    yourRank: 'Your Rank',
    unranked: 'Unranked',
    leadMessage: 'You are leading the leaderboard! Keep it burning 🔥',
    climbHint: (time, rank) => `Only ${time} to advance to rank #${rank}!`,
    unrankedHint: 'Complete a practice exercise today to light up your name ✨',
    loading: 'Loading the leaderboard...',
    empty: 'No practice sessions recorded for this period yet.',
    emptyHint: 'Start a practice session now to be the first on the leaderboard 🏆',
    topLearners: 'Top Active Learners',
  },
};

const getInitial = (name) => (name || 'L').trim().charAt(0).toUpperCase();

const RankMark = ({ rank }) => {
  if (rank === 1) {
    return (
      <span
        className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-white shadow-sm shadow-amber-500/40 ring-1 ring-amber-300"
        title="Quán quân"
      >
        <Crown size={15} className="drop-shadow-xs" />
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span
        className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-tr from-slate-400 to-slate-300 text-white shadow-sm ring-1 ring-slate-200 dark:from-slate-600 dark:to-slate-400"
        title="Á quân"
      >
        <Medal size={15} />
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span
        className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-700 to-amber-500 text-white shadow-sm ring-1 ring-amber-400/50"
        title="Hạng ba"
      >
        <Medal size={15} />
      </span>
    );
  }
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/60 dark:bg-white/5 border border-white/50 dark:border-white/10 text-xs font-black text-slate-500 dark:text-slate-400">
      {rank}
    </span>
  );
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

  const currentUserEntry = entries.find((e) => e.is_current_user || e.user_id === user?.id);

  let userMotivationText = text.unrankedHint;
  if (currentUserEntry) {
    if (currentUserEntry.leaderboard_rank === 1) {
      userMotivationText = text.leadMessage;
    } else {
      const prevEntry = entries.find((e) => e.leaderboard_rank === currentUserEntry.leaderboard_rank - 1);
      const diffSecs = prevEntry ? Math.max(60, (prevEntry.total_seconds - currentUserEntry.total_seconds) + 60) : 0;
      userMotivationText = text.climbHint(formatPracticeDuration(diffSecs, locale), currentUserEntry.leaderboard_rank - 1);
    }
  }

  const currentUserAvatar = user?.user_metadata?.custom_avatar_url || user?.user_metadata?.avatar_url || currentUserEntry?.avatar_url;
  const currentUserName = user?.user_metadata?.custom_full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || text.you;

  return (
    <section className="rounded-[2.5rem] glass-panel p-6 sm:p-7 shadow-xl border border-white/60 dark:border-white/10 transition-all select-none">
      {/* Header Bar */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center">
          <h2 className="sr-only">{text.title}</h2>
          <img
            src={rankGif}
            alt={text.title}
            title={text.title}
            className="h-14 w-14 sm:h-16 sm:w-16 object-contain pointer-events-none select-none drop-shadow-md"
            loading="eager"
          />
        </div>

        {/* Time Period Filter Pills */}
        <div className="inline-flex w-fit items-center rounded-2xl p-1.5 bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 shadow-xs gap-1" role="group" aria-label={text.title}>
          {[
            { id: 'week', label: text.week },
            { id: 'month', label: text.month },
          ].map((option) => {
            const isActive = period === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setPeriod(option.id)}
                className={`rounded-xl px-4 py-2 text-xs font-black transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-102 ring-1 ring-white/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10'
                }`}
                aria-pressed={isActive}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Your Rank Showcase Card */}
      <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 dark:border-cyan-500/20 backdrop-blur-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            {currentUserAvatar ? (
              <img
                src={currentUserAvatar}
                alt=""
                className="h-11 w-11 rounded-full object-cover ring-2 ring-indigo-500/30 dark:ring-cyan-500/30 shadow-xs"
              />
            ) : (
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-sm font-black shadow-xs">
                {getInitial(currentUserName)}
              </span>
            )}
            {currentUserEntry?.leaderboard_rank === 1 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-slate-950 shadow-2xs">
                <Crown size={12} />
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-slate-950 dark:text-white truncate">
                {currentUserName}
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-600 text-white shadow-2xs">
                {text.you}
              </span>
              {currentUserEntry ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-cyan-300">
                  #{currentUserEntry.leaderboard_rank}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-slate-400">
                  {text.unranked}
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-0.5 truncate">
              {userMotivationText}
            </p>
          </div>
        </div>

        {currentUserEntry && (
          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                <Activity size={12} className="text-orange-500" />
                {currentUserEntry.active_days} {text.active}
              </span>
              <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                {formatPracticeDuration(currentUserEntry.total_seconds, locale)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard Entries List */}
      <div>
        <div className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-1">
          <span>{text.topLearners}</span>
          <span className="flex items-center gap-1.5">
            <Clock3 size={14} className="text-indigo-500 dark:text-cyan-400" />
            {text.time}
          </span>
        </div>

        {loading ? (
          <div className="space-y-2.5" aria-label={text.loading}>
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="h-14 animate-pulse rounded-2xl bg-white/30 dark:bg-white/5 border border-white/40 dark:border-white/5"
              />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-white/20 dark:bg-black/20 border border-dashed border-white/50 dark:border-white/10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl glass-panel text-amber-500 mb-3 shadow-2xs">
              <Trophy size={24} />
            </div>
            <p className="text-sm font-black text-slate-800 dark:text-slate-200">
              {text.empty}
            </p>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              {text.emptyHint}
            </p>
          </div>
        ) : (
          <ol className="space-y-2">
            {entries.map((entry) => {
              const isCurrent = entry.is_current_user || entry.user_id === user?.id;
              const label = isCurrent ? text.you : entry.display_name;
              const avatarUrl = isCurrent ? currentUserAvatar : entry.avatar_url;
              const rank = entry.leaderboard_rank;

              let avatarRingClass = 'ring-1 ring-white/60 dark:ring-white/10';
              if (rank === 1) avatarRingClass = 'ring-2 ring-amber-400 shadow-sm shadow-amber-400/30';
              else if (rank === 2) avatarRingClass = 'ring-2 ring-slate-300 dark:ring-slate-500';
              else if (rank === 3) avatarRingClass = 'ring-2 ring-amber-600/70';

              return (
                <li
                  key={entry.user_id}
                  className={`group flex items-center gap-3.5 rounded-2xl px-4 py-3 transition-all duration-200 border ${
                    isCurrent
                      ? 'bg-indigo-500/10 dark:bg-cyan-500/10 border-indigo-500/30 dark:border-cyan-500/30 shadow-xs ring-1 ring-indigo-500/20'
                      : 'bg-white/30 dark:bg-white/5 border-white/50 dark:border-white/5 hover:bg-white/60 dark:hover:bg-white/10 hover:border-white/80 hover:scale-[1.008]'
                  }`}
                >
                  {/* Rank Mark */}
                  <span className="flex shrink-0 items-center justify-center">
                    <RankMark rank={rank} />
                  </span>

                  {/* Avatar */}
                  <div className="shrink-0">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt=""
                        loading="lazy"
                        className={`h-9 w-9 rounded-full object-cover ${avatarRingClass}`}
                      />
                    ) : (
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-xs font-black text-indigo-700 dark:text-cyan-300 ${avatarRingClass}`}
                      >
                        {getInitial(isCurrent ? currentUserName : label)}
                      </span>
                    )}
                  </div>

                  {/* Name and active days */}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-black text-slate-950 dark:text-white">
                        {label}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-600 text-white shadow-2xs">
                          {text.you}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                      <Activity size={12} className="text-orange-500" />
                      {entry.active_days} {text.active}
                    </span>
                  </span>

                  {/* Duration Pill */}
                  <span className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shadow-2xs">
                    {formatPracticeDuration(entry.total_seconds, locale)}
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
