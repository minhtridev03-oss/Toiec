import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { BookType, ArrowRight, CheckCircle2, Lock, Unlock } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';

const COPY = {
  vi: {
    title: 'Làm chủ 12 Thì Tiếng Anh',
    desc: 'Nắm vững ngữ pháp cốt lõi qua các bài học chi tiết và bài tập tương tác.',
    presentTenses: 'Các thì Hiện Tại',
    pastTenses: 'Các thì Quá Khứ',
    futureTenses: 'Các thì Tương Lai',
    completed: 'Đã hoàn thành',
    learnNow: 'Học ngay',
    lockedTitle: 'Hoàn thành 12 thì để mở khóa',
    lockedDesc: 'Hãy hoàn thành 100% tất cả 12 thì cơ bản phía trên để mở khóa các bài nâng cao nhé!',
    advancedTenses: 'Ngữ pháp Nâng cao',
    testTitle: 'Bài kiểm tra tổng hợp',
    requires100: 'Yêu cầu hoàn thành 100% 12 thì',
    unlocked: 'Đã mở khóa',
    challengeTitle: 'Thử thách: 100 Câu Hỏi Hỗn Hợp',
    challengeDesc: 'Kiểm tra toàn diện kiến thức của bạn với 100 câu hỏi ngữ pháp hỗn hợp của 12 thì tiếng Anh.',
    otherTopics: 'Các chủ đề ngữ pháp khác',
  },
  en: {
    title: 'Master 12 English Tenses',
    desc: 'Master core grammar with detailed lessons and interactive practice.',
    presentTenses: 'Present Tenses',
    pastTenses: 'Past Tenses',
    futureTenses: 'Future Tenses',
    completed: 'Completed',
    learnNow: 'Learn Now',
    lockedTitle: 'Complete 12 tenses to unlock',
    lockedDesc: 'Please complete 100% of all 12 basic tenses above to unlock advanced lessons!',
    advancedTenses: 'Advanced Grammar',
    testTitle: 'Comprehensive Test',
    requires100: 'Requires 100% completion of 12 tenses',
    unlocked: 'Unlocked',
    challengeTitle: 'Challenge: 100 Mixed Questions',
    challengeDesc: 'Comprehensively test your knowledge with 100 mixed grammar questions across all 12 English tenses.',
    otherTopics: 'Other Grammar Topics',
  }
};

