import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import VideoDictationPlayer from '../components/VideoDictationPlayer';

export default function DictationDetail() {
  const { id } = useParams();
  const [videoData, setVideoData] = useState(null);
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDictationData = async () => {
      try {
        setLoading(true);
        const { data: video, error: videoError } = await supabase
          .from('dictation_videos')
          .select('id, title, description, youtube_id, thumbnail_url, level, category, audio_storage_path')
          .eq('id', id)
          .single();

        if (videoError) throw videoError;

        // Lấy các phân đoạn nghe của video đó
        const { data: segmentsData, error: segmentsError } = await supabase
          .from('dictation_segments')
          .select('id, video_id, step_order, start_time, end_time, mode, display_template, answer, transcript')
          .eq('video_id', video.id)
          .order('step_order', { ascending: true });

        if (segmentsError) throw segmentsError;

        setVideoData(video);
        setSegments(segmentsData);
      } catch (error) {
        console.error('Error loading listening data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDictationData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-pink-50 dark:bg-[#160B1E] transition-colors">
        <p className="text-slate-500 dark:text-slate-400 font-medium">Loading lesson data...</p>
      </div>
    );
  }

  if (!videoData || segments.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-pink-50 dark:bg-[#160B1E] transition-colors">
        <p className="text-slate-500 dark:text-slate-400 font-medium">Lesson data not found. Please check the database.</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col bg-pink-50 dark:bg-[#110815] transition-colors">
      <VideoDictationPlayer 
        videoData={videoData} 
        segments={segments} 
      />
    </div>
  );
}
