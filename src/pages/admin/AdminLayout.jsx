import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Headphones, PenTool, ArrowLeft,
  BookType, FileText, Users, MessageSquarePlus, Menu, X
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const adminNav = [
  { to: '/admin', icon: LayoutDashboard, label: 'Tổng quan', end: true },
  { to: '/admin/users', icon: Users, label: 'Quản lý User' },
  { to: '/admin/writing', icon: PenTool, label: 'Luyện viết' },
  { to: '/admin/reading', icon: BookOpen, label: 'Luyện đọc' },
  { to: '/admin/dictation', icon: Headphones, label: 'Luyện nghe' },
  { to: '/admin/grammar', icon: BookType, label: 'Ngữ pháp' },
  { to: '/admin/vocab', icon: FileText, label: 'Từ vựng' },
  { to: '/admin/feedbacks', icon: MessageSquarePlus, label: 'Góp ý' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  const SidebarContent = () => (
    <>
      {/* Header */}
      <div className="h-16 md:h-20 flex items-center px-4 md:px-6 border-b border-slate-200 dark:border-[#3A2F43] shrink-0">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-200 dark:shadow-purple-900/30 shrink-0">
            <LayoutDashboard size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">Admin</h1>
            <p className="text-[10px] md:text-[11px] text-slate-400 dark:text-slate-500 font-medium">Quản lý nội dung</p>
          </div>
        </div>
        {/* Close button mobile */}
        <button
          onClick={closeSidebar}
          className="md:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#3A2F43] transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 md:px-4 py-4 md:py-6 space-y-1 overflow-y-auto">
        {adminNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={closeSidebar}
            className={({ isActive }) =>
              `admin-nav-link ${isActive ? 'admin-nav-link-active' : ''}`
            }
          >
            <item.icon size={19} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 md:p-4 border-t border-slate-200 dark:border-[#3A2F43] space-y-1 md:space-y-2 shrink-0">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#3A2F43] transition-colors"
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          {isDarkMode ? 'Chế độ sáng' : 'Chế độ tối'}
        </button>
        <button
          onClick={() => { navigate('/dashboard'); closeSidebar(); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#3A2F43] transition-colors"
        >
          <ArrowLeft size={18} />
          Quay về trang chính
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#0F1117] transition-colors">

      {/* ===== MOBILE: Overlay backdrop ===== */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* ===== DESKTOP: Fixed sidebar ===== */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-[#1E1226] border-r border-slate-200 dark:border-[#3A2F43] h-screen fixed top-0 left-0 flex-col transition-colors z-50">
        <SidebarContent />
      </aside>

      {/* ===== MOBILE: Slide-in drawer ===== */}
      <aside className={`md:hidden fixed top-0 left-0 h-full w-72 bg-white dark:bg-[#1E1226] border-r border-slate-200 dark:border-[#3A2F43] flex flex-col transition-transform duration-300 z-50 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </aside>

      {/* ===== MOBILE: Top bar ===== */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white dark:bg-[#1E1226] border-b border-slate-200 dark:border-[#3A2F43] flex items-center px-4 gap-3 z-30 transition-colors">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-[#3A2F43] transition-colors"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
            <LayoutDashboard size={13} className="text-white" />
          </div>
          <span className="font-bold text-slate-800 dark:text-white text-sm">Admin Panel</span>
        </div>
      </div>

      {/* ===== Main Content ===== */}
      <main className="flex-1 md:ml-64 min-h-screen pt-14 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
