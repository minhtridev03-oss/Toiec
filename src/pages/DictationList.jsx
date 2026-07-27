import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Headphones, Play, Clock, ChevronRight, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import VideoListModal from '../components/VideoListModal';

const CACHE_DURATION = 5 * 60 * 1000;
let dictationCache = {};

const COPY = {
  vi: {
    allLevels: 'Tất cả cấp độ',
    continueLearning: 'Tiếp tục học',
    newLessons: 'Bài học mới',
    noLessons: 'Không tìm thấy bài học nào.',
    viewMore: 'Xem thêm',
    progress: 'Tiến độ',
    notStarted: 'Chưa học',
  },
  en: {
    allLevels: 'All Levels',
    continueLearning: 'Continue Learning',
    newLessons: 'New Lessons',
    noLessons: 'No lessons found.',
    viewMore: 'View more',
    progress: 'Progress',
    notStarted: 'Not started',
  }
};

export default function DictationList() {
  const { user } = useAuth();
  const { locale } = useLocale();
  const text = COPY[locale];
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeLevel, setActiveLevel] = useState('All'); // 'All', 'A1', 'A2', 'B1', 'B2', 'C1'
  const [modalData, setModalData] = useState({ isOpen: false, title: '', videos: [] });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Check cache
        const userIdStr = user ? user.id : 'guest';
        const now = Date.now();
        if (dictationCache[userIdStr] && (now - dictationCache[userIdStr].timestamp < CACHE_DURATION)) {
          setVideos(dictationCache[userIdStr].data);
          setLoading(false);
          return;
        }

        // 1. Fetch videos
        const { data: vids, error: vError } = await supabase
          .from('dictation_videos')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (vError) throw vError;

        // 2. Fetch all segments to count totals per video
        const { data: segs, error: sError } = await supabase
          .from('dictation_segments')
          .select('id, video_id');
        
        let totalMap = {};
        if (segs) {
          segs.forEach(s => {
            totalMap[s.video_id] = (totalMap[s.video_id] || 0) + 1;
          });
        }

        // 3. Fetch user progress
        let completedMap = {};
        if (user) {
          const { data: prog, error: pError } = await supabase
            .from('user_dictation_progress')
            .select('video_id')
            .eq('user_id', user.id)
            .eq('is_completed', true);
            
          if (prog) {
            prog.forEach(p => {
              completedMap[p.video_id] = (completedMap[p.video_id] || 0) + 1;
            });
          }
        }

        // Process data
        const processedVideos = (vids || []).map(v => {
          const total = totalMap[v.id] || 0;
          const completed = completedMap[v.id] || 0;
          const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
          return {
            ...v,
            totalSegments: total,
            completedSegments: completed,
            progressPercent,
            // Mock duration to 5 mins if missing
            durationStr: '5 mins'
          };
        });

        dictationCache[userIdStr] = { data: processedVideos, timestamp: now };
        setVideos(processedVideos);
      } catch (err) {
        console.error('Error fetching dictation videos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const getYoutubeThumbnail = (youtubeIdOrUrl) => {
    if (!youtubeIdOrUrl) return '';
    const match = youtubeIdOrUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    const id = match ? match[1] : youtubeIdOrUrl;
    
    if (id && id.length !== 11) {
      if (id.includes('actual_listening_2')) return '/assets/listening-covers/ielts-actual-listening-2.png';
      return '/assets/listening-covers/ielts.png';
    }
    return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
  };

  const getLevelColor = (level) => {
    const l = (level || '').toUpperCase();
    if (l === 'A1' || l === 'A2') return 'bg-emerald-500 text-white';
    if (l === 'B1' || l === 'B2') return 'bg-orange-500 text-white';
    if (l === 'C1' || l === 'C2') return 'bg-rose-500 text-white';
    return 'bg-slate-500 text-white';
  };

  // Filtered videos based on level tab
  const filteredVideos = activeLevel === 'All' 
    ? videos 
    : videos.filter(v => v.level && v.level.toUpperCase() === activeLevel);

  // Groupings
  const continueLearning = filteredVideos.filter(v => v.progressPercent > 0 && v.progressPercent < 100);
  const newLessons = [...filteredVideos].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);
  
  const categoryGroups = {};
  filteredVideos.forEach(v => {
    const cat = v.category || 'Other';
    if (!categoryGroups[cat]) categoryGroups[cat] = [];
    categoryGroups[cat].push(v);
  });

  const levels = ['All', 'A1', 'A2', 'B1', 'B2', 'C1'];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-pink-50 dark:bg-[#110815] transition-colors">
        <div className="w-10 h-10 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-pink-50 dark:bg-[#0B060F] transition-colors pb-20">
      
      {/* Top Header / Level Nav */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#0B060F]/80 backdrop-blur-md border-b border-pink-100 dark:border-white/5 shadow-sm">
        <div className="w-[90%] mx-auto">
          <div className="flex items-center gap-2 py-4 overflow-x-auto hide-scrollbar">
            {levels.map(lvl => (
              <button
                key={lvl}
                onClick={() => setActiveLevel(lvl)}
                className={`px-5 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-colors cursor-pointer ${
                  activeLevel === lvl 
                  ? 'bg-fuchsia-500 text-white shadow-md' 
                  : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-fuchsia-50 dark:hover:bg-white/10'
                }`}
              >
                {lvl === 'All' ? text.allLevels : lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-[90%] mx-auto py-8">
        
        {continueLearning.length > 0 && (
          <VideoSection 
            title={text.continueLearning} 
            videos={continueLearning} 
            getYoutubeThumbnail={getYoutubeThumbnail} 
            getLevelColor={getLevelColor} 
            onViewMore={() => setModalData({ isOpen: true, title: text.continueLearning, videos: continueLearning })}
            text={text}
          />
        )}

        <VideoSection 
          title={text.newLessons} 
          videos={newLessons} 
          getYoutubeThumbnail={getYoutubeThumbnail} 
          getLevelColor={getLevelColor} 
          onViewMore={() => setModalData({ isOpen: true, title: text.newLessons, videos: newLessons })}
          text={text}
        />

        {Object.entries(categoryGroups).map(([cat, vids]) => (
          <VideoSection 
            key={cat} 
            title={cat} 
            count={vids.length} 
            videos={vids} 
            getYoutubeThumbnail={getYoutubeThumbnail} 
            getLevelColor={getLevelColor} 
            onViewMore={() => setModalData({ isOpen: true, title: cat, videos: vids })}
            text={text}
          />
        ))}

        {filteredVideos.length === 0 && (
          <div className="py-20 text-center text-slate-500">
            {text.noLessons}
          </div>
        )}

      </div>

      <VideoListModal 
        isOpen={modalData.isOpen}
        onClose={() => setModalData({ ...modalData, isOpen: false })}
        title={modalData.title}
        videos={modalData.videos}
        getYoutubeThumbnail={getYoutubeThumbnail}
        getLevelColor={getLevelColor}
        linkPrefix="/dictation"
      />
    </div>
  );
}

function VideoSection({ title, count, videos, getYoutubeThumbnail, getLevelColor, onViewMore, text }) {
  if (!videos || videos.length === 0) return null;

  return (
    <div className="mb-12 relative group">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
          {title}
          {count > 0 && (
            <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-sm font-medium">
              {count}
            </span>
          )}
        </h2>
        
        {videos.length > 5 && (
          <button 
            onClick={onViewMore}
            className="text-fuchsia-600 hover:text-fuchsia-500 text-sm font-medium hover:underline transition-all cursor-pointer"
          >
            {text.viewMore}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        {videos.slice(0, 5).map((video, idx) => (
          <div 
            key={video.id} 
            className={`
              ${idx >= 2 ? 'hidden md:block' : ''} 
              ${idx >= 3 ? 'md:hidden lg:block' : ''} 
              ${idx >= 4 ? 'lg:hidden xl:block' : ''}
            `}
          >
            <VideoCard 
              video={video} 
              getYoutubeThumbnail={getYoutubeThumbnail} 
              getLevelColor={getLevelColor} 
              text={text}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function VideoCard({ video, getYoutubeThumbnail, getLevelColor, text }) {
  const isStarted = video.progressPercent > 0;

  return (
    <Link 
      to={`/dictation/${video.id}`}
      className="bg-white dark:bg-[#1A0E24] rounded-2xl overflow-hidden hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-fuchsia-900/20 transition-all duration-300 group border border-pink-100 dark:border-white/5 flex flex-col h-full"
    >
      <div className="relative aspect-video overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img 
          src={video.thumbnail_url || getYoutubeThumbnail(video.youtube_id)} 
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
        
        {/* Level Badge */}
        <div className="absolute top-3 left-3">
          <span className={`px-2.5 py-1 rounded border-b-[3px] border-black/20 text-xs font-bold shadow-md ${getLevelColor(video.level)}`}>
            {(video.level || 'A1').toUpperCase()}
          </span>
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 backdrop-blur-md rounded-md text-white text-xs font-medium flex items-center gap-1.5 shadow-sm">
          <Clock size={12} />
          {video.durationStr}
        </div>
        
        {/* Play Icon Hover */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-white/90 text-fuchsia-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all shadow-lg">
            <Play size={20} className="ml-1" />
          </div>
        </div>
      </div>
      
      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-base font-bold text-slate-800 dark:text-white mb-3 line-clamp-2 leading-snug group-hover:text-fuchsia-600 dark:group-hover:text-fuchsia-400 transition-colors">
          {video.title}
        </h3>
        
        <div className="mt-auto">
          {isStarted ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-500 dark:text-slate-400">{text.progress}</span>
                <span className="text-fuchsia-600 dark:text-fuchsia-500">{video.progressPercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-fuchsia-500 rounded-full" 
                  style={{ width: `${video.progressPercent}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="text-xs font-medium text-slate-400 dark:text-slate-500">
              {text.notStarted}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
