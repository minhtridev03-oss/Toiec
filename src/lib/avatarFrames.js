import { supabase } from './supabaseClient';

export const DEFAULT_FALLBACK_FRAMES = [
  {
    id: 'none',
    name: 'Mặc định',
    description: 'Ảnh đại diện nguyên bản, không dùng khung trang trí.',
    category: 'default',
    unlockType: 'free',
    unlockValue: 0,
    rarity: 'common',
    badgeIcon: '✨',
    frameUrl: '',
    gradient: 'from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-600',
    glowColor: 'transparent',
    animation: 'none',
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'flame-streak',
    name: 'Ngọn Lửa Chăm Chỉ',
    description: 'Khung ngọn lửa nhiệt huyết dành tặng cho người học có chuỗi điểm danh kiên trì.',
    category: 'attendance',
    unlockType: 'streak',
    unlockValue: 1,
    rarity: 'rare',
    badgeIcon: '🔥',
    frameUrl: '',
    gradient: 'from-amber-400 via-orange-500 to-rose-600',
    glowColor: 'rgba(249, 115, 22, 0.55)',
    animation: 'pulse-slow',
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 'sprout-emerald',
    name: 'Mầm Xanh Bền Bỉ',
    description: 'Tượng trưng cho sự nảy mầm của tri thức khi điểm danh chuyên cần 3 ngày.',
    category: 'attendance',
    unlockType: 'streak',
    unlockValue: 3,
    rarity: 'common',
    badgeIcon: '🌱',
    frameUrl: '',
    gradient: 'from-emerald-400 via-teal-400 to-cyan-500',
    glowColor: 'rgba(16, 185, 129, 0.5)',
    animation: 'spin-slow',
    sortOrder: 3,
    isActive: true,
  },
  {
    id: 'gold-royalty',
    name: 'Hoàng Kim Tinh Anh',
    description: 'Khung vàng hoàng gia rực rỡ chứng nhận học viên chăm chỉ đạt Cấp độ 2 trở lên.',
    category: 'level',
    unlockType: 'level',
    unlockValue: 2,
    rarity: 'epic',
    badgeIcon: '👑',
    frameUrl: '',
    gradient: 'from-yellow-300 via-amber-400 to-amber-600',
    glowColor: 'rgba(245, 158, 11, 0.6)',
    animation: 'shimmer',
    sortOrder: 4,
    isActive: true,
  },
  {
    id: 'cyber-neon',
    name: 'Sóng Điện Neon',
    description: 'Khung ánh sáng tương lai Cyberpunk chuyển động xoay quanh avatar cực ngầu (Mở sẵn trải nghiệm).',
    category: 'special',
    unlockType: 'free',
    unlockValue: 0,
    rarity: 'legendary',
    badgeIcon: '⚡',
    frameUrl: '',
    gradient: 'from-cyan-400 via-fuchsia-500 to-violet-600',
    glowColor: 'rgba(6, 182, 212, 0.65)',
    animation: 'spin-slow',
    sortOrder: 5,
    isActive: true,
  },
];

export const FRAME_CATEGORIES = [
  { id: 'all', label: 'Tất cả' },
  { id: 'attendance', label: 'Quà Điểm danh' },
  { id: 'level', label: 'Thăng Cấp Level' },
  { id: 'special', label: 'Đặc biệt' },
];

export const RARITY_CONFIG = {
  common: { label: 'Phổ thông', color: 'from-slate-400 to-slate-500', text: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-800' },
  rare: { label: 'Hiếm', color: 'from-blue-500 to-cyan-500', text: 'text-blue-600 dark:text-cyan-400', bg: 'bg-blue-500/10' },
  epic: { label: 'Sử Thi', color: 'from-purple-500 to-pink-500', text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10' },
  legendary: { label: 'Huyền Thoại', color: 'from-amber-400 via-orange-500 to-rose-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
};

export function normalizeFrame(row) {
  if (!row) return null;
  return {
    id: String(row.id || '').trim(),
    name: row.name || 'Khung Avatar',
    description: row.description || '',
    category: row.category || 'special',
    unlockType: row.unlock_type || row.unlockType || 'free',
    unlockValue: Number(row.unlock_value ?? row.unlockValue ?? 0),
    rarity: row.rarity || 'common',
    badgeIcon: row.badge_icon || row.badgeIcon || '',
    frameUrl: row.frame_url || row.frameUrl || '',
    gradient: row.gradient || 'from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-600',
    glowColor: row.glow_color || row.glowColor || 'transparent',
    animation: row.animation || 'none',
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    isActive: row.is_active ?? row.isActive ?? true,
    frameScale: Number(row.frame_scale ?? row.frameScale ?? (row.frame_url || row.frameUrl ? 1.6 : 1.28)),
    offsetX: Number(row.offset_x ?? row.offsetX ?? 0),
    offsetY: Number(row.offset_y ?? row.offsetY ?? 0),
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
  };
}

// In-memory cache for ultra-fast synchronous lookup
const STORAGE_KEY = 'toiec_cached_avatar_frames_v1';
let memoryCache = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(normalizeFrame);
      }
    }
  } catch (e) {
    console.warn('Lỗi đọc cache khung avatar:', e);
  }
  return [...DEFAULT_FALLBACK_FRAMES];
})();

