import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Sparkles,
  Plus,
  Search,
  Upload,
  Image as ImageIcon,
  Flame,
  Award,
  Layers,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  RefreshCw,
  Eye,
  Sliders,
  Check,
  Power,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import UserAvatar from '../../components/common/UserAvatar';
import {
  normalizeFrame,
  uploadFrameMedia,
  deleteFrameMedia,
  FRAME_CATEGORIES,
  RARITY_CONFIG,
  DEFAULT_FALLBACK_FRAMES,
} from '../../lib/avatarFrames';
import { useAvatarFrames } from '../../contexts/AvatarFramesContext';

const GRADIENT_PRESETS = [
  { name: 'Ngọn Lửa', gradient: 'from-amber-400 via-orange-500 to-rose-600', glow: 'rgba(249, 115, 22, 0.55)' },
  { name: 'Mầm Xanh', gradient: 'from-emerald-400 via-teal-400 to-cyan-500', glow: 'rgba(16, 185, 129, 0.5)' },
  { name: 'Hoàng Kim', gradient: 'from-yellow-300 via-amber-400 to-amber-600', glow: 'rgba(245, 158, 11, 0.6)' },
  { name: 'Cyberpunk', gradient: 'from-cyan-400 via-fuchsia-500 to-violet-600', glow: 'rgba(6, 182, 212, 0.65)' },
  { name: 'Huyền Bí', gradient: 'from-purple-500 via-indigo-500 to-blue-600', glow: 'rgba(147, 51, 234, 0.55)' },
  { name: 'Hoàng Hôn', gradient: 'from-rose-400 via-pink-500 to-amber-500', glow: 'rgba(244, 63, 94, 0.5)' },
  { name: 'Băng Giá', gradient: 'from-sky-300 via-cyan-400 to-blue-500', glow: 'rgba(14, 165, 233, 0.5)' },
  { name: 'Vũ Trụ', gradient: 'from-fuchsia-600 via-purple-600 to-cyan-400', glow: 'rgba(192, 38, 211, 0.6)' },
];

const ANIMATION_OPTIONS = [
  { id: 'none', label: 'Không hiệu ứng (Tĩnh)' },
  { id: 'spin-slow', label: 'Xoay tròn mượt mà (Spin)' },
  { id: 'pulse-slow', label: 'Nhấp nháy thở chậm (Pulse)' },
  { id: 'shimmer', label: 'Lấp lánh viền (Shimmer)' },
];

const EMPTY_FORM = {
  id: '',
  name: '',
  description: '',
  category: 'special', // 'attendance' | 'level' | 'special' | 'default'
  unlockType: 'free',  // 'streak' | 'level' | 'free'
  unlockValue: 0,
  rarity: 'common',    // 'common' | 'rare' | 'epic' | 'legendary'
  badgeIcon: '✨',
  frameType: 'media',  // 'media' (Upload Ảnh/GIF) | 'css' (Gradient CSS)
  frameUrl: '',
  frameScale: 1.6,     // Tỉ lệ kích thước khung (1.0 = 100%, 1.8 = 180%)
  offsetX: 0,          // Độ dịch chuyển trục X (%)
  offsetY: 0,          // Độ dịch chuyển trục Y (%)
  gradient: 'from-amber-400 via-orange-500 to-rose-600',
  glowColor: 'rgba(249, 115, 22, 0.55)',
  animation: 'none',
  sortOrder: 10,
  isActive: true,
};