export default function TenseList() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const text = COPY[locale];
  const [tenses, setTenses] = useState([]);
  const [progressData, setProgressData] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTensesAndProgress();
  }, [user]);

  const fetchTensesAndProgress = async () => {
    try {
      setLoading(true);
      const { data: tensesData, error: tensesError } = await supabase
        .from('tenses')
        .select('*')
        .order('id', { ascending: true });
        
      if (tensesError) throw tensesError;
      setTenses(tensesData || []);

      if (user) {
        const { data: exercisesData } = await supabase
          .from('tense_exercises')
          .select('id, tense_id');

        const { data: completedData } = await supabase
          .from('user_tense_exercises')
          .select('exercise_id')
          .eq('user_id', user.id);

        if (exercisesData && completedData) {
          const completedSet = new Set(completedData.map(c => c.exercise_id));
          const progressMap = {};
          
          tensesData.forEach(t => {
            progressMap[t.id] = { total: 0, completed: 0, percentage: 0 };
          });

          exercisesData.forEach(ex => {
            if (progressMap[ex.tense_id]) {
              progressMap[ex.tense_id].total++;
              if (completedSet.has(ex.id)) {
                progressMap[ex.tense_id].completed++;
              }
            }
          });

          Object.keys(progressMap).forEach(key => {
            const data = progressMap[key];
            if (data.total > 0) {
              data.percentage = Math.round((data.completed / data.total) * 100);
            }
          });

          setProgressData(progressMap);
        }
      }
    } catch (error) {
      console.error('Error fetching tenses:', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-pink-50 dark:bg-[#160B1E] transition-colors">
        <div className="w-8 h-8 border-4 border-fuchsia-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const coreTenses = tenses.filter(t => t.id >= 1 && t.id <= 12);
  const presentTenses = coreTenses.filter(t => t.name_vi.includes('Hiện Tại'));
  const pastTenses = coreTenses.filter(t => t.name_vi.includes('Quá Khứ'));
  const futureTenses = coreTenses.filter(t => t.name_vi.includes('Tương Lai'));

  const all12Tenses100 = coreTenses.length === 12 && coreTenses.every(t => progressData[t.id]?.percentage === 100);

  const renderGroup = (title, groupTenses, colorClass) => (
    <div className="mb-12">
      <h3 className={`text-xl font-bold mb-6 flex items-center gap-2 ${colorClass}`}>
        <div className="w-2 h-6 rounded-full bg-current"></div>
        {title}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {groupTenses.map((tense) => {
          const progress = progressData[tense.id] || { total: 0, completed: 0, percentage: 0 };
          const isCompleted = progress.percentage === 100;
          
          return (
            <motion.div
              key={tense.id}
              whileHover={{ y: -4 }}
              className={`bg-white dark:bg-[#1E1226] rounded-2xl p-6 shadow-sm border ${isCompleted ? 'border-green-500 shadow-green-100 dark:shadow-green-900/20' : 'border-pink-100 dark:border-[#3A2F43]'} hover:shadow-xl hover:border-fuchsia-200 dark:hover:border-fuchsia-500/50 transition-all cursor-pointer group flex flex-col relative overflow-hidden`}
              onClick={() => navigate(`/tenses/${tense.slug}`)}
            >
              <div className="flex justify-between items-start mb-4 transition-colors">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isCompleted ? 'bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 group-hover:bg-fuchsia-50 dark:group-hover:bg-fuchsia-500/20 group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400'}`}>
                  <BookType size={24} />
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
              
              <h4 className="font-bold text-slate-800 dark:text-white text-lg mb-1 transition-colors">{locale === 'vi' ? tense.name_vi : tense.name_en}</h4>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 flex-1 transition-colors">{locale === 'vi' ? tense.name_en : tense.name_vi}</p>
              
              {!isCompleted && user && progress.total > 0 && (
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mb-4 overflow-hidden transition-colors">
                  <div className="bg-fuchsia-500 h-full rounded-full transition-all duration-1000" style={{ width: `${progress.percentage}%` }}></div>
                </div>
              )}

              <div className="flex items-center text-sm font-semibold text-fuchsia-600 opacity-0 group-hover:opacity-100 transition-opacity">
                {text.learnNow} <ArrowRight size={16} className="ml-1" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex-1 p-6 md:p-10 bg-pink-50 dark:bg-[#160B1E] overflow-y-auto transition-colors">
      <div className="w-[90%] mx-auto">
        <div className="mb-10 transition-colors">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight transition-colors">{text.title}</h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg transition-colors">{text.desc}</p>
        </div>

        {renderGroup(text.presentTenses, presentTenses, 'text-emerald-600')}
        {renderGroup(text.pastTenses, pastTenses, 'text-amber-600')}
        {renderGroup(text.futureTenses, futureTenses, 'text-indigo-600')}

        <div className="mb-12 mt-16 pt-12 border-t-2 border-dashed border-pink-200 dark:border-[#3A2F43] transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6 transition-colors">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3 transition-colors">
              <span className="text-3xl md:text-4xl">🏆</span> {text.testTitle}
            </h3>
            {!all12Tenses100 && (
              <span className="w-fit bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-500 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <Lock size={12} /> {text.requires100}
              </span>
            )}
          </div>
          
          <div 
            onClick={() => all12Tenses100 && navigate('/tenses/final-tense-test')}
            className={`relative rounded-3xl overflow-hidden p-6 md:p-8 transition-colors ${all12Tenses100 ? 'bg-gradient-to-br from-fuchsia-600 to-pink-700 text-white cursor-pointer hover:shadow-2xl hover:scale-[1.01] transition-all' : 'bg-pink-200 dark:bg-[#1E1226] border border-transparent dark:border-[#3A2F43] text-slate-400 cursor-not-allowed'}`}
          >
            {!all12Tenses100 && (
              <div className="absolute inset-0 bg-slate-100/50 dark:bg-[#160B1E]/60 backdrop-blur-sm flex flex-col items-center justify-center z-10 px-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-white dark:bg-[#232736] rounded-full flex items-center justify-center shadow-lg text-slate-400 dark:text-slate-500 mb-3 md:mb-4">
                  <Lock className="w-6 h-6 md:w-8 md:h-8" />
                </div>
                <p className="font-bold text-slate-600 dark:text-slate-300 text-base md:text-lg text-center">{text.lockedTitle}</p>
                <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mt-1.5 max-w-sm text-center leading-relaxed">{text.lockedDesc}</p>
              </div>
            )}
            
            <div className="relative z-0">
              <div className="flex justify-between items-start mb-6">
                <div className="w-16 h-16 rounded-2xl bg-white/20 dark:bg-slate-800/50 flex items-center justify-center backdrop-blur-md">
                  <BookType size={32} className={all12Tenses100 ? 'text-white' : 'text-slate-400 dark:text-slate-500'} />
                </div>
                {all12Tenses100 && (
                  <span className="bg-white/20 text-white text-sm font-bold px-4 py-2 rounded-xl backdrop-blur-md flex items-center gap-2">
                    <Unlock size={16} /> {text.unlocked}
                  </span>
                )}
              </div>
              <h4 className="text-3xl font-extrabold mb-2 dark:text-white transition-colors">{text.challengeTitle}</h4>
              <p className={`transition-colors ${all12Tenses100 ? 'text-fuchsia-100 text-lg max-w-2xl' : 'text-slate-400 dark:text-slate-500 text-lg'}`}>
                {text.challengeDesc}
              </p>
            </div>
          </div>
        </div>

        {renderGroup(text.otherTopics, [
          { id: 'g1', name_en: 'Passive Voice', name_vi: 'Câu bị động (Passive Voice)', slug: 'passive-voice' },
          { id: 'g2', name_en: 'Conditionals', name_vi: 'Câu điều kiện (Conditionals)', slug: 'conditionals' },
          { id: 'g3', name_en: 'Reported Speech', name_vi: 'Câu tường thuật (Reported Speech)', slug: 'reported-speech' },
          { id: 'g4', name_en: 'Relative Clauses', name_vi: 'Mệnh đề quan hệ (Relative Clauses)', slug: 'relative-clauses' },
          { id: 'g5', name_en: 'Gerunds & Infinitives', name_vi: 'Danh động từ & Động từ nguyên thể (Gerunds & Infinitives)', slug: 'gerunds-infinitives' },
          { id: 'g6', name_en: 'Comparisons', name_vi: 'Câu so sánh (Comparisons)', slug: 'comparisons' },
          { id: 'g7', name_en: 'Modal Verbs', name_vi: 'Động từ khuyết thiếu (Modal Verbs)', slug: 'modal-verbs' },
          { id: 'g8', name_en: 'Articles', name_vi: 'Mạo từ (Articles)', slug: 'articles' }
        ], 'text-purple-600')}

        {renderGroup(text.advancedTenses, [
          { id: 'a1', name_en: 'Inversion', name_vi: 'Đảo ngữ (Inversion)', slug: 'inversion' },
          { id: 'a2', name_en: 'Reduced Clauses', name_vi: 'Mệnh đề rút gọn (Reduced Clauses)', slug: 'reduced-clauses' },
          { id: 'a3', name_en: 'Subjunctive Mood', name_vi: 'Câu giả định (Subjunctive Mood)', slug: 'subjunctive-mood' },
          { id: 'a4', name_en: 'Cleft Sentences', name_vi: 'Câu chẻ (Cleft Sentences)', slug: 'cleft-sentences' },
          { id: 'a5', name_en: 'Subject-Verb Agreement', name_vi: 'Sự hòa hợp chủ ngữ & động từ (Subject-Verb Agreement)', slug: 'subject-verb-agreement' },
          { id: 'a6', name_en: 'Causative Form', name_vi: 'Cấu trúc nhờ vả (Causative Form)', slug: 'causative-form' },
          { id: 'a7', name_en: 'Tag Questions', name_vi: 'Câu hỏi đuôi (Tag Questions)', slug: 'tag-questions' },
          { id: 'a8', name_en: 'Connectors', name_vi: 'Từ nối (Connectors)', slug: 'connectors' }
        ], 'text-rose-600')}
      </div>
    </div>
  );
}
