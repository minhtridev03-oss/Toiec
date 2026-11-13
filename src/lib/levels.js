import { supabase } from './supabaseClient';

export const DEFAULT_LEVEL_CONFIGS = [
  { level: 1, min_exp: 0, title: 'Tân Binh Khởi Hành', reward_frame_id: 'none', description: 'Khởi đầu hành trình rèn luyện ngoại ngữ' },
  { level: 2, min_exp: 50, title: 'Học Viên Chăm Chỉ', reward_frame_id: 'sprout-emerald', description: 'Mốc 50 EXP: Tích lũy kiến thức cơ bản' },
  { level: 3, min_exp: 120, title: 'Chiến Binh Kiên Trì', reward_frame_id: 'flame-streak', description: 'Mốc 120 EXP: Duy trì thói quen học tập đều đặn' },
  { level: 4, min_exp: 220, title: 'Thực Khách Tri Thức', reward_frame_id: 'cyber-neon', description: 'Mốc 220 EXP: Nắm vững các cấu trúc ngữ pháp' },
  { level: 5, min_exp: 360, title: 'Cao Thủ Bền Bỉ', reward_frame_id: 'gold-royalty', description: 'Mốc 360 EXP: Tăng tốc vốn từ vựng và bài đọc' },
  { level: 6, min_exp: 550, title: 'Tinh Anh Xuất Sắc', reward_frame_id: null, description: 'Mốc 550 EXP: Đạt trình độ trung cấp vững chắc' },
  { level: 7, min_exp: 800, title: 'Học Giả Uyên Bác', reward_frame_id: null, description: 'Mốc 800 EXP: Khả năng phản xạ và ghi nhớ sâu sắc' },
  { level: 8, min_exp: 1150, title: 'Bậc Thầy Ngoại Ngữ', reward_frame_id: null, description: 'Mốc 1150 EXP: Kỹ năng đọc viết thuần thục' },
  { level: 9, min_exp: 1600, title: 'Huyền Thoại Tri Thức', reward_frame_id: null, description: 'Mốc 1600 EXP: Trình độ nâng cao toàn diện' },
  { level: 10, min_exp: 2200, title: 'Đỉnh Cao Bất Bại', reward_frame_id: null, description: 'Mốc 2200 EXP: Cấp độ tinh hoa xuất chúng' },
];

export const DEFAULT_EXP_RULES = [
  { activity_type: 'vocab', name: 'Học từ vựng', points_per_unit: 0.5, unit_label: 'từ', is_active: true },
  { activity_type: 'grammar', name: 'Bài tập ngữ pháp', points_per_unit: 0.25, unit_label: 'câu', is_active: true },
  { activity_type: 'reading', name: 'Đọc hiểu', points_per_unit: 1.0, unit_label: 'câu', is_active: true },
  { activity_type: 'writing', name: 'Luyện viết', points_per_unit: 1.0, unit_label: 'câu', is_active: true },
  { activity_type: 'dictation', name: 'Nghe chép chính tả', points_per_unit: 0.5, unit_label: 'câu', is_active: true },
];

/**
 * Fetch all level configs from Supabase, sorted by level ASC
 */
export async function fetchLevelConfigs() {
  try {
    const { data, error } = await supabase
      .from('level_configs')
      .select('*')
      .order('level', { ascending: true });

    if (error) {
      console.warn('Lỗi đọc level_configs từ Supabase, sử dụng mặc định:', error);
      return DEFAULT_LEVEL_CONFIGS;
    }

    if (data && data.length > 0) {
      return data.map((item) => ({
        level: Number(item.level),
        min_exp: Number(item.min_exp),
        title: item.title,
        reward_frame_id: item.reward_frame_id || null,
        description: item.description || '',
      }));
    }
  } catch (err) {
    console.warn('Lỗi kết nối level_configs:', err);
  }
  return DEFAULT_LEVEL_CONFIGS;
}

/**
 * Fetch all EXP activity rate rules
 */
