import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Headphones,
  Repeat,
  PenTool,
  BookOpen,
  Mic,
  FileText,
  Sparkles,
} from 'lucide-react';
import { hapticsService } from '../../lib/hapticsService';

const SKILLS = [
  { to: '/practice', label: 'Tất cả kỹ năng', icon: Sparkles, exact: true },
  { to: '/dictation', label: 'Nghe chép', icon: Headphones },
  { to: '/shadowing', label: 'Nghe nhại', icon: Repeat },
  { to: '/writing', label: 'Luyện viết', icon: PenTool },
  { to: '/reading', label: 'Luyện đọc', icon: BookOpen },
  { to: '/speaking', label: 'Luyện nói', icon: Mic },
  { to: '/tenses', label: 'Ngữ pháp', icon: FileText },
];

export default function SkillSwitchTabs() {
  const location = useLocation();

  return (
    <div className="w-full overflow-x-auto no-scrollbar py-1 select-none">
      <div className="inline-flex min-w-max items-center gap-1 sm:gap-1.5 p-1 rounded-2xl glass-panel shadow-xs dark:bg-black/40 dark:border-white/10">
        {SKILLS.map((skill) => {
          const isActive = skill.exact
            ? location.pathname === skill.to
            : location.pathname.startsWith(skill.to);
          const Icon = skill.icon;

          return (
            <Link
              key={skill.to}
              to={skill.to}
              onClick={() => hapticsService.selection()}
              className={`flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                isActive
                  ? 'glass-pill-active text-indigo-900 font-black shadow-xs dark:bg-black dark:text-cyan-400 dark:border dark:border-cyan-500/30'
                  : 'text-slate-700 hover:text-slate-950 hover:bg-white/60 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/5'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-indigo-600 dark:text-cyan-400' : ''} />
              <span>{skill.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
