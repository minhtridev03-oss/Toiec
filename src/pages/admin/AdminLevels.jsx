import { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Plus,
  Edit2,
  Trash2,
  Save,
  RotateCcw,
  Sparkles,
  BookOpen,
  BookType,
  PenTool,
  Headphones,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Sliders,
  Check,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import {
  fetchLevelConfigs,
  fetchExpRules,
  saveLevelConfig,
  deleteLevelConfig,
  saveExpRule,
} from '../../lib/levels';
import { useAvatarFrames } from '../../contexts/AvatarFramesContext';
import UserAvatar from '../../components/common/UserAvatar';

const ACTIVITY_ICONS = {
  vocab: BookOpen,
  grammar: BookType,
  reading: BookOpen,
  writing: PenTool,
  dictation: Headphones,
};

export default function AdminLevels() {
  const { frames } = useAvatarFrames();

  // State
  const [activeTab, setActiveTab] = useState('levels'); // 'levels' | 'rules'
  const [levelConfigs, setLevelConfigs] = useState([]);
  const [expRules, setExpRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Modal State for adding/editing a level
  const [editingLevel, setEditingLevel] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    level: 1,
    min_exp: 0,
    title: '',
    reward_frame_id: '',
    description: '',
  });

  // Rule editing state
  const [editingRules, setEditingRules] = useState({});
  const [savingRule, setSavingRule] = useState({});

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load level configs & exp rules
  const loadData = async () => {
    setLoading(true);
    try {
      const [cfgs, rules] = await Promise.all([fetchLevelConfigs(), fetchExpRules()]);
      setLevelConfigs(cfgs);
      setExpRules(rules);

      // Initialize editing rules state
      const ruleMap = {};
      rules.forEach((r) => {
        ruleMap[r.activity_type] = r.points_per_unit;
      });
      setEditingRules(ruleMap);
    } catch (err) {
      console.error('Lỗi tải dữ liệu cấp độ:', err);
      showToast('Lỗi tải dữ liệu: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Open modal for Create
  const handleOpenCreate = () => {
    const nextLevelNum =
      levelConfigs.length > 0 ? Math.max(...levelConfigs.map((l) => l.level)) + 1 : 1;
    const lastMinExp =
      levelConfigs.length > 0 ? Math.max(...levelConfigs.map((l) => l.min_exp)) : 0;

    setEditingLevel(null);
    setFormData({
      level: nextLevelNum,
      min_exp: lastMinExp + 100,
      title: '',
      reward_frame_id: '',
      description: '',
    });
    setModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (lvl) => {
    setEditingLevel(lvl);
    setFormData({
      level: lvl.level,
      min_exp: lvl.min_exp,
      title: lvl.title || '',
      reward_frame_id: lvl.reward_frame_id || '',
      description: lvl.description || '',
    });
    setModalOpen(true);
  };

  // Save level config
  const handleSaveLevel = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('Vui lòng nhập tên danh hiệu cấp độ.', 'error');
      return;
    }
    if (formData.min_exp < 0) {
      showToast('Điểm EXP không được âm.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await saveLevelConfig({
        level: Number(formData.level),
        min_exp: Number(formData.min_exp),
        title: formData.title.trim(),
        reward_frame_id: formData.reward_frame_id || null,
        description: formData.description.trim(),
      });

      showToast(`Đã lưu Level ${formData.level} - "${formData.title}" thành công!`);
      setModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Lỗi lưu level:', err);
      showToast('Lỗi lưu level: ' + err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete level config
  const handleDeleteLevel = async (lvl) => {
    if (lvl.level <= 1) {
      showToast('Không thể xóa Level 1 mặc định.', 'error');
      return;
    }

    const ok = window.confirm(
      `Bạn có chắc chắn muốn xóa Level ${lvl.level} ("${lvl.title}") không?`
    );
    if (!ok) return;

    try {
      await deleteLevelConfig(lvl.level);
      showToast(`Đã xóa Level ${lvl.level}!`);
      await loadData();
    } catch (err) {
      console.error('Lỗi xóa level:', err);
      showToast('Lỗi xóa level: ' + err.message, 'error');
    }
  };

  // Save single activity EXP rule
  const handleSaveRule = async (activityType) => {
    const val = Number(editingRules[activityType]);
    if (isNaN(val) || val < 0) {
      showToast('Điểm số phải là số dương hợp lệ.', 'error');
      return;
    }

    setSavingRule((prev) => ({ ...prev, [activityType]: true }));
    try {
      await saveExpRule(activityType, val, true);
      showToast(`Đã cập nhật hệ số điểm cho "${activityType}" thành công!`);
      await loadData();
    } catch (err) {
      console.error('Lỗi cập nhật quy tắc:', err);
      showToast('Lỗi cập nhật: ' + err.message, 'error');
    } finally {
      setSavingRule((prev) => ({ ...prev, [activityType]: false }));
    }
  };

  // Recalculate all users EXP
  const [recalculating, setRecalculating] = useState(false);
  const handleRecalculateAll = async () => {
    const ok = window.confirm(
      'Hệ thống sẽ đồng bộ và tính toán lại điểm EXP cùng Cấp độ cho toàn bộ học viên dựa trên lịch sử làm bài. Tiếp tục?'
    );
    if (!ok) return;

    setRecalculating(true);
    try {
      // Fetch all distinct user_ids from activity tables
      const { data: users, error } = await supabase
        .from('user_tense_exercises')
        .select('user_id');

      if (error) throw error;

      const uniqueUserIds = Array.from(new Set((users || []).map((u) => u.user_id))).filter(Boolean);

      let count = 0;
      for (const uid of uniqueUserIds) {
        await supabase.rpc('sync_user_learning_exp', { p_user_id: uid });
        count++;
      }

      showToast(`Đã tính toán lại thành công cho ${count} học viên!`);
    } catch (err) {
      console.error('Lỗi tính toán lại:', err);
      showToast('Lỗi: ' + err.message, 'error');
    } finally {
      setRecalculating(false);
    }
  };

  // Frame dictionary map for quick lookup
  const frameMap = useMemo(() => {
    const map = {};
    (frames || []).forEach((f) => {
      map[f.id] = f;
    });
    return map;
  }, [frames]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
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

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <span className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/20">
              <Trophy size={22} />
            </span>
            <span>Quản Lý Cấp Độ & Điểm EXP</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
            Cấu hình mốc điểm EXP lên cấp, danh hiệu học viên, khung avatar thưởng và hệ số điểm các kỹ năng
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRecalculateAll}
            disabled={recalculating}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            title="Đồng bộ lại điểm toàn bộ học viên"
          >
            <RotateCcw size={15} className={recalculating ? 'animate-spin' : ''} />
            <span>{recalculating ? 'Đang tính toán...' : 'Đồng bộ điểm'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md shadow-indigo-500/25 transition-all cursor-pointer hover:scale-102 active:scale-98"
          >
            <Plus size={16} />
            <span>Thêm Cấp Độ</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('levels')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'levels'
              ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Trophy size={15} />
          <span>Mốc Cấp Độ ({levelConfigs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'rules'
              ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sliders size={15} />
          <span>Hệ Số Điểm Hoạt Động ({expRules.length})</span>
        </button>
      </div>

      {/* TAB 1: MỐC CẤP ĐỘ */}
      {activeTab === 'levels' && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 size={32} className="animate-spin text-indigo-600 dark:text-cyan-400" />
              <p className="text-xs font-bold text-slate-500">Đang tải danh sách mốc cấp độ...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {levelConfigs.map((lvl, index) => {
                const nextLvl = levelConfigs[index + 1];
                const frameReward = frameMap[lvl.reward_frame_id];

                return (
                  <div
                    key={lvl.level}
                    className="group relative rounded-3xl p-5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-white font-black text-sm shadow-xs">
                            {lvl.level}
                          </span>
                          <div>
                            <h3 className="text-base font-black text-slate-950 dark:text-white leading-tight">
                              Level {lvl.level}
                            </h3>
                            <p className="text-xs font-bold text-indigo-600 dark:text-cyan-400">
                              {lvl.title}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(lvl)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-cyan-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            title="Sửa cấp độ"
                          >
                            <Edit2 size={15} />
                          </button>
                          {lvl.level > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteLevel(lvl)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                              title="Xóa cấp độ"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* EXP Milestone */}
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1 mb-3">
                        <div className="flex justify-between items-center text-xs font-bold">
                          <span className="text-slate-500">Mốc EXP yêu cầu:</span>
                          <span className="text-slate-950 dark:text-white font-black text-sm">
                            {lvl.min_exp} EXP
                          </span>
                        </div>
                        {nextLvl && (
                          <div className="flex justify-between items-center text-[11px] text-slate-400">
                            <span>Lên Level {nextLvl.level}:</span>
                            <span>cần thêm +{(nextLvl.min_exp - lvl.min_exp).toFixed(0)} EXP</span>
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mb-3 line-clamp-2">
                        {lvl.description || 'Chưa có mô tả chi tiết cho cấp độ này.'}
                      </p>
                    </div>

                    {/* Reward Frame Preview */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {frameReward ? (
                          <>
                            <div className="shrink-0 scale-90">
                              <UserAvatar
                                src="/assets/3000.png"
                                frame={frameReward}
                                size="sm"
                                fallbackText="L"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                Khung thưởng
                              </p>
                              <p className="text-xs font-black text-slate-900 dark:text-slate-100 truncate">
                                {frameReward.name}
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                            <Sparkles size={13} />
                            <span>Không tặng khung</span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(lvl)}
                        className="text-[11px] font-bold text-indigo-600 dark:text-cyan-400 hover:underline shrink-0"
                      >
                        Chỉnh sửa
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HỆ SỐ ĐIỂM HOẠT ĐỘNG (EXP RULES) */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          <div className="p-5 rounded-3xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/40 flex items-start gap-3.5">
            <span className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs shrink-0 mt-0.5">
              <Sliders size={18} />
            </span>
            <div className="text-xs space-y-1">
              <p className="font-black text-indigo-950 dark:text-indigo-200 text-sm">
                Biểu Phí Điểm Kinh Nghiệm (EXP Rates)
              </p>
              <p className="text-indigo-800/80 dark:text-indigo-300 font-medium">
                Mỗi khi học viên hoàn thành một câu hỏi, từ vựng hoặc đoạn chép chính tả, hệ thống sẽ tự động nhân với hệ số điểm bên dưới và tích lũy vào tổng điểm EXP để tự động thăng cấp.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {expRules.map((rule) => {
              const IconComp = ACTIVITY_ICONS[rule.activity_type] || BookOpen;
              const currentVal = editingRules[rule.activity_type] ?? rule.points_per_unit;
              const isChanged = Number(currentVal) !== Number(rule.points_per_unit);
              const isSavingThis = savingRule[rule.activity_type];

              return (
                <div
                  key={rule.activity_type}
                  className="rounded-3xl p-6 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700/60 text-indigo-600 dark:text-cyan-400 shadow-2xs">
                        <IconComp size={20} />
                      </span>
                      <div>
                        <h3 className="text-base font-black text-slate-950 dark:text-white">
                          {rule.name}
                        </h3>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          Mã: <code className="font-mono text-indigo-600 dark:text-cyan-400">{rule.activity_type}</code>
                        </p>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      Học viên nhận điểm mỗi khi hoàn thành đúng 1 {rule.unit_label}.
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Điểm thưởng / 1 {rule.unit_label}
                    </label>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          max="100"
                          value={currentVal}
                          onChange={(e) =>
                            setEditingRules((prev) => ({
                              ...prev,
                              [rule.activity_type]: e.target.value,
                            }))
                          }
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-black text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                        <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">
                          điểm
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSaveRule(rule.activity_type)}
                        disabled={!isChanged || isSavingThis}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                          isChanged
                            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs hover:scale-102'
                            : 'bg-slate-100 dark:bg-slate-700/60 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {isSavingThis ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Save size={14} />
                        )}
                        <span>Lưu</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: Thêm / Sửa Cấp Độ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-7 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white font-black text-sm">
                  {formData.level}
                </span>
                <div>
                  <h3 className="text-lg font-black text-slate-950 dark:text-white">
                    {editingLevel ? `Chỉnh sửa Level ${formData.level}` : 'Tạo Mới Cấp Độ'}
                  </h3>
                  <p className="text-xs font-medium text-slate-500">
                    Cấu hình mốc điểm và phần thưởng cho cấp độ
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveLevel} className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                {/* Level number */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Số Cấp Độ (Level)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    disabled={Boolean(editingLevel)}
                    value={formData.level}
                    onChange={(e) => setFormData((f) => ({ ...f, level: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-60 disabled:cursor-not-allowed"
                    required
                  />
                </div>

                {/* Min EXP */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Mốc EXP Yêu Cầu
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={formData.min_exp}
                    onChange={(e) => setFormData((f) => ({ ...f, min_exp: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    required
                  />
                </div>
              </div>

              {/* Title / Danh hiệu */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Tên Danh Hiệu (Title)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Học Viên Chăm Chỉ, Chiến Binh Kiên Trì..."
                  value={formData.title}
                  onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  required
                />
              </div>

              {/* Reward Avatar Frame Dropdown */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Khung Avatar Tặng Thưởng (Tùy chọn)
                </label>
                <select
                  value={formData.reward_frame_id}
                  onChange={(e) => setFormData((f) => ({ ...f, reward_frame_id: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="">-- Không tặng khung --</option>
                  {frames.map((fr) => (
                    <option key={fr.id} value={fr.id}>
                      {fr.badgeIcon} {fr.name} ({fr.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Mô Tả Cấp Độ
                </label>
                <textarea
                  rows={2}
                  placeholder="Mô tả ý nghĩa của cấp độ này..."
                  value={formData.description}
                  onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-500/25 hover:scale-102 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  <span>{isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