export async function fetchExpRules() {
  try {
    const { data, error } = await supabase
      .from('exp_activity_rules')
      .select('*')
      .order('activity_type', { ascending: true });

    if (error) {
      console.warn('Lỗi đọc exp_activity_rules, sử dụng mặc định:', error);
      return DEFAULT_EXP_RULES;
    }

    if (data && data.length > 0) {
      return data.map((item) => ({
        activity_type: item.activity_type,
        name: item.name,
        points_per_unit: Number(item.points_per_unit),
        unit_label: item.unit_label,
        is_active: item.is_active ?? true,
      }));
    }
  } catch (err) {
    console.warn('Lỗi kết nối exp_activity_rules:', err);
  }
  return DEFAULT_EXP_RULES;
}

/**
 * Calculate user level, title, next level and progress % dynamically
 */
export function calculateLevelFromExp(totalExp = 0, levelConfigs = DEFAULT_LEVEL_CONFIGS) {
  const exp = Math.max(0, Number(totalExp) || 0);
  const sorted = [...(levelConfigs.length > 0 ? levelConfigs : DEFAULT_LEVEL_CONFIGS)]
    .sort((a, b) => a.level - b.level);

  let currentLevelObj = sorted[0] || { level: 1, min_exp: 0, title: 'Tân Binh Khởi Hành' };
  let nextLevelObj = null;

  for (let i = 0; i < sorted.length; i++) {
    if (exp >= sorted[i].min_exp) {
      currentLevelObj = sorted[i];
      nextLevelObj = sorted[i + 1] || null;
    } else {
      if (!nextLevelObj) nextLevelObj = sorted[i];
      break;
    }
  }

  const currentLevel = currentLevelObj.level;
  const currentTitle = currentLevelObj.title;
  const currentMinExp = currentLevelObj.min_exp;
  const nextMinExp = nextLevelObj ? nextLevelObj.min_exp : null;

  let progressPercent = 100;
  let expToNext = 0;

  if (nextLevelObj) {
    const range = nextMinExp - currentMinExp;
    const gained = exp - currentMinExp;
    progressPercent = range > 0 ? Math.min(100, Math.max(0, Math.round((gained / range) * 100))) : 0;
    expToNext = Math.max(0, +(nextMinExp - exp).toFixed(2));
  }

  return {
    level: currentLevel,
    title: currentTitle,
    rewardFrameId: currentLevelObj.reward_frame_id,
    currentExp: exp,
    currentMinExp,
    nextMinExp,
    nextLevel: nextLevelObj ? nextLevelObj.level : null,
    nextTitle: nextLevelObj ? nextLevelObj.title : null,
    progressPercent,
    expToNext,
    isMaxLevel: !nextLevelObj,
  };
}

/**
 * Sync / calculate user learning EXP via Postgres stored procedure
 */
export async function syncUserLearningExp(userId) {
  if (!userId) return null;
  try {
    const { data, error } = await supabase.rpc('sync_user_learning_exp', {
      p_user_id: userId,
    });

    if (error) {
      console.warn('Lỗi rpc sync_user_learning_exp:', error);
      // Fallback query from user_exp_stats
      const { data: cached } = await supabase
        .from('user_exp_stats')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      return cached;
    }

    return data;
  } catch (err) {
    console.error('Lỗi khi đồng bộ điểm EXP:', err);
    return null;
  }
}

/**
 * Admin: Create or update a level config
 */
export async function saveLevelConfig(config) {
  const payload = {
    level: Number(config.level),
    min_exp: Number(config.min_exp),
    title: String(config.title || '').trim(),
    reward_frame_id: config.reward_frame_id || null,
    description: String(config.description || '').trim(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('level_configs')
    .upsert(payload, { onConflict: 'level' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Admin: Delete a level config (prevent deleting level 1)
 */
export async function deleteLevelConfig(level) {
  if (Number(level) <= 1) {
    throw new Error('Không thể xóa Level 1 mặc định của hệ thống.');
  }

  const { error } = await supabase
    .from('level_configs')
    .delete()
    .eq('level', Number(level));

  if (error) throw error;
  return true;
}

/**
 * Admin: Update EXP activity points rule
 */
export async function saveExpRule(activityType, pointsPerUnit, isActive = true) {
  const payload = {
    points_per_unit: Number(pointsPerUnit),
    is_active: Boolean(isActive),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('exp_activity_rules')
    .update(payload)
    .eq('activity_type', activityType)
    .select()
    .single();

  if (error) throw error;
  return data;
}
