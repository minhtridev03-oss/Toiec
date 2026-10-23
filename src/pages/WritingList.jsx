import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PenTool, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { prefetchWritingLesson } from '../lib/lessonCache';

const LEVELS = ['All', 'Basic', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'Toeic'];

let cachedWritingLessons = null;
let cachedWritingProgress = {};

const COPY = {
  vi: {
    title: 'Luyện viết',
    desc: 'Luyện dịch và viết câu tự nhiên với sự hỗ trợ của AI.',
    allTopics: 'Tất cả chủ đề',
    completed: 'Đã hoàn thành',
    translationPractice: 'Bài luyện dịch',
    startPractice: 'Bắt đầu luyện',
    noLessons: 'Chưa có bài viết nào cho cấp độ',
  },
  en: {
    title: 'Writing Practice',
    desc: 'Practice translation and writing natural sentences with AI assistance.',
    allTopics: 'All Topics',
    completed: 'Completed',
    translationPractice: 'Translation practice',
    startPractice: 'Start Practice',
    noLessons: 'No writing lessons available for',
  }
};

export default function WritingList() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const text = COPY[locale];
  const [activeTab, setActiveTab] = useState('All');
  const [lessons, setLessons] = useState(() => cachedWritingLessons || []);
  const [progressData, setProgressData] = useState(() => cachedWritingProgress || {});
  const [loading, setLoading] = useState(() => !cachedWritingLessons);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLessons();
  }, [user?.id]);

  const fetchLessons = async () => {
    try {
      // Chỉ hiện spinner toàn màn hình nếu chưa có dữ liệu đệm trong bộ nhớ
      if (!cachedWritingLessons) {
        setLoading(true);
      }

      const [lessonsRes, progressRes] = await Promise.all([
        supabase
          .from('writing_lessons')
          .select('id, title, level, created_at')
          .order('created_at', { ascending: true }),
        user?.id
          ? supabase.rpc('get_writing_progress', { p_user_id: user.id })
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (lessonsRes.error) throw lessonsRes.error;
      const lessonsData = lessonsRes.data || [];
      setLessons(lessonsData);

      const progressMap = {};
      lessonsData.forEach(l => {
        progressMap[l.id] = { total: 0, completed: 0, percentage: 0 };
      });

      if (!progressRes.error && Array.isArray(progressRes.data)) {
        progressRes.data.forEach((row) => {
          const total = Number(row.total_count) || 0;
          const completed = Number(row.completed_count) || 0;
          progressMap[row.lesson_id] = {
            total,
            completed,
            percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
          };
        });
      } else if (user) {
        // Dự phòng nếu RPC chưa được tạo
        const [sentencesRes, completedRes] = await Promise.all([
          supabase.from('writing_sentences').select('id, lesson_id'),
          supabase.from('user_writing_progress').select('sentence_id').eq('user_id', user.id),
        ]);

        if (sentencesRes.data && completedRes.data) {
          const completedSet = new Set(completedRes.data.map(c => c.sentence_id));
          sentencesRes.data.forEach(s => {
            if (progressMap[s.lesson_id]) {
              progressMap[s.lesson_id].total++;
              if (completedSet.has(s.id)) {
                progressMap[s.lesson_id].completed++;
              }
            }
          });
          Object.keys(progressMap).forEach(key => {
            const data = progressMap[key];
            if (data.total > 0) {
              data.percentage = Math.round((data.completed / data.total) * 100);
            }
          });
        }
      }

      setProgressData(progressMap);
      cachedWritingLessons = lessonsData;
      cachedWritingProgress = progressMap;
    } catch (error) {
      console.error('Error fetching writing lessons:', error.message);
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
            <PenTool size={28} className="fill-fuchsia-600/20" />
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
              const progress = progressData[lesson.id] || { total: 0, completed: 0, percentage: 0 };
              const isCompleted = progress.percentage === 100 && progress.total > 0;
              
              return (
              <motion.div
                key={lesson.id}
                whileHover={{ y: -4 }}
                onMouseEnter={() => prefetchWritingLesson(lesson.id)}
                onFocus={() => prefetchWritingLesson(lesson.id)}
                onClick={() => navigate(`/writing/${lesson.id}`)}
                className={`bg-white dark:bg-[#1E1226] rounded-3xl overflow-hidden shadow-sm border ${isCompleted ? 'border-green-500 shadow-green-100 dark:shadow-green-900/20' : 'border-pink-100 dark:border-[#3A2F43]'} hover:shadow-xl hover:border-fuchsia-200 dark:hover:border-fuchsia-500/50 transition-all cursor-pointer group flex flex-col relative`}
              >
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-5 transition-colors">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors group-hover:scale-110 duration-300 ${isCompleted ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-fuchsia-50 dark:bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 group-hover:bg-fuchsia-100 dark:group-hover:bg-fuchsia-500/20'}`}>
                      <PenTool size={28} />
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      {/* Level badge */}
                      <div className="px-3 py-1 bg-fuchsia-100/90 text-fuchsia-800 dark:bg-fuchsia-500/20 dark:text-fuchsia-300 text-xs font-extrabold rounded-lg backdrop-blur-sm uppercase shadow-sm">
                        {lesson.level || 'basic'}
                      </div>
                      
                      {user && progress.total > 0 && (
                        <div className={`text-xs font-bold px-2 py-1 rounded-lg ${isCompleted ? 'bg-green-500 text-white flex items-center gap-1' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                          {isCompleted ? (
                            <><CheckCircle2 size={14} /> {text.completed}</>
                          ) : (
                            `${progress.percentage}%`
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 line-clamp-2 group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400 transition-colors leading-tight">
                    {lesson.title}
                  </h3>

                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 flex-1 line-clamp-2 transition-colors">
                    {text.translationPractice}
                  </p>

                  {!isCompleted && user && progress.total > 0 && (
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mb-4 overflow-hidden transition-colors">
                      <div className="bg-fuchsia-500 h-full rounded-full transition-all duration-1000" style={{ width: `${progress.percentage}%` }}></div>
                    </div>
                  )}

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
            )})}

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
