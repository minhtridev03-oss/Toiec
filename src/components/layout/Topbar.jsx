import {
  Bell,
  ChevronDown,
  Languages,
  LogOut,
  Menu,
  Sparkles,
  User,
} from 'lucide-react';
import { Sun as SunIcon, Moon as MoonIcon } from 'lucide';
import { MorphIcon } from 'morphicons/react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabaseClient';
import { useAvatarFrames } from '../../contexts/AvatarFramesContext';
import { useStats } from '../../contexts/StatsContext';
import { getAvatarFrameById } from '../../lib/avatarFrames';
import UserAvatar from '../common/UserAvatar';

const COPY = {
  vi: {
    profile: 'Hồ sơ cá nhân',
    logout: 'Đăng xuất',
    theme: 'Đổi giao diện sáng/tối',
    language: 'Ngôn ngữ',
    user: 'Học viên',
    roleAdmin: 'Quản trị viên',
    roleStudent: 'Học viên',
    quotes: [
      'Bắt đầu là cách duy nhất để tiến về phía trước.',
      'Tiến bộ nhỏ mỗi ngày tạo nên thành quả lớn.',
      'Sự kiên trì chính là chìa khóa mở cánh cửa ngoại ngữ.',
      'Mỗi từ mới hôm nay là một bước tiến cho tương lai.',
    ],
  },
  en: {
    profile: 'Profile Settings',
    logout: 'Log out',
    theme: 'Toggle appearance',
    language: 'Language',
    user: 'Learner',
    roleAdmin: 'Admin',
    roleStudent: 'Learner',
    quotes: [
      'The secret of getting ahead is getting started.',
      'Small progress each day adds up to big results.',
      'Consistency is the key that unlocks language fluency.',
      'Every new word today builds a brighter tomorrow.',
    ],
  },
};