export function getCachedAvatarFrames() {
  return memoryCache;
}

export function setCachedAvatarFrames(frames) {
  if (!Array.isArray(frames)) return;
  memoryCache = frames.map(normalizeFrame);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache));
  } catch (e) {
    console.warn('Lỗi lưu cache khung avatar:', e);
  }
  window.dispatchEvent(new CustomEvent('toiec-avatar-frames-updated', { detail: memoryCache }));
}

/**
 * Lấy khung avatar theo ID (Đồng bộ, luôn trả về ít nhất khung mặc định 'none')
 */
export function getAvatarFrameById(frameId) {
  if (!frameId || frameId === 'none') {
    return memoryCache.find((f) => f.id === 'none') || DEFAULT_FALLBACK_FRAMES[0];
  }
  const found = memoryCache.find((f) => f.id === frameId);
  if (found) return found;
  return DEFAULT_FALLBACK_FRAMES[0];
}

/**
 * Tải danh sách khung từ Supabase
 */
export async function fetchAvatarFramesFromSupabase(includeInactive = false) {
  try {
    let query = supabase
      .from('avatar_frames')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    if (data && data.length > 0) {
      const normalized = data.map(normalizeFrame);
      // Ensure 'none' exists at top
      if (!normalized.some((f) => f.id === 'none')) {
        normalized.unshift(DEFAULT_FALLBACK_FRAMES[0]);
      }
      setCachedAvatarFrames(normalized);
      return normalized;
    }
  } catch (err) {
    console.warn('Không thể tải khung avatar từ Supabase, dùng cache hiện tại:', err);
  }
  return memoryCache;
}

/**
 * Kiểm tra điều kiện mở khóa khung
 */
export function checkFrameUnlockStatus(frame, userStats = { streak: 0, level: 1 }) {
  if (!frame || frame.unlockType === 'free' || frame.id === 'none') {
    return {
      isUnlocked: true,
      progressText: 'Đã sẵn sàng sử dụng',
      current: 1,
      target: 1,
    };
  }

  if (frame.unlockType === 'streak') {
    const streak = Math.max(0, Number(userStats.streak) || 0);
    const target = frame.unlockValue;
    const isUnlocked = streak >= target;
    return {
      isUnlocked,
      progressText: isUnlocked
        ? `Đã mở khóa (Chuỗi ${streak}/${target} ngày)`
        : `Cần điểm danh chuỗi ${target} ngày (Hiện tại: ${streak}/${target})`,
      current: streak,
      target,
    };
  }

  if (frame.unlockType === 'level') {
    const level = Math.max(1, Number(userStats.level) || 1);
    const target = frame.unlockValue;
    const isUnlocked = level >= target;
    return {
      isUnlocked,
      progressText: isUnlocked
        ? `Đã mở khóa (Level ${level}/${target})`
        : `Cần đạt Level ${target} (Hiện tại: Lv.${level}/${target})`,
      current: level,
      target,
    };
  }

  return { isUnlocked: false, progressText: 'Chưa đủ điều kiện', current: 0, target: 1 };
}

/**
 * Upload file ảnh/GIF/WebP/SVG khung avatar lên bucket Supabase Storage `avatar-frames`
 */
export async function uploadFrameMedia(file, frameId = 'frame') {
  if (!file) throw new Error('Không có file để tải lên.');

  const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Định dạng file không hỗ trợ. Vui lòng chọn PNG, GIF, WebP, JPEG hoặc SVG.');
  }

  const cleanName = file.name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]/g, '-');

  const fileExt = cleanName.split('.').pop() || 'png';
  const safeId = String(frameId || 'frame').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
  const filePath = `frames/${safeId}-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('avatar-frames')
    .upload(filePath, file, {
      cacheControl: '31536000',
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('avatar-frames')
    .getPublicUrl(filePath);

  return {
    publicUrl: urlData.publicUrl,
    filePath,
  };
}

/**
 * Xóa file khung cũ khỏi Storage nếu có
 */
export async function deleteFrameMedia(publicUrlOrPath) {
  if (!publicUrlOrPath) return;
  try {
    let filePath = publicUrlOrPath;
    const marker = '/storage/v1/object/public/avatar-frames/';
    const idx = publicUrlOrPath.indexOf(marker);
    if (idx !== -1) {
      filePath = decodeURIComponent(publicUrlOrPath.slice(idx + marker.length).split('?')[0]);
    }
    if (filePath && filePath.startsWith('frames/')) {
      await supabase.storage.from('avatar-frames').remove([filePath]);
    }
  } catch (err) {
    console.warn('Lỗi xóa file frame cũ khỏi storage:', err);
  }
}
