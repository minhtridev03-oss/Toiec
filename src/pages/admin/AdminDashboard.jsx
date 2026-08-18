import { useState, useEffect } from 'react';
import { 
  BookOpen, LibraryBig, PenTool, Headphones, FileText, BookType,
  TrendingUp, Database
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { Link } from 'react-router-dom';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    writing_lessons: 0,
    writing_sentences: 0,
    reading_lessons: 0,
    reading_questions: 0,
    dictation_videos: 0,
    tenses: 0,
    tense_exercises: 0,
    vocab_categories: 0,
    vocabularies: 0,
    library_books: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const queries = [
        supabase.from('writing_lessons').select('id', { count: 'exact', head: true }),
        supabase.from('writing_sentences').select('id', { count: 'exact', head: true }),
        supabase.from('reading_lessons').select('id', { count: 'exact', head: true }),
        supabase.from('reading_questions').select('id', { count: 'exact', head: true }),
        supabase.from('dictation_videos').select('id', { count: 'exact', head: true }),
        supabase.from('tenses').select('id', { count: 'exact', head: true }),
        supabase.from('tense_exercises').select('id', { count: 'exact', head: true }),
        supabase.from('categories').select('id', { count: 'exact', head: true }),
        supabase.from('vocabularies').select('id', { count: 'exact', head: true }),
        supabase.from('library_books').select('id', { count: 'exact', head: true }),
      ];

      const results = await Promise.all(queries);

      setStats({
        writing_lessons: results[0].count || 0,
        writing_sentences: results[1].count || 0,
        reading_lessons: results[2].count || 0,
        reading_questions: results[3].count || 0,
        dictation_videos: results[4].count || 0,
        tenses: results[5].count || 0,
        tense_exercises: results[6].count || 0,
        vocab_categories: results[7].count || 0,
        vocabularies: results[8].count || 0,
        library_books: results[9].count || 0,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    {
      title: 'Luyện viết',
      to: '/admin/writing',
      icon: PenTool,
      color: 'indigo',
      stats: [
        { label: 'Bài học', value: stats.writing_lessons },
        { label: 'Câu dịch', value: stats.writing_sentences },
      ],
    },
    {
      title: 'Luyện đọc',
      to: '/admin/reading',
      icon: BookOpen,
      color: 'blue',
      stats: [
        { label: 'Bài đọc', value: stats.reading_lessons },
        { label: 'Câu hỏi', value: stats.reading_questions },
      ],
    },
    {
      title: 'Luyện nghe',
      to: '/admin/dictation',
      icon: Headphones,
      color: 'emerald',
      stats: [
        { label: 'Video', value: stats.dictation_videos },
      ],
    },
    {
      title: 'Ngữ pháp',
      to: '/admin/grammar',
      icon: BookType,
      color: 'amber',
      stats: [
        { label: 'Thì', value: stats.tenses },
        { label: 'Bài tập', value: stats.tense_exercises },
      ],
    },
    {
      title: 'Từ vựng',
      to: '/admin/vocab',
      icon: FileText,
      color: 'rose',
      stats: [
        { label: 'Chủ đề', value: stats.vocab_categories },
        { label: 'Từ vựng', value: stats.vocabularies },
      ],
    },
    {
      title: 'Thư viện sách',
      to: '/admin/library',
      icon: LibraryBig,
      color: 'fuchsia',
      stats: [
        { label: 'Sách', value: stats.library_books },
      ],
    },
  ];

  const colorMap = {
    indigo: {
      bg: 'bg-indigo-50 dark:bg-indigo-500/10',
      icon: 'text-indigo-600 dark:text-indigo-400',
      badge: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300',
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-500/10',
      icon: 'text-blue-600 dark:text-blue-400',
      badge: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      icon: 'text-emerald-600 dark:text-emerald-400',
      badge: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      icon: 'text-amber-600 dark:text-amber-400',
      badge: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
    },
    rose: {
      bg: 'bg-rose-50 dark:bg-rose-500/10',
      icon: 'text-rose-600 dark:text-rose-400',
      badge: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',
    },
    fuchsia: {
      bg: 'bg-fuchsia-50 dark:bg-fuchsia-500/10',
      icon: 'text-fuchsia-600 dark:text-fuchsia-400',
      badge: 'bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300',
    },
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-slate-50 dark:bg-[#0F1117]">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 bg-slate-50 dark:bg-[#0F1117] min-h-screen transition-colors">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <Database size={28} className="text-purple-600 dark:text-purple-400" />
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Admin Dashboard
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Quản lý toàn bộ nội dung học tập của hệ thống.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => {
            const colors = colorMap[card.color];
            return (
              <Link
                key={card.to}
                to={card.to}
                className="bg-white dark:bg-[#1E1226] rounded-2xl p-6 border border-slate-100 dark:border-[#3A2F43] hover:shadow-xl hover:border-purple-200 dark:hover:border-purple-500/30 transition-all group"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center`}>
                    <card.icon size={24} className={colors.icon} />
                  </div>
                  <TrendingUp size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-purple-400 transition-colors" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">{card.title}</h3>
                <div className="flex flex-wrap gap-2">
                  {card.stats.map((stat) => (
                    <span key={stat.label} className={`text-xs font-bold px-3 py-1.5 rounded-lg ${colors.badge}`}>
                      {stat.value} {stat.label}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
