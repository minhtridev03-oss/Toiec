import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, BookOpen, AlertCircle } from 'lucide-react';

export default function SubCategories() {
  const { mainGroupName } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});

  useEffect(() => {
    if (user && mainGroupName) {
      fetchSubCategories();
    }
  }, [user, mainGroupName]);

  const fetchSubCategories = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('id, name, icon, color, bg')
        .ilike('name', `${mainGroupName}||%`)
        .order('created_at', { ascending: true });

      if (catError) throw catError;
      setSubCategories(catData || []);

      const statsMap = {};
      await Promise.all((catData || []).map(async (cat) => {
        const { count: totalCount } = await supabase
          .from('topic_vocabularies')
          .select('id', { count: 'exact', head: true })
          .eq('category_id', cat.id);

        const { data: learnedData } = await supabase
          .from('user_topic_vocabularies')
          .select('vocabulary_id, topic_vocabularies!inner(category_id)')
          .eq('user_id', user.id)
          .eq('is_learned', true)
          .eq('topic_vocabularies.category_id', cat.id);

        statsMap[cat.id] = {
          total: totalCount || 0,
          learned: learnedData ? learnedData.length : 0,
        };
      }));
      setStats(statsMap);
    } catch (err) {
      console.error('Lỗi khi tải danh mục con:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto w-full">
        <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse mb-8"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-white dark:bg-[#1E1226] rounded-2xl animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto w-full">
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex items-start gap-4">
          <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={22} />
          <div>
            <h3 className="font-bold text-red-800">Error loading data</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto w-full transition-colors">
      <button
        onClick={() => navigate('/categories')}
        className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 mb-6 transition-colors cursor-pointer w-fit"
      >
        <ArrowLeft size={20} />
        <span className="font-medium">Back to Main Topics</span>
      </button>

      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white transition-colors">{mainGroupName}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 transition-colors">Choose a specific sub-topic to learn</p>
      </div>

      {subCategories.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-[#1E1226] rounded-2xl border border-pink-200 dark:border-[#3A2F43] transition-colors">
          <BookOpen size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4 transition-colors" />
          <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors">No sub-topics available.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {subCategories.map((cat) => {
            const subName = cat.name.split('||')[1] || cat.name;
            const catStats = stats[cat.id] || { total: 0, learned: 0 };
            const progressPercent = catStats.total > 0
              ? Math.round((catStats.learned / catStats.total) * 100)
              : 0;

            return (
              <div
                key={cat.id}
                onClick={() => navigate(`/categories/${cat.id}`)}
                className="bg-white dark:bg-[#1E1226] rounded-2xl p-5 shadow-sm border border-pink-200 dark:border-[#3A2F43] hover:border-fuchsia-400 dark:hover:border-fuchsia-500 transition-all cursor-pointer group flex items-center justify-between"
              >
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400 transition-colors text-lg">{subName}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{catStats.total} words</p>
                </div>
                
                <div className="text-right">
                  <div className="text-xs font-semibold text-fuchsia-600 dark:text-fuchsia-400 mb-1">{progressPercent}%</div>
                  <div className="w-16 bg-pink-100 dark:bg-fuchsia-900/40 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-fuchsia-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
