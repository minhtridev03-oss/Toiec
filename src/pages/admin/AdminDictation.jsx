import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Plus, Pencil, Trash2, Save, X, ChevronDown, ChevronUp,
  Headphones, AlertCircle, CheckCircle2, Play
} from 'lucide-react';

export default function AdminDictation() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedVideoId, setExpandedVideoId] = useState(null);
  const [segments, setSegments] = useState([]);
  const [loadingSegments, setLoadingSegments] = useState(false);

  // Form states
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [videoForm, setVideoForm] = useState({
    title: '',
    description: '',
    youtube_id: '',
    category: 'toeic',
    level: 'beginner',
    is_active: true
  });

  const [showSegmentForm, setShowSegmentForm] = useState(false);
  const [editingSegment, setEditingSegment] = useState(null);
  const [segmentForm, setSegmentForm] = useState({
    start_time: 0,
    end_time: 10,
    mode: 'full_sentence',
    transcript: '',
    display_template: '',
    target_words: '',
    explanation: '',
    step_order: 1,
  });

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from('dictation_videos')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setVideos(data || []);
    } catch (err) {
      showToast('Lỗi tải dữ liệu: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSegments = async (videoId) => {
    setLoadingSegments(true);
    try {
      const { data, error } = await supabase
        .from('dictation_segments')
        .select('*')
        .eq('video_id', videoId)
        .order('step_order', { ascending: true });
      if (error) throw error;
      setSegments(data || []);
    } catch (err) {
      showToast('Lỗi tải phân đoạn: ' + err.message, 'error');
    } finally {
      setLoadingSegments(false);
    }
  };

  const toggleVideo = (videoId) => {
    if (expandedVideoId === videoId) {
      setExpandedVideoId(null);
      setSegments([]);
    } else {
      setExpandedVideoId(videoId);
      fetchSegments(videoId);
    }
  };

  // === VIDEO CRUD ===
  const handleSaveVideo = async () => {
    if (!videoForm.title.trim() || !videoForm.youtube_id.trim()) {
      showToast('Vui lòng nhập tiêu đề và Youtube ID', 'error');
      return;
    }

    try {
      if (editingVideo) {
        const { error } = await supabase
          .from('dictation_videos')
          .update(videoForm)
          .eq('id', editingVideo.id);
        if (error) throw error;
        showToast('Đã cập nhật bài nghe!');
      } else {
        const { error } = await supabase
          .from('dictation_videos')
          .insert([videoForm]);
        if (error) throw error;
        showToast('Đã tạo bài nghe mới!');
      }
      setShowVideoForm(false);
      setEditingVideo(null);
      setVideoForm({ title: '', description: '', youtube_id: '', category: 'toeic', level: 'beginner', is_active: true });
      fetchVideos();
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    }
  };

  const handleDeleteVideo = async (id) => {
    if (!window.confirm('Xóa bài nghe này và tất cả các phân đoạn liên quan?')) return;
    try {
      await supabase.from('dictation_segments').delete().eq('video_id', id);
      const { error } = await supabase.from('dictation_videos').delete().eq('id', id);
      if (error) throw error;
      showToast('Đã xóa bài nghe!');
      if (expandedVideoId === id) {
        setExpandedVideoId(null);
        setSegments([]);
      }
      fetchVideos();
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    }
  };

  // === SEGMENT CRUD ===
  const handleSaveSegment = async () => {
    if (!segmentForm.transcript.trim()) {
      showToast('Vui lòng nhập câu gốc (transcript)', 'error');
      return;
    }

    try {
      const payload = {
        video_id: expandedVideoId,
        start_time: segmentForm.start_time,
        end_time: segmentForm.end_time,
        mode: segmentForm.mode,
        transcript: segmentForm.transcript,
        answer: segmentForm.transcript, // map transcript as answer for the check logic
        display_template: segmentForm.display_template,
        step_order: segmentForm.step_order,
      };

      if (editingSegment) {
        const { error } = await supabase
          .from('dictation_segments')
          .update(payload)
          .eq('id', editingSegment.id);
        if (error) throw error;
        showToast('Đã cập nhật phân đoạn!');
      } else {
        const { error } = await supabase
          .from('dictation_segments')
          .insert([payload]);
        if (error) throw error;
        showToast('Đã thêm phân đoạn mới!');
      }
      setShowSegmentForm(false);
      setEditingSegment(null);
      setSegmentForm({ start_time: 0, end_time: 10, mode: 'full_sentence', transcript: '', display_template: '', target_words: '', explanation: '', step_order: segments.length + 1 });
      fetchSegments(expandedVideoId);
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    }
  };

  const handleDeleteSegment = async (id) => {
    if (!window.confirm('Xóa phân đoạn này?')) return;
    try {
      const { error } = await supabase.from('dictation_segments').delete().eq('id', id);
      if (error) throw error;
      showToast('Đã xóa phân đoạn!');
      fetchSegments(expandedVideoId);
    } catch (err) {
      showToast('Lỗi: ' + err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-slate-50 dark:bg-[#0F1117]">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 bg-slate-50 dark:bg-[#0F1117] min-h-screen transition-colors">
      <div className="max-w-5xl mx-auto">
        {/* Toast */}
        {toast && (
          <div className={`fixed top-6 right-6 z-[100] flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-300 ${
            toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
          }`}>
            {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Headphones size={26} className="text-emerald-600 dark:text-emerald-400" />
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Quản lý Luyện Nghe</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{videos.length} bài nghe</p>
          </div>
          <button
            onClick={() => {
              setEditingVideo(null);
              setVideoForm({ title: '', description: '', youtube_id: '', category: 'toeic', level: 'beginner', is_active: true });
              setShowVideoForm(true);
            }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-2.5 rounded-xl transition-colors shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30"
          >
            <Plus size={18} />
            Thêm bài nghe
          </button>
        </div>

        {/* Video Form Modal */}
        {showVideoForm && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#1E1226] rounded-2xl p-6 w-full max-w-lg border border-slate-200 dark:border-[#3A2F43] shadow-2xl">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
                {editingVideo ? 'Sửa bài nghe' : 'Thêm bài nghe mới'}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Tiêu đề *</label>
                  <input
                    type="text"
                    value={videoForm.title}
                    onChange={(e) => setVideoForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Mô tả</label>
                  <textarea
                    value={videoForm.description}
                    onChange={(e) => setVideoForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Youtube ID (hoặc URL) *</label>
                  <input
                    type="text"
                    value={videoForm.youtube_id}
                    onChange={(e) => setVideoForm(f => ({ ...f, youtube_id: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="VD: dQw4w9WgXcQ"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Thể loại</label>
                    <select
                      value={videoForm.category}
                      onChange={(e) => setVideoForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      <option value="toeic">TOEIC</option>
                      <option value="ielts">IELTS</option>
                      <option value="general">Giao tiếp chung</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Trình độ</label>
                    <select
                      value={videoForm.level}
                      onChange={(e) => setVideoForm(f => ({ ...f, level: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      <option value="beginner">Sơ cấp</option>
                      <option value="intermediate">Trung cấp</option>
                      <option value="advanced">Cao cấp</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={videoForm.is_active}
                    onChange={(e) => setVideoForm(f => ({ ...f, is_active: e.target.checked }))}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-slate-700 dark:text-slate-300">Hoạt động (Hiển thị cho user)</label>
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-5">
                <button
                  onClick={() => { setShowVideoForm(false); setEditingVideo(null); }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#3A2F43] rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveVideo}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Save size={16} />
                  {editingVideo ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Segment Form Modal */}
        {showSegmentForm && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-[#1E1226] rounded-2xl p-6 w-full max-w-2xl border border-slate-200 dark:border-[#3A2F43] shadow-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
                {editingSegment ? 'Sửa phân đoạn' : 'Thêm phân đoạn mới'}
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Thời gian bắt đầu (giây)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={segmentForm.start_time}
                      onChange={(e) => setSegmentForm(f => ({ ...f, start_time: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Thời gian kết thúc (giây)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={segmentForm.end_time}
                      onChange={(e) => setSegmentForm(f => ({ ...f, end_time: parseFloat(e.target.value) || 0 }))}
                      className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Chế độ (Mode)</label>
                    <select
                      value={segmentForm.mode}
                      onChange={(e) => setSegmentForm(f => ({ ...f, mode: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      <option value="full_sentence">Gõ cả câu (Full Sentence)</option>
                      <option value="fill_blank">Điền vào chỗ trống (Fill in Blank)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Thứ tự</label>
                    <input
                      type="number"
                      value={segmentForm.step_order}
                      onChange={(e) => setSegmentForm(f => ({ ...f, step_order: parseInt(e.target.value) || 1 }))}
                      className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Nội dung câu (Transcript) *</label>
                  <textarea
                    value={segmentForm.transcript}
                    onChange={(e) => setSegmentForm(f => ({ ...f, transcript: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                    rows={2}
                  />
                  <p className="text-xs text-slate-400 mt-1">Là đáp án người dùng cần nhập để qua bài.</p>
                </div>

                {segmentForm.mode === 'fill_blank' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Mẫu hiển thị (Display Template)</label>
                    <textarea
                      value={segmentForm.display_template}
                      onChange={(e) => setSegmentForm(f => ({ ...f, display_template: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                      rows={2}
                    />
                    <p className="text-xs text-slate-400 mt-1">Dùng [blank] để đại diện cho ô trống. VD: This is a [blank] sentence.</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Giải thích / Dịch nghĩa (Tùy chọn)</label>
                  <textarea
                    value={segmentForm.explanation}
                    onChange={(e) => setSegmentForm(f => ({ ...f, explanation: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] rounded-xl px-4 py-2text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-5">
                <button
                  onClick={() => { setShowSegmentForm(false); setEditingSegment(null); }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#3A2F43] rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveSegment}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Save size={16} />
                  {editingSegment ? 'Cập nhật' : 'Thêm'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Videos List */}
        <div className="space-y-3">
          {videos.length === 0 && (
            <div className="bg-white dark:bg-[#1E1226] rounded-2xl p-10 text-center border border-dashed border-slate-300 dark:border-[#3A2F43] text-slate-500 dark:text-slate-400">
              Chưa có video bài nghe nào.
            </div>
          )}

          {videos.map((video) => (
            <div key={video.id} className="bg-white dark:bg-[#1E1226] rounded-2xl border border-slate-100 dark:border-[#3A2F43] overflow-hidden transition-colors">
              {/* Video Header */}
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#232736] transition-colors"
                onClick={() => toggleVideo(video.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Headphones size={16} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate">{video.title}</h3>
                    <div className="flex gap-2 items-center text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      <span className="capitalize">{video.level}</span>
                      <span>•</span>
                      <span>ID: {video.youtube_id}</span>
                      {!video.is_active && <span className="text-red-500 font-bold ml-2">Đang ẩn</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingVideo(video);
                      setVideoForm({
                        title: video.title,
                        description: video.description || '',
                        youtube_id: video.youtube_id,
                        category: video.category,
                        level: video.level,
                        is_active: video.is_active
                      });
                      setShowVideoForm(true);
                    }}
                    className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteVideo(video.id); }}
                    className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                  {expandedVideoId === video.id ? (
                    <ChevronUp size={18} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={18} className="text-slate-400" />
                  )}
                </div>
              </div>

              {/* Expanded Segments */}
              {expandedVideoId === video.id && (
                <div className="border-t border-slate-100 dark:border-[#3A2F43] bg-slate-50/50 dark:bg-[#0F1117]/50 px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300">
                      Danh sách phân đoạn ({segments.length})
                    </h4>
                    <button
                      onClick={() => {
                        setEditingSegment(null);
                        setSegmentForm({
                          start_time: 0,
                          end_time: 10,
                          mode: 'full_sentence',
                          transcript: '',
                          display_template: '',
                          target_words: '',
                          explanation: '',
                          step_order: segments.length + 1,
                        });
                        setShowSegmentForm(true);
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Plus size={14} />
                      Thêm phân đoạn
                    </button>
                  </div>

                  {loadingSegments ? (
                    <div className="py-6 text-center">
                      <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    </div>
                  ) : segments.length === 0 ? (
                    <div className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                      Chưa có phân đoạn nghe nào.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {segments.map((s, idx) => (
                        <div key={s.id} className="bg-white dark:bg-[#1E1226] rounded-xl px-4 py-3 border border-slate-100 dark:border-[#3A2F43] flex items-start gap-3">
                          <span className="text-xs font-bold text-slate-300 dark:text-slate-600 mt-1 shrink-0 w-6 text-center">
                            {s.step_order || idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-400 px-1.5 py-0.5 rounded uppercase">
                                {s.start_time}s - {s.end_time}s
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 rounded uppercase">
                                {s.mode === 'fill_blank' ? 'Fill Blank' : 'Full Sentence'}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-0.5">{s.transcript}</p>
                            {s.mode === 'fill_blank' && (
                              <p className="text-xs text-slate-500 dark:text-slate-400">Hiển thị: {s.display_template}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setEditingSegment(s);
                                setSegmentForm({
                                  start_time: s.start_time,
                                  end_time: s.end_time,
                                  mode: s.mode,
                                  transcript: s.transcript,
                                  display_template: s.display_template || '',
                                  target_words: s.target_words || '',
                                  explanation: s.explanation || '',
                                  step_order: s.step_order || idx + 1,
                                });
                                setShowSegmentForm(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-colors"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteSegment(s.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-md transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
