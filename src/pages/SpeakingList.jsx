import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Sparkles,
  Search,
  X,
  Mic,
  ArrowRight,
  Target,
  Users,
  Compass,
  Filter,
  Layers,
  Clock,
  CheckCircle2,
  Play,
  Flame,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useLocale } from '../contexts/LocaleContext';
import { useInfiniteScroll } from '../lib/useInfiniteScroll';
import SkillSwitchTabs from '../components/navigation/SkillSwitchTabs';

const CEFR_LEVELS = ['All', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const PAGE_SIZE = 24;

const LEVEL_CONFIG = {
  All: { label: 'Tất cả', badge: 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300' },
  A1: { label: 'A1 Căn bản', badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  A2: { label: 'A2 Sơ cấp', badge: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30' },
  B1: { label: 'B1 Trung cấp', badge: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30' },
  B2: { label: 'B2 Trung cao', badge: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30' },
  C1: { label: 'C1 Cao cấp', badge: 'bg-indigo-500/15 text-indigo-700 dark:text-cyan-300 border-indigo-500/30' },
  C2: { label: 'C2 Thành thạo', badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
};

const speakingScenarioCache = new Map();
const speakingScenarioInflight = new Map();

const getSpeakingScenariosPage = async (level, page) => {
  const cacheKey = `${level}:${page}`;
  const cached = speakingScenarioCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  if (speakingScenarioInflight.has(cacheKey)) return speakingScenarioInflight.get(cacheKey);

  let query = supabase
    .from('speaking_scenarios')
    .select('id, level, title, description, image_url, partner_name, partner_role, partner_initial, suggestions')
    .order('id', { ascending: true })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  if (level !== 'All') query = query.ilike('level', level);

  const request = query
    .then(({ data, error }) => {
      if (error) throw error;
      const rows = (data || []).map((item) => ({
        id: item.id,
        level: item.level || 'A1',
        title: item.title,
        description: item.description,
        image: item.image_url,
        partner_name: item.partner_name || 'AI Assistant',
        partner_role: item.partner_role || 'Partner',
        partner_initial: item.partner_initial || (item.partner_name ? item.partner_name[0] : 'A'),
        suggestions: item.suggestions || [],
      }));
      speakingScenarioCache.set(cacheKey, { data: rows, expiresAt: Date.now() + 60_000 });
      return rows;
    })
    .finally(() => speakingScenarioInflight.delete(cacheKey));

  speakingScenarioInflight.set(cacheKey, request);
  return request;
};

const COPY = {
  vi: {
    heroBadge: 'AI CONVERSATION STUDIO',
    title: 'Luyện Nói Phản Xạ Cùng AI',
    desc: 'Thực hành giao tiếp 1-1 không giới hạn với đối tác AI theo các tình huống thực tiễn, rèn luyện ngữ điệu và phát âm chuẩn tự nhiên.',
    allScenarios: 'Tất cả tình huống thực tế',
    loading: 'Đang tải danh sách tình huống...',
    all: 'Tất cả',
    featuredTitle: 'Tình huống gợi ý hôm nay',
    startPractice: 'Bắt đầu luyện nói',
    searchPlaceholder: 'Tìm tình huống, chủ đề (phỏng vấn, khách sạn, nhà hàng...)...',
    totalScenarios: 'Tổng tình huống',
    practiceTime: 'Thời lượng',
    levelsCovered: 'Cấp độ CEFR',
    noScenariosFound: 'Không tìm thấy tình huống nào phù hợp.',
    clearFilters: 'Xóa bộ lọc',
    enterSession: 'Vào luyện nói',
    speakingPartner: 'Đối tác',
  },
  en: {
    heroBadge: 'AI CONVERSATION STUDIO',
    title: 'AI Speaking & Reflex Studio',
    desc: 'Practice 1-on-1 immersive conversations with native AI personas in realistic scenarios to sharpen intonation, vocabulary, and confidence.',
    allScenarios: 'All Real-life Scenarios',
    loading: 'Loading scenarios...',
    all: 'All',
    featuredTitle: 'Featured Daily Scenario',
    startPractice: 'Start Speaking',
    searchPlaceholder: 'Search scenarios, topics (interview, hotel, coffee...)...',
    totalScenarios: 'Total Scenarios',
    practiceTime: 'Estimated Time',
    levelsCovered: 'CEFR Levels',
    noScenariosFound: 'No scenarios found matching your criteria.',
    clearFilters: 'Reset filters',
    enterSession: 'Start Session',
    speakingPartner: 'Partner',
  },
};

export default function SpeakingList() {
  const { locale } = useLocale();
  const text = COPY[locale] || COPY.vi;
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [scenarios, setScenarios] = useState([]);
  const [allLevelCounts, setAllLevelCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);

  // Fetch count metadata across levels once
  useEffect(() => {
    supabase
      .from('speaking_scenarios')
      .select('id, level')
      .then(({ data }) => {
        if (data) {
          const counts = { All: data.length };
          data.forEach((item) => {
            const lvl = (item.level || '').toUpperCase();
            counts[lvl] = (counts[lvl] || 0) + 1;
          });
          setAllLevelCounts(counts);
        }
      })
      .catch(() => {});
  }, []);

  const fetchScenarios = useCallback(
    async (reset = false) => {
      try {
        if (reset) {
          setLoading(true);
          pageRef.current = 0;
        } else {
          setLoadingMore(true);
        }
        const nextPage = reset ? 0 : pageRef.current + 1;
        const rows = await getSpeakingScenariosPage(activeTab, nextPage);
        setScenarios((current) => (reset ? rows : [...current, ...rows]));
        pageRef.current = nextPage;
        setHasMore(rows.length === PAGE_SIZE);
      } catch (error) {
        console.error('Error fetching scenarios:', error);
      } finally {
        if (reset) setLoading(false);
        else setLoadingMore(false);
      }
    },
    [activeTab]
  );

  useEffect(() => {
    fetchScenarios(true);
  }, [fetchScenarios]);

  const loadMore = useCallback(() => fetchScenarios(false), [fetchScenarios]);
  const sentinelRef = useInfiniteScroll(loadMore, hasMore, loadingMore);

  // Filter scenarios client-side for search
  const filteredScenarios = useMemo(() => {
    if (!searchQuery.trim()) return scenarios;
    const q = searchQuery.toLowerCase().trim();
    return scenarios.filter((scenario) => {
      const titleMatch = (scenario.title || '').toLowerCase().includes(q);
      const descMatch = (scenario.description || '').toLowerCase().includes(q);
      const partnerMatch = (scenario.partner_name || '').toLowerCase().includes(q) ||
                           (scenario.partner_role || '').toLowerCase().includes(q);
      return titleMatch || descMatch || partnerMatch;
    });
  }, [scenarios, searchQuery]);

  // Featured scenario of the day
  const featuredScenario = useMemo(() => {
    if (scenarios.length === 0) return null;
    // Pick first B1 or A2 if available, or just scenarios[0]
    return scenarios.find((s) => s.level === 'B1' || s.level === 'A2') || scenarios[0];
  }, [scenarios]);

  return (
    <div className="flex-1 bg-transparent text-slate-800 dark:text-white overflow-y-auto min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-7 space-y-5 sm:space-y-7 pb-20">
        {/* Top Quick Skill Tabs */}
        <SkillSwitchTabs />
        
        {/* 1. HERO GLASS BANNER & DAILY SPOTLIGHT */}
        <div className="relative rounded-3xl p-6 sm:p-8 lg:p-10 backdrop-blur-2xl bg-white/30 dark:bg-slate-900/40 border border-white/35 dark:border-white/10 shadow-2xl shadow-indigo-500/5 overflow-hidden">
          {/* Ambient Glow Orbs */}
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-500/15 via-blue-500/10 to-cyan-400/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-gradient-to-tr from-blue-500/15 via-indigo-500/10 to-transparent blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Header Description & Metrics */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/15 to-blue-500/15 border border-indigo-500/30 text-indigo-700 dark:text-cyan-300 text-xs font-black tracking-wider uppercase backdrop-blur-md">
                <Sparkles size={14} className="text-indigo-600 dark:text-cyan-400 animate-pulse" />
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
                    {allLevelCounts.All || scenarios.length} {text.totalScenarios}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-white/40 dark:border-white/10 shadow-xs">
                  <Layers size={16} className="text-indigo-500" />
                  <span className="text-xs font-black text-slate-800 dark:text-white">
                    6 Cấp độ (A1 → C2)
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-white/40 dark:border-white/10 shadow-xs">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span className="text-xs font-black text-slate-800 dark:text-white">
                    AI Đánh giá phản xạ
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Featured Daily Scenario Card */}
            {featuredScenario && (
              <div className="lg:col-span-5">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  onClick={() => navigate(`/speaking/${featuredScenario.id}`)}
                  className="relative rounded-3xl p-5 bg-gradient-to-br from-white/60 via-white/40 to-white/20 dark:from-slate-800/70 dark:via-slate-800/50 dark:to-slate-900/60 border border-indigo-500/30 dark:border-indigo-500/20 shadow-xl shadow-indigo-500/10 cursor-pointer group overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-cyan-300">
                      <Sparkles size={13} className="text-indigo-500 dark:text-cyan-400" />
                      <span>{text.featuredTitle}</span>
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black border ${LEVEL_CONFIG[featuredScenario.level]?.badge || 'bg-slate-200 text-slate-700'}`}>
                      {featuredScenario.level}
                    </span>
                  </div>

                  <div className="flex gap-4 items-center mb-3">
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden shrink-0 border border-white/40 shadow-md">
                      <img
                        src={featuredScenario.image}
                        alt={featuredScenario.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-cyan-400 transition-colors">
                        {featuredScenario.title}
                      </h2>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                        <span className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center font-bold text-[10px]">
                          {featuredScenario.partner_initial}
                        </span>
                        <span className="truncate">
                          {featuredScenario.partner_name} • {featuredScenario.partner_role}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
                    {featuredScenario.description}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-white/20 dark:border-white/10">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock size={13} /> ~5-10 phút
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white text-xs font-extrabold shadow-md shadow-indigo-500/25 group-hover:shadow-lg transition-all">
                      <span>{text.startPractice}</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </div>

        {/* 2. FLOATING ROUNDED FILTER & SEARCH DOCK */}
        <div className="sticky top-3 z-30 py-1">
          <div className="p-3 sm:p-3.5 rounded-2xl sm:rounded-3xl bg-white/30 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/35 dark:border-white/10 shadow-lg shadow-black/5 flex flex-col md:flex-row items-center justify-between gap-3">
            
            {/* CEFR Level Tabs with Badge Counts */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl sm:rounded-2xl bg-white/20 dark:bg-slate-800/25 border border-white/25 dark:border-white/5 shadow-inner overflow-x-auto w-full md:w-auto hide-scrollbar">
              {CEFR_LEVELS.map((lvl) => {
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
                    <span>{lvl === 'All' ? text.all : lvl}</span>
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

            {/* Instant Search Bar */}
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

        {/* 3. SCENARIOS GRID */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl backdrop-blur-xl bg-white/60 dark:bg-slate-900/65 border border-white/50 dark:border-white/10 shadow-sm shadow-black/5">
              <span className="p-1.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white shadow-xs">
                <MessageSquare size={16} />
              </span>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>{text.allScenarios}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-extrabold bg-indigo-500/15 text-indigo-700 dark:text-cyan-300 border border-indigo-500/25">
                  {filteredScenarios.length}
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
                  className="rounded-3xl p-4 bg-white/20 dark:bg-slate-800/20 border border-white/20 dark:border-white/5 space-y-4 animate-pulse"
                >
                  <div className="h-48 rounded-2xl bg-slate-300/40 dark:bg-slate-700/40" />
                  <div className="h-4 w-3/4 rounded-lg bg-slate-300/40 dark:bg-slate-700/40" />
                  <div className="h-3 w-full rounded-lg bg-slate-300/30 dark:bg-slate-700/30" />
                </div>
              ))}
            </div>
          ) : filteredScenarios.length === 0 ? (
            /* Empty State */
            <div className="rounded-3xl p-12 text-center backdrop-blur-2xl bg-white/20 dark:bg-slate-900/30 border border-white/25 dark:border-white/10 space-y-3">
              <Compass size={40} className="mx-auto text-slate-400" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                {text.noScenariosFound}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
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
              {filteredScenarios.map((scenario) => {
                const levelCfg = LEVEL_CONFIG[scenario.level] || LEVEL_CONFIG.A1;

                return (
                  <motion.div
                    key={scenario.id}
                    whileHover={{ y: -6 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => navigate(`/speaking/${scenario.id}`)}
                    className="defer-render rounded-3xl backdrop-blur-xl bg-white/35 dark:bg-slate-900/45 border border-white/40 dark:border-white/10 shadow-lg shadow-black/5 hover:shadow-2xl hover:border-indigo-500/40 transition-all cursor-pointer group flex flex-col overflow-hidden"
                  >
                    {/* Top Image Container */}
                    <div className="relative h-48 sm:h-52 overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img
                        src={scenario.image}
                        alt={scenario.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                      />
                      {/* Gradient overlay for contrast */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                      {/* Top Left: CEFR Level Badge */}
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-xl text-xs font-black backdrop-blur-md border shadow-sm shadow-black/20 bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-white border-white/40">
                        {scenario.level}
                      </div>

                      {/* Bottom-on-image: Partner Persona Strip */}
                      <div className="absolute bottom-2.5 left-3 right-3 flex items-center gap-2 p-1.5 px-2.5 rounded-xl bg-black/55 backdrop-blur-md border border-white/15 text-white">
                        <span className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center font-black text-[10px] shrink-0 text-white shadow-xs">
                          {scenario.partner_initial}
                        </span>
                        <div className="min-w-0 flex-1 text-left">
                          <p className="text-xs font-black truncate leading-tight">
                            {scenario.partner_name}
                          </p>
                          <p className="text-[10px] text-white/75 truncate leading-tight">
                            {scenario.partner_role}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3">
                      <div>
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1.5 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-cyan-400 transition-colors">
                          {scenario.title}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm line-clamp-2 leading-relaxed">
                          {scenario.description}
                        </p>
                      </div>

                      {/* Footer CTA */}
                      <div className="pt-3 border-t border-white/20 dark:border-white/10 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Clock size={12} /> ~5-10m
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-600 dark:text-cyan-400 group-hover:translate-x-0.5 transition-transform">
                          <span>{text.enterSession}</span>
                          <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                        </span>
                      </div>
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
