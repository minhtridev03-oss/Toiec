import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  CheckCircle2,
  Loader2,
  Play,
  Rocket,
  Shuffle,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { isSoundEnabled, setSoundEnabled } from '../features/games/gameAudio';
import SpeedReflexGame from '../features/games/speedReflex/SpeedReflexGame';
import WordRocketGame from '../features/games/wordRocket/WordRocketGame';
import { fetchUnifiedGameData } from '../features/games/wordRocket/gameWords';
import WordScrambleGame from '../features/games/wordScramble/WordScrambleGame';

const STARTER_TOEIC_WORDS = [
  { id: 'st-1', word: 'contract', meaning: 'hợp đồng, giao kèo', pronunciation: '/ˈkɑːntrækt/', source: 'starter' },
  { id: 'st-2', word: 'negotiate', meaning: 'đàm phán, thương lượng', pronunciation: '/nɪˈɡoʊʃieɪt/', source: 'starter' },
  { id: 'st-3', word: 'schedule', meaning: 'lịch trình, thời khóa biểu', pronunciation: '/ˈskedʒuːl/', source: 'starter' },
  { id: 'st-4', word: 'candidate', meaning: 'ứng viên, người ứng cử', pronunciation: '/ˈkændɪdət/', source: 'starter' },
  { id: 'st-5', word: 'revenue', meaning: 'doanh thu, lợi tức', pronunciation: '/ˈrevənuː/', source: 'starter' },
  { id: 'st-6', word: 'strategy', meaning: 'chiến lược, kế hoạch', pronunciation: '/ˈstrætədʒi/', source: 'starter' },
  { id: 'st-7', word: 'inventory', meaning: 'hàng tồn kho, sự kiểm kê', pronunciation: '/ˈɪnvəntɔːri/', source: 'starter' },
  { id: 'st-8', word: 'department', meaning: 'phòng ban, bộ phận', pronunciation: '/dɪˈpɑːrtmənt/', source: 'starter' },
  { id: 'st-9', word: 'deadline', meaning: 'hạn chót, thời hạn cuối', pronunciation: '/ˈdedlaɪn/', source: 'starter' },
  { id: 'st-10', word: 'budget', meaning: 'ngân sách, ngân quỹ', pronunciation: '/ˈbʌdʒɪt/', source: 'starter' },
  { id: 'st-11', word: 'feedback', meaning: 'phản hồi, ý kiến đánh giá', pronunciation: '/ˈfiːdbæk/', source: 'starter' },
  { id: 'st-12', word: 'colleague', meaning: 'đồng nghiệp', pronunciation: '/ˈkɑːliːɡ/', source: 'starter' },
  { id: 'st-13', word: 'presentation', meaning: 'bài thuyết trình, trình bày', pronunciation: '/ˌpreznˈteɪʃn/', source: 'starter' },
  { id: 'st-14', word: 'client', meaning: 'khách hàng, thân chủ', pronunciation: '/ˈklaɪənt/', source: 'starter' },
  { id: 'st-15', word: 'promotion', meaning: 'sự thăng chức, khuyến mãi', pronunciation: '/prəˈmoʊʃn/', source: 'starter' },
  { id: 'st-16', word: 'policy', meaning: 'chính sách, quy định', pronunciation: '/ˈpɑːləsi/', source: 'starter' },
  { id: 'st-17', word: 'investment', meaning: 'sự đầu tư, vốn đầu tư', pronunciation: '/ɪnˈvestmənt/', source: 'starter' },
  { id: 'st-18', word: 'guarantee', meaning: 'bảo đảm, cam đoan', pronunciation: '/ˌɡærənˈtiː/', source: 'starter' },
  { id: 'st-19', word: 'solution', meaning: 'giải pháp, cách giải quyết', pronunciation: '/səˈluːʃn/', source: 'starter' },
  { id: 'st-20', word: 'reputation', meaning: 'danh tiếng, uy tín', pronunciation: '/ˌrepjuˈteɪʃn/', source: 'starter' },
];

