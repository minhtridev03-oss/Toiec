import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';

const LEVELS = ['All', 'Basic', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Toeic', 'IELTS'];

const COPY = {
  vi: {
    title: 'Luyện đọc',
    desc: 'Nâng cao kỹ năng đọc hiểu và từ vựng với các bài đọc đa dạng.',
    allTopics: 'Tất cả chủ đề',
    completed: 'Đã hoàn thành',
    readingPractice: 'Bài luyện đọc hiểu',
    startPractice: 'Bắt đầu luyện',
    noLessons: 'Chưa có bài đọc nào cho cấp độ',
  },
  en: {
    title: 'Reading Practice',
    desc: 'Improve reading comprehension and vocabulary with diverse reading passages.',
    allTopics: 'All Topics',
    completed: 'Completed',
    readingPractice: 'Reading comprehension practice',
    startPractice: 'Start Practice',
    noLessons: 'No reading lessons available for',
  }
};

export default function ReadingList() {
  const { locale } = useLocale();
  const text = COPY[locale];
  const [activeTab, setActiveTab] = useState('All');
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchLessons();
    if (user) {
      fetchProgress();
    }
  }, [user]);

  const fetchProgress = async () => {
    try {
      const { data, error } = await supabase
        .from('user_reading_progress')
        .select('lesson_id')
        .eq('user_id', user?.id);
        
      if (error) throw error;
      if (data) {
        setCompletedLessons(new Set(data.map(d => d.lesson_id)));
      }
    } catch (error) {
      console.error('Error fetching progress:', error.message);
    }
  };

  const fetchLessons = async () => {
    try {
      const { data, error } = await supabase
        .from('reading_lessons')
        .select('id, title, level, created_at')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setLessons(data || []);
    } catch (error) {
      console.error('Error fetching reading lessons:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredLessons = activeTab === 'All'
    ? lessons
    : lessons.filter(l => (l.level || 'basic').toLowerCase() === activeTab.toLowerCase());

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-pink-50 dark:bg-[#160B1E] transition-colors">
        <div className="w-8 h-8 border-4 border-fuchsia-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-10 bg-pink-50 dark:bg-[#160B1E] overflow-y-auto transition-colors">
      <div className="w-[90%] mx-auto space-y-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-fuchsia-600/10 flex items-center justify-center text-fuchsia-600 shrink-0 transition-colors">
            <BookOpen size={28} className="fill-fuchsia-600/20" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight transition-colors">{text.title}</h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg transition-colors">{text.desc}</p>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white transition-colors">{text.allTopics}</h2>

          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {LEVELS.map(level => (
              <button
                key={level}
                onClick={() => setActiveTab(level)}
                className={`tab-btn cursor-pointer ${activeTab === level ? 'tab-btn-active' : ''}`}
              >
                {level}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredLessons.map((lesson) => {
              const isCompleted = completedLessons.has(lesson.id);
              
              return (
              <motion.div
                key={lesson.id}
                whileHover={{ y: -4 }}
                onClick={() => navigate(`/reading/${lesson.id}`)}
                className={`bg-white dark:bg-[#1E1226] rounded-3xl overflow-hidden shadow-sm border ${isCompleted ? 'border-green-500 shadow-green-100 dark:shadow-green-900/20' : 'border-pink-100 dark:border-[#3A2F43]'} hover:shadow-xl hover:border-fuchsia-200 dark:hover:border-fuchsia-500/50 transition-all cursor-pointer group flex flex-col relative`}
              >
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-5 transition-colors">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors group-hover:scale-110 duration-300 ${isCompleted ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-fuchsia-50 dark:bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 group-hover:bg-fuchsia-100 dark:group-hover:bg-fuchsia-500/20'}`}>
                      <BookOpen size={28} />
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className="px-3 py-1 bg-fuchsia-100/90 text-fuchsia-800 dark:bg-fuchsia-500/20 dark:text-fuchsia-300 text-xs font-extrabold rounded-lg backdrop-blur-sm uppercase shadow-sm">
                        {lesson.level || 'basic'}
                      </div>
                      
                      {isCompleted && (
                        <div className="text-xs font-bold px-2 py-1 rounded-lg bg-green-500 text-white flex items-center gap-1">
                          <CheckCircle2 size={14} /> {text.completed}
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 line-clamp-2 group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400 transition-colors leading-tight">
                    {lesson.title}
                  </h3>

                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 flex-1 line-clamp-2 transition-colors">
                    {text.readingPractice}
                  </p>

                  <div className="flex items-center justify-between border-t border-slate-100 dark:border-[#3A2F43] pt-4 mt-auto">
                    <span className="text-sm font-semibold text-slate-400 group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400 transition-colors">
                      {text.startPractice}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-[#2A1F33] flex items-center justify-center text-slate-400 group-hover:bg-fuchsia-600 group-hover:text-white transition-all shadow-sm group-hover:shadow-md">
                      <ArrowRight size={16} />
                    </div>
                  </div>
                </div>
              </motion.div>
              );
            })}

            {filteredLessons.length === 0 && (
              <div className="col-span-full p-10 bg-white dark:bg-[#1E1226] rounded-3xl border border-dashed border-pink-300 dark:border-[#3A2F43] text-center text-slate-500 dark:text-slate-400 transition-colors">
                {text.noLessons} {activeTab}.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
