import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Files, Headphones, LayoutDashboard, Mic, PanelLeft, Pencil, PenTool, Search, Shapes } from 'lucide-react';
import appLogo from '../../assets/log.jpg';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import TransparentImage from '../TransparentImage';

const navItems = [
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, exact: true },
  { to: '/tflat', labelKey: 'nav.dictionary', icon: Search },
  { to: '/categories', labelKey: 'nav.vocabulary', icon: BookOpen },
  { to: '/practice', labelKey: 'nav.exercises', icon: Pencil, exact: true },
  // { to: '/kids', labelKey: 'nav.kids', icon: Shapes, exact: true },
  { to: '/tenses', labelKey: 'nav.grammar', icon: BookOpen },
  { to: '/dictation', labelKey: 'nav.listening', icon: Headphones },
  { to: '/shadowing', labelKey: 'nav.shadowing', icon: Headphones },
  { to: '/speaking', labelKey: 'nav.speaking', icon: Mic },
  { to: '/reading', labelKey: 'nav.reading', icon: BookOpen },
  { to: '/writing', labelKey: 'nav.writing', icon: PenTool },
  { to: '/library', labelKey: 'nav.library', icon: Files },
];

export default function Sidebar({ isCollapsed, setIsCollapsed, isMobileMenuOpen, setIsMobileMenuOpen }) {
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLocale();
  const isAdmin = user?.app_metadata?.role === 'admin';
  const path = location.pathname;

  return (
    <aside className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-slate-200 bg-white transition-all duration-300 dark:border-fuchsia-900 dark:bg-[#1E1226] lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'lg:w-[5.5rem] w-64' : 'w-64'}`}>
      <div className="relative flex h-20 items-center justify-center border-b border-slate-200 px-4 transition-colors dark:border-fuchsia-900">
        <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center justify-center" aria-label="Trang chủ">
          <div className={`flex shrink-0 items-center justify-center ${isCollapsed ? 'h-12 w-14' : 'h-14 w-24 sm:h-16 sm:w-28'}`}>
            <TransparentImage src={appLogo} alt="Logo" className="h-full w-full object-contain" tolerance={245} />
          </div>
        </Link>
        {!isCollapsed && <button type="button" onClick={() => setIsCollapsed(true)} className="absolute right-4 hidden cursor-pointer text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-white lg:block" aria-label={t('common.expandSidebar')}><PanelLeft size={22} /></button>}
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
        {navItems.map((item) => {
          const label = t(item.labelKey);
          const isActive = item.exact ? path === item.to || (item.to === '/dashboard' && path === '/') : path.startsWith(item.to);
          return (
            <Link key={item.to} to={item.to} onClick={() => setIsMobileMenuOpen(false)} title={isCollapsed ? label : undefined} className={`nav-link ${isActive ? 'nav-link-active' : ''} ${isCollapsed ? 'justify-center px-0' : ''}`}>
              <item.icon size={20} className="shrink-0" />
              {!isCollapsed && <span className="whitespace-nowrap">{label}</span>}
            </Link>
          );
        })}

        {isCollapsed && <div className="flex justify-center pt-4"><button type="button" onClick={() => setIsCollapsed(false)} className="cursor-pointer rounded-xl bg-pink-100 p-2 text-slate-600 transition-colors hover:bg-pink-200 hover:text-slate-900 dark:bg-[#3A2F43] dark:text-slate-300 dark:hover:bg-fuchsia-600 dark:hover:text-white" title={t('common.expandSidebar')}><PanelLeft size={20} /></button></div>}

        {isAdmin && (
          <div className="mt-2 border-t border-slate-200 pt-4 dark:border-slate-700/50">
            <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} title={isCollapsed ? t('nav.admin') : undefined} className={`nav-link ${path.startsWith('/admin') ? 'nav-link-active-admin' : ''} ${isCollapsed ? 'justify-center px-0' : ''}`}>
              <LayoutDashboard size={20} className="shrink-0" />
              {!isCollapsed && <span className="whitespace-nowrap">{t('nav.admin')}</span>}
            </Link>
          </div>
        )}
      </nav>

      <div className="border-t border-slate-200 p-4 transition-colors dark:border-fuchsia-900">
        {isCollapsed ? (
          <div className="flex justify-center"><div className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-pink-300 font-bold text-white dark:bg-pink-500" title={t('common.proPlan')}>P</div></div>
        ) : (
          <div className="rounded-xl border border-slate-100 bg-pink-50 p-4 transition-colors dark:border-[#3A2F43] dark:bg-[#1E1226]">
            <p className="mb-2 text-xs font-medium text-slate-800 dark:text-slate-400">{t('common.proPlan')}</p>
            <p className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">{t('common.upgradeCopy')}</p>
            <button type="button" className="w-full cursor-pointer rounded-lg bg-pink-300 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-pink-400 dark:bg-pink-500 dark:hover:bg-pink-600">{t('common.upgrade')}</button>
          </div>
        )}
      </div>
    </aside>
  );
}
