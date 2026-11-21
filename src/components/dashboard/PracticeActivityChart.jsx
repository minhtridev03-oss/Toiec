import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useLocale } from '../../contexts/LocaleContext';
import bieuDoGif from '../../assets/bieu-do.gif';
import {
  fetchPracticeActivityLast7Days,
  formatPracticeDuration,
  getPracticeSkillLabel,
  PRACTICE_SKILLS,
} from '../../lib/practiceActivity';

const CHART_WIDTH = 720;
const CHART_HEIGHT = 280;
const PADDING = { top: 32, right: 24, bottom: 44, left: 56 };

const SKILL_THEMES = {
  all: { main: '#8b5cf6', gradient: 'from-violet-600 to-indigo-500', glow: 'rgba(139, 92, 246, 0.4)' },
  vocabulary: { main: '#10b981', gradient: 'from-emerald-500 to-teal-400', glow: 'rgba(16, 185, 129, 0.4)' },
  grammar: { main: '#a855f7', gradient: 'from-purple-500 to-indigo-500', glow: 'rgba(168, 85, 247, 0.4)' },
  dictation: { main: '#06b6d4', gradient: 'from-cyan-500 to-blue-500', glow: 'rgba(6, 182, 212, 0.4)' },
  shadowing: { main: '#f43f5e', gradient: 'from-rose-500 to-pink-500', glow: 'rgba(244, 63, 94, 0.4)' },
  reading: { main: '#f59e0b', gradient: 'from-amber-500 to-orange-500', glow: 'rgba(245, 158, 11, 0.4)' },
  writing: { main: '#3b82f6', gradient: 'from-blue-600 to-cyan-500', glow: 'rgba(59, 130, 246, 0.4)' },
  speaking: { main: '#ec4899', gradient: 'from-pink-500 to-rose-400', glow: 'rgba(236, 72, 153, 0.4)' },
};

