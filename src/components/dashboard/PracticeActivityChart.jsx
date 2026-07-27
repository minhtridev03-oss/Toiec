import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Flame, SlidersHorizontal } from 'lucide-react';
import { useLocale } from '../../contexts/LocaleContext';
import {
  fetchPracticeActivityLast7Days,
  getPracticeSkillLabel,
  PRACTICE_SKILLS,
} from '../../lib/practiceActivity';

const CHART_WIDTH = 720;
const CHART_HEIGHT = 260;
const PADDING = { top: 26, right: 18, bottom: 42, left: 54 };

const COPY = {
  vi: {
    streak: 'ngày streak',
    words: 'từ đã học',
    title: 'Hoạt động luyện tập',
    subtitle: 'Phút luyện tập trong 7 ngày gần đây',
    settings: 'Tùy chỉnh biểu đồ',
    chartLabel: 'Biểu đồ phút luyện tập trong 7 ngày gần đây',
    noActivity: 'Chưa có phiên luyện tập nào được ghi nhận',
    loading: 'Đang tải dữ liệu...',
    total: 'phút tuần này',
  },
  en: {
    streak: 'day streak',
    words: 'words learned',
    title: 'Practice activity',
    subtitle: 'Practice minutes from the last 7 days',
    settings: 'Chart settings',
    chartLabel: 'Practice minutes chart for the last 7 days',
    noActivity: 'No practice session has been recorded yet',
    loading: 'Loading data...',
    total: 'minutes this week',
  },
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getSmoothPath = (points) => {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const next = points[index + 1] || point;
    const previousPrevious = points[index - 2] || previous;
    const smoothing = 0.18;

    const controlPointStart = {
      x: previous.x + (point.x - previousPrevious.x) * smoothing,
      y: previous.y + (point.y - previousPrevious.y) * smoothing,
    };
    const controlPointEnd = {
      x: point.x - (next.x - previous.x) * smoothing,
      y: point.y - (next.y - previous.y) * smoothing,
    };

    return `${path} C ${controlPointStart.x} ${controlPointStart.y}, ${controlPointEnd.x} ${controlPointEnd.y}, ${point.x} ${point.y}`;
  }, '');
};

const buildYTicks = (maxValue) => {
  if (maxValue <= 4) return [4, 2, 1, 0];
  const half = Math.round(maxValue / 2);
  const quarter = Math.max(1, Math.round(maxValue / 4));
  return [...new Set([maxValue, half, quarter, 0])].sort((a, b) => b - a);
};

