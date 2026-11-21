import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import {
  AlertCircle,
  X,
  Sparkles,
  Check,
  ArrowRight,
  Search,
  FolderOpen,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { supabase } from '../lib/supabaseClient';
import bookGif from '../assets/book.gif';

const FALLBACK_IMAGES = {
  destination: '/assets/vocab-covers/destination-archive.jpg',
  oxford: '/assets/vocab-covers/oxford-archive.jpg',
  vocab3000: '/assets/vocab-covers/vocab-3000-archive.jpg',
};

// Tạo public URL từ Supabase Storage bucket topic-images
const getStorageImageUrl = (categoryId) => {
  if (!categoryId) return null;
  const { data } = supabase.storage
    .from('topic-images')
    .getPublicUrl(`${categoryId}.jpg`);
  return data?.publicUrl || null;
};

const normalizeName = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .toLowerCase();

const resolvePublicImage = (value, fallback) => {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  const normalized = raw.replace(/\\/g, '/');
  if (normalized.startsWith('/')) return normalized;
  const publicIndex = normalized.toLowerCase().lastIndexOf('/public/');
  if (publicIndex >= 0) return normalized.slice(publicIndex + '/public'.length);
  const assetsIndex = normalized.toLowerCase().lastIndexOf('/assets/');
  if (assetsIndex >= 0) return normalized.slice(assetsIndex);
  return fallback;
};

const getCategoryMeta = (categoryName, locale) => {
  const normalized = normalizeName(categoryName);
  const descriptions =
    locale === 'vi'
      ? {
          destinationC: 'Từ vựng Destination C1 & C2, được sắp xếp theo từng bài học.',
          destinationB2: 'Từ vựng và cụm động từ Destination B2, được sắp xếp theo chủ đề.',
          destinationB1: 'Từ vựng và cụm động từ Destination B1, được sắp xếp theo chủ đề.',
          oxford: 'Danh sách Oxford 5000 dành cho người học tiếng Anh nâng cao.',
          vocab3000: 'Từ vựng tiếng Anh thông dụng được phân theo chủ đề hằng ngày.',
          toeic: '600 từ vựng thiết yếu cho bài thi TOEIC, được sắp xếp theo chủ đề công việc.',
          ielts: 'Từ vựng học thuật cho luyện thi IELTS Cambridge.',
          fallback: 'Kho từ vựng được sắp xếp theo chủ đề.',
        }
      : {
          destinationC: 'Vocabulary from Destination C1 & C2 (Advanced-Proficiency), organized by book unit.',
          destinationB2: 'Vocabulary and phrasal verbs from Destination B2, organized by topic.',
          destinationB1: 'Vocabulary and phrasal verbs from Destination B1, organized by topic.',
          oxford: 'The Oxford 5000 is an expanded core word list for advanced learners of English.',
          vocab3000: 'Common English vocabulary grouped by everyday topics.',
          toeic: '600 essential vocabulary words for TOEIC test preparation, organized by business topic.',
          ielts: 'Academic vocabulary for IELTS Cambridge practice.',
          fallback: 'Vocabulary archive organized by topic.',
        };

  if (/destination.*c1|c1.*c2/.test(normalized)) {
    return {
      fallbackImage: FALLBACK_IMAGES.destination,
      description: descriptions.destinationC,
    };
  }
  if (/destination.*b2/.test(normalized)) {
    return {
      fallbackImage: FALLBACK_IMAGES.destination,
      description: descriptions.destinationB2,
    };
  }
  if (/destination.*b1/.test(normalized)) {
    return {
      fallbackImage: FALLBACK_IMAGES.destination,
      description: descriptions.destinationB1,
    };
  }
  if (/oxford/.test(normalized)) {
    return {
      fallbackImage: FALLBACK_IMAGES.oxford,
      description: descriptions.oxford,
    };
  }
  if (/3000|tu vung/.test(normalized)) {
    return {
      fallbackImage: FALLBACK_IMAGES.vocab3000,
      description: descriptions.vocab3000,
    };
  }
  if (/toeic|600/.test(normalized)) {
    return {
      fallbackImage: FALLBACK_IMAGES.oxford,
      description: descriptions.toeic,
    };
  }
  if (/ielts|cambridge/.test(normalized)) {
    return {
      fallbackImage: FALLBACK_IMAGES.destination,
      description: descriptions.ielts,
    };
  }
  return {
    fallbackImage: FALLBACK_IMAGES.vocab3000,
    description: descriptions.fallback,
  };
};

const getCategoryTag = (name = '') => {
  const n = normalizeName(name);
  if (/destination.*c1|c1.*c2/.test(n)) {
    return { label: 'C1 & C2 • Thành Thạo', className: 'bg-indigo-600/90 text-white border-indigo-400/40' };
  }
  if (/destination.*b2/.test(n)) {
    return { label: 'B2 • Trung Cao Cấp', className: 'bg-blue-600/90 text-white border-blue-400/40' };
  }
  if (/destination.*b1/.test(n)) {
    return { label: 'B1 • Trung Cấp', className: 'bg-sky-600/90 text-white border-sky-400/40' };
  }
  if (/oxford/.test(n)) {
    return { label: 'Oxford 5000 • Chuẩn', className: 'bg-violet-600/90 text-white border-violet-400/40' };
  }
  if (/3000|tu vung/.test(n)) {
    return { label: '3000 Core • Cơ Bản', className: 'bg-emerald-600/90 text-white border-emerald-400/40' };
  }
  if (/toeic|600/.test(n)) {
    return { label: 'TOEIC 600+ • Đi Làm', className: 'bg-amber-600/90 text-white border-amber-400/40' };
  }
  if (/ielts|cambridge/.test(n)) {
    return { label: 'IELTS • Học Thuật', className: 'bg-purple-600/90 text-white border-purple-400/40' };
  }
  return { label: 'Chủ Đề Tổng Hợp', className: 'bg-slate-700/90 text-white border-slate-500/40' };
};

const parseUnitName = (fullName = '') => {
  const match = fullName.match(/^(Unit\s+\d+|Topic\s+\d+|Bài\s+\d+|Lesson\s+\d+|Set\s+\d+)[:.-]?\s*(.*)$/i);
  if (match) {
    return {
      unitTag: match[1].trim(),
      title: match[2].trim() || fullName,
    };
  }
  return {
    unitTag: null,
    title: fullName,
  };
};

const FILTER_TABS = [
  { id: 'all', label: 'Tất cả chủ đề' },
  { id: 'toeic', label: 'TOEIC & Công việc' },
  { id: 'ielts', label: 'IELTS Cambridge' },
  { id: 'oxford', label: 'Oxford & 3000 từ' },
  { id: 'destination', label: 'Destination' },
];

export default function Categories() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { locale } = useLocale();

  const text =
    locale === 'vi'
      ? {
          errorTitle: 'Không thể tải dữ liệu',
          retry: 'Thử lại',
          title: 'Kho Chủ Đề Từ Vựng',
          subtitle: 'Lựa chọn lộ trình học tập mục tiêu từ cơ bản đến nâng cao để rèn luyện ghi nhớ mỗi ngày.',
          empty: 'Chưa có chủ đề nào.',
          viewSets: (name) => `Xem các bộ từ của ${name}`,
          sets: 'bộ từ',
          words: 'từ',
          learned: 'đã thuộc',
          setsLabel: 'Các bộ từ học tập',
          chooseSet: 'Chọn một bộ từ để bắt đầu luyện tập Flashcard hoặc làm bài thi trắc nghiệm.',
          close: 'Đóng',
          closeDialog: 'Đóng danh sách chủ đề nhỏ',
        }
      : {
          errorTitle: 'Unable to load data',
          retry: 'Try again',
          title: 'Vocabulary Categories',
          subtitle: 'Choose your learning path from essential to advanced vocabulary to build fluency every day.',
          empty: 'There are no topics yet.',
          viewSets: (name) => `View vocabulary sets in ${name}`,
          sets: 'sets',
          words: 'words',
          learned: 'learned',
          setsLabel: 'Vocabulary sets',
          chooseSet: 'Choose a set to start learning.',
          close: 'Close',
          closeDialog: 'Close vocabulary sets',
        };

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [modalSearch, setModalSearch] = useState('');
  const [modalFilter, setModalFilter] = useState('all');

  const fetchCategoriesData = async () => {
    const { data: catData, error: catError } = await supabase
      .from('categories')
      .select('id, name, img, created_at, sub_categories(id, name, created_at)')
      .order('created_at', { ascending: true });

    if (catError) throw catError;

    const formattedCategories = (catData || []).map((cat) => ({
      id: cat.id,
      name: cat.name,
      img: cat.img,
      description: cat.description || cat.desc || '',
      subCategories: [...(cat.sub_categories || [])].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      ),
    }));

    const statsMap = {};
    let personalVocabCount = 0;

    if (user?.id) {
      try {
        const { data: progressRows, error: progressError } = await supabase.rpc(
          'get_sub_category_progress',
          { p_user_id: user.id }
        );

        if (!progressError && Array.isArray(progressRows)) {
          progressRows.forEach((row) => {
            statsMap[row.sub_category_id] = {
              total: Number(row.total_count) || 0,
              learned: Number(row.learned_count) || 0,
            };
          });
        }

        const { count: pCount, error: pError } = await supabase
          .from('user_vocabulary')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        personalVocabCount = pError ? 0 : pCount || 0;
      } catch (err) {
        console.warn('Could not fetch user progress:', err);
      }
    }

    return {
      categories: formattedCategories,
      stats: statsMap,
      personalVocabCount,
    };
  };

  const { data, error: swrError, isLoading, mutate } = useSWR(
    `categories_${user?.id || 'guest'}`,
    fetchCategoriesData,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      keepPreviousData: true,
      dedupingInterval: 60000,
    }
  );

  const categories = data?.categories || [];
  const stats = data?.stats || {};
  const personalVocabCount = data?.personalVocabCount || 0;
  const loading = isLoading && !data;
  const error = swrError
    ? locale === 'vi'
      ? 'Không thể tải danh sách chủ đề. Vui lòng thử lại.'
      : 'Could not load the topic list. Please try again.'
    : null;

  useEffect(() => {
    if (!selectedGroup) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedGroup(null);
        setModalSearch('');
        setModalFilter('all');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedGroup]);

  const getGroupStats = (group) =>
    (group.subCategories || []).reduce(
      (total, sub) => {
        const subStats = stats[sub.id] || { total: 0, learned: 0 };
        return {
          total: total.total + subStats.total,
          learned: total.learned + subStats.learned,
        };
      },
      { total: 0, learned: 0 }
    );

  // Overall statistics calculation
  const { overallTotal, overallLearned, overallPercent } = useMemo(() => {
    let total = 0;
    let learned = 0;
    categories.forEach((cat) => {
      const s = getGroupStats(cat);
      total += s.total;
      learned += s.learned;
    });
    const percent = total > 0 ? Math.round((learned / total) * 100) : 0;
    return { overallTotal: total, overallLearned: learned, overallPercent: percent };
  }, [categories, stats]);

  // Modal specific statistics & filtered units
  const modalData = useMemo(() => {
    if (!selectedGroup) {
      return {
        imageSrc: null,
        fallbackSrc: null,
        groupStats: { total: 0, learned: 0 },
        progressPercent: 0,
        learningCount: 0,
        notStartedCount: 0,
        completedCount: 0,
        filteredUnits: [],
      };
    }

    const meta = getCategoryMeta(selectedGroup.name, locale);
    const storageUrl = getStorageImageUrl(selectedGroup.id);
    const imageSrc = storageUrl || resolvePublicImage(selectedGroup.img, meta.fallbackImage);
    const fallbackSrc = resolvePublicImage(selectedGroup.img, meta.fallbackImage);
    const groupStats = getGroupStats(selectedGroup);
    const progressPercent =
      groupStats.total > 0
        ? Math.round((groupStats.learned / groupStats.total) * 100)
        : 0;

    let learning = 0;
    let notStarted = 0;
    let completed = 0;

    (selectedGroup.subCategories || []).forEach((cat) => {
      const s = stats[cat.id] || { total: 0, learned: 0 };
      const p = s.total > 0 ? Math.round((s.learned / s.total) * 100) : 0;
      if (p === 100) completed++;
      else if (p > 0) learning++;
      else notStarted++;
    });

    const filteredUnits = (selectedGroup.subCategories || []).filter((cat) => {
      const s = stats[cat.id] || { total: 0, learned: 0 };
      const p = s.total > 0 ? Math.round((s.learned / s.total) * 100) : 0;

      if (modalSearch.trim()) {
        const q = normalizeName(modalSearch);
        if (!normalizeName(cat.name).includes(q)) return false;
      }

      if (modalFilter === 'learning') return p > 0 && p < 100;
      if (modalFilter === 'not_started') return p === 0;
      if (modalFilter === 'completed') return p === 100;
      return true;
    });

    return {
      imageSrc,
      fallbackSrc,
      groupStats,
      progressPercent,
      learningCount: learning,
      notStartedCount: notStarted,
      completedCount: completed,
      filteredUnits,
    };
  }, [selectedGroup, stats, modalSearch, modalFilter, locale]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const n = normalizeName(cat.name);
      if (searchFilter.trim()) {
        const query = normalizeName(searchFilter);
        if (!n.includes(query)) return false;
      }
      if (selectedTab === 'all') return true;
      if (selectedTab === 'toeic') return /toeic|600/.test(n);
      if (selectedTab === 'ielts') return /ielts|cambridge/.test(n);
      if (selectedTab === 'oxford') return /oxford|3000/.test(n);
      if (selectedTab === 'destination') return /destination/.test(n);
      return true;
    });
  }, [categories, selectedTab, searchFilter]);

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto space-y-6">
        <div className="h-44 w-full animate-pulse rounded-[2.5rem] bg-white/30 dark:bg-white/5 border border-white/40" />
        <div className="h-28 w-full animate-pulse rounded-[2.5rem] bg-white/30 dark:bg-white/5 border border-white/40" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="overflow-hidden rounded-[2.2rem] border border-white/40 bg-white/30 dark:bg-white/5 p-4 space-y-4"
            >
              <div className="aspect-[16/9] animate-pulse rounded-2xl bg-white/50 dark:bg-white/10" />
              <div className="space-y-2">
                <div className="h-6 w-2/3 animate-pulse rounded-lg bg-white/50 dark:bg-white/10" />
                <div className="h-4 w-full animate-pulse rounded-lg bg-white/40 dark:bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8 max-w-4xl w-full mx-auto">
        <div className="flex items-start gap-4 rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 backdrop-blur-xl">
          <AlertCircle className="mt-0.5 shrink-0 text-rose-500" size={24} />
          <div className="space-y-2">
            <h3 className="text-lg font-black text-rose-700 dark:text-rose-300">{text.errorTitle}</h3>
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{error}</p>
            <button
              type="button"
              onClick={() => mutate()}
              className="mt-2 cursor-pointer rounded-xl bg-rose-600 text-white px-5 py-2 text-xs font-black transition-all hover:bg-rose-500 shadow-md shadow-rose-500/25"
            >
              {text.retry}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 max-w-7xl w-full mx-auto space-y-5 sm:space-y-8 select-none transition-colors">
      {/* ============================================================ */}
      {/* 1. HERO HEADER BANNER: High Contrast, Translucent Glass */}
      {/* ============================================================ */}
      <section className="glass-panel rounded-[2rem] sm:rounded-[2.5rem] p-4.5 sm:p-8 border border-white/60 dark:border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-2xl space-y-5 sm:space-y-6">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-fuchsia-500/10 dark:bg-purple-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-indigo-500/10 dark:bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-500/15 text-indigo-700 dark:text-cyan-300 border border-indigo-500/25 dark:border-cyan-500/25 shadow-2xs">
              <Sparkles size={13} />
              <span>Kho Giáo Trình & Chủ Đề Bản Quyền</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-950 dark:text-white tracking-tight drop-shadow-sm">
              {text.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 font-semibold max-w-2xl leading-relaxed">
              {text.subtitle}
            </p>
          </div>

          {/* Quick Mastery Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 shrink-0">
            <div className="p-3 sm:p-3.5 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 text-center space-y-0.5">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Chủ đề
              </span>
              <p className="text-lg sm:text-2xl font-black text-slate-950 dark:text-white">
                {categories.length}
              </p>
            </div>

            <div className="p-3 sm:p-3.5 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 text-center space-y-0.5">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tổng từ
              </span>
              <p className="text-lg sm:text-2xl font-black text-indigo-600 dark:text-cyan-400">
                {overallTotal.toLocaleString('vi-VN')}
              </p>
            </div>

            <div className="p-3 sm:p-3.5 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 text-center space-y-0.5">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Đã thuộc
              </span>
              <p className="text-lg sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {overallLearned.toLocaleString('vi-VN')}
              </p>
            </div>

            <div className="p-3 sm:p-3.5 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 text-center space-y-0.5">
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Tiến độ
              </span>
              <p className="text-lg sm:text-2xl font-black text-amber-500">
                {overallPercent}%
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. SỔ TAY TỪ VỰNG CÁ NHÂN (VIP Glass Action Card) */}
      {/* ============================================================ */}
      <div
        onClick={() => navigate('/my-vocabulary')}
        className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-5 overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] border border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/5 p-4 sm:p-7 transition-all duration-300 hover:scale-[1.01] hover:border-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-500/15 cursor-pointer backdrop-blur-xl"
      >
        <div className="flex items-center gap-3.5 sm:gap-5 w-full sm:w-auto">
          <div className="h-14 w-14 sm:h-18 sm:w-18 shrink-0 rounded-2xl bg-gradient-to-tr from-fuchsia-500/20 to-indigo-500/20 border border-white/50 dark:border-white/10 flex items-center justify-center overflow-hidden shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
            <img
              src={bookGif}
              alt=""
              className="h-10 w-10 sm:h-14 sm:w-14 object-contain pointer-events-none select-none drop-shadow-md"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight">
                Sổ tay từ vựng của tôi
              </h2>
              <span className="px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider rounded-full bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-500/30">
                Cá nhân
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium max-w-xl line-clamp-2">
              Danh sách các từ vựng cá nhân bạn đã lưu từ từ điển TFlat, bài tập và kho bài đọc.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-white/40 dark:border-white/10">
          <div className="flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-white/60 dark:bg-black/25 border border-white/50 dark:border-white/10">
            <span className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-cyan-400">
              {personalVocabCount}
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-400 leading-tight text-left">
              từ<br />đã lưu
            </span>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-1.5 sm:gap-2 px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-xs shadow-md shadow-indigo-500/25 group-hover:from-violet-500 group-hover:to-indigo-500 group-hover:shadow-indigo-500/40 transition-all cursor-pointer whitespace-nowrap"
          >
            <span>Mở sổ từ & Ôn tập</span>
            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. SEARCH & FILTER TABS BAR */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth p-1.5 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 backdrop-blur-md">
          {FILTER_TABS.map((tab) => {
            const isActive = selectedTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedTab(tab.id)}
                className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-102 ring-1 ring-white/30'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Quick Search Input */}
        <div className="relative min-w-[200px] sm:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Tìm nhanh giáo trình..."
            className="w-full pl-10 pr-8 py-2.5 bg-white/40 dark:bg-black/25 border border-white/50 dark:border-white/10 focus:bg-white dark:focus:bg-black/40 focus:border-indigo-500/60 rounded-xl outline-none text-xs font-bold text-slate-950 dark:text-white shadow-inner transition-all placeholder:text-slate-400"
          />
          {searchFilter && (
            <button
              type="button"
              onClick={() => setSearchFilter('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. COURSE CARDS GRID 2.0 */}
      {/* ============================================================ */}
      {filteredCategories.length === 0 ? (
        <div className="rounded-[2.5rem] border border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/5 py-16 text-center backdrop-blur-xl space-y-3">
          <FolderOpen size={48} className="mx-auto text-slate-400 opacity-60" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Không tìm thấy chủ đề phù hợp với bộ lọc hiện tại.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedTab('all');
              setSearchFilter('');
            }}
            className="text-xs font-black text-indigo-600 dark:text-cyan-400 hover:underline cursor-pointer"
          >
            Đặt lại bộ lọc
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredCategories.map((group) => {
            const meta = getCategoryMeta(group.name, locale);
            const storageUrl = getStorageImageUrl(group.id);
            const imageSrc = storageUrl || resolvePublicImage(group.img, meta.fallbackImage);
            const fallbackSrc = resolvePublicImage(group.img, meta.fallbackImage);
            const groupStats = getGroupStats(group);
            const progressPercent =
              groupStats.total > 0
                ? Math.round((groupStats.learned / groupStats.total) * 100)
                : 0;

            const tagInfo = getCategoryTag(group.name);

            return (
              <article
                key={group.id || group.name}
                role={group.subCategories.length > 0 ? 'button' : undefined}
                tabIndex={group.subCategories.length > 0 ? 0 : undefined}
                aria-label={group.subCategories.length > 0 ? text.viewSets(group.name) : undefined}
                onClick={() => group.subCategories.length > 0 && setSelectedGroup(group)}
                onKeyDown={(event) => {
                  if (
                    group.subCategories.length > 0 &&
                    (event.key === 'Enter' || event.key === ' ')
                  ) {
                    event.preventDefault();
                    setSelectedGroup(group);
                  }
                }}
                className="group flex h-full flex-col overflow-hidden rounded-[2.2rem] border border-white/60 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/15 cursor-pointer"
              >
                {/* 3D Book Cover Container */}
                <div className="relative aspect-[16/9] overflow-hidden bg-slate-900/10 dark:bg-black/30">
                  <img
                    src={imageSrc}
                    alt={group.name}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = fallbackSrc;
                    }}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />

                  {/* Gentle gradient overlay for high text contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

                  {/* Level tag floating top-left */}
                  <div className="absolute top-3.5 left-3.5 z-10">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider shadow-md backdrop-blur-md border ${tagInfo.className}`}
                    >
                      {tagInfo.label}
                    </span>
                  </div>

                  {/* Units and Words counter floating bottom */}
                  <div className="absolute bottom-3.5 left-3.5 right-3.5 z-10 flex items-center justify-between text-white text-xs font-bold drop-shadow-sm">
                    <span className="bg-slate-950/70 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/20">
                      {group.subCategories.length > 0
                        ? `${group.subCategories.length} ${text.sets} • `
                        : ''}
                      {groupStats.total} {text.words}
                    </span>

                    {progressPercent === 100 && (
                      <span className="bg-emerald-500 text-white px-2.5 py-1 rounded-lg font-black text-[11px] flex items-center gap-1 shadow-md">
                        <Check size={12} strokeWidth={3} /> Đã hoàn thành
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="flex flex-1 flex-col p-5 sm:p-6 justify-between space-y-4">
                  <div className="space-y-1.5">
                    <h2 className="text-xl font-black text-slate-950 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-cyan-300 transition-colors tracking-tight">
                      {group.name}
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium line-clamp-2 leading-relaxed">
                      {group.description || meta.description}
                    </p>
                  </div>

                  {/* Progress Bar & Details */}
                  <div className="pt-2 border-t border-white/40 dark:border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-600 dark:text-slate-400">
                        {progressPercent}% {text.learned}
                      </span>
                      <span className="text-slate-950 dark:text-white font-black">
                        {groupStats.learned}/{groupStats.total} {text.words}
                      </span>
                    </div>

                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10 p-0.5 border border-white/30 dark:border-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400 transition-all duration-500 shadow-sm"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
{/* 5. SUB-CATEGORIES MODAL DIALOG (Liquid Glass Studio - Light & Dark) */}
      {/* ============================================================ */}
      {selectedGroup && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 dark:bg-slate-950/70 p-3 sm:p-5 backdrop-blur-xl animate-in fade-in duration-300"
          role="presentation"
          onMouseDown={() => {
            setSelectedGroup(null);
            setModalSearch('');
            setModalFilter('all');
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="sub-category-dialog-title"
            className="relative max-h-[92vh] sm:max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-[1.75rem] sm:rounded-[2.5rem] border border-white/80 dark:border-white/15 bg-white/90 dark:bg-[#070d19]/80 shadow-[0_20px_50px_rgba(0,0,0,0.1),_inset_0_1px_2px_rgba(255,255,255,0.9),_inset_0_-1px_1px_rgba(0,0,0,0.04)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),_inset_0_1px_2px_rgba(255,255,255,0.4),_inset_0_-1px_1px_rgba(255,255,255,0.08)] backdrop-blur-3xl flex flex-col animate-in zoom-in-95 duration-200"
            onMouseDown={(event) => event.stopPropagation()}
          >
            {/* Fluid Caustics Background Elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[1.75rem] sm:rounded-[2.5rem] -z-0">
              {/* Top-left Indigo/Cyan Liquid Blob */}
              <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-gradient-to-br from-indigo-500/15 dark:from-indigo-500/25 via-cyan-400/10 dark:via-cyan-400/20 to-transparent blur-3xl animate-liquid-blob" />
              {/* Bottom-right Violet/Pink Liquid Blob */}
              <div
                className="absolute -bottom-36 -right-36 w-96 h-96 rounded-full bg-gradient-to-tl from-violet-500/15 dark:from-violet-600/25 via-pink-400/10 dark:via-fuchsia-500/15 to-transparent blur-3xl animate-liquid-blob"
                style={{ animationDelay: '-4s' }}
              />
              {/* Liquid Specular Rim Light on Top Edge */}
              <div className="absolute top-0 inset-x-12 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/50 to-transparent" />
            </div>

            {/* Modal Header: Liquid Capsule Header */}
            <div className="relative z-10 flex items-start justify-between border-b border-slate-200/70 dark:border-white/10 p-4 sm:p-7 gap-3 sm:gap-4 bg-gradient-to-b from-white/70 via-white/50 to-transparent dark:from-white/10 dark:via-white/[0.03] dark:to-transparent backdrop-blur-md">
              <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                {modalData.imageSrc && (
                  <div className="relative group/thumb shrink-0">
                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400 opacity-30 dark:opacity-40 blur-md group-hover/thumb:opacity-60 dark:group-hover/thumb:opacity-70 transition-opacity" />
                    <img
                      src={modalData.imageSrc}
                      alt={selectedGroup.name}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = modalData.fallbackSrc;
                      }}
                      className="relative h-13 w-13 sm:h-20 sm:w-20 rounded-2xl object-cover shadow-xl border border-white/80 dark:border-white/20 select-none pointer-events-none"
                    />
                  </div>
                )}
                <div className="min-w-0 space-y-1 sm:space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/10 dark:bg-cyan-400/10 text-indigo-700 dark:text-cyan-300 border border-indigo-500/20 dark:border-cyan-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]">
                      {selectedGroup.subCategories.length} bài học
                    </span>
                    <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
                      • {modalData.groupStats.total} {text.words}
                    </span>
                  </div>
                  <h2
                    id="sub-category-dialog-title"
                    className="text-lg sm:text-2xl lg:text-3xl font-black text-slate-950 dark:text-white tracking-tight drop-shadow-xs truncate"
                  >
                    {selectedGroup.name}
                  </h2>
                  <div className="flex items-center gap-2 sm:gap-3 pt-0.5">
                    {/* Liquid Plasma Stream */}
                    <div className="relative w-28 sm:w-56 h-2 sm:h-2.5 rounded-full overflow-hidden bg-slate-200/80 dark:bg-slate-950/80 p-[1.5px] border border-slate-300/60 dark:border-white/15 shadow-[inset_0_2px_4px_rgba(0,0,0,0.12)] dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.35)]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400 transition-all duration-700 relative overflow-hidden shadow-[0_0_12px_rgba(99,102,241,0.3)] dark:shadow-[0_0_12px_rgba(34,211,238,0.5)]"
                        style={{ width: `${modalData.progressPercent}%` }}
                      >
                        {/* Shimmer liquid wave */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-liquid-shimmer pointer-events-none" />
                      </div>
                    </div>
                    <span className="text-[11px] sm:text-xs font-black text-slate-700 dark:text-slate-200">
                      {modalData.progressPercent}% ({modalData.groupStats.learned}/{modalData.groupStats.total} {text.words})
                    </span>
                  </div>
                </div>
              </div>

              {/* Dewdrop Close Button */}
              <button
                type="button"
                onClick={() => {
                  setSelectedGroup(null);
                  setModalSearch('');
                  setModalFilter('all');
                }}
                title={text.close}
                aria-label={text.closeDialog}
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-slate-100/90 dark:bg-white/10 hover:bg-slate-200/90 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all duration-200 cursor-pointer border border-slate-200/80 dark:border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),_0_4px_12px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),_0_4px_12px_rgba(0,0,0,0.15)] active:scale-95 shrink-0"
              >
                <X size={17} />
              </button>
            </div>

            {/* Filter Pills & Refractive Search Capsule */}
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 px-4 sm:px-7 py-2.5 sm:py-3 border-b border-slate-200/70 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] backdrop-blur-md">
              {/* Status Pills in Liquid Tray */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth pb-0.5 sm:pb-0 p-1 rounded-2xl bg-slate-200/60 dark:bg-black/30 border border-slate-200/80 dark:border-white/10">
                {[
                  { id: 'all', label: `Tất cả (${selectedGroup.subCategories.length})` },
                  { id: 'learning', label: `Đang học (${modalData.learningCount})` },
                  { id: 'not_started', label: `Chưa học (${modalData.notStartedCount})` },
                  { id: 'completed', label: `Đã xong (${modalData.completedCount})` },
                ].map((tab) => {
                  const isActive = modalFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setModalFilter(tab.id)}
                      className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white shadow-[0_4px_15px_-2px_rgba(99,102,241,0.4),_inset_0_1px_1px_rgba(255,255,255,0.4)] scale-[1.02] border border-white/30'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-white/70 dark:hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Refractive Search Capsule */}
              <div className="relative min-w-[200px] sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder="Tìm bài học (ví dụ: Unit 04, Work)..."
                  className="w-full pl-8 pr-7 py-1.5 bg-white/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/15 focus:bg-white dark:focus:bg-slate-900/90 focus:border-indigo-500/50 dark:focus:border-cyan-400/50 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-cyan-400/20 rounded-xl outline-none text-xs font-bold text-slate-950 dark:text-white transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] placeholder:text-slate-400"
                />
                {modalSearch && (
                  <button
                    type="button"
                    onClick={() => setModalSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Modal Body: Grid of Liquid Droplet Cards */}
            <div className="relative z-10 max-h-[60vh] overflow-y-auto p-5 sm:p-7">
              {modalData.filteredUnits.length === 0 ? (
                <div className="py-14 text-center text-slate-500 space-y-2">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Không tìm thấy bài học nào phù hợp với bộ lọc hiện tại.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setModalSearch('');
                      setModalFilter('all');
                    }}
                    className="text-xs font-black text-indigo-600 dark:text-cyan-400 hover:underline cursor-pointer"
                  >
                    Đặt lại bộ lọc
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  {modalData.filteredUnits.map((cat) => {
                    const catStats = stats[cat.id] || { total: 0, learned: 0 };
                    const catProgress =
                      catStats.total > 0
                        ? Math.round((catStats.learned / catStats.total) * 100)
                        : 0;
                    const parsed = parseUnitName(cat.name);

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSelectedGroup(null);
                          setModalSearch('');
                          setModalFilter('all');
                          navigate(`/categories/${cat.id}`);
                        }}
                        className="group/sub relative p-4 rounded-2xl bg-white/75 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 hover:border-indigo-400/40 dark:hover:border-cyan-400/40 hover:bg-white dark:hover:bg-white/[0.08] hover:shadow-[0_12px_28px_-6px_rgba(99,102,241,0.15),_inset_0_1px_1px_rgba(255,255,255,0.8)] dark:hover:shadow-[0_12px_28px_-6px_rgba(34,211,238,0.18),_inset_0_1px_1px_rgba(255,255,255,0.3)] transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-3.5 hover:-translate-y-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-md text-left"
                      >
                        {/* Specular Rim Light Top Sheen */}
                        <div className="absolute top-0 inset-x-6 h-[1px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/30 to-transparent pointer-events-none" />

                        <div className="space-y-2">
                          {/* Unit Tag & Words Count Row */}
                          <div className="flex items-center justify-between gap-2">
                            {parsed.unitTag ? (
                              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 dark:bg-cyan-400/10 text-indigo-700 dark:text-cyan-300 border border-indigo-500/20 dark:border-cyan-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
                                {parsed.unitTag}
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-400">
                                Bài học
                              </span>
                            )}

                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100/80 dark:bg-black/25 px-2 py-0.5 rounded-md border border-slate-200/70 dark:border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                              {catStats.total} {text.words}
                            </span>
                          </div>

                          {/* Full Title (2 lines without harsh cut-off) */}
                          <h3 className="font-black text-sm text-slate-950 dark:text-white group-hover/sub:text-indigo-600 dark:group-hover/sub:text-cyan-300 line-clamp-2 leading-snug transition-colors">
                            {parsed.title}
                          </h3>
                        </div>

                        {/* Progress Details & Liquid Tube */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-200/70 dark:border-white/10">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            {catProgress === 100 ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-black flex items-center gap-1 drop-shadow-xs dark:drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                                <Check size={12} strokeWidth={3} /> Đã thuộc (100%)
                              </span>
                            ) : catProgress > 0 ? (
                              <span className="text-indigo-600 dark:text-cyan-400 font-bold flex items-center gap-1">
                                Đang học ({catProgress}%)
                              </span>
                            ) : (
                              <span className="text-slate-500 dark:text-slate-400 font-medium">
                                Chưa học (0%)
                              </span>
                            )}

                            <span className="text-slate-700 dark:text-slate-300 font-bold">
                              {catStats.learned}/{catStats.total}
                            </span>
                          </div>

                          {/* Liquid Progress Bar */}
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-900/80 p-[1px] border border-slate-300/60 dark:border-white/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                catProgress === 100
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.3)] dark:shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                                  : 'bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400 shadow-[0_0_8px_rgba(99,102,241,0.25)] dark:shadow-[0_0_8px_rgba(34,211,238,0.4)]'
                              }`}
                              style={{ width: `${catProgress}%` }}
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
