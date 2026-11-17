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
} from 'lucide-react';
import appLogo from '../../assets/log.jpg';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import TransparentImage from '../TransparentImage';

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
      {/* Light mode indicator */}
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
  const isAdmin = user?.app_metadata?.role === 'admin';
  const path = location.pathname;

  return (
    <aside
      className={`fixed z-50 flex flex-col transition-all duration-300 ease-out lg:translate-x-0 inset-y-2.5 left-2.5 ${
        isMobileMenuOpen
          ? 'translate-x-0 w-[calc(100vw-1.25rem)] sm:w-72 shadow-2xl bg-white/95 dark:bg-[#090a0f]/95 backdrop-blur-2xl rounded-[2rem] border border-slate-200 dark:border-white/10'
          : '-translate-x-full w-72'
      } lg:top-3.5 lg:bottom-3.5 lg:left-3.5 ${
        isCollapsed ? 'lg:w-[4.85rem]' : 'lg:w-[17.25rem]'
      } glass-panel rounded-[2rem] overflow-hidden`}
    >
      {/* Brand Header */}
      <div className="relative flex h-18 shrink-0 items-center justify-between border-b border-white/40 dark:border-white/10 px-4">
        <Link
          to="/dashboard"
          onClick={() => setIsMobileMenuOpen(false)}
          className={`flex items-center gap-3 transition-transform duration-150 active:scale-95 ${
            isCollapsed ? 'lg:justify-center lg:w-full' : ''
          }`}
          aria-label="Trang chủ T-English"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl glass-pill p-1.5 shadow-xs overflow-hidden">
            <TransparentImage src={appLogo} alt="Logo" className="h-full w-full object-contain" tolerance={245} />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                T-English
              </span>
              <span className="text-[11px] font-bold text-indigo-700 dark:text-slate-400">
                TOEIC Mastery
              </span>
            </div>
          )}
        </Link>

        {/* Collapse toggle button */}
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
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-3.5 overflow-y-auto px-3 py-2 no-scrollbar select-none">
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
                  onClick={() => setIsMobileMenuOpen(false)}
                />
              );
            })}
          </div>
        ))}

        {/* Expand button in collapsed mode */}
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
              onClick={() => setIsMobileMenuOpen(false)}
            />
          </div>
        )}
      </nav>

      {/* Pro Plan / Footer */}
      <div className="border-t border-white/40 dark:border-white/10 p-3 shrink-0">
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
  );
}
