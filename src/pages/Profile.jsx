import { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Camera,
  Trophy,
  Headphones,
  PenTool,
  Info,
  Mail,
  Shield,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Upload,
  Sparkles,
  Flame,
  Award,
  BookOpen,
  Lock,
  Check,
  Palette,
  Layers,
  LogOut,
  Rocket,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useStats } from '../contexts/StatsContext';
import { supabase } from '../lib/supabaseClient';
import UserAvatar from '../components/common/UserAvatar';
import { useAvatarFrames } from '../contexts/AvatarFramesContext';
import { CURRENT_APP_VERSION } from '../lib/appUpdateService';
import { usePlatform } from '../hooks/usePlatform';

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isNative } = usePlatform();
  const {
    streak = 0,
    learnedWords = 0,
    userLevel = 1,
    levelTitle = 'Tân Binh Khởi Hành',
    totalExp = 0,
    levelInfo = null,
    activityCounts = {
      vocabCount: 0,
      grammarCount: 0,
      readingCount: 0,
      writingCount: 0,
      dictationCount: 0,
    },
    levelConfigs = [],
  } = useStats();
  const { frames, getFrameById, checkUnlockStatus, FRAME_CATEGORIES } = useAvatarFrames();

  // Active tab state
  const [activeTab, setActiveTab] = useState('frames'); // 'frames' | 'account' | 'stats'
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Equipped frame & live preview frame
  const initialFrameId = user?.user_metadata?.avatar_frame || 'none';
  const [equippedFrameId, setEquippedFrameId] = useState(initialFrameId);
  const [previewFrameId, setPreviewFrameId] = useState(initialFrameId);
  const [equipping, setEquipping] = useState(false);

  // Profile Form state
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.user_metadata?.custom_full_name || user?.user_metadata?.full_name || '',
    avatarUrl: user?.user_metadata?.custom_avatar_url || user?.user_metadata?.avatar_url || '',
  });

  const fileInputRef = useRef(null);

  // Toast notification
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  };

  // Sync initial metadata when user updates
  useEffect(() => {
    if (user?.user_metadata) {
      if (user.user_metadata.avatar_frame) {
        setEquippedFrameId(user.user_metadata.avatar_frame);
        setPreviewFrameId(user.user_metadata.avatar_frame);
      }
      if (user.user_metadata.custom_full_name || user.user_metadata.full_name) {
        setFormData((prev) => ({
          ...prev,
          fullName: user.user_metadata.custom_full_name || user.user_metadata.full_name,
        }));
      }
      if (user.user_metadata.custom_avatar_url || user.user_metadata.avatar_url) {
        setFormData((prev) => ({
          ...prev,
          avatarUrl: user.user_metadata.custom_avatar_url || user.user_metadata.avatar_url,
        }));
      }
    }
  }, [user]);

  // Note: userLevel, levelTitle, totalExp now come directly from useStats (Supabase DB)

  // Filtered frames
  const filteredFrames = useMemo(() => {
    if (selectedCategory === 'all') return frames;
    return frames.filter((f) => f.category === selectedCategory);
  }, [frames, selectedCategory]);

  // Handle equipping an avatar frame
  const handleEquipFrame = async (frameId) => {
    setEquipping(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          avatar_frame: frameId,
        },
      });

      if (error) throw error;

      setEquippedFrameId(frameId);
      setPreviewFrameId(frameId);

      // Save local cache and notify Topbar/Dashboard in real time
      if (user?.id) {
        localStorage.setItem(`toiec_avatar_frame_${user.id}`, frameId);
      }
      localStorage.setItem('toiec_equipped_frame', frameId);
      window.dispatchEvent(new CustomEvent('avatar-frame-changed', { detail: frameId }));

      const frameObj = getFrameById(frameId);
      showToast(
        frameId === 'none'
          ? 'Đã tháo khung trang trí!'
          : `Đã trang bị khung "${frameObj.name}" thành công!`
      );
    } catch (err) {
      console.error('Lỗi trang bị khung:', err);
      showToast('Không thể lưu trang bị: ' + err.message, 'error');
    } finally {
      setEquipping(false);
    }
  };

  // Upload avatar to Supabase storage
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Chỉ hỗ trợ file ảnh (JPG, PNG, WebP, GIF)', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('Kích thước ảnh tối đa là 2MB', 'error');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          avatar_url: publicUrl,
          custom_avatar_url: publicUrl,
        },
      });

      if (updateError) throw updateError;

      setFormData((f) => ({ ...f, avatarUrl: publicUrl }));
      showToast('Cập nhật ảnh đại diện thành công!');
    } catch (err) {
      console.error('Upload error:', err);
      showToast('Lỗi tải ảnh: ' + err.message, 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Update profile name
  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      showToast('Tên hiển thị không được để trống', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: formData.fullName,
          avatar_url: formData.avatarUrl,
          custom_full_name: formData.fullName,
          custom_avatar_url: formData.avatarUrl,
        },
      });

      if (error) throw error;
      showToast('Cập nhật thông tin thành công!');
    } catch (err) {
      showToast('Lỗi cập nhật: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const displayName = formData.fullName || user?.email?.split('@')[0] || 'Học viên';
  const previewFrame = getFrameById(previewFrameId);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/dashboard');
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8 max-w-5xl w-full mx-auto space-y-6 select-none transition-colors">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[100] flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl text-sm font-black animate-in fade-in slide-in-from-top-4 duration-300 border backdrop-blur-xl ${
            toast.type === 'error'
              ? 'bg-rose-500/95 text-white border-rose-400/40 shadow-rose-500/20'
              : 'bg-emerald-500/95 text-white border-emerald-400/40 shadow-emerald-500/20'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Hero Card: Thẻ Căn Cước Người Học (Learner ID Card) */}
      <section className="glass-panel rounded-[2.5rem] p-6 sm:p-8 border border-white/60 dark:border-white/10 shadow-xl relative overflow-hidden backdrop-blur-xl">
        {/* Quick Logout Button */}
        <button
          type="button"
          onClick={handleLogout}
          className="absolute top-4 right-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/70 dark:bg-white/10 hover:bg-rose-50 dark:hover:bg-rose-500/20 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200/80 dark:border-white/10 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
          title="Đăng xuất tài khoản"
        >
          <LogOut size={14} className="text-rose-500" />
          <span>Đăng xuất</span>
        </button>

        {/* Ambient subtle glow background inside card */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-indigo-500/15 dark:bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-fuchsia-500/10 dark:bg-purple-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-8 sm:gap-12 py-2 sm:py-4">
          {/* Avatar with Live Previewed Frame & Quick Upload Button */}
          <div className="relative group shrink-0">
            <UserAvatar
              src={formData.avatarUrl}
              frameId={previewFrameId}
              size="2xl"
              fallbackText={displayName}
              showBadge={true}
              alt={displayName}
            >
              {/* Quick Camera Upload Overlay */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-5 text-white text-[11px] font-bold"
                title="Đổi ảnh đại diện"
                aria-label="Đổi ảnh đại diện"
              >
                {uploading ? (
                  <Loader2 size={24} className="animate-spin text-white" />
                ) : (
                  <>
                    <Camera size={22} className="text-white drop-shadow-xs mb-0.5" />
                    <span>Đổi ảnh</span>
                  </>
                )}
              </button>
            </UserAvatar>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          {/* User Basic Info & Level */}
          <div className="text-center md:text-left min-w-0 space-y-2.5">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight truncate">
                {displayName}
              </h2>

              {/* Level Badge */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs">
                <Sparkles size={12} />
                <span>Lv.{userLevel}</span>
              </span>

              {/* Equipped Frame Name Pill */}
              {previewFrame && previewFrame.id !== 'none' && (
                <span
                  className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black border backdrop-blur-xs"
                  style={{
                    backgroundColor: previewFrame.glowColor ? `${previewFrame.glowColor.replace('0.55', '0.14').replace('0.5', '0.14')}` : 'rgba(255,255,255,0.2)',
                    borderColor: 'rgba(255,255,255,0.3)',
                  }}
                >
                  <span>{previewFrame.badgeIcon}</span>
                  <span className="text-slate-950 dark:text-white font-extrabold">
                    Khung: {previewFrame.name}
                  </span>
                  {previewFrameId !== equippedFrameId && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-black uppercase tracking-wider ml-1">
                      (Đang xem thử)
                    </span>
                  )}
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center justify-center md:justify-start gap-1.5">
              <Mail size={15} className="text-slate-700 dark:text-slate-300" />
              <span>{user?.email || 'Chưa cập nhật email'}</span>
              <Shield size={14} className="text-emerald-600 dark:text-emerald-400 ml-1" title="Email đã đồng bộ" />
            </p>

            {/* Title / Description */}
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
              Danh hiệu hiện tại:{' '}
              <span className="font-black text-indigo-700 dark:text-cyan-300 bg-indigo-500/10 dark:bg-cyan-500/15 px-2.5 py-0.5 rounded-md border border-indigo-500/25 dark:border-cyan-500/25">
                {levelTitle}
              </span>
            </p>
          </div>
        </div>
      </section>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto p-1.5 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 shadow-xs backdrop-blur-md">
        {[
          { id: 'frames', label: 'Kho Khung Avatar', icon: Palette },
          { id: 'account', label: 'Thông tin cá nhân', icon: User },
          { id: 'stats', label: 'Cấp độ & Hành trình', icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-102 ring-1 ring-white/30'
                  : 'text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10 font-extrabold'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: KHO KHUNG AVATAR (AVATAR WARDROBE) */}
      {activeTab === 'frames' && (
        <section className="glass-panel rounded-[2.5rem] p-6 sm:p-7 border border-white/60 dark:border-white/10 shadow-xl space-y-6 backdrop-blur-xl">
          {/* Header of Wardrobe */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/40 dark:border-white/10 pb-5">
            <div>
              <h3 className="text-lg font-black text-slate-950 dark:text-white flex items-center gap-2">
                <span>Bộ sưu tập Khung Avatar</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-cyan-400 font-bold border border-indigo-500/20">
                  {frames.length} mẫu có sẵn
                </span>
              </h3>
              <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold mt-0.5">
                Nhận khung mới qua điểm danh liên tiếp và thăng cấp người học. Bấm để thử và trang bị!
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {FRAME_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950 shadow-xs'
                      : 'bg-white/50 dark:bg-white/10 text-slate-800 dark:text-slate-200 hover:bg-white/80 dark:hover:bg-white/20 font-bold'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid of Frame Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFrames.map((frame) => {
              const status = checkUnlockStatus(frame, { streak, level: userLevel });
              const isEquipped = equippedFrameId === frame.id;
              const isPreviewing = previewFrameId === frame.id;

              return (
                <div
                  key={frame.id}
                  onClick={() => setPreviewFrameId(frame.id)}
                  className={`group relative rounded-2xl p-4.5 border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                    isPreviewing
                      ? 'bg-indigo-500/10 dark:bg-cyan-500/10 border-indigo-500/50 dark:border-cyan-500/50 shadow-md ring-2 ring-indigo-500/30 dark:ring-cyan-500/30'
                      : 'bg-white/35 dark:bg-white/5 border-white/50 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 hover:border-white/80'
                  }`}
                >
                  {/* Top: Avatar with frame preview + Rarity Badge */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <UserAvatar
                      src={formData.avatarUrl}
                      frame={frame}
                      size="lg"
                      fallbackText={displayName}
                      showBadge={false}
                    />

                    <div className="flex flex-col items-end gap-1">
                      {isEquipped && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-2xs">
                          <Check size={11} strokeWidth={3} /> Đang dùng
                        </span>
                      )}
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/70 dark:bg-white/15 text-slate-800 dark:text-slate-200 border border-white/40 dark:border-white/10">
                        {frame.badgeIcon} {frame.category === 'attendance' ? 'Điểm danh' : frame.category === 'level' ? 'Level' : 'Đặc biệt'}
                      </span>
                    </div>
                  </div>

                  {/* Body: Title & Description */}
                  <div className="space-y-1.5 mb-4">
                    <h4 className="text-sm font-black text-slate-950 dark:text-white flex items-center gap-1.5">
                      <span>{frame.name}</span>
                    </h4>
                    <p className="text-xs text-slate-800 dark:text-slate-200 font-medium line-clamp-2">
                      {frame.description}
                    </p>

                    {/* Unlock Status Hint */}
                    <div className="pt-1">
                      {status.isUnlocked ? (
                        <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          <span>{status.progressText}</span>
                        </p>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Lock size={12} />
                            <span>{status.progressText}</span>
                          </p>
                          {/* Mini Progress Bar */}
                          <div className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
                              style={{
                                width: `${Math.min(100, Math.round((status.current / status.target) * 100))}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom Actions: Equip / Unequip / Preview */}
                  <div className="pt-2 border-t border-white/40 dark:border-white/5 flex items-center gap-2">
                    {isEquipped ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEquipFrame('none');
                        }}
                        disabled={equipping}
                        className="flex-1 py-2 px-3 rounded-xl text-xs font-black bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-all cursor-pointer text-center"
                      >
                        Tháo khung
                      </button>
                    ) : status.isUnlocked ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEquipFrame(frame.id);
                        }}
                        disabled={equipping}
                        className="flex-1 py-2 px-3 rounded-xl text-xs font-black bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs hover:scale-102 active:scale-98 transition-all cursor-pointer text-center"
                      >
                        {equipping ? 'Đang lưu...' : 'Trang bị khung'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-slate-200/50 dark:bg-white/5 text-slate-400 dark:text-slate-500 cursor-not-allowed text-center flex items-center justify-center gap-1"
                      >
                        <Lock size={12} /> Chưa mở khóa
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewFrameId(frame.id);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isPreviewing
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-white/60 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/20'
                      }`}
                      title="Xem trước trên avatar của bạn"
                    >
                      {isPreviewing ? 'Đang thử' : 'Thử'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB 2: THÔNG TIN TÀI KHOẢN (ACCOUNT SETTINGS) */}
      {activeTab === 'account' && (
        <section className="glass-panel rounded-[2.5rem] p-6 sm:p-8 border border-white/60 dark:border-white/10 shadow-xl backdrop-blur-xl w-full space-y-6">
          <div className="border-b border-white/40 dark:border-white/10 pb-4">
            <h3 className="text-lg font-black text-slate-950 dark:text-white">
              Thông tin cơ bản
            </h3>
            <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold mt-0.5">
              Cập nhật tên hiển thị và ảnh hồ sơ của bạn trên hệ thống
            </p>
          </div>

          <form onSubmit={handleUpdate}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
              {/* Left Column: Avatar Showcase & Upload Box (lg:col-span-5) */}
              <div className="lg:col-span-5 p-6 sm:p-8 rounded-3xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 flex flex-col items-center justify-center text-center space-y-4">
                <div className="relative py-4 px-6 flex items-center justify-center">
                  <UserAvatar
                    src={formData.avatarUrl}
                    frameId={equippedFrameId}
                    size="2xl"
                    fallbackText={displayName}
                    showBadge={true}
                  />
                </div>

                <div>
                  <h4 className="text-base font-black text-slate-950 dark:text-white">
                    Ảnh đại diện hồ sơ
                  </h4>
                  <p className="text-xs text-slate-800 dark:text-slate-200 font-medium mt-1 max-w-xs">
                    Hỗ trợ định dạng JPG, PNG, WebP hoặc GIF. Kích thước tối đa 2MB.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/80 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 text-slate-900 dark:text-slate-100 text-xs font-black rounded-xl border border-white/60 dark:border-white/20 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={15} className="animate-spin text-indigo-600 dark:text-cyan-400" />
                      <span>Đang tải lên...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={15} />
                      <span>Chọn ảnh từ máy tính</span>
                    </>
                  )}
                </button>
              </div>

              {/* Right Column: Account Fields & Save Button (lg:col-span-7) */}
              <div className="lg:col-span-7 p-6 sm:p-8 rounded-3xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 flex flex-col justify-between space-y-6">
                <div className="space-y-5">
                  {/* Full Name Input */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-2">
                      Tên hiển thị
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <User size={18} />
                      </div>
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => setFormData((f) => ({ ...f, fullName: e.target.value }))}
                        className="w-full bg-white/40 dark:bg-black/20 border border-white/50 dark:border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-xs transition-all placeholder:text-slate-400"
                        placeholder="Nhập họ và tên hoặc biệt danh của bạn"
                      />
                    </div>
                  </div>

                  {/* Email (Readonly) */}
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-200 mb-2">
                      Địa chỉ Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <Mail size={18} />
                      </div>
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="w-full bg-white/20 dark:bg-black/30 border border-white/30 dark:border-white/5 rounded-2xl pl-11 pr-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-400 cursor-not-allowed select-none"
                      />
                    </div>
                    <p className="text-xs text-slate-800 dark:text-slate-200 font-medium mt-2 flex items-center gap-1.5">
                      <Shield size={13} className="text-emerald-500" />
                      <span>Email được đồng bộ an toàn từ tài khoản đăng nhập của bạn.</span>
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black px-8 py-3 rounded-2xl shadow-lg shadow-indigo-500/25 transition-all cursor-pointer hover:scale-102 active:scale-98 disabled:opacity-70 text-sm"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    <span>{loading ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Card Thông tin phiên bản & Kiểm tra cập nhật ứng dụng (Chỉ hiển thị trên App, ẩn hoàn toàn trên Web) */}
          {isNative && (
            <div className="pt-4 border-t border-white/40 dark:border-white/10">
              <div className="p-5 sm:p-6 rounded-3xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="h-11 w-11 rounded-2xl bg-indigo-500/10 dark:bg-cyan-500/10 border border-indigo-500/20 dark:border-cyan-500/20 flex items-center justify-center text-indigo-600 dark:text-cyan-400 shrink-0">
                    <Rocket size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-950 dark:text-white">
                      T-English App (Phiên bản v{CURRENT_APP_VERSION})
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                      Tự động kiểm tra tính năng mới & bản vá lỗi từ hệ thống
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('tenglish:check-update'));
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer active:scale-95"
                >
                  <Sparkles size={14} />
                  <span>Kiểm tra cập nhật</span>
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 3: CẤP ĐỘ & HÀNH TRÌNH (LEVEL & STATS) */}
      {activeTab === 'stats' && (
        <section className="glass-panel rounded-[2.5rem] p-6 sm:p-8 border border-white/60 dark:border-white/10 shadow-xl space-y-8 backdrop-blur-xl">
          {/* Header */}
          <div className="border-b border-white/40 dark:border-white/10 pb-4">
            <h3 className="text-xl font-black text-slate-950 dark:text-white flex items-center gap-2.5">
              <Trophy size={24} className="text-amber-500" />
              <span>Hệ Thống Cấp Độ & Điểm Kinh Nghiệm (EXP)</span>
            </h3>
            <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold mt-1">
              Thực hiện các bài học Từ vựng, Ngữ pháp, Đọc hiểu, Luyện viết và Nghe chép chính tả để tích lũy EXP, thăng cấp và nhận các khung Avatar danh giá!
            </p>
          </div>

          {/* Level Progress Visual Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-cyan-500/10 border border-indigo-500/20 dark:border-cyan-500/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-cyan-400">
                  Cấp độ người học hiện tại
                </span>
                <h4 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight mt-0.5">
                  Level {userLevel} • {levelTitle}
                </h4>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mt-1">
                  Tổng điểm kinh nghiệm tích lũy:{' '}
                  <span className="font-black text-indigo-600 dark:text-cyan-400 text-sm">
                    {Number(totalExp || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} EXP
                  </span>
                </p>
              </div>
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 flex flex-col items-center justify-center text-white font-black shadow-lg shadow-amber-500/30 shrink-0 self-start sm:self-center">
                <span className="text-[10px] uppercase font-extrabold tracking-widest text-amber-900/80">CẤP</span>
                <span className="text-2xl sm:text-3xl leading-none">{userLevel}</span>
              </div>
            </div>

            {/* EXP Bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs font-black text-slate-800 dark:text-slate-200">
                <span>
                  {levelInfo?.isMaxLevel
                    ? 'Bạn đã đạt cấp độ tối đa của hệ thống! Chúc mừng bạn!'
                    : `Tiến trình lên Level ${userLevel + 1} (Cần thêm ${Number(levelInfo?.expToNext || 0).toFixed(1)} EXP)`}
                </span>
                <span>
                  {Number(totalExp || 0).toFixed(1)} / {levelInfo?.nextMinExp ? `${Number(levelInfo.nextMinExp).toFixed(0)} EXP` : 'Tối đa'} ({levelInfo?.progressPercent || 0}%)
                </span>
              </div>
              <div className="h-3.5 w-full bg-slate-200/80 dark:bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/40 dark:border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${levelInfo?.progressPercent || 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Chi tiết điểm tích lũy theo từng hoạt động */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-500" />
                <span>Nguồn điểm EXP từ hoạt động học tập</span>
              </h4>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Tự động đồng bộ từ kết quả học thực tế
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* 1. Từ vựng */}
              <div className="p-4 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 flex items-start gap-3.5 hover:border-indigo-500/30 transition-colors">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <BookOpen size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100">Học Từ Vựng</span>
                    <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      +0.5đ / từ
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Đã học: <strong className="text-slate-900 dark:text-white font-black">{activityCounts.vocabCount || 0}</strong> từ
                  </p>
                  <p className="text-xs font-black text-indigo-600 dark:text-cyan-400 mt-0.5">
                    = +{((activityCounts.vocabCount || 0) * 0.5).toFixed(1)} EXP
                  </p>
                </div>
              </div>

              {/* 2. Ngữ pháp */}
              <div className="p-4 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 flex items-start gap-3.5 hover:border-indigo-500/30 transition-colors">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Sparkles size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100">Bài Tập Ngữ Pháp</span>
                    <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                      +0.25đ / câu
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Làm đúng: <strong className="text-slate-900 dark:text-white font-black">{activityCounts.grammarCount || 0}</strong> câu
                  </p>
                  <p className="text-xs font-black text-indigo-600 dark:text-cyan-400 mt-0.5">
                    = +{((activityCounts.grammarCount || 0) * 0.25).toFixed(2)} EXP
                  </p>
                </div>
              </div>

              {/* 3. Đọc hiểu */}
              <div className="p-4 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 flex items-start gap-3.5 hover:border-indigo-500/30 transition-colors">
                <div className="h-10 w-10 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Layers size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100">Đọc Hiểu (Reading)</span>
                    <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                      +1.0đ / câu
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Hoàn thành: <strong className="text-slate-900 dark:text-white font-black">{activityCounts.readingCount || 0}</strong> câu
                  </p>
                  <p className="text-xs font-black text-indigo-600 dark:text-cyan-400 mt-0.5">
                    = +{((activityCounts.readingCount || 0) * 1.0).toFixed(1)} EXP
                  </p>
                </div>
              </div>

              {/* 4. Luyện viết */}
              <div className="p-4 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 flex items-start gap-3.5 hover:border-indigo-500/30 transition-colors">
                <div className="h-10 w-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <PenTool size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100">Luyện Viết (Writing)</span>
                    <span className="text-[11px] font-black text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                      +1.0đ / câu
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Hoàn thành: <strong className="text-slate-900 dark:text-white font-black">{activityCounts.writingCount || 0}</strong> câu
                  </p>
                  <p className="text-xs font-black text-indigo-600 dark:text-cyan-400 mt-0.5">
                    = +{((activityCounts.writingCount || 0) * 1.0).toFixed(1)} EXP
                  </p>
                </div>
              </div>

              {/* 5. Nghe chép chính tả */}
              <div className="p-4 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 flex items-start gap-3.5 hover:border-indigo-500/30 transition-colors">
                <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Headphones size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 dark:text-slate-100">Nghe Chép Chính Tả</span>
                    <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                      +0.5đ / câu
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Hoàn thành: <strong className="text-slate-900 dark:text-white font-black">{activityCounts.dictationCount || 0}</strong> câu
                  </p>
                  <p className="text-xs font-black text-indigo-600 dark:text-cyan-400 mt-0.5">
                    = +{((activityCounts.dictationCount || 0) * 0.5).toFixed(1)} EXP
                  </p>
                </div>
              </div>

              {/* 6. Nhại lại (Shadowing) Note Card */}
              <div className="p-4 rounded-2xl bg-white/20 dark:bg-white/5 border border-dashed border-white/40 dark:border-white/10 flex items-start gap-3.5 opacity-80">
                <div className="h-10 w-10 rounded-xl bg-slate-500/15 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0">
                  <Info size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Nhại lại (Shadowing)</span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-500/10 px-2 py-0.5 rounded-full">
                      0đ / câu
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Hoạt động rèn luyện phát âm & ngữ điệu, không tính điểm vào hệ thống cấp độ.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Lộ Trình Cấp Độ & Phần Thưởng Khung */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Award size={16} className="text-amber-500" />
                  <span>Lộ trình các Mốc Cấp Độ ({levelConfigs.length} mốc)</span>
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Đạt đủ điểm EXP quy định để mở khóa danh hiệu và phần thưởng khung Avatar tương ứng.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {levelConfigs.map((lvl) => {
                const isUnlocked = userLevel >= lvl.level;
                const isCurrent = userLevel === lvl.level;
                const rewardFrame = lvl.reward_frame_id ? getFrameById(lvl.reward_frame_id) : null;

                return (
                  <div
                    key={lvl.level}
                    className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                      isCurrent
                        ? 'bg-indigo-500/10 dark:bg-cyan-500/10 border-indigo-500/40 dark:border-cyan-500/40 ring-2 ring-indigo-500/20 shadow-md'
                        : isUnlocked
                        ? 'bg-white/40 dark:bg-white/5 border-white/50 dark:border-white/10'
                        : 'bg-white/20 dark:bg-black/20 border-white/30 dark:border-white/5 opacity-75'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-xs font-black px-2.5 py-0.5 rounded-lg ${
                            isCurrent
                              ? 'bg-indigo-600 text-white'
                              : isUnlocked
                              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                              : 'bg-slate-500/20 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          Level {lvl.level}
                        </span>

                        {isCurrent ? (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500 text-white">
                            Hiện tại
                          </span>
                        ) : isUnlocked ? (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500 text-white flex items-center gap-1">
                            <Check size={11} strokeWidth={3} /> Đã đạt
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Lock size={12} /> Cần {lvl.min_exp} EXP
                          </span>
                        )}
                      </div>

                      <h5 className="text-sm font-black text-slate-950 dark:text-white">
                        {lvl.title}
                      </h5>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                        {lvl.description || `Mốc thăng cấp Level ${lvl.level}`}
                      </p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-white/40 dark:border-white/10 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-500 dark:text-slate-400">
                        Yêu cầu: <strong className="text-slate-900 dark:text-white">{lvl.min_exp} EXP</strong>
                      </span>

                      {rewardFrame ? (
                        <span
                          className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-cyan-400"
                          title={`Thưởng khung: ${rewardFrame.name}`}
                        >
                          <Sparkles size={13} />
                          <span className="max-w-[110px] truncate">{rewardFrame.name}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Không có khung</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mốc Chuỗi Điểm Danh (Streak) */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-orange-500">
                <Flame size={18} />
                <span>Mốc Chuỗi Điểm Danh Hàng Ngày</span>
              </div>
              <span className="text-xs font-black text-orange-500 bg-orange-500/15 px-3 py-1 rounded-full">
                {streak} ngày liên tiếp
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              Duy trì thói quen học tập mỗi ngày để giữ vững chuỗi điểm danh và mở khóa các khung Avatar rực lửa và độc quyền!
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