export default function AdminAvatarFrames() {
  const { refreshFrames: triggerGlobalRefresh } = useAvatarFrames();
  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'media' | 'css'

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingFrame, setEditingFrame] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [uploadFile, setUploadFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [saving, setSaving] = useState(false);

  // Preview options
  const [previewSize, setPreviewSize] = useState('xl'); // 'md', 'lg', 'xl', '2xl'

  const fileInputRef = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  // Fetch all frames (including inactive) for admin
  const fetchFrames = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('avatar_frames')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      const normalized = (data || []).map(normalizeFrame);
      setFrames(normalized);
    } catch (err) {
      console.error('Lỗi tải danh sách khung:', err);
      showToast('Không tải được danh sách khung: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchFrames();
  }, [fetchFrames]);

  // Quick stats
  const stats = useMemo(() => {
    const total = frames.length;
    const active = frames.filter((f) => f.isActive).length;
    const mediaCount = frames.filter((f) => Boolean(f.frameUrl)).length;
    const attendanceCount = frames.filter((f) => f.category === 'attendance').length;
    const levelCount = frames.filter((f) => f.category === 'level').length;
    return { total, active, mediaCount, attendanceCount, levelCount };
  }, [frames]);

  // Filtered frames
  const filteredFrames = useMemo(() => {
    return frames.filter((frame) => {
      if (categoryFilter !== 'all' && frame.category !== categoryFilter) return false;
      if (typeFilter === 'media' && !frame.frameUrl) return false;
      if (typeFilter === 'css' && frame.frameUrl) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchName = frame.name.toLowerCase().includes(query);
        const matchId = frame.id.toLowerCase().includes(query);
        const matchDesc = (frame.description || '').toLowerCase().includes(query);
        return matchName || matchId || matchDesc;
      }
      return true;
    });
  }, [frames, categoryFilter, typeFilter, searchTerm]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingFrame(null);
    setFormData({
      ...EMPTY_FORM,
      sortOrder: (frames.length + 1) * 2,
    });
    setUploadFile(null);
    setFilePreview('');
    setShowModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (frame) => {
    setEditingFrame(frame);
    setFormData({
      id: frame.id,
      name: frame.name,
      description: frame.description || '',
      category: frame.category || 'special',
      unlockType: frame.unlockType || 'free',
      unlockValue: frame.unlockValue || 0,
      rarity: frame.rarity || 'common',
      badgeIcon: frame.badgeIcon || '✨',
      frameType: frame.frameUrl ? 'media' : 'css',
      frameUrl: frame.frameUrl || '',
      frameScale: frame.frameScale ?? 1.6,
      offsetX: frame.offsetX ?? 0,
      offsetY: frame.offsetY ?? 0,
      gradient: frame.gradient || 'from-amber-400 via-orange-500 to-rose-600',
      glowColor: frame.glowColor || 'rgba(249, 115, 22, 0.55)',
      animation: frame.animation || 'none',
      sortOrder: frame.sortOrder ?? 10,
      isActive: frame.isActive ?? true,
    });
    setUploadFile(null);
    setFilePreview(frame.frameUrl || '');
    setShowModal(true);
  };

  // File selection (Image / Animated GIF / WebP / SVG)
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      showToast('Định dạng không hợp lệ. Chọn PNG, GIF, WebP, JPEG hoặc SVG.', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Kích thước file tối đa 10 MB.', 'error');
      return;
    }

    setUploadFile(file);
    const objectUrl = URL.createObjectURL(file);
    setFilePreview(objectUrl);
  };

  // Auto-slug generator for ID
  const generateSlug = (text) => {
    return text
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    if (!editingFrame && (!formData.id || formData.id === generateSlug(formData.name))) {
      setFormData((prev) => ({
        ...prev,
        name: val,
        id: generateSlug(val),
      }));
    } else {
      setFormData((prev) => ({ ...prev, name: val }));
    }
  };

  // Toggle active status
  const handleToggleActive = async (frame) => {
    const nextState = !frame.isActive;
    try {
      const { error } = await supabase
        .from('avatar_frames')
        .update({ is_active: nextState, updated_at: new Date().toISOString() })
        .eq('id', frame.id);

      if (error) throw error;

      setFrames((prev) =>
        prev.map((f) => (f.id === frame.id ? { ...f, isActive: nextState } : f))
      );
      showToast(`Đã ${nextState ? 'kích hoạt' : 'ẩn'} khung "${frame.name}".`);
      triggerGlobalRefresh();
    } catch (err) {
      showToast('Lỗi cập nhật trạng thái: ' + err.message, 'error');
    }
  };

  // Delete frame
  const handleDelete = async (frame) => {
    if (frame.id === 'none') {
      showToast('Không thể xóa khung Mặc định!', 'error');
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa khung "${frame.name}" (ID: ${frame.id})? Hành động này không thể hoàn tác!`
    );
    if (!confirmed) return;

    try {
      // 1. Delete from table
      const { error } = await supabase.from('avatar_frames').delete().eq('id', frame.id);
      if (error) throw error;

      // 2. Cleanup storage media if exists
      if (frame.frameUrl) {
        await deleteFrameMedia(frame.frameUrl);
      }

      setFrames((prev) => prev.filter((f) => f.id !== frame.id));
      showToast(`Đã xóa khung "${frame.name}" thành công!`);
      triggerGlobalRefresh();
    } catch (err) {
      console.error('Lỗi xóa khung:', err);
      showToast('Không thể xóa khung: ' + err.message, 'error');
    }
  };

  // Save (Create or Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    const id = formData.id.trim();
    const name = formData.name.trim();

    if (!id) return showToast('Vui lòng nhập Mã ID khung!', 'error');
    if (!name) return showToast('Vui lòng nhập Tên hiển thị!', 'error');

    if (!/^[a-z0-9_-]+$/.test(id)) {
      return showToast('Mã ID chỉ được chứa chữ thường không dấu, số, dấu gạch nối (- hoặc _)!', 'error');
    }

    setSaving(true);
    let finalFrameUrl = formData.frameUrl;

    try {
      // 1. Upload new media file to Supabase Storage if selected
      if (formData.frameType === 'media' && uploadFile) {
        const uploadResult = await uploadFrameMedia(uploadFile, id);
        finalFrameUrl = uploadResult.publicUrl;

        // If replacing old image, delete old file from storage
        if (editingFrame?.frameUrl && editingFrame.frameUrl !== finalFrameUrl) {
          deleteFrameMedia(editingFrame.frameUrl).catch(() => {});
        }
      } else if (formData.frameType === 'css') {
        finalFrameUrl = '';
      }

      const payload = {
        id,
        name,
        description: formData.description.trim(),
        category: formData.category,
        unlock_type: formData.unlockType,
        unlock_value: Number(formData.unlockValue) || 0,
        rarity: formData.rarity,
        badge_icon: formData.badgeIcon.trim(),
        frame_url: finalFrameUrl,
        frame_scale: Number(formData.frameScale) || 1.6,
        offset_x: Number(formData.offsetX) || 0,
        offset_y: Number(formData.offsetY) || 0,
        gradient: formData.gradient,
        glow_color: formData.glowColor,
        animation: formData.animation,
        sort_order: Number(formData.sortOrder) || 0,
        is_active: Boolean(formData.isActive),
        updated_at: new Date().toISOString(),
      };

      if (editingFrame) {
        // Update
        const { error } = await supabase
          .from('avatar_frames')
          .update(payload)
          .eq('id', editingFrame.id);

        if (error) throw error;
        showToast(`Đã cập nhật khung "${name}"!`);
      } else {
        // Insert
        const { error } = await supabase
          .from('avatar_frames')
          .insert(payload);

        if (error) throw error;
        showToast(`Đã tạo mới khung "${name}" thành công!`);
      }

      setShowModal(false);
      await fetchFrames();
      triggerGlobalRefresh();
    } catch (err) {
      console.error('Lỗi lưu khung:', err);
      showToast('Lỗi lưu thông tin khung: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Preview object for Live Avatar inside Modal
  const livePreviewFrame = useMemo(() => {
    return {
      id: formData.id || 'preview',
      name: formData.name || 'Xem thử khung',
      description: formData.description,
      badgeIcon: formData.badgeIcon,
      frameUrl: formData.frameType === 'media' ? (filePreview || formData.frameUrl) : '',
      frameScale: Number(formData.frameScale) || 1.6,
      offsetX: Number(formData.offsetX) || 0,
      offsetY: Number(formData.offsetY) || 0,
      gradient: formData.gradient,
      glowColor: formData.glowColor,
      animation: formData.animation,
    };
  }, [formData, filePreview]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[120] flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl text-sm font-black animate-in fade-in slide-in-from-top-4 duration-300 border backdrop-blur-xl ${
            toast.type === 'error'
              ? 'bg-rose-500/95 text-white border-rose-400/40 shadow-rose-500/20'
              : 'bg-emerald-500/95 text-white border-emerald-400/40 shadow-emerald-500/20'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                Quản lý Khung Avatar
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-cyan-400 font-bold border border-indigo-500/20">
                  Supabase Database & Storage
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Thêm mới, sửa đổi, upload ảnh hoặc file GIF khung avatar cho người học TOEIC.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchFrames}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-sm shadow-lg shadow-indigo-500/25 transition-all cursor-pointer active:scale-95"
          >
            <Plus size={18} />
            <span>Thêm khung mới</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            <Layers size={14} className="text-indigo-500" />
            <span>Tổng số khung</span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {stats.total}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <span>Đang kích hoạt</span>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.active}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            <ImageIcon size={14} className="text-purple-500" />
            <span>Khung Ảnh / GIF</span>
          </div>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {stats.mediaCount}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            <Flame size={14} className="text-orange-500" />
            <span>Quà Điểm Danh</span>
          </div>
          <p className="text-2xl font-black text-orange-600 dark:text-orange-400 mt-1">
            {stats.attendanceCount}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
            <Award size={14} className="text-amber-500" />
            <span>Thăng Cấp Level</span>
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {stats.levelCount}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên khung hoặc mã ID..."
            className="w-full pl-9.5 pr-4 py-2 text-sm rounded-xl bg-slate-100 dark:bg-white/5 border border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
          >
            <option value="all">Tất cả danh mục</option>
            <option value="attendance">Quà Điểm danh</option>
            <option value="level">Thăng Cấp Level</option>
            <option value="special">Đặc biệt</option>
            <option value="default">Mặc định</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
          >
            <option value="all">Tất cả định dạng</option>
            <option value="media">Chỉ khung Ảnh / GIF</option>
            <option value="css">Chỉ khung Viền CSS</option>
          </select>
        </div>
      </div>

      {/* Frame Cards Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <Loader2 size={32} className="animate-spin text-indigo-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-500">Đang tải danh sách khung từ Supabase...</p>
        </div>
      ) : filteredFrames.length === 0 ? (
        <div className="py-20 text-center space-y-3 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/5">
          <ImageIcon size={36} className="text-slate-400 mx-auto" />
          <p className="text-base font-bold text-slate-800 dark:text-slate-200">Không tìm thấy khung avatar nào</p>
          <p className="text-xs text-slate-500">Hãy thử thay đổi bộ lọc hoặc thêm một khung mới.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredFrames.map((frame) => {
            const rarity = RARITY_CONFIG[frame.rarity] || RARITY_CONFIG.common;
            const isMedia = Boolean(frame.frameUrl);

            return (
              <div
                key={frame.id}
                className={`relative rounded-3xl p-5 border transition-all duration-200 flex flex-col justify-between ${
                  frame.isActive
                    ? 'bg-white dark:bg-white/5 border-slate-200/90 dark:border-white/10 hover:shadow-lg hover:border-indigo-500/40'
                    : 'bg-slate-100/70 dark:bg-white/2 border-dashed border-slate-300 dark:border-white/10 opacity-70'
                }`}
              >
                {/* Top Section */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    {/* Live Preview Avatar */}
                    <div className="relative shrink-0">
                      <UserAvatar
                        frame={frame}
                        size="xl"
                        fallbackText="AD"
                        showBadge={true}
                      />
                    </div>

                    {/* Meta Badges */}
                    <div className="flex flex-col items-end gap-1.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${rarity.bg} ${rarity.text}`}
                        >
                          {rarity.label}
                        </span>

                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            frame.isActive
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-200 dark:bg-white/10 text-slate-500'
                          }`}
                        >
                          {frame.isActive ? 'Kích hoạt' : 'Đang ẩn'}
                        </span>
                      </div>

                      {/* Type Badge */}
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        {isMedia ? (
                          <>
                            <ImageIcon size={11} className="text-purple-500" />
                            <span>{frame.frameUrl.toLowerCase().includes('.gif') ? 'Thẻ GIF' : 'File Ảnh'}</span>
                          </>
                        ) : (
                          <>
                            <Sliders size={11} className="text-indigo-500" />
                            <span>Viền Gradient CSS</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900 dark:text-white truncate">
                        {frame.name}
                      </h3>
                      <span className="text-sm">{frame.badgeIcon}</span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      ID: <span className="font-semibold text-slate-700 dark:text-slate-300">{frame.id}</span>
                    </p>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">
                      {frame.description || 'Chưa có mô tả'}
                    </p>
                  </div>

                  {/* Conditions Pill */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-xs font-semibold space-y-1">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span className="text-slate-400">Danh mục:</span>
                      <span className="font-bold">
                        {frame.category === 'attendance'
                          ? 'Quà Điểm danh'
                          : frame.category === 'level'
                          ? 'Thăng Cấp Level'
                          : frame.category === 'default'
                          ? 'Mặc định'
                          : 'Đặc biệt'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span className="text-slate-400">Mở khóa:</span>
                      <span className="font-bold text-indigo-600 dark:text-cyan-400">
                        {frame.unlockType === 'streak'
                          ? `Chuỗi ${frame.unlockValue} ngày`
                          : frame.unlockType === 'level'
                          ? `Cấp độ ${frame.unlockValue}`
                          : 'Miễn phí / Tự do'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                      <span className="text-slate-400">Thứ tự hiển thị:</span>
                      <span className="font-mono text-slate-500">{frame.sortOrder}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-4 mt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(frame)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      frame.isActive
                        ? 'text-amber-600 hover:bg-amber-500/10'
                        : 'text-emerald-600 hover:bg-emerald-500/10'
                    }`}
                    title={frame.isActive ? 'Tạm ẩn khỏi người học' : 'Kích hoạt cho người học'}
                  >
                    <Power size={14} />
                    <span>{frame.isActive ? 'Ẩn' : 'Bật'}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(frame)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white transition-all cursor-pointer"
                    >
                      <Edit2 size={13} />
                      <span>Sửa</span>
                    </button>

                    {frame.id !== 'none' && (
                      <button
                        type="button"
                        onClick={() => handleDelete(frame)}
                        className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Xóa khung"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
          <div className="my-6 w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-[#3A2F43] dark:bg-[#1E1226] overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4.5 dark:border-[#3A2F43] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-cyan-400 flex items-center justify-center font-bold">
                  {editingFrame ? <Edit2 size={16} /> : <Plus size={18} />}
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    {editingFrame ? `Chỉnh sửa: ${editingFrame.name}` : 'Thêm Khung Avatar Mới'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Cấu hình thuộc tính, upload ảnh/GIF và kiểm tra hiển thị trực quan
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
              {/* LIVE PREVIEW & ADJUSTMENT SECTION (ISLAND) */}
              <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-cyan-500/10 border border-indigo-500/20 dark:border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <UserAvatar
                        frame={livePreviewFrame}
                        size={previewSize}
                        fallbackText="AI"
                        showBadge={true}
                      />
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-indigo-600 dark:text-cyan-400 uppercase tracking-wider">
                          Xem Thử Trực Tiếp
                        </span>
                        <span>{formData.badgeIcon}</span>
                      </div>
                      <p className="text-sm font-black text-slate-900 dark:text-white">
                        {formData.name || 'Tên khung mẫu'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formData.frameType === 'media'
                          ? filePreview
                            ? 'Đang xem file vừa chọn (PNG/GIF)'
                            : 'Chưa có file ảnh/GIF tải lên'
                          : `Viền gradient (${formData.animation})`}
                      </p>
                    </div>
                  </div>

                  {/* Preview Size Switcher */}
                  <div className="flex items-center gap-1 bg-white/60 dark:bg-white/10 p-1 rounded-xl">
                    {['md', 'lg', 'xl', '2xl'].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setPreviewSize(sz)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase transition-all ${
                          previewSize === sz
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3 Adjustment Sliders for Image/GIF: Scale, Offset X, Offset Y */}
                {formData.frameType === 'media' && (
                  <div className="pt-3 border-t border-indigo-500/20 dark:border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:text-cyan-300 flex items-center gap-1.5">
                        <Sliders size={13} />
                        <span>Căn chỉnh khung trực quan (Scale, Trục X, Trục Y):</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, frameScale: 1.6, offsetX: 0, offsetY: 0 }))}
                        className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
                        title="Đặt lại vị trí mặc định"
                      >
                        Đặt lại mặc định
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* 1. Scale Slider */}
                      <div className="space-y-1 bg-white/80 dark:bg-white/5 p-3 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-2xs">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            Tỉ lệ (Scale):
                          </span>
                          <span className="font-mono font-black text-indigo-600 dark:text-cyan-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md">
                            {Math.round((Number(formData.frameScale) || 1.6) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1.0"
                          max="2.6"
                          step="0.05"
                          value={formData.frameScale}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, frameScale: parseFloat(e.target.value) }))
                          }
                          className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <p className="text-[10px] text-slate-400">
                          Khung cánh to: 180% – 220%
                        </p>
                      </div>

                      {/* 2. Offset X Slider */}
                      <div className="space-y-1 bg-white/80 dark:bg-white/5 p-3 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-2xs">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            Tâm ngang (Trục X):
                          </span>
                          <span className="font-mono font-black text-blue-600 dark:text-cyan-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md">
                            {formData.offsetX > 0 ? `+${formData.offsetX}%` : `${formData.offsetX}%`}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="-25"
                          max="25"
                          step="1"
                          value={formData.offsetX}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, offsetX: parseInt(e.target.value, 10) }))
                          }
                          className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <p className="text-[10px] text-slate-400">
                          Trái (-) hoặc Phải (+)
                        </p>
                      </div>

                      {/* 3. Offset Y Slider */}
                      <div className="space-y-1 bg-white/80 dark:bg-white/5 p-3 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-2xs">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            Tâm dọc (Trục Y):
                          </span>
                          <span className="font-mono font-black text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-md">
                            {formData.offsetY > 0 ? `+${formData.offsetY}%` : `${formData.offsetY}%`}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="-25"
                          max="25"
                          step="1"
                          value={formData.offsetY}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, offsetY: parseInt(e.target.value, 10) }))
                          }
                          className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                        />
                        <p className="text-[10px] text-slate-400">
                          Lên (-) hoặc Xuống (+)
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* FORMAT SELECTOR: Image/GIF vs CSS Gradient */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2">
                  Loại Khung Hiển Thị <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, frameType: 'media' }))}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      formData.frameType === 'media'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                      <ImageIcon size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black">Upload Ảnh / Thẻ GIF</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">File PNG, GIF chuyển động, WebP, SVG</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, frameType: 'css' }))}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      formData.frameType === 'css'
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Sliders size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black">Viền Màu CSS Gradient</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Tự tạo viền phát sáng & xoay mượt mà</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* MEDIA UPLOAD SECTION (When frameType === 'media') */}
              {formData.frameType === 'media' && (
                <div className="space-y-3 p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      File Ảnh / GIF Khung (Trong Suốt)
                    </span>
                    <span className="text-[11px] text-slate-400 font-semibold">Tối đa 10 MB</span>
                  </div>

                  {/* Dropzone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-white/20 hover:border-indigo-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-white dark:bg-white/5"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/gif,image/webp,image/jpeg,image/svg+xml"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {filePreview ? (
                      <div className="flex items-center justify-center gap-4">
                        <img
                          src={filePreview}
                          alt="Khung đã chọn"
                          className="w-16 h-16 object-contain rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border"
                        />
                        <div className="text-left">
                          <p className="text-xs font-black text-slate-900 dark:text-white">
                            {uploadFile ? uploadFile.name : 'Đang sử dụng file từ Supabase Storage'}
                          </p>
                          <p className="text-[11px] text-slate-400">Bấm để chọn file khác thay thế</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload size={28} className="mx-auto text-indigo-500" />
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          Kéo thả hoặc bấm để chọn file ảnh khung (Khuyên dùng PNG trong suốt hoặc GIF)
                        </p>
                        <p className="text-[11px] text-slate-400">Hỗ trợ .png, .gif, .webp, .svg</p>
                      </div>
                    )}
                  </div>

                  {/* Or Direct URL */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      Hoặc dán URL ảnh / GIF trực tiếp (nếu có sẵn link):
                    </label>
                    <input
                      type="url"
                      value={formData.frameUrl}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev) => ({ ...prev, frameUrl: val }));
                        if (!uploadFile) setFilePreview(val);
                      }}
                      placeholder="https://.../khung-dep.gif"
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Format Tip Alert */}
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <span>💡 Lưu ý định dạng ảnh khung:</span>
                      </p>
                      <p className="text-slate-600 dark:text-slate-300">
                        - <strong>PNG trong suốt hoặc GIF:</strong> Phải là ảnh rỗng ở giữa (transparent) để ảnh đại diện bên trong có thể hiển thị xuyên thấu.
                      </p>
                      <p className="text-slate-600 dark:text-slate-300">
                        - <strong>Nếu bạn có ảnh JPG:</strong> Định dạng JPG không hỗ trợ độ trong suốt. Bạn hãy dùng công cụ xóa nền (như <em>remove.bg</em>) để tách phần tâm khung rồi tải lên file PNG nhé!
                      </p>
                    </div>
                  </div>
              )}

              {/* CSS GRADIENT SETTINGS (When frameType === 'css') */}
              {formData.frameType === 'css' && (
                <div className="space-y-4 p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/2">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                      Mẫu Màu Gradient Có Sẵn
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {GRADIENT_PRESETS.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              gradient: p.gradient,
                              glowColor: p.glow,
                            }));
                          }}
                          className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-2 ${
                            formData.gradient === p.gradient
                              ? 'border-indigo-600 bg-white dark:bg-white/10 shadow-xs'
                              : 'border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/5'
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full bg-gradient-to-tr ${p.gradient} shrink-0`}
                          />
                          <span className="truncate">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Tailwind Gradient Classes
                      </label>
                      <input
                        type="text"
                        value={formData.gradient}
                        onChange={(e) => setFormData((prev) => ({ ...prev, gradient: e.target.value }))}
                        className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Màu Phát Sáng (Glow Color rgba / hex)
                      </label>
                      <input
                        type="text"
                        value={formData.glowColor}
                        onChange={(e) => setFormData((prev) => ({ ...prev, glowColor: e.target.value }))}
                        className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Hiệu ứng Chuyển Động (Animation)
                    </label>
                    <select
                      value={formData.animation}
                      onChange={(e) => setFormData((prev) => ({ ...prev, animation: e.target.value }))}
                      className="w-full px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {ANIMATION_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* BASIC ATTRIBUTES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* ID */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Mã ID Khung (Duy nhất) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.id}
                    disabled={Boolean(editingFrame)}
                    onChange={(e) => setFormData((prev) => ({ ...prev, id: e.target.value }))}
                    placeholder="vd: dragon-gold-2026"
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-indigo-500 disabled:opacity-60"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Chữ thường không dấu, gạch ngang</p>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                    Tên Hiển Thị <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={handleNameChange}
                    placeholder="vd: Hoàng Kim Thịnh Vượng"
                    className="w-full px-3.5 py-2 text-sm rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Mô Tả Khung
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Ý nghĩa khung hoặc cách đạt được..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Category, Unlock Type, Value */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Danh Mục
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="attendance">Quà Điểm danh</option>
                    <option value="level">Thăng Cấp Level</option>
                    <option value="special">Đặc biệt</option>
                    <option value="default">Mặc định</option>
                  </select>
                </div>

                {/* Unlock Type */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Điều Kiện Mở Khóa
                  </label>
                  <select
                    value={formData.unlockType}
                    onChange={(e) => setFormData((prev) => ({ ...prev, unlockType: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="free">Miễn phí / Tự do</option>
                    <option value="streak">Chuỗi ngày điểm danh (Streak)</option>
                    <option value="level">Cấp độ người học (Level)</option>
                  </select>
                </div>

                {/* Unlock Value */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Giá Trị Yêu Cầu
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.unlockValue}
                    disabled={formData.unlockType === 'free'}
                    onChange={(e) => setFormData((prev) => ({ ...prev, unlockValue: e.target.value }))}
                    placeholder="VD: 3 hoặc 7"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-indigo-500 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Rarity & Badge Icon & Sort Order */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Rarity */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Độ Hiếm
                  </label>
                  <select
                    value={formData.rarity}
                    onChange={(e) => setFormData((prev) => ({ ...prev, rarity: e.target.value }))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="common">Phổ thông (Common)</option>
                    <option value="rare">Hiếm (Rare)</option>
                    <option value="epic">Sử Thi (Epic)</option>
                    <option value="legendary">Huyền Thoại (Legendary)</option>
                  </select>
                </div>

                {/* Badge Icon */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Biểu Tượng Huy Hiệu (Emoji)
                  </label>
                  <input
                    type="text"
                    value={formData.badgeIcon}
                    onChange={(e) => setFormData((prev) => ({ ...prev, badgeIcon: e.target.value }))}
                    placeholder="🔥 hoặc 👑, ⚡, 🐉"
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-center"
                  />
                </div>

                {/* Sort Order */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Thứ Tự Sắp Xếp
                  </label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData((prev) => ({ ...prev, sortOrder: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Is Active */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="modalIsActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="modalIsActive" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                  Kích hoạt khung này ngay (Học viên có thể nhìn thấy và trang bị)
                </label>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-slate-200 dark:border-[#3A2F43] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-60"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  <span>{saving ? 'Đang lưu lên Supabase...' : editingFrame ? 'Lưu Thay Đổi' : 'Tạo Khung Mới'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