const COPY = {
  vi: {
    title: 'Hoạt động luyện tập',
    subtitle: 'Thống kê thời lượng học tập trong 7 ngày gần đây',
    totalWeek: 'Tổng thời gian',
    dailyAvg: 'Trung bình',
    bestDay: 'Học nhiều nhất',
    perDay: 'phút/ngày',
    chartLabel: 'Biểu đồ phút luyện tập trong 7 ngày gần đây',
    noActivity: 'Chưa có phiên luyện tập nào được ghi nhận',
    noActivityHint: 'Hãy luyện tập một bài học hôm nay để ghi dấu ấn nhé ✨',
    loading: 'Đang tải dữ liệu biểu đồ...',
  },
  en: {
    title: 'Practice Activity',
    subtitle: 'Learning time recorded over the last 7 days',
    totalWeek: 'Total practice',
    dailyAvg: 'Daily average',
    bestDay: 'Peak day',
    perDay: 'mins/day',
    chartLabel: 'Practice minutes chart for the last 7 days',
    noActivity: 'No practice sessions recorded yet',
    noActivityHint: 'Complete a practice exercise today to light up your chart ✨',
    loading: 'Loading chart data...',
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
  if (!maxValue || maxValue <= 5) return [15, 10, 5, 0];
  if (maxValue <= 15) return [15, 10, 5, 0];
  if (maxValue <= 30) return [30, 20, 10, 0];
  if (maxValue <= 60) return [60, 45, 30, 15, 0];
  const step = Math.ceil(maxValue / 4 / 5) * 5;
  return [step * 4, step * 3, step * 2, step, 0];
};

export default function PracticeActivityChart({ userId }) {
  const [activeSkill, setActiveSkill] = useState('all');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const chartWrapRef = useRef(null);
  const [chartWidth, setChartWidth] = useState(CHART_WIDTH);
  const { locale } = useLocale();
  const text = COPY[locale];

  const currentTheme = SKILL_THEMES[activeSkill] || SKILL_THEMES.all;

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
    const rawMax = Math.max(...values, 0);
    const ticks = buildYTicks(rawMax);
    const maxMinutes = ticks[0];
    const innerWidth = chartWidth - PADDING.left - PADDING.right;
    const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
    const baselineY = PADDING.top + innerHeight;

    const points = chartData.map((item, index) => {
      const x = PADDING.left + (chartData.length <= 1 ? 0 : (index / (chartData.length - 1)) * innerWidth);
      const ratio = clamp((Number(item.minutes) || 0) / maxMinutes, 0, 1);
      return {
        x,
        y: baselineY - ratio * innerHeight,
        ...item,
      };
    });

    const linePath = getSmoothPath(points);
    const areaPath = points.length
      ? `${linePath} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`
      : '';

    const totalSeconds = chartData.reduce((sum, item) => sum + (Number(item.seconds) || 0), 0);
    const totalMinutes = values.reduce((sum, value) => sum + value, 0);
    const avgMinutes = Number((totalMinutes / 7).toFixed(1));

    let bestDay = null;
    let maxDayMinutes = 0;
    points.forEach((p) => {
      if (p.minutes > maxDayMinutes) {
        maxDayMinutes = p.minutes;
        bestDay = p;
      }
    });

    return {
      points,
      ticks,
      maxMinutes,
      baselineY,
      linePath,
      areaPath,
      totalSeconds,
      totalMinutes,
      avgMinutes,
      bestDay,
      hasActivity: values.some((value) => value > 0),
    };
  }, [chartData, chartWidth]);

  const handleMouseMove = (e) => {
    if (!chartWrapRef.current || !chart.points.length) return;
    const rect = chartWrapRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;

    let closest = chart.points[0];
    let minDiff = Infinity;
    chart.points.forEach((pt) => {
      const diff = Math.abs(pt.x - x);
      if (diff < minDiff) {
        minDiff = diff;
        closest = pt;
      }
    });
    setHoveredPoint(closest);
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  return (
    <section className="rounded-[1.75rem] sm:rounded-[2.5rem] glass-panel p-4 sm:p-7 shadow-xl border border-white/60 dark:border-white/10 transition-all select-none">
      {/* Header Bar */}
      <div className="mb-4 sm:mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight flex items-center gap-2 sm:gap-2.5">
            <img
              src={bieuDoGif}
              alt=""
              className="h-7 w-7 sm:h-9 sm:w-9 object-contain pointer-events-none select-none drop-shadow-xs"
              loading="eager"
            />
            <span>{text.title}</span>
          </h2>
          <p className="mt-1 text-xs font-bold text-slate-600 dark:text-slate-400">
            {text.subtitle}
          </p>
        </div>

        {/* Skill Filter Pills */}
        <div className="flex min-w-0 w-full lg:w-auto overflow-x-auto no-scrollbar scroll-smooth rounded-2xl p-1 sm:p-1.5 bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 shadow-xs gap-1">
          {PRACTICE_SKILLS.map((skill) => {
            const isActive = activeSkill === skill.id;
            const theme = SKILL_THEMES[skill.id] || SKILL_THEMES.all;

            return (
              <button
                key={skill.id}
                type="button"
                onClick={() => setActiveSkill(skill.id)}
                className={`shrink-0 rounded-xl px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? `bg-gradient-to-r ${theme.gradient} text-white shadow-md scale-102 ring-1 ring-white/30`
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10'
                }`}
              >
                {getPracticeSkillLabel(skill.id, locale)}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3 Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5 mb-4 sm:mb-5">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 shadow-2xs">
          <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {text.totalWeek}
          </p>
          <p className="text-base sm:text-lg font-black text-slate-950 dark:text-white mt-0.5">
            {loading ? '--' : formatPracticeDuration(chart.totalSeconds, locale)}
          </p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 shadow-2xs">
          <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {text.dailyAvg}
          </p>
          <p className="text-base sm:text-lg font-black text-slate-950 dark:text-white mt-0.5">
            {loading ? '--' : `${chart.avgMinutes} ${text.perDay}`}
          </p>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 shadow-2xs">
          <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {text.bestDay}
          </p>
          <p className="text-base sm:text-lg font-black text-slate-950 dark:text-white mt-0.5">
            {loading || !chart.bestDay
              ? '--'
              : `${chart.bestDay.label} (${chart.bestDay.minutes}m)`}
          </p>
        </div>
      </div>

      {/* Chart Canvas Container */}
      <div
        ref={chartWrapRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative overflow-hidden rounded-2xl bg-white/30 dark:bg-black/20 p-2 sm:p-4 border border-white/40 dark:border-white/5 backdrop-blur-xs cursor-crosshair"
      >
        <svg
          viewBox={`0 0 ${chartWidth} ${CHART_HEIGHT}`}
          role="img"
          aria-label={text.chartLabel}
          className="block h-[280px] w-full overflow-visible"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="chartGradientArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={currentTheme.main} stopOpacity="0.35" />
              <stop offset="100%" stopColor={currentTheme.main} stopOpacity="0.0" />
            </linearGradient>

            <filter id="chartLineGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines & Y-ticks */}
          {chart.ticks.map((tick) => {
            const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
            const y = PADDING.top + innerHeight - (tick / chart.maxMinutes) * innerHeight;
            return (
              <g key={tick}>
                <line
                  x1={PADDING.left}
                  x2={chartWidth - PADDING.right}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="4 6"
                  className="text-slate-300/60 dark:text-white/10"
                />
                <text
                  x={PADDING.left - 12}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-500 dark:fill-slate-400 text-xs font-bold select-none"
                >
                  {tick}m
                </text>
              </g>
            );
          })}

          {/* Active Area Fill */}
          {chart.areaPath && (
            <path
              d={chart.areaPath}
              fill="url(#chartGradientArea)"
              className="transition-all duration-700 ease-out"
              opacity={loading ? 0.3 : 1}
            />
          )}

          {/* Active Curve Line */}
          {chart.linePath && (
            <path
              d={chart.linePath}
              fill="none"
              stroke={currentTheme.main}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#chartLineGlow)"
              className="transition-all duration-700 ease-out"
              opacity={loading ? 0.4 : 1}
            />
          )}

          {/* Vertical cursor indicator line when hovering */}
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              x2={hoveredPoint.x}
              y1={PADDING.top}
              y2={chart.baselineY}
              stroke={currentTheme.main}
              strokeWidth="1.5"
              strokeDasharray="3 3"
              className="opacity-75 transition-all duration-75"
            />
          )}

          {/* Data Points and X labels */}
          {chart.points.map((point) => {
            const isHovered = hoveredPoint?.key === point.key;
            const hasValue = point.minutes > 0;

            return (
              <g key={point.key}>
                {/* Dot on line */}
                {(hasValue || isHovered) && (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={isHovered ? 7 : 4.5}
                    fill={currentTheme.main}
                    stroke="#ffffff"
                    strokeWidth={isHovered ? 3 : 2}
                    className="transition-all duration-150 shadow-md"
                  />
                )}

                {/* Date Label */}
                <text
                  x={point.x}
                  y={CHART_HEIGHT - 12}
                  textAnchor="middle"
                  className={`text-xs select-none transition-colors ${
                    isHovered
                      ? 'fill-indigo-600 dark:fill-cyan-400 font-black'
                      : 'fill-slate-600 dark:fill-slate-400 font-bold'
                  }`}
                >
                  {point.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Interactive Floating Hover Tooltip */}
        {hoveredPoint && (
          <div
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-2xl glass-panel px-3.5 py-2 shadow-2xl border border-white/60 dark:border-white/10 transition-all duration-100 ease-out"
            style={{
              left: `${(hoveredPoint.x / chartWidth) * 100}%`,
              top: `${Math.max(12, (hoveredPoint.y / CHART_HEIGHT) * 100 - 4)}%`,
            }}
          >
            <p className="font-black text-slate-950 dark:text-white text-xs whitespace-nowrap">
              {hoveredPoint.label}
            </p>
            <p className="font-extrabold text-sm whitespace-nowrap mt-0.5" style={{ color: currentTheme.main }}>
              {formatPracticeDuration(hoveredPoint.seconds, locale)}
            </p>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
              {getPracticeSkillLabel(activeSkill, locale)}
            </p>
          </div>
        )}

        {/* Empty state overlay */}
        {!loading && !chart.hasActivity && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-white/20 dark:bg-black/20 backdrop-blur-xs rounded-2xl">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl glass-panel text-slate-400 dark:text-slate-500 mb-2.5 shadow-2xs">
              <Sparkles size={20} />
            </div>
            <p className="text-sm font-black text-slate-800 dark:text-slate-200">
              {text.noActivity}
            </p>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5 max-w-sm">
              {text.noActivityHint}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
