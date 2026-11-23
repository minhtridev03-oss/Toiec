import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BookOpen,
  Bookmark,
  Crown,
  Files,
  FileText,
  Gamepad2,
  GraduationCap,
  Headphones,
  LayoutDashboard,
  Mic,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  PenTool,
  Repeat,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import appLogo from '../../assets/logo.png';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import { useStats } from '../../contexts/StatsContext';
import TransparentImage from '../TransparentImage';
import UserAvatar from '../common/UserAvatar';

const navSections = [
  {
    titleKey: 'nav.sectionOverview',
    items: [
      { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    titleKey: 'nav.sectionVocab',
    items: [
      { to: '/tflat', labelKey: 'nav.dictionary', icon: Search },
      { to: '/categories', labelKey: 'nav.vocabulary', icon: BookOpen },
      { to: '/my-vocabulary', labelKey: 'nav.myVocabulary', icon: Bookmark },
      { to: '/tenses', labelKey: 'nav.grammar', icon: FileText },
    ],
  },
  {
    titleKey: 'nav.sectionSkills',
    items: [
      { to: '/dictation', labelKey: 'nav.listening', icon: Headphones },
      { to: '/shadowing', labelKey: 'nav.shadowing', icon: Repeat },
      { to: '/speaking', labelKey: 'nav.speaking', icon: Mic },
      { to: '/reading', labelKey: 'nav.reading', icon: BookOpen },
      { to: '/writing', labelKey: 'nav.writing', icon: PenTool },
      { to: '/practice', labelKey: 'nav.exercises', icon: Pencil, exact: true },
    ],
  },
  {
    titleKey: 'nav.sectionExam',
    items: [
      { to: '/mock-tests', labelKey: 'nav.mockTests', icon: GraduationCap },
      { to: '/library', labelKey: 'nav.library', icon: Files },
      { to: '/games', labelKey: 'nav.games', icon: Gamepad2, exact: true },
    ],
  },
];

function NavItem({ to, label, icon: Icon, isActive, isCollapsed, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      title={isCollapsed ? label : undefined}
      className={`group relative flex items-center transition-all duration-150 select-none ${
        isCollapsed
          ? 'justify-center h-10 w-10 mx-auto rounded-2xl'
          : 'gap-3 px-3.5 py-2.5 text-sm rounded-2xl'
      } ${
        isActive
          ? 'glass-pill-active text-indigo-900 font-black shadow-xs dark:bg-black dark:text-cyan-400 dark:border dark:border-white/15 dark:shadow-[0_4px_16px_rgba(0,0,0,0.5)]'
          : 'text-slate-900 hover:bg-white/70 hover:text-indigo-600 font-extrabold dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/10 active:scale-[0.98]'
      }`}
    >
      {/* Light mode active bar indicator */}
      {isActive && !isCollapsed && (
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(99,102,241,0.6)] dark:hidden" />
      )}
      <Icon
        size={isCollapsed ? 20 : 18}
        className={`shrink-0 transition-transform duration-150 group-hover:scale-110 ${
          isActive
            ? 'text-indigo-700 dark:text-cyan-400'
            : 'text-slate-800 group-hover:text-indigo-600 dark:text-slate-400 dark:group-hover:text-white'
        }`}
      />
      {!isCollapsed && <span className="truncate leading-none">{label}</span>}
    </Link>
  );
}

export default function Sidebar({ isCollapsed, setIsCollapsed, isMobileMenuOpen, setIsMobileMenuOpen }) {
  const location = useLocation();
  const { user, openAuthModal } = useAuth();
  const { t } = useLocale();
  const { userLevel = 1 } = useStats();
  const isAdmin = user?.app_metadata?.role === 'admin';
  const path = location.pathname;

  // Touch gesture state for swipe-to-close on mobile
  const touchStartRef = useRef({ x: null, y: null });
  const touchCurrentXRef = useRef(null);
  const isHorizontalSwipeRef = useRef(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Lock background scroll when mobile sidebar is open
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (isMobileMenuOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
    return undefined;
  }, [isMobileMenuOpen]);

  // ESC key listener to close mobile menu
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen, setIsMobileMenuOpen]);

  // Handle touch drag to dismiss on mobile
  const handleTouchStart = (e) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    touchCurrentXRef.current = e.touches[0].clientX;
    isHorizontalSwipeRef.current = false;
  };

  const handleTouchMove = (e) => {
    if (touchStartRef.current.x === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartRef.current.x;
    const diffY = currentY - touchStartRef.current.y;

    // Detect horizontal swipe intention vs vertical scroll
    if (!isHorizontalSwipeRef.current && (Math.abs(diffX) > 8 || Math.abs(diffY) > 8)) {
      if (Math.abs(diffX) > Math.abs(diffY)) {
        isHorizontalSwipeRef.current = true;
        setIsDragging(true);
      } else {
        touchStartRef.current = { x: null, y: null };
        return;
      }
    }

    // Only allow dragging left (closing)
    if (isHorizontalSwipeRef.current && diffX < 0) {
      touchCurrentXRef.current = currentX;
      setDragOffset(diffX);
    }
  };

  const handleTouchEnd = () => {
    if (isHorizontalSwipeRef.current && touchStartRef.current.x !== null && touchCurrentXRef.current !== null) {
      const diffX = touchCurrentXRef.current - touchStartRef.current.x;
      // Close if dragged more than 50px left
      if (diffX < -50) {
        setIsMobileMenuOpen(false);
      }
    }
    touchStartRef.current = { x: null, y: null };
    touchCurrentXRef.current = null;
    isHorizontalSwipeRef.current = false;
    setDragOffset(0);
    setIsDragging(false);
  };

  const closeMobile = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay with liquid fade & blur */}
      <div
        className={`fixed inset-0 z-[90] lg:hidden bg-slate-950/60 dark:bg-black/75 backdrop-blur-sm transition-opacity duration-300 ease-out ${
          isMobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMobile}
        aria-hidden="true"
      />

      {/* Main Drawer Aside */}
      <aside
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={
          isDragging && dragOffset < 0
            ? { transform: `translateX(${dragOffset}px)` }
            : undefined
        }
        className={`fixed z-[100] lg:z-50 flex flex-col lg:translate-x-0 inset-y-2 left-2 sm:inset-y-3 sm:left-3 ${
          isDragging
            ? 'transition-none'
            : 'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]'
        } ${
          isMobileMenuOpen
            ? 'translate-x-0 pointer-events-auto'
            : '-translate-x-[calc(100%+2.5rem)] pointer-events-none'
        } w-[82vw] max-w-[310px] sm:w-72 lg:pointer-events-auto lg:top-3.5 lg:bottom-3.5 lg:left-3.5 ${
          isCollapsed ? 'lg:w-[4.85rem]' : 'lg:w-[17.25rem]'
        } glass-panel rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.35)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-white/70 dark:border-white/15`}
      >
        {/* Specular Rim Light Top Sheen */}
        <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/30 to-transparent pointer-events-none z-10" />

        {/* Ambient Liquid Glass Globs */}
        <div className="absolute -top-24 -left-24 w-60 h-60 rounded-full bg-gradient-to-br from-indigo-500/15 dark:from-indigo-500/25 via-cyan-400/10 dark:via-cyan-400/20 to-transparent blur-3xl pointer-events-none -z-0" />
        <div className="absolute -bottom-28 -right-24 w-64 h-64 rounded-full bg-gradient-to-tl from-purple-500/15 dark:from-purple-600/20 via-pink-400/10 dark:via-fuchsia-500/15 to-transparent blur-3xl pointer-events-none -z-0" />

        {/* Brand Header */}
        <div className="relative flex h-16 sm:h-18 shrink-0 items-center justify-between border-b border-white/40 dark:border-white/10 px-4 z-10">
          <Link
            to="/dashboard"
            onClick={closeMobile}
            className={`flex items-center gap-3 transition-transform duration-150 active:scale-95 ${
              isCollapsed ? 'lg:justify-center lg:w-full' : ''
            }`}
            aria-label="Trang chủ T-English"
          >
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-2xl glass-pill p-1 shadow-xs overflow-hidden">
              <img src={appLogo} alt="Logo" className="h-full w-full object-contain rounded-xl" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                  T-English
                </span>
                <span className="text-[11px] font-bold text-indigo-700 dark:text-cyan-400">
                  TOEIC Mastery
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse toggle button */}
          {!isCollapsed && (
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="hidden cursor-pointer rounded-xl glass-pill p-2 text-slate-700 transition-all hover:text-slate-950 dark:text-slate-400 dark:hover:text-white hover:scale-105 active:scale-95 lg:block"
              title={t('common.collapseSidebar')}
              aria-label={t('common.collapseSidebar')}
            >
              <PanelLeftClose size={17} />
            </button>
          )}

          {/* Mobile Close Button (X) */}
          <button
            type="button"
            onClick={closeMobile}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200/70 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 transition-all hover:scale-105 active:scale-95 lg:hidden cursor-pointer shadow-xs border border-white/50 dark:border-white/10"
            title="Đóng menu"
            aria-label="Đóng menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mobile Swipe-to-close Pill Indicator */}
        <div className="lg:hidden flex items-center justify-center pt-2 pb-0.5 shrink-0 select-none">
          <div className="w-9 h-1 rounded-full bg-slate-300/80 dark:bg-white/20" />
        </div>

        {/* Navigation List */}
        <nav className="flex-1 space-y-3.5 overflow-y-auto px-3 py-2 no-scrollbar select-none z-10">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pt-2 pb-0.5 text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-400">
                  {t(section.titleKey)}
                </div>
              )}
              {section.items.map((item) => {
                const label = t(item.labelKey);
                const isActive = item.exact
                  ? path === item.to || (item.to === '/dashboard' && path === '/')
                  : path.startsWith(item.to);

                return (
                  <NavItem
                    key={item.to}
                    to={item.to}
                    label={label}
                    icon={item.icon}
                    isActive={isActive}
                    isCollapsed={isCollapsed}
                    onClick={closeMobile}
                  />
                );
              })}
            </div>
          ))}

          {/* Expand button in collapsed mode on desktop */}
          {isCollapsed && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                className="cursor-pointer rounded-2xl glass-pill p-2 text-slate-700 transition-all hover:bg-slate-200/60 hover:text-slate-950 dark:hover:text-white hover:scale-105 active:scale-95 dark:text-slate-400"
                title={t('common.expandSidebar')}
              >
                <PanelLeftOpen size={18} />
              </button>
            </div>
          )}

          {/* Admin Section */}
          {isAdmin && (
            <div className="pt-2 border-t border-white/40 dark:border-white/10">
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-purple-600 dark:text-pink-400 select-none">
                  Admin
                </div>
              )}
              <NavItem
                to="/admin"
                label={t('nav.admin')}
                icon={ShieldCheck}
                isActive={path.startsWith('/admin')}
                isCollapsed={isCollapsed}
                onClick={closeMobile}
              />
            </div>
          )}
        </nav>

        {/* User Card on Mobile */}
        {user && !isCollapsed && (
          <div className="lg:hidden mx-3 mb-2 p-2.5 rounded-2xl bg-white/45 dark:bg-white/5 border border-white/60 dark:border-white/10 flex items-center justify-between shadow-2xs z-10 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <UserAvatar
                src={user?.user_metadata?.custom_avatar_url || user?.user_metadata?.avatar_url}
                frameId={user?.user_metadata?.avatar_frame || 'none'}
                size="sm"
                fallbackText={user?.user_metadata?.custom_full_name || user?.email}
              />
              <div className="min-w-0 flex flex-col">
                <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                  {user?.user_metadata?.custom_full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {user?.email}
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 text-[10px] font-black text-white shrink-0 shadow-2xs">
              Lv.{userLevel}
            </span>
          </div>
        )}

        {/* Pro Plan / Footer */}
        <div className="border-t border-white/40 dark:border-white/10 p-3 shrink-0 z-10">
          {isCollapsed ? (
            <div className="flex justify-center">
              <button
                type="button"
                className="group relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 dark:bg-black dark:text-cyan-400 dark:border dark:border-white/15 text-white shadow-md transition-all hover:scale-105 active:scale-95"
                title={t('common.proPlan')}
                aria-label={t('common.proPlan')}
              >
                <Crown size={19} />
              </button>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-white/45 to-indigo-50/30 border border-white/60 dark:bg-white/[0.03] dark:border-white/10 p-3.5 shadow-xs">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-indigo-600 dark:bg-black dark:border dark:border-white/15 text-white dark:text-cyan-400 shadow-xs">
                  <Crown size={12} />
                </span>
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-900 dark:text-cyan-400">
                  {t('common.proPlan')}
                </span>
              </div>
              <p className="mb-3 text-xs font-bold leading-relaxed text-slate-800 dark:text-slate-300">
                {t('common.upgradeCopy')}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (!user) openAuthModal('signup');
                }}
                className="relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 dark:bg-black dark:text-cyan-400 dark:border dark:border-white/15 py-2.5 px-3 w-full text-xs font-extrabold text-white shadow-md transition-all hover:brightness-105 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Sparkles size={14} className="text-white dark:text-cyan-400" />
                <span>{t('common.upgrade')}</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