export default function Games() {
  const { user } = useAuth();
  const { locale } = useLocale();

  // Active game mode: null (Hub) | 'rocket' | 'speed_reflex' | 'scramble'
  const [activeGame, setActiveGame] = useState(null);
  const [selectedMode, setSelectedMode] = useState('rocket');
  const [selectedScope, setSelectedScope] = useState('all'); // 'all' | 'personal' | 'topic:<id>'
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());

  // Scroll to top immediately whenever entering or exiting a game so it is never covered by Topbar
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activeGame]);

  const handleLaunchGame = (mode) => {
    setActiveGame(mode);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  };

  const { data, error, isLoading, mutate } = useSWR(
    user?.id ? `unified-game-data:v2:${user.id}` : null,
    () => fetchUnifiedGameData(user?.id),
    { revalidateOnFocus: true, dedupingInterval: 60 * 1000 },
  );

  const allWords = data?.allWords || [];
  const personalWords = data?.personalWords || [];
  const topics = data?.topics || [];

  // Toggle global game sound
  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  // Local storage high scores
  const rocketBest = useMemo(() => {
    try {
      return Number(window.localStorage.getItem(`word-rocket-best:${user?.id || 'guest'}`)) || 0;
    } catch {
      return 0;
    }
  }, [user?.id, activeGame]);

  const speedBest = useMemo(() => {
    try {
      return Number(window.localStorage.getItem(`speed-reflex-best:${user?.id || 'guest'}`)) || 0;
    } catch {
      return 0;
    }
  }, [user?.id, activeGame]);

  // Words filtered by chosen scope
  const activeWordPool = useMemo(() => {
    let pool = allWords;

    if (selectedScope === 'personal') {
      pool = personalWords.length > 0 ? personalWords : allWords;
    } else if (selectedScope.startsWith('topic:')) {
      const topicSubId = selectedScope.replace('topic:', '');
      const filtered = allWords.filter((w) => String(w.sub_category_id) === topicSubId);
      pool = filtered.length >= 4 ? filtered : allWords;
    }

    // Fallback if pool is too small (< 4 words)
    if (pool.length < 4) {
      return STARTER_TOEIC_WORDS;
    }
    return pool;
  }, [allWords, personalWords, selectedScope]);

  return (
    <div className={`min-h-full px-3 sm:px-6 lg:px-8 ${activeGame ? 'py-2 sm:py-3' : 'py-4 sm:py-6'}`}>
      <div className="mx-auto w-full max-w-7xl">
        {/* Loading state */}
        {isLoading && activeGame === null && (
          <div className="flex min-h-[480px] items-center justify-center rounded-[2.5rem] border border-white/60 bg-white/70 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/70">
            <div className="text-center">
              <Loader2 className="mx-auto mb-3 animate-spin text-blue-500" size={36} />
              <p className="text-base font-bold text-slate-700 dark:text-slate-200">
                Đang chuẩn bị đấu trường từ vựng...
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && activeGame === null && (
          <div className="rounded-[2.5rem] border border-rose-200 bg-white/80 p-8 text-center shadow-xl backdrop-blur-2xl dark:border-rose-900/50 dark:bg-slate-900/80">
            <p className="font-bold text-rose-600 dark:text-rose-300">
              Không thể tải dữ liệu từ vựng cho trò chơi lúc này.
            </p>
            <button
              type="button"
              onClick={() => mutate()}
              className="mt-4 rounded-xl bg-rose-500 px-6 py-2.5 font-bold text-white shadow-lg transition hover:bg-rose-600"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* ========================================================
            ARCADE HUB: GAME SELECTION & LAUNCHER (When activeGame === null)
        ======================================================== */}
        {!isLoading && !error && activeGame === null && (
          <div className="space-y-6">
            {/* Liquid Glass Hero Card */}
            <div className="relative overflow-hidden rounded-[2.5rem] border border-white/60 bg-white/75 p-6 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/75 sm:p-8">
              <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    <Sparkles size={13} /> ARCADE ARENA · HỌC MÀ CHƠI
                  </div>
                  <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                    Đấu Trường Từ Vựng TOEIC
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">
                    Biến việc học từ vựng thành những cuộc đua phản xạ đầy phấn khích. Gõ nhanh, chọn chuẩn
                    và ghi nhớ sâu từng từ vựng TOEIC với 3 chế độ thử thách thông minh.
                  </p>
                </div>

                {/* Player Stats Dock */}
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                  <div className="flex items-center gap-2.5 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-800/80">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/20 text-amber-500">
                      <Trophy size={20} />
                    </div>
                    <div>
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Phi thuyền
                      </span>
                      <span className="text-sm font-black text-slate-800 dark:text-slate-100 sm:text-base">
                        {rocketBest} pts
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-800/80">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-400/20 text-rose-500">
                      <Zap size={20} />
                    </div>
                    <div>
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Phản xạ 60s
                      </span>
                      <span className="text-sm font-black text-slate-800 dark:text-slate-100 sm:text-base">
                        {speedBest} pts
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-800/80">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/20 text-cyan-500">
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Kho từ sẵn sàng
                      </span>
                      <span className="text-sm font-black text-slate-800 dark:text-slate-100 sm:text-base">
                        {allWords.length > 0 ? `${allWords.length} từ` : '20 từ khởi động'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleSound}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/60 bg-white/70 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white hover:text-blue-600 dark:border-white/10 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-700"
                    title={soundOn ? 'Đang bật âm thanh' : 'Đang tắt âm thanh'}
                  >
                    {soundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
                  </button>
                </div>
              </div>

              {/* Decorative radial glows */}
              <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
              <div className="pointer-events-none absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
            </div>

            {/* 3 Game Mode Bento Selection Cards */}
            <div>
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
                  Chọn chế độ chơi
                </h2>
                <span className="text-xs font-bold text-slate-500">
                  3 mini-game rèn luyện các giác quan khác nhau
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Mode 1: Phi thuyền phòng thủ */}
                <div
                  onClick={() => setSelectedMode('rocket')}
                  className={`group relative cursor-pointer overflow-hidden rounded-[2rem] border p-6 transition-all duration-300 ${
                    selectedMode === 'rocket'
                      ? 'border-cyan-400 bg-gradient-to-br from-cyan-500/15 via-blue-600/15 to-indigo-900/30 shadow-2xl shadow-cyan-500/20 ring-2 ring-cyan-400/40 backdrop-blur-2xl'
                      : 'border-white/60 bg-white/70 hover:border-cyan-300/60 hover:bg-white/90 dark:border-white/10 dark:bg-slate-900/70 dark:hover:bg-slate-800/80 shadow-lg backdrop-blur-xl'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/30">
                      <Rocket size={28} className="-rotate-45 text-white" />
                    </div>
                    {selectedMode === 'rocket' && (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-400 text-slate-950 shadow">
                        <CheckCircle2 size={18} strokeWidth={2.5} />
                      </span>
                    )}
                  </div>

                  <span className="mt-4 inline-block text-[11px] font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                    Hành động & Gõ phím
                  </span>
                  <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                    Phi thuyền phòng thủ
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    Mục tiêu từ vựng đang rơi xuống vạch phòng thủ. Đọc nghĩa tiếng Việt và gõ chính xác
                    từ tiếng Anh để khai hỏa tia laser tiêu diệt!
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-lg bg-cyan-500/10 px-2.5 py-1 text-[11px] font-bold text-cyan-700 dark:text-cyan-300">
                      Nhớ mặt chữ
                    </span>
                    <span className="rounded-lg bg-blue-500/10 px-2.5 py-1 text-[11px] font-bold text-blue-700 dark:text-blue-300">
                      Luyện gõ nhanh
                    </span>
                    <span className="rounded-lg bg-slate-500/10 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      3 Tim sinh mệnh
                    </span>
                  </div>
                </div>

                {/* Mode 2: Phản xạ 60 giây */}
                <div
                  onClick={() => setSelectedMode('speed_reflex')}
                  className={`group relative cursor-pointer overflow-hidden rounded-[2rem] border p-6 transition-all duration-300 ${
                    selectedMode === 'speed_reflex'
                      ? 'border-amber-400 bg-gradient-to-br from-amber-500/15 via-orange-600/15 to-rose-900/30 shadow-2xl shadow-amber-500/20 ring-2 ring-amber-400/40 backdrop-blur-2xl'
                      : 'border-white/60 bg-white/70 hover:border-amber-300/60 hover:bg-white/90 dark:border-white/10 dark:bg-slate-900/70 dark:hover:bg-slate-800/80 shadow-lg backdrop-blur-xl'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 shadow-lg shadow-amber-500/30">
                      <Zap size={28} className="text-white" />
                    </div>
                    {selectedMode === 'speed_reflex' && (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-slate-950 shadow">
                        <CheckCircle2 size={18} strokeWidth={2.5} />
                      </span>
                    )}
                  </div>

                  <span className="mt-4 inline-block text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Thời gian thực · 4 Lựa chọn
                  </span>
                  <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                    Phản xạ 60 giây
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    60 giây sinh tử! Đọc nghĩa và bấm nhanh 1 trong 4 từ. Chuỗi đúng liên tiếp kích hoạt
                    Frenzy Mode x3 điểm cực kỳ gây nghiện!
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                      Phản xạ 60s
                    </span>
                    <span className="rounded-lg bg-rose-500/10 px-2.5 py-1 text-[11px] font-bold text-rose-700 dark:text-rose-300">
                      Frenzy Combo
                    </span>
                    <span className="rounded-lg bg-slate-500/10 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Phím 1-2-3-4
                    </span>
                  </div>
                </div>

                {/* Mode 3: Đảo chữ thiên tài */}
                <div
                  onClick={() => setSelectedMode('scramble')}
                  className={`group relative cursor-pointer overflow-hidden rounded-[2rem] border p-6 transition-all duration-300 ${
                    selectedMode === 'scramble'
                      ? 'border-emerald-400 bg-gradient-to-br from-emerald-500/15 via-teal-600/15 to-emerald-950/30 shadow-2xl shadow-emerald-500/20 ring-2 ring-emerald-400/40 backdrop-blur-2xl'
                      : 'border-white/60 bg-white/70 hover:border-emerald-300/60 hover:bg-white/90 dark:border-white/10 dark:bg-slate-900/70 dark:hover:bg-slate-800/80 shadow-lg backdrop-blur-xl'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/30">
                      <Shuffle size={28} className="text-white" />
                    </div>
                    {selectedMode === 'scramble' && (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400 text-slate-950 shadow">
                        <CheckCircle2 size={18} strokeWidth={2.5} />
                      </span>
                    )}
                  </div>

                  <span className="mt-4 inline-block text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Tư duy & Chính tả
                  </span>
                  <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-white">
                    Đảo chữ thiên tài
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    Các chữ cái bị xáo trộn lung tung thành các viên ngọc ký tự. Nhấp hoặc gõ từng chữ
                    để ghép lại từ vựng chuẩn xác 100%.
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                      Rèn chính tả
                    </span>
                    <span className="rounded-lg bg-teal-500/10 px-2.5 py-1 text-[11px] font-bold text-teal-700 dark:text-teal-300">
                      Tập trung cao
                    </span>
                    <span className="rounded-lg bg-slate-500/10 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Gợi ý ký tự
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scope & Launch Dock */}
            <div className="rounded-[2.5rem] border border-white/60 bg-white/75 p-6 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/75 sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                  <span className="block text-xs font-black uppercase tracking-wider text-slate-400">
                    Chọn phạm vi ôn luyện từ vựng
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedScope('all')}
                      className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold transition sm:text-sm ${
                        selectedScope === 'all'
                          ? 'border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                          : 'border-white/60 bg-white/60 text-slate-700 hover:bg-white dark:border-white/10 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <BookOpen size={16} />
                      <span>Tất cả từ đã học</span>
                      <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                        {allWords.length}
                      </span>
                    </button>

                    {personalWords.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedScope('personal')}
                        className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold transition sm:text-sm ${
                          selectedScope === 'personal'
                            ? 'border-fuchsia-500 bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/25'
                            : 'border-white/60 bg-white/60 text-slate-700 hover:bg-white dark:border-white/10 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        <Bookmark size={16} />
                        <span>Sổ tay cá nhân</span>
                        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                          {personalWords.length}
                        </span>
                      </button>
                    )}

                    {/* Topic dropdown/selector if available */}
                    {topics.length > 0 && (
                      <select
                        value={selectedScope.startsWith('topic:') ? selectedScope : ''}
                        onChange={(e) => {
                          if (e.target.value) setSelectedScope(e.target.value);
                        }}
                        className="rounded-2xl border border-white/60 bg-white/60 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm backdrop-blur outline-none transition focus:border-blue-500 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 sm:text-sm"
                      >
                        <option value="">-- Theo chủ đề cụ thể ({topics.length}) --</option>
                        {topics.map((t) =>
                          t.subCategories?.map((sub) => (
                            <option key={sub.id} value={`topic:${sub.id}`}>
                              {t.name} · {sub.name}
                            </option>
                          )),
                        )}
                      </select>
                    )}
                  </div>
                </div>

                {/* Big Action Launch Button */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleLaunchGame(selectedMode)}
                    className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-fuchsia-600 px-8 py-4 text-base font-black text-white shadow-xl shadow-indigo-500/30 transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-98 sm:w-auto"
                  >
                    <Play size={20} className="fill-white" />
                    <span>VÀO ĐẤU TRƯỜNG NGAY</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            ACTIVE GAME SCREENS (Clean integration with self-contained header)
        ======================================================== */}
        {activeGame === 'rocket' && (
          <div className="w-full">
            <WordRocketGame
              words={activeWordPool}
              user={user}
              locale={locale}
              onPhaseChange={() => {}}
              onExit={() => setActiveGame(null)}
            />
          </div>
        )}

        {activeGame === 'speed_reflex' && (
          <div className="w-full">
            <SpeedReflexGame
              words={activeWordPool}
              user={user}
              onExit={() => setActiveGame(null)}
            />
          </div>
        )}

        {activeGame === 'scramble' && (
          <div className="w-full">
            <WordScrambleGame
              words={activeWordPool}
              user={user}
              onExit={() => setActiveGame(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
