import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, PenTool, Lock } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import LazyVideo from '../components/tenses/LazyVideo';
import FillInBlankQuiz from '../components/tenses/FillInBlankQuiz';
import { useAuth } from '../contexts/AuthContext';

export default function TenseDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tense, setTense] = useState(null);
  const [exercises, setExercises] = useState({ basic: [], advanced: [] });
  const [completedExerciseIds, setCompletedExerciseIds] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('lesson'); // 'lesson', 'basic', 'advanced'
  const [isAdvancedUnlocked, setIsAdvancedUnlocked] = useState(false);

  useEffect(() => {
    fetchTenseDetail();
  }, [slug, user]);

  const fetchTenseDetail = async () => {
    setLoading(true);
    try {
      // Fetch tense
      const { data: tenseData, error: tenseError } = await supabase
        .from('tenses')
        .select('*')
        .eq('slug', slug)
        .single();

      if (tenseError) throw tenseError;
      setTense(tenseData);

      // Check unlock status from localStorage
      const unlocked = localStorage.getItem(`unlocked_tenses_${tenseData.id}`);
      setIsAdvancedUnlocked(unlocked === 'true');

      // Fetch exercises
      const { data: exData, error: exError } = await supabase
        .from('tense_exercises')
        .select('*')
        .eq('tense_id', tenseData.id)
        .order('id');

      if (exError) throw exError;

      const basic = exData.filter(e => e.level === 'basic');
      const advanced = exData.filter(e => e.level === 'advanced');

      setExercises({ basic, advanced });

      // Fetch completed exercises for this user
      if (user) {
        const { data: completedData, error: completedError } = await supabase
          .from('user_tense_exercises')
          .select('exercise_id')
          .eq('user_id', user.id)
          .in('exercise_id', exData.map(e => e.id));

        if (!completedError && completedData) {
          const completedIds = completedData.map(d => d.exercise_id);
          setCompletedExerciseIds(completedIds);

          if (basic.length > 0) {
            const completedBasicCount = basic.filter(b => completedIds.includes(b.id)).length;
            const percentage = (completedBasicCount / basic.length) * 100;
            if (percentage >= 80) {
              setIsAdvancedUnlocked(true);
              // Lưu vào local storage để sync (nếu cần)
              localStorage.setItem(`unlocked_tenses_${tenseData.id}`, 'true');
            }
          }
        }
      }

    } catch (error) {
      console.error('Error fetching tense details:', error.message);
      navigate('/tenses');
    } finally {
      setLoading(false);
    }
  };

  const handleQuizComplete = (correctCount, total) => {
    const percentage = Math.round((correctCount / total) * 100);
    if (activeTab === 'basic' && percentage >= 80) {
      setIsAdvancedUnlocked(true);
      localStorage.setItem(`unlocked_tenses_${tense.id}`, 'true');
    }
  };

  const handleExerciseUpdate = (exerciseId) => {
    setCompletedExerciseIds(prev => prev.includes(exerciseId) ? prev : [...prev, exerciseId]);
  };

  if (loading || !tense) {
    return (
      <div className="flex-1 flex items-center justify-center bg-pink-50 dark:bg-[#160B1E] transition-colors">
        <div className="w-8 h-8 border-4 border-fuchsia-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-pink-50 dark:bg-[#160B1E] transition-colors h-full overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-[#1E1226] transition-colors border-b border-pink-200 dark:border-[#3A2F43] px-6 py-4 flex items-center sticky top-0 z-10 shadow-sm">
        <button
          onClick={() => navigate('/tenses')}
          className="w-10 h-10 rounded-full hover:bg-pink-100 dark:hover:bg-[#2A1F33] flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors mr-4 cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white leading-tight transition-colors">{tense.name_en}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium transition-colors">{tense.name_vi}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 md:p-8">

          {/* Tabs */}
          <div className="flex bg-pink-200/50 dark:bg-slate-800/50 p-1.5 rounded-2xl mb-8 w-fit max-w-full overflow-x-auto transition-colors">
            <button
              onClick={() => setActiveTab('lesson')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all whitespace-nowrap cursor-pointer ${activeTab === 'lesson' ? 'bg-white dark:bg-[#1E1226] text-fuchsia-600 dark:text-fuchsia-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <BookOpen size={18} />
              Lý thuyết
            </button>
            <button
              onClick={() => setActiveTab('basic')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all whitespace-nowrap cursor-pointer ${activeTab === 'basic' ? 'bg-white dark:bg-[#1E1226] text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <PenTool size={18} />
              Cơ bản
            </button>
            <button
              onClick={() => isAdvancedUnlocked && setActiveTab('advanced')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all whitespace-nowrap cursor-pointer ${!isAdvancedUnlocked ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed' :
                activeTab === 'advanced' ? 'bg-white dark:bg-[#1E1226] text-fuchsia-600 dark:text-fuchsia-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              {!isAdvancedUnlocked ? <Lock size={18} /> : <PenTool size={18} />}
              Nâng Cao
            </button>
          </div>

          {/* Tab Content */}
          <div className="pb-20">
            {activeTab === 'lesson' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Video Section */}
                <LazyVideo videoId={tense.video_id} title={tense.name_en} />

                {/* Formula */}
                <div className="bg-white dark:bg-[#1E1226] rounded-3xl p-8 shadow-sm border border-pink-100 dark:border-[#3A2F43] transition-colors">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2 transition-colors">
                    <span className="w-8 h-8 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400 flex items-center justify-center transition-colors"></span>
                    Công thức
                  </h3>
                  <div className="grid gap-4">
                    <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl p-5 border border-emerald-100 dark:border-emerald-500/20">
                      <div className="text-emerald-800 dark:text-emerald-400 font-bold mb-1">
                        {tense.id < 100 ? 'Khẳng định (+)' : 'Cấu trúc 1'}
                      </div>
                      <code className="text-lg text-emerald-900 dark:text-emerald-300 whitespace-pre-wrap">{tense.formula?.affirmative || 'N/A'}</code>
                    </div>
                    <div className="bg-rose-50 dark:bg-rose-500/10 rounded-2xl p-5 border border-rose-100 dark:border-rose-500/20">
                      <div className="text-rose-800 dark:text-rose-400 font-bold mb-1">
                        {tense.id < 100 ? 'Phủ định (-)' : 'Cấu trúc 2'}
                      </div>
                      <code className="text-lg text-rose-900 dark:text-rose-300 whitespace-pre-wrap">{tense.formula?.negative || 'N/A'}</code>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl p-5 border border-indigo-100 dark:border-indigo-500/20">
                      <div className="text-indigo-800 dark:text-indigo-400 font-bold mb-1">
                        {tense.id < 100 ? 'Nghi vấn (?)' : 'Cấu trúc 3'}
                      </div>
                      <code className="text-lg text-indigo-900 dark:text-indigo-300 whitespace-pre-wrap">{tense.formula?.interrogative || 'N/A'}</code>
                    </div>
                  </div>
                </div>

                {/* Usage */}
                <div className="bg-white dark:bg-[#1E1226] rounded-3xl p-8 shadow-sm border border-pink-100 dark:border-[#3A2F43] transition-colors">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2 transition-colors">
                    <span className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center transition-colors"></span>
                    Cách dùng
                  </h3>
                  <ul className="space-y-3">
                    {(tense.usage || []).map((u, i) => (
                      <li key={i} className="flex items-start gap-3 text-slate-700 dark:text-slate-300 leading-relaxed">
                        <div className="w-2 h-2 rounded-full bg-amber-400 dark:bg-amber-500 mt-2 shrink-0"></div>
                        <span>{u}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Signals */}
                <div className="bg-white dark:bg-[#1E1226] rounded-3xl p-8 shadow-sm border border-pink-100 dark:border-[#3A2F43] transition-colors">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2 transition-colors">
                    <span className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center transition-colors"></span>
                    Dấu hiệu nhận biết
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(tense.signals || []).map((s, i) => (
                      <span key={i} className="bg-pink-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium px-4 py-2 rounded-xl border border-pink-200 dark:border-[#3A2F43] transition-colors">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'basic' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {exercises.basic.length > 0 ? (
                  <FillInBlankQuiz
                    exercises={exercises.basic}
                    level="basic"
                    tenseId={tense.id}
                    completedExerciseIds={completedExerciseIds}
                    onComplete={handleQuizComplete}
                    onExerciseUpdate={handleExerciseUpdate}
                  />
                ) : (
                  <div className="bg-white dark:bg-[#1E1226] rounded-3xl p-10 text-center shadow-sm border border-pink-200 dark:border-[#3A2F43] text-slate-500 dark:text-slate-400 transition-colors">
                    Chưa có bài tập cơ bản cho thì này.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'advanced' && isAdvancedUnlocked && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {exercises.advanced.length > 0 ? (
                  <FillInBlankQuiz
                    exercises={exercises.advanced}
                    level="advanced"
                    tenseId={tense.id}
                    completedExerciseIds={completedExerciseIds}
                    onComplete={handleQuizComplete}
                    onExerciseUpdate={handleExerciseUpdate}
                  />
                ) : (
                  <div className="bg-white dark:bg-[#1E1226] rounded-3xl p-10 text-center shadow-sm border border-pink-200 dark:border-[#3A2F43] text-slate-500 dark:text-slate-400 transition-colors">
                    Chưa có bài tập nâng cao cho thì này.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
