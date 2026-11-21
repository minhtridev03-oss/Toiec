import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Pencil,
  GraduationCap,
  User,
} from 'lucide-react';
import { hapticsService } from '../../lib/hapticsService';
import { useLocale } from '../../contexts/LocaleContext';

const NAV_ITEMS = [
  {
    to: '/dashboard',
    label: { vi: 'Trang chủ', en: 'Home' },
    icon: LayoutDashboard,
    isActive: (pathname) => pathname === '/dashboard' || pathname === '/',
  },
  {
    to: '/categories',
    label: { vi: 'Từ vựng', en: 'Vocab' },
    icon: BookOpen,
    isActive: (pathname) =>
      pathname.startsWith('/categories') ||
      pathname.startsWith('/vocabularies') ||
      pathname.startsWith('/subcategories'),
  },
  {
    to: '/practice',
    label: { vi: 'Luyện tập', en: 'Practice' },
    icon: Pencil,
    isActive: (pathname) =>
      pathname.startsWith('/practice') ||
      pathname.startsWith('/dictation') ||
      pathname.startsWith('/shadowing') ||
      pathname.startsWith('/speaking') ||
      pathname.startsWith('/reading') ||
      pathname.startsWith('/writing') ||
      pathname.startsWith('/tenses'),
  },
  {
    to: '/mock-tests',
    label: { vi: 'Thi thử', en: 'Tests' },
    icon: GraduationCap,
    isActive: (pathname) => pathname.startsWith('/mock-tests'),
  },
  {
    to: '/profile',
    label: { vi: 'Hồ sơ', en: 'Profile' },
    icon: User,
    isActive: (pathname) => pathname.startsWith('/profile') || pathname.startsWith('/my-vocabulary'),
  },
];

export default function BottomNav() {
  const location = useLocation();
  const { locale } = useLocale();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#0c0d14]/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-white/10 select-none shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-8px_32px_rgba(0,0,0,0.35)] transition-transform duration-300"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
      }}
      aria-label="Bottom Navigation"
    >
      <div className="flex items-center justify-around max-w-md mx-auto px-2 pt-2">
        {NAV_ITEMS.map((item) => {
          const active = item.isActive(location.pathname);
          const Icon = item.icon;
          const labelText = item.label[locale] || item.label.vi;

          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => hapticsService.selection()}
              className={`relative flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-200 group active:scale-95 ${
                active
                  ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {/* Active Pill Glow */}
              {active && (
                <span
                  className="absolute -top-1 w-8 h-1 rounded-full bg-indigo-600 dark:bg-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.6)]"
                  aria-hidden="true"
                />
              )}

              <div
                className={`p-1 rounded-xl transition-all duration-200 ${
                  active
                    ? 'bg-indigo-50/80 dark:bg-indigo-500/15'
                    : 'group-hover:bg-slate-100/50 dark:group-hover:bg-white/5'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
              </div>

              <span className="text-[11px] leading-tight mt-0.5 tracking-tight whitespace-nowrap">
                {labelText}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
