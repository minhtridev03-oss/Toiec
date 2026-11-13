import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import VideoShadowingPlayer from '../components/VideoShadowingPlayer';
import { dictationLessonCache } from '../lib/lessonCache';

export default function ShadowingDetail() {
  const { id } = useParams();
  const cached = id ? dictationLessonCache.get(id) : null;
  const [videoData, setVideoData] = useState(cached?.video || null);
  const [segments, setSegments] = useState(cached?.segments || []);
  const [loading, setLoading] = useState(!cached);
  const [fetchError, setFetchError] = useState(null);

  const fetchShadowingData = useCallback(async () => {
    try {
      if (!cached) setLoading(true);
      setFetchError(null);

      const { data: video, error: videoError } = await supabase
        .from('dictation_videos')
        .select('id, title, description, youtube_id, thumbnail_url, level, category, audio_storage_path')
        .eq('id', id)
        .single();

      if (videoError) throw videoError;

      // Lấy các phân đoạn câu của video
      const { data: segmentsData, error: segmentsError } = await supabase
        .from('dictation_segments')
        .select('id, video_id, step_order, start_time, end_time, mode, display_template, answer, transcript')
        .eq('video_id', video.id)
        .order('step_order', { ascending: true });

      if (segmentsError) throw segmentsError;

      dictationLessonCache.set(id, {
        video,
        segments: segmentsData || [],
      });

      setVideoData(video);
      setSegments(segmentsData || []);
    } catch (error) {
      console.error('Error loading shadowing data:', error);
      setFetchError(error.message || 'Lỗi tải bài học');
    } finally {
      setLoading(false);
    }
  }, [id, cached]);

  useEffect(() => {
    fetchShadowingData();
  }, [fetchShadowingData]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3 p-8 rounded-3xl bg-white/30 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/35 dark:border-white/10 shadow-xl text-center">
          <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Đang chuẩn bị phòng thu Shadowing Reflex Studio...</p>
        </div>
      </div>
    );
  }

  if (!videoData || segments.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3 p-8 rounded-3xl bg-white/30 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/35 dark:border-white/10 shadow-xl text-center max-w-md">
          <p className="text-base font-bold text-slate-800 dark:text-slate-100">
            {fetchError ? 'Không thể tải bài luyện nói' : 'Không tìm thấy dữ liệu bài luyện nói'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {fetchError || 'Vui lòng kiểm tra lại đường dẫn hoặc quay lại danh sách bài học.'}
          </p>
          <button
            type="button"
            onClick={fetchShadowingData}
            className="mt-2 px-4 py-2 rounded-xl bg-rose-500 text-white text-xs font-bold hover:bg-rose-600 transition-colors cursor-pointer shadow-lg shadow-rose-500/20"
          >
            Thử tải lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-transparent overflow-hidden">
      <VideoShadowingPlayer 
        videoData={videoData} 
        segments={segments} 
      />
    </div>
  );
}
