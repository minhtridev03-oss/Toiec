import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, History, Sparkles, Plus, Mic } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useLocale } from '../contexts/LocaleContext';

const CEFR_LEVELS = ['All', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const COPY = {
  vi: {
    title: 'Luyện nói',
    desc: 'Luyện nói tiếng Anh trong các tình huống thực tế với AI',
    allScenarios: 'Tất cả tình huống',
    loading: 'Đang tải...',
    all: 'Tất cả',
  },
  en: {
    title: 'Speaking Practice',
    desc: 'Practice speaking English in real-life situations with AI',
    allScenarios: 'All Scenarios',
    loading: 'Loading scenarios...',
    all: 'All',
  }
};

export default function SpeakingList() {
  const { locale } = useLocale();
  const text = COPY[locale];
  const [activeTab, setActiveTab] = useState('All');
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchScenarios();
  }, []);

  const fetchScenarios = async () => {
    try {
      const { data, error } = await supabase
        .from('speaking_scenarios')
        .select('*')
        .order('id', { ascending: true });
      if (error) throw error;

      const mapped = data.map(item => ({
        id: item.id,
        level: item.level,
        title: item.title,
        description: item.description,
        image: item.image_url,
      }));
      setScenarios(mapped);
    } catch (error) {
      console.error('Error fetching scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredScenarios = activeTab === 'All'
    ? scenarios
    : scenarios.filter(s => s.level === activeTab);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center p-10 bg-pink-50 dark:bg-[#160B1E] text-slate-500 transition-colors">{text.loading}</div>;
  }

  return (
    <div className="flex-1 p-6 md:p-10 bg-pink-50 dark:bg-[#160B1E] overflow-y-auto transition-colors">
      <div className="w-[90%] mx-auto space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-fuchsia-600/10 flex items-center justify-center text-fuchsia-600 shrink-0 transition-colors">
              <MessageSquare size={28} className="fill-fuchsia-600/20" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight transition-colors">{text.title}</h1>
              <p className="text-slate-600 dark:text-slate-400 text-lg transition-colors">{text.desc}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white transition-colors">{text.allScenarios}</h2>

          <div className="flex flex-wrap items-center gap-2">
            {CEFR_LEVELS.map(level => (
              <button
                key={level}
                onClick={() => setActiveTab(level)}
                className={`tab-btn cursor-pointer ${activeTab === level ? 'tab-btn-active' : ''}`}
              >
                {level}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredScenarios.map((scenario) => (
              <motion.div
                key={scenario.id}
                whileHover={{ y: -4 }}
                onClick={() => navigate(`/speaking/${scenario.id}`)}
                className="bg-white dark:bg-[#1E1226] rounded-3xl overflow-hidden shadow-sm border border-pink-100 dark:border-[#3A2F43] hover:shadow-xl hover:border-fuchsia-200 dark:hover:border-fuchsia-500/50 transition-all cursor-pointer group flex flex-col"
              >
                {/* Image container */}
                <div className="relative h-48 bg-slate-100 dark:bg-[#3A2F43] overflow-hidden">
                  <img
                    src={scenario.image}
                    alt={scenario.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 bg-teal-100/90 text-teal-800 text-xs font-extrabold rounded-lg backdrop-blur-sm">
                    {scenario.level}
                  </div>
                  {scenario.status && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 bg-blue-100/90 backdrop-blur-sm text-blue-700 text-xs font-bold rounded-lg flex items-center gap-1.5 border border-blue-200">
                      <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></div>
                      {scenario.status}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 line-clamp-1 group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400 transition-colors">
                    {scenario.title}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2 flex-1 leading-relaxed transition-colors">
                    {scenario.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
