import { useState, useEffect } from 'react';
import { Download, X, Sparkles, Smartphone } from 'lucide-react';
import { usePlatform } from '../../hooks/usePlatform';
import appLogo from '../../assets/log.jpg';

const STORAGE_KEY = 'tenglish_hide_app_banner_until';
const HIDE_DURATION_DAYS = 7;

export default function AppDownloadBanner() {
  const { isMobileWeb } = usePlatform();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Chỉ hiển thị trên trình duyệt di động / iPad
    if (!isMobileWeb) {
      setIsVisible(false);
      return;
    }

    // Kiểm tra xem người dùng đã bấm tắt gần đây chưa
    try {
      const hiddenUntil = localStorage.getItem(STORAGE_KEY);
      if (hiddenUntil && Number(hiddenUntil) > Date.now()) {
        setIsVisible(false);
        return;
      }
    } catch {
      // localStorage fallback
    }

    // Delay hiển thị nhẹ để người dùng không bị choáng
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, [isMobileWeb]);

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      const expireTime = Date.now() + HIDE_DURATION_DAYS * 24 * 60 * 60 * 1000;
      localStorage.setItem(STORAGE_KEY, expireTime.toString());
    } catch {
      // Ignored
    }
  };

  if (!isVisible) return null;

  return (
    <aside
      role="complementary"
      aria-label="Tải ứng dụng T-English"
      className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 select-none"
    >
      <div className="relative overflow-hidden rounded-2xl bg-white/95 dark:bg-[#13151f]/95 backdrop-blur-2xl border border-indigo-200/60 dark:border-indigo-500/30 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.55)]">
        {/* Subtle Ambient Accent */}
        <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500/20 to-pink-500/20 blur-2xl pointer-events-none" />

        <div className="flex items-start gap-3.5 relative z-10">
          <div className="relative shrink-0 mt-0.5">
            <img
              src={appLogo}
              alt="T-English App Logo"
              className="w-12 h-12 rounded-xl object-cover shadow-md border border-white/40 dark:border-white/10"
            />
            <span className="absolute -bottom-1 -right-1 bg-gradient-to-r from-indigo-600 to-pink-500 text-white p-0.5 rounded-full shadow-sm">
              <Sparkles size={10} />
            </span>
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/15 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                <Smartphone size={10} /> APP ANDROID
              </span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                Trải nghiệm tốt nhất
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug mb-3">
              Tải ứng dụng T-English APK để luyện phát âm mượt 120 FPS, không hao pin và nhận nhắc nhở giữ chuỗi lửa mỗi ngày!
            </p>

            <div className="flex items-center gap-2">
              <a
                href="/T-English.apk"
                download="T-English.apk"
                onClick={handleDismiss}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-pink-500 hover:opacity-95 text-white font-semibold text-xs shadow-md shadow-indigo-500/25 active:scale-95 transition-all"
              >
                <Download size={14} />
                <span>Tải APK cài đặt</span>
              </a>

              <button
                type="button"
                onClick={handleDismiss}
                className="py-2 px-3 rounded-xl text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95 transition-all"
              >
                Tiếp tục web
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Đóng thông báo"
            className="absolute top-0 right-0 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
