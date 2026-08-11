import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { AlertCircle, BookOpen, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { supabase } from '../lib/supabaseClient';

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

const normalizeName = (value) => String(value || '')
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
  const descriptions = locale === 'vi'
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
export default function Categories() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { locale } = useLocale();
  const text = locale === 'vi'
    ? {
      errorTitle: 'Không thể tải dữ liệu', retry: 'Thử lại', title: 'Các chủ đề từ vựng', subtitle: 'Chọn một chủ đề để bắt đầu học', empty: 'Chưa có chủ đề nào.',
      viewSets: (name) => `Xem các bộ từ của ${name}`, sets: 'bộ từ', words: 'từ', learned: 'đã thuộc', setsLabel: 'Các bộ từ', chooseSet: 'Chọn một bộ từ để bắt đầu học.', close: 'Đóng', closeDialog: 'Đóng danh sách chủ đề nhỏ',
    }
    : {
      errorTitle: 'Unable to load data', retry: 'Try again', title: 'Vocabulary Categories', subtitle: 'Choose a topic to start learning', empty: 'There are no topics yet.',
      viewSets: (name) => `View vocabulary sets in ${name}`, sets: 'sets', words: 'words', learned: 'learned', setsLabel: 'Vocabulary sets', chooseSet: 'Choose a set to start learning.', close: 'Close', closeDialog: 'Close vocabulary sets',
    };
  const [selectedGroup, setSelectedGroup] = useState(null);

  const fetchCategoriesData = async () => {
    if (!user?.id) throw new Error('No user');
    const { data: catData, error: catError } = await supabase
      .from('categories')
      .select('*, sub_categories(*)')
      .order('created_at', { ascending: true });
    if (catError) throw catError;
    const formattedCategories = (catData || []).map((cat) => ({
      id: cat.id,
      name: cat.name,
      img: cat.img,
      description: cat.description || cat.desc || '',
      subCategories: [...(cat.sub_categories || [])]
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    }));
    const { data: progressRows, error: progressError } = await supabase
      .rpc('get_sub_category_progress', { p_user_id: user.id });
    if (progressError) throw progressError;
    const statsMap = {};
    (progressRows || []).forEach((row) => {
      statsMap[row.sub_category_id] = {
        total: Number(row.total_count) || 0,
        learned: Number(row.learned_count) || 0,
      };
    });
    const { count: pCount, error: pError } = await supabase
      .from('user_vocabulary')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    return {
      categories: formattedCategories,
      stats: statsMap,
      personalVocabCount: pError ? 0 : (pCount || 0)
    };
  };

  const { data, error: swrError, isLoading, mutate } = useSWR(
    user?.id ? `categories_${user.id}` : null,
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
  const error = swrError ? (locale === 'vi' ? 'Không thể tải danh sách chủ đề. Vui lòng thử lại.' : 'Could not load the topic list. Please try again.') : null;

  useEffect(() => {
    if (!selectedGroup) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setSelectedGroup(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedGroup]);

  const getGroupStats = (group) => group.subCategories.reduce((total, sub) => {
    const subStats = stats[sub.id] || { total: 0, learned: 0 };
    return {
      total: total.total + subStats.total,
      learned: total.learned + subStats.learned,
    };
  }, { total: 0, learned: 0 });
  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1900px] px-6 py-8 sm:px-8 sm:py-10">
        <div className="mb-10">
          <div className="h-10 w-80 animate-pulse rounded-lg bg-pink-100 dark:bg-white/10" />
          <div className="mt-4 h-6 w-96 animate-pulse rounded-lg bg-pink-50 dark:bg-white/5" />
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="overflow-hidden rounded-[22px] border border-pink-200 bg-white dark:border-[#3A2F43] dark:bg-[#1E1226]">
              <div className="aspect-[16/9] animate-pulse bg-pink-50 dark:bg-white/10" />
              <div className="px-8 py-7">
                <div className="h-8 w-2/3 animate-pulse rounded bg-pink-100 dark:bg-white/10" />
                <div className="mt-5 h-5 w-full animate-pulse rounded bg-pink-50 dark:bg-white/10" />
                <div className="mt-3 h-5 w-3/4 animate-pulse rounded bg-pink-50 dark:bg-white/10" />
                <div className="mt-9 h-2.5 animate-pulse rounded bg-pink-100 dark:bg-fuchsia-900/40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="mx-auto w-full max-w-6xl p-8">
        <div className="flex items-start gap-4 rounded-2xl border border-red-900/40 bg-red-950/30 p-6">
          <AlertCircle className="mt-0.5 shrink-0 text-red-400" size={22} />
          <div>
            <h3 className="font-bold text-red-200">{text.errorTitle}</h3>
            <p className="mt-1 text-sm text-red-300">{error}</p>
            <button
              type="button"
              onClick={fetchCategoriesWithStats}
              className="mt-3 cursor-pointer rounded-xl bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/30"
            >
              {text.retry}
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto w-full max-w-[1900px] px-6 py-8 sm:px-8 sm:py-10">
      <div className="mb-10">
        <h1 className="text-4xl font-bold leading-tight tracking-normal text-slate-800 dark:text-white">
          {text.title}
        </h1>
        <p className="mt-3 text-[23px] leading-tight text-slate-500 dark:text-[#9eb0d0]">
          {text.subtitle}
        </p>
      </div>
      {categories.length === 0 ? (
        <div className="rounded-2xl border border-pink-200 bg-white py-16 text-center dark:border-[#3A2F43] dark:bg-[#1E1226]">
          <BookOpen size={48} className="mx-auto mb-4 text-pink-300 dark:text-[#a99aab]" />
          <p className="font-medium text-slate-500 dark:text-[#b8aab6]">{text.empty}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Personal Vocabulary Banner */}
          <div
            onClick={() => navigate('/my-vocabulary')}
            className="group relative flex flex-col sm:flex-row items-center gap-6 overflow-hidden rounded-[24px] border border-fuchsia-200 bg-white p-6 sm:p-8 transition-all hover:-translate-y-1 hover:border-fuchsia-400 hover:shadow-xl hover:shadow-fuchsia-200/50 cursor-pointer dark:border-fuchsia-900/40 dark:bg-[#1E1226] dark:hover:border-fuchsia-700/70"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-50/80 to-transparent dark:from-fuchsia-950/20 pointer-events-none" />
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-400 to-purple-600 text-white shadow-lg shadow-fuchsia-500/30">
              <BookOpen size={36} />
            </div>
            <div className="relative flex-1 text-center sm:text-left">
              <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">
                Sổ tay từ vựng của tôi
              </h2>
              <p className="mt-2 text-base font-medium text-slate-500 dark:text-slate-400 max-w-xl">
                Danh sách các từ vựng cá nhân bạn đã lưu từ AI Dictionary và các bài học.
              </p>
            </div>
            <div className="relative flex items-center gap-3 rounded-2xl bg-fuchsia-50 px-6 py-4 dark:bg-fuchsia-950/40 border border-fuchsia-100 dark:border-fuchsia-900/30 sm:ml-auto">
              <span className="text-3xl font-black text-fuchsia-600 dark:text-fuchsia-400">{personalVocabCount}</span>
              <span className="text-sm font-bold text-fuchsia-800/60 dark:text-fuchsia-300/60 leading-tight">
                từ<br />đã lưu
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((group) => {
            const meta = getCategoryMeta(group.name, locale);
            // Ưu tiên: 1) Ảnh từ Supabase Storage, 2) Cột img trong DB, 3) Fallback local
            const storageUrl = getStorageImageUrl(group.id);
            const imageSrc = storageUrl || resolvePublicImage(group.img, meta.fallbackImage);
            const fallbackSrc = resolvePublicImage(group.img, meta.fallbackImage);
            const groupStats = getGroupStats(group);
            const progressPercent = groupStats.total > 0
              ? Math.round((groupStats.learned / groupStats.total) * 100)
              : 0;
            return (
              <article
                key={group.id || group.name}
                role={group.subCategories.length > 0 ? 'button' : undefined}
                tabIndex={group.subCategories.length > 0 ? 0 : undefined}
                aria-label={group.subCategories.length > 0 ? text.viewSets(group.name) : undefined}
                onClick={() => group.subCategories.length > 0 && setSelectedGroup(group)}
                onKeyDown={(event) => {
                  if (group.subCategories.length > 0 && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    setSelectedGroup(group);
                  }
                }}
                className="group flex h-full flex-col overflow-hidden rounded-[22px] border border-pink-200 bg-white transition-all hover:-translate-y-1 hover:border-pink-400 hover:shadow-lg hover:shadow-pink-200/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 dark:border-[#3A2F43] dark:bg-[#1E1226] dark:hover:border-pink-400/70 dark:hover:shadow-[0_18px_45px_rgba(16,5,18,0.42)] cursor-pointer"
              >
                <div className="relative aspect-[2/1] overflow-hidden bg-pink-100 dark:bg-[#09050a]">
                  <img
                    src={imageSrc}
                    alt={group.name}
                    loading="eager"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = fallbackSrc;
                    }}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  />
                </div>
                <div className="flex min-h-[180px] flex-col px-5 py-4">
                  <div className="flex items-start justify-between gap-5">
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold leading-tight tracking-normal text-slate-800 dark:text-[#fff9fd]">
                        {group.name}
                      </h2>
                      <p className="mt-2 min-h-[2.6rem] max-w-[34rem] text-sm leading-relaxed text-slate-500 dark:text-[#b8aab6]">
                        {group.description || meta.description}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-500 dark:text-[#b8aab6]">
                    {group.subCategories.length > 0 ? `${group.subCategories.length} ${text.sets} • ` : ''}
                    {groupStats.total} {text.words}
                  </p>
                  <div className="mt-auto pt-4">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-500 dark:text-[#b8aab6]">{progressPercent}% {text.learned}</span>
                      <span className="font-bold text-slate-800 dark:text-[#f7edf5]">{groupStats.learned}/{groupStats.total}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-pink-100 dark:bg-fuchsia-900/40">
                      <div
                        className="h-full rounded-full bg-pink-500 transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        </div>
      )}
      {selectedGroup && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm dark:bg-black/65"
          role="presentation"
          onMouseDown={() => setSelectedGroup(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="sub-category-dialog-title"
            className="max-h-[82vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-pink-200 bg-white shadow-[0_24px_90px_rgba(131,24,67,0.22)] dark:border-fuchsia-500/40 dark:bg-[#1E1226] dark:shadow-[0_24px_90px_rgba(0,0,0,0.55)]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-pink-100 px-6 py-5 dark:border-white/10 sm:px-8">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-pink-600 dark:text-pink-300">{text.setsLabel}</p>
                <h2 id="sub-category-dialog-title" className="mt-1 text-2xl font-bold text-slate-800 dark:text-white sm:text-3xl">
                  {selectedGroup.name}
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-[#b8aab6]">{text.chooseSet}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                title={text.close}
                aria-label={text.closeDialog}
                className="rounded-full border border-pink-200 bg-pink-50 p-2.5 text-slate-500 transition-colors hover:border-pink-400 hover:bg-pink-100 hover:text-pink-600 dark:border-[#3A2F43] dark:bg-[#2A1F33] dark:text-[#d8c8d5] dark:hover:bg-[#32263C] dark:hover:text-pink-200 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="max-h-[62vh] overflow-y-auto p-5 sm:p-7">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {selectedGroup.subCategories.map((cat) => {
                  const catStats = stats[cat.id] || { total: 0, learned: 0 };
                  const catProgress = catStats.total > 0
                    ? Math.round((catStats.learned / catStats.total) * 100)
                    : 0;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedGroup(null);
                        navigate(`/categories/${cat.id}`);
                      }}
                      className="group/sub min-h-32 rounded-xl border border-pink-200 bg-pink-50 p-4 text-left transition-colors hover:border-pink-400 hover:bg-pink-100 dark:border-[#3A2F43] dark:bg-[#2A1F33] dark:hover:border-pink-400/70 dark:hover:bg-[#32263C] cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate font-bold text-slate-800 group-hover/sub:text-pink-600 dark:text-[#fff9fd] dark:group-hover/sub:text-pink-200">{cat.name}</h3>
                          <p className="mt-1 text-sm text-slate-500 dark:text-[#b8aab6]">{catStats.total} {text.words}</p>
                        </div>
                        <BookOpen size={18} className="shrink-0 text-pink-500 dark:text-pink-300" />
                      </div>
                      <div className="mt-5 flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-pink-100 dark:bg-fuchsia-900/40">
                          <div className="h-full rounded-full bg-pink-500" style={{ width: `${catProgress}%` }} />
                        </div>
                        <span className="text-xs font-bold text-pink-600 dark:text-pink-200">{catProgress}%</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}