export default function PracticeActivityChart({ userId, streak = 0, learnedWords = 0 }) {
  const [activeSkill, setActiveSkill] = useState('dictation');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const chartWrapRef = useRef(null);
  const [chartWidth, setChartWidth] = useState(CHART_WIDTH);
  const { locale } = useLocale();
  const text = COPY[locale];

  useEffect(() => {
    let cancelled = false;

    const loadChartData = async () => {
      setLoading(true);
      const data = await fetchPracticeActivityLast7Days(userId, activeSkill, locale);
      if (!cancelled) {
        setChartData(data);
        setLoading(false);
      }
    };

    loadChartData();
    return () => {
      cancelled = true;
    };
  }, [activeSkill, locale, userId]);

  useEffect(() => {
    const element = chartWrapRef.current;
    if (!element) return undefined;

    const updateWidth = () => setChartWidth(Math.max(360, Math.round(element.getBoundingClientRect().width)));
    updateWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const chart = useMemo(() => {
    const values = chartData.map((item) => Number(item.minutes) || 0);
    const maxMinutes = Math.max(4, Math.ceil(Math.max(...values, 0)));
    const ticks = buildYTicks(maxMinutes);
    const innerWidth = chartWidth - PADDING.left - PADDING.right;
    const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
    const baselineY = PADDING.top + innerHeight;
    const points = chartData.map((item, index) => {
      const x = PADDING.left + (chartData.length <= 1 ? 0 : (index / (chartData.length - 1)) * innerWidth);
      const ratio = clamp((Number(item.minutes) || 0) / maxMinutes, 0, 1);
      return {
        x,
        y: baselineY - ratio * innerHeight,
        showCompactLabel: index === 0 || index === chartData.length - 1 || index % 2 === 0,
        ...item,
      };
    });
    const linePath = getSmoothPath(points);
    const areaPath = points.length ? `${linePath} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z` : '';

    return {
      points,
      ticks,
      maxMinutes,
      baselineY,
      linePath,
      areaPath,
      totalMinutes: values.reduce((sum, value) => sum + value, 0),
      hasActivity: values.some((value) => value > 0),
    };
  }, [chartData, chartWidth]);

  return (
    <section className="rounded-2xl border border-pink-200/80 bg-white p-5 shadow-sm transition-colors dark:border-[#3A2F43] dark:bg-[#160B1E] sm:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">
              <Flame size={14} /> {streak} {text.streak}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-bold text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300">
              <BookOpen size={14} /> {learnedWords} {text.words}
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">{text.title}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{text.subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-1 overflow-x-auto rounded-xl bg-pink-50 p-1 dark:bg-[#2A1724] sm:flex-none">
            {PRACTICE_SKILLS.map((skill) => {
              const isActive = activeSkill === skill.id;
              return (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => setActiveSkill(skill.id)}
                  className={`shrink-0 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all sm:px-4 ${isActive ? 'bg-[#DC4E99] text-white shadow-lg shadow-pink-500/20' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'} cursor-pointer`}
                >
                  {getPracticeSkillLabel(skill.id, locale)}
                </button>
              );
            })}
          </div>

          <button type="button" title={text.settings} aria-label={text.settings} className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-pink-50 hover:text-fuchsia-600 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-fuchsia-300 sm:flex">
            <SlidersHorizontal size={22} />
          </button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-pink-50/70 p-3 dark:bg-[#0F0814] sm:p-4">
        <div ref={chartWrapRef} className="w-full">
          <svg viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`} role="img" aria-label={text.chartLabel} className="block h-[260px] w-full overflow-visible" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="practiceActivityArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#DC4E99" stopOpacity="0.34" />
                <stop offset="100%" stopColor="#DC4E99" stopOpacity="0" />
              </linearGradient>
              <filter id="practiceLineGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {chart.ticks.map((tick) => {
              const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
              const y = PADDING.top + innerHeight - (tick / chart.maxMinutes) * innerHeight;
              return (
                <g key={tick}>
                  <line x1={PADDING.left} x2={chartWidth - PADDING.right} y1={y} y2={y} stroke="currentColor" strokeDasharray="5 7" className="text-pink-200/90 dark:text-white/10" />
                  <text x={PADDING.left - 14} y={y + 5} textAnchor="end" className="fill-slate-400 text-[15px] font-medium dark:fill-slate-500">{tick}</text>
                </g>
              );
            })}
            {chart.areaPath && <path d={chart.areaPath} fill="url(#practiceActivityArea)" opacity={loading ? 0.35 : 1} />}
            {chart.linePath && <path d={chart.linePath} fill="none" stroke="#DC4E99" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" filter="url(#practiceLineGlow)" opacity={loading ? 0.4 : 1} />}
            {chart.points.map((point) => (
              <g key={point.key}>
                {point.minutes > 0 && <circle cx={point.x} cy={point.y} r="5" className="fill-white stroke-[#DC4E99] dark:fill-[#160B1E]" strokeWidth="3" />}
                <text x={point.x} y={CHART_HEIGHT - 12} textAnchor="middle" className={`fill-slate-500 text-[13px] font-medium dark:fill-slate-400 sm:text-[15px] ${point.showCompactLabel ? 'block' : 'hidden sm:block'}`}>{point.label}</text>
              </g>
            ))}
          </svg>
        </div>

        {!loading && !chart.hasActivity && <div className="pointer-events-none absolute inset-x-6 top-1/2 -translate-y-1/2 text-center text-sm font-medium text-slate-400 dark:text-slate-500">{text.noActivity}</div>}
        <div className="mt-2 flex items-center justify-between px-1 text-sm text-slate-500 dark:text-slate-400">
          <span>{loading ? text.loading : `${chart.totalMinutes.toFixed(1).replace('.0', '')} ${text.total}`}</span>
          <span>{getPracticeSkillLabel(activeSkill, locale)}</span>
        </div>
      </div>
    </section>
  );
}
