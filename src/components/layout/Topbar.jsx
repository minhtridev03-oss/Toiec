import { Bell, BookOpen, Flame, Languages, LogOut, Moon, Settings, Sun, Menu } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useStats } from '../../contexts/StatsContext';
import { supabase } from '../../lib/supabaseClient';

const COPY = {
  vi: {
    words: 'từ đã học',
    streak: 'ngày streak',
    profile: 'Hồ sơ',
    logout: 'Đăng xuất',
    theme: 'Đổi giao diện',
    language: 'Ngôn ngữ',
    user: 'Người dùng',
    quotes: [
      'Bắt đầu là cách duy nhất để tiến về phía trước.',
      'Tiến bộ nhỏ vẫn là tiến bộ. Cứ tiếp tục nhé.',
      'Mỗi ngày học một chút sẽ tạo nên khác biệt lớn.',
      'Sự đều đặn là chìa khóa của thành công.',
    ],
  },
  en: {
    words: 'words learned',
    streak: 'day streak',
    profile: 'Profile',
    logout: 'Log out',
    theme: 'Toggle appearance',
    language: 'Language',
    user: 'User',
    quotes: [
      'The secret of getting ahead is getting started.',
      'Small progress is still progress. Keep going.',
      'A little learning every day creates a big difference.',
      'Consistency is the key to success.',
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
  const { streak, learnedWords } = useStats();
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
  const emailInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';

  return (
    <header className="sticky top-0 z-40 flex h-20 items-center justify-between border-b border-pink-200 bg-white px-4 md:px-6 transition-colors dark:border-fuchsia-900 dark:bg-[#1E1226]">
      <div className="flex items-center flex-1 min-w-0">
        <button 
          onClick={onMenuClick}
          className="mr-3 p-2 rounded-lg text-slate-600 hover:bg-pink-100 dark:text-slate-400 dark:hover:bg-[#2A1F33] transition-colors lg:hidden"
        >
          <Menu size={24} />
        </button>
        <div className="hidden min-w-0 flex-col md:flex">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-lg font-bold capitalize leading-none text-slate-800 dark:text-slate-100">{dateString}</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/20 dark:text-orange-300">
              <Flame size={13} /> {streak} {text.streak}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-200 bg-fuchsia-100 px-2.5 py-1 text-xs font-bold text-fuchsia-700 dark:border-fuchsia-500/30 dark:bg-fuchsia-500/20 dark:text-fuchsia-300">
              <BookOpen size={13} /> {learnedWords} {text.words}
            </span>
          </div>
          <p className="mt-1 truncate text-sm font-medium italic text-slate-500 dark:text-slate-400">“{dailyQuote}”</p>
        </div>
      </div>

      <div className="ml-4 flex items-center gap-2 sm:gap-3">
        <div className="flex items-center rounded-lg border border-pink-200 bg-pink-50 p-1 dark:border-[#3A2F43] dark:bg-[#2A1F33]" role="group" aria-label={text.language}>
          <Languages size={15} className="mx-1 text-slate-500 dark:text-slate-400" />
          {['vi', 'en'].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setLocale(option)}
              className={`rounded-md px-2 py-1 text-xs font-extrabold transition-colors cursor-pointer ${locale === option ? 'bg-white text-pink-600 shadow-sm dark:bg-[#160B1E] dark:text-pink-300' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
              aria-pressed={locale === option}
            >
              {option.toUpperCase()}
            </button>
          ))}
        </div>

        <button type="button" onClick={toggleTheme} className="icon-btn" title={text.theme} aria-label={text.theme}>
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        <button type="button" className="icon-btn relative" aria-label="Notifications">
          <Bell size={20} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white bg-red-500 dark:border-[#1E1226]" />
        </button>
        <div className="hidden h-8 w-px bg-pink-200 dark:bg-fuchsia-900/40 sm:block" />

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((open) => !open)}
            className="flex items-center gap-2 rounded-full border border-transparent p-1 pr-3 transition-all hover:border-pink-200 hover:bg-pink-50 dark:hover:border-fuchsia-900/40 dark:hover:bg-[#2A1F33] cursor-pointer"
          >
            {user?.user_metadata?.custom_avatar_url || user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.custom_avatar_url || user.user_metadata.avatar_url} alt="Avatar" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-fuchsia-100 font-bold text-fuchsia-600 dark:bg-fuchsia-500/20 dark:text-fuchsia-400">{emailInitial}</div>
            )}
            <span className="hidden max-w-[120px] truncate text-sm font-medium text-slate-700 dark:text-slate-300 sm:block">
              {user?.user_metadata?.custom_full_name || user?.user_metadata?.full_name || user?.email || text.user}
            </span>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-pink-200 bg-white py-2 shadow-lg shadow-pink-200/50 dark:border-fuchsia-900/40 dark:bg-[#1E1226] dark:shadow-none">
              <button type="button" onClick={() => { setDropdownOpen(false); navigate('/profile'); }} className="dropdown-btn rounded-t-xl">
                <Settings size={16} className="text-slate-400 dark:text-slate-500" />
                {text.profile}
              </button>
              <div className="my-1 h-px bg-pink-100 dark:bg-fuchsia-900/40" />
              <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-b-xl px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 cursor-pointer">
                <LogOut size={16} className="text-red-400 dark:text-red-500" />
                {text.logout}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
