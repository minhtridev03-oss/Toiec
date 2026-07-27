import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, RefreshCw, WifiOff, AlertTriangle } from 'lucide-react';

const COPY = {
  vi: {
    '404': {
      title: 'Ối! Trang không tồn tại',
      subtitle: 'Có vẻ bạn đã lạc đường rồi. Trang bạn tìm kiếm không tồn tại hoặc đã được di chuyển.',
      code: '404',
    },
    offline: {
      title: 'Mất kết nối mạng',
      subtitle: 'Hãy kiểm tra kết nối Internet của bạn rồi thử tải lại trang nhé.',
      code: 'OFFLINE',
    },
    error: {
      title: 'Đã xảy ra sự cố',
      subtitle: 'Ứng dụng gặp lỗi không mong muốn. Hãy thử tải lại trang hoặc quay về trang chủ.',
      code: 'LỖI',
    },
    home: 'Về trang chủ',
    reload: 'Tải lại trang',
    path: 'Đường dẫn',
  },
  en: {
    '404': {
      title: 'Oops! Page not found',
      subtitle: "Looks like you're lost. The page you're looking for doesn't exist or has been moved.",
      code: '404',
    },
    offline: {
      title: 'No internet connection',
      subtitle: 'Please check your internet connection and try reloading the page.',
      code: 'OFFLINE',
    },
    error: {
      title: 'Something went wrong',
      subtitle: 'The app encountered an unexpected error. Try reloading the page or go back home.',
      code: 'ERROR',
    },
    home: 'Go home',
    reload: 'Reload page',
    path: 'Path',
  },
};

export default function NotFound({ type = '404' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [locale] = useState(() => {
    try {
      return localStorage.getItem('locale') || 'vi';
    } catch {
      return 'vi';
    }
  });

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  const activeType = isOffline ? 'offline' : type;
  const text = COPY[locale] || COPY.vi;
  const content = text[activeType] || text['404'];

  const Icon = activeType === 'offline' ? WifiOff : activeType === 'error' ? AlertTriangle : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-pink-50 px-4 dark:bg-[#160B1E]">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-pink-200/40 blur-3xl dark:bg-pink-500/10" />
        <div className="absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-fuchsia-200/40 blur-3xl dark:bg-fuchsia-500/10" />
        <div className="absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-100/30 blur-3xl dark:bg-orange-500/5" />
      </div>

      <div className="relative z-10 flex max-w-lg flex-col items-center text-center">
        {/* Animated code badge */}
        <div className="relative mb-6">
          {Icon ? (
            <div className="flex h-28 w-28 items-center justify-center rounded-3xl border border-pink-200/60 bg-white shadow-xl shadow-pink-200/30 dark:border-[#3A2F43] dark:bg-[#211126] dark:shadow-pink-950/20">
              <Icon size={52} className="text-pink-500 dark:text-pink-400" strokeWidth={1.5} />
            </div>
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-3xl border border-pink-200/60 bg-white shadow-xl shadow-pink-200/30 dark:border-[#3A2F43] dark:bg-[#211126] dark:shadow-pink-950/20">
              <span className="text-5xl font-black tracking-tighter text-pink-500 dark:text-pink-400 animate-pulse">
                {content.code}
              </span>
            </div>
          )}
          {/* Floating ring animation */}
          <div className="absolute -inset-3 animate-spin rounded-[2rem] border-2 border-dashed border-pink-300/40 dark:border-pink-500/20" style={{ animationDuration: '12s' }} />
        </div>

        {/* Title */}
        <h1 className="mt-4 text-3xl font-extrabold text-slate-800 dark:text-white sm:text-4xl">
          {content.title}
        </h1>

        {/* Subtitle */}
        <p className="mt-4 max-w-md text-base leading-relaxed text-slate-500 dark:text-slate-400">
          {content.subtitle}
        </p>

        {/* Current path hint (only for 404) */}
        {activeType === '404' && (
          <p className="mt-3 rounded-lg bg-pink-100/60 px-3 py-1.5 text-xs font-mono text-pink-700 dark:bg-pink-500/10 dark:text-pink-300">
            {text.path}: <span className="font-semibold">{location.pathname}</span>
          </p>
        )}

        {/* Action buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 rounded-xl bg-[#DC4E99] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-pink-500/25 transition-all hover:bg-[#c83f87] hover:shadow-pink-500/35 active:scale-[0.97] cursor-pointer"
          >
            <Home size={18} />
            {text.home}
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-xl border border-pink-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-pink-300 hover:bg-pink-50 active:scale-[0.97] dark:border-[#3A2F43] dark:bg-[#211126] dark:text-slate-200 dark:hover:bg-[#2A1F33] cursor-pointer"
          >
            <RefreshCw size={18} />
            {text.reload}
          </button>
        </div>

        {/* Decorative bottom illustration */}
        <div className="mt-12 flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-pink-400" />
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-400" />
          <span className="ml-2 font-bold">T-ENGLISH</span>
        </div>
      </div>
    </div>
  );
}