export default function Topbar({ onMenuClick }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { locale, setLocale } = useLocale();
  const { userLevel = 1 } = useStats();
  const text = COPY[locale];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [avatarFrameId, setAvatarFrameId] = useState(
    user?.user_metadata?.avatar_frame || 'none'
  );

  useEffect(() => {
    if (user?.user_metadata?.avatar_frame) {
      setAvatarFrameId(user.user_metadata.avatar_frame);
    }
    const handleFrameChange = (e) => {
      setAvatarFrameId(e.detail || 'none');
    };
    window.addEventListener('avatar-frame-changed', handleFrameChange);
    return () => window.removeEventListener('avatar-frame-changed', handleFrameChange);
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const today = new Date();
  const dateString = today.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const dailyQuote = text.quotes[today.getDate() % text.quotes.length];
  const isAdmin = user?.app_metadata?.role === 'admin';
  const displayName = user?.user_metadata?.custom_full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || text.user;

  const { getFrameById } = useAvatarFrames();
  const currentFrame = (getFrameById && getFrameById(avatarFrameId)) || getAvatarFrameById(avatarFrameId);
  const isImageFrame = Boolean(currentFrame?.frameUrl || currentFrame?.frame_url);
  const frameScale = Number(currentFrame?.frameScale ?? currentFrame?.frame_scale ?? 1.28);

  // Large ornate frames (with wide wings or crowns) need generous spacing so the graphic does not overlap the name
  const nameMarginClass = isImageFrame
    ? frameScale >= 2.0
      ? 'ml-8'
      : frameScale >= 1.6
        ? 'ml-7'
        : 'ml-6'
    : 'ml-3.5';

  return (
    <header className="sticky top-0 z-50 flex h-18 items-center justify-between bg-transparent border-none px-4 md:px-8 transition-colors pointer-events-none">
      {/* Left: Mobile trigger & Date/Quote Island */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0 pointer-events-auto">
        <button
          type="button"
          onClick={onMenuClick}
          className="mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl glass-panel text-slate-600 transition-all hover:scale-105 hover:text-slate-900 active:scale-95 dark:text-slate-300 dark:hover:text-white lg:hidden cursor-pointer"
          aria-label="Mở menu"
        >
          <Menu size={20} />
        </button>

        {/* Date & Daily Quote ("Câu hay") Island */}
        <div className="hidden sm:flex items-center gap-3 glass-panel rounded-2xl px-4 py-2 shadow-xs max-w-md xl:max-w-2xl select-none">
          <span className="text-xs font-black capitalize tracking-tight text-slate-950 dark:text-white whitespace-nowrap">
            {dateString}
          </span>
          <div className="h-3.5 w-px bg-slate-300/60 dark:bg-white/10 shrink-0" />
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles size={13} className="text-indigo-600 dark:text-cyan-400 shrink-0" />
            <p className="truncate text-xs font-bold text-slate-900 dark:text-slate-200 italic">
              “{dailyQuote}”
            </p>
          </div>
        </div>
      </div>

      {/* Right Controls: Liquid Glass Buttons */}
      <div className="ml-4 flex items-center gap-2 sm:gap-2.5 pointer-events-auto">
        {/* Language Switcher */}
        <div
          className="glass-panel rounded-2xl p-1 inline-flex items-center gap-0.5 shadow-xs"
          role="group"
          aria-label={text.language}
        >
          <Languages size={14} className="mx-1.5 text-slate-700 dark:text-slate-300 shrink-0" />
          {['vi', 'en'].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setLocale(option)}
              className={`rounded-xl px-2.5 py-1 text-xs font-extrabold transition-all cursor-pointer ${
                locale === option
                  ? 'glass-pill-active text-indigo-800 font-black shadow-xs dark:bg-black dark:text-cyan-400 dark:border dark:border-cyan-500/30'
                  : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
              }`}
              aria-pressed={locale === option}
            >
              {option.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="glass-panel rounded-2xl h-10 w-10 flex items-center justify-center text-slate-800 dark:text-slate-200 hover:text-amber-500 dark:hover:text-amber-400 shadow-xs hover:scale-105 active:scale-95 transition-all cursor-pointer"
          title={text.theme}
          aria-label={text.theme}
        >
          <span className={`inline-flex items-center justify-center transition-colors duration-300 ${isDarkMode ? 'text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>
            <MorphIcon
              icon={isDarkMode ? SunIcon : MoonIcon}
              size={18}
              strokeWidth={2}
              spring="bouncy"
            />
          </span>
        </button>

        {/* Notification Bell */}
        <button
          type="button"
          className="glass-panel rounded-2xl h-10 w-10 flex items-center justify-center text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-xs hover:scale-105 active:scale-95 transition-all cursor-pointer relative"
          aria-label="Thông báo"
        >
          <Bell size={18} />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full ring-2 ring-white dark:ring-slate-900 bg-indigo-600 dark:bg-indigo-400" />
        </button>

        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((open) => !open)}
            className={`glass-panel rounded-full py-1.5 flex items-center shadow-xs hover:scale-[1.03] active:scale-[0.98] transition-all cursor-pointer ${
              isImageFrame ? 'pl-3.5 pr-4' : 'pl-2.5 pr-4'
            }`}
          >
            <div className={`shrink-0 flex items-center justify-center relative ${isImageFrame ? 'mx-0.5' : ''}`}>
              <UserAvatar
                src={user?.user_metadata?.custom_avatar_url || user?.user_metadata?.avatar_url}
                frameId={avatarFrameId}
                size="sm"
                fallbackText={displayName}
              />
            </div>
            <span
              className={`hidden max-w-[140px] truncate text-xs font-black text-slate-950 dark:text-slate-200 sm:block tracking-tight ${nameMarginClass}`}
            >
              {displayName}
            </span>
            <ChevronDown
              size={14}
              className={`text-slate-700 dark:text-slate-300 transition-transform duration-200 shrink-0 ml-2.5 ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl glass-panel bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-2xl p-1.5 shadow-2xl border border-white/50 dark:border-white/10 transition-all animate-in fade-in zoom-in-95">
              {/* User Header */}
              <div className="px-3 py-2.5 border-b border-white/40 dark:border-white/10">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {displayName}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {user?.email}
                </p>
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-2 py-0.5 text-[10px] font-black text-white shadow-2xs">
                    <Sparkles size={10} />
                    <span>Lv.{userLevel}</span>
                  </span>
                  <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                    {isAdmin ? text.roleAdmin : text.roleStudent}
                  </span>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/profile');
                  }}
                  className="dropdown-btn"
                >
                  <User size={16} className="text-slate-400 dark:text-slate-400" />
                  <span>{text.profile}</span>
                </button>
              </div>

              {/* Divider & Logout */}
              <div className="border-t border-white/40 dark:border-white/10 pt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 cursor-pointer"
                >
                  <LogOut size={16} className="text-red-500" />
                  <span>{text.logout}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
