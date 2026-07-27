import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { MessageSquarePlus, Trash2, Clock, Mail, User, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminFeedbacks() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      // 1. Lấy danh sách góp ý từ user_feedbacks
      const { data: feedbacksData, error: feedbacksError } = await supabase
        .from('user_feedbacks')
        .select('id, content, created_at, user_id')
        .order('created_at', { ascending: false });
        
      if (feedbacksError) throw feedbacksError;
      
      // 2. Lấy danh sách users (bằng RPC đã có sẵn) để lấy email thay vì tên
      const { data: usersData, error: usersError } = await supabase.rpc('get_all_users');
      
      let usersMap = {};
      if (!usersError && usersData) {
        usersData.forEach(u => {
          usersMap[u.id] = u.email;
        });
      }
      
      // 3. Ghép dữ liệu
      const mapped = (feedbacksData || []).map(fb => ({
        ...fb,
        user_name: fb.user_id ? (usersMap[fb.user_id] || 'Người dùng') : 'Ẩn danh',
        user_email: fb.user_id ? usersMap[fb.user_id] : null,
      }));
      setFeedbacks(mapped);
    } catch (err) {
      showToast('Lỗi tải danh sách góp ý: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteFeedback = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa góp ý này?')) return;
    
    try {
      const { error } = await supabase.from('user_feedbacks').delete().eq('id', id);
      if (error) throw error;
      
      setFeedbacks(feedbacks.filter(fb => fb.id !== id));
      showToast('Đã xóa góp ý thành công!');
    } catch (err) {
      showToast('Lỗi khi xóa: ' + err.message, 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8 bg-slate-50 dark:bg-[#0F1117] transition-colors">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
          <RefreshCw size={24} className="animate-spin text-fuchsia-500" />
          <span className="font-medium text-lg">Đang tải danh sách góp ý...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-50 dark:bg-[#0F1117] min-h-full transition-colors">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white flex items-center gap-3">
            <MessageSquarePlus className="text-fuchsia-600" size={32} />
            Quản lý Góp ý
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Xem và quản lý các phản hồi, đóng góp từ người dùng
          </p>
        </div>
        <button
          onClick={fetchFeedbacks}
          className="flex items-center gap-2 bg-white dark:bg-[#1E1226] px-4 py-2 rounded-xl text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-[#2A1F33] transition-colors border border-slate-200 dark:border-[#3A2F43] shadow-sm"
        >
          <RefreshCw size={18} /> Làm mới
        </button>
      </div>

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl flex items-center gap-3 ${
            toast.type === 'error' 
              ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30' 
              : 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span className="font-medium">{toast.message}</span>
        </motion.div>
      )}

      {feedbacks.length === 0 ? (
        <div className="bg-white dark:bg-[#1E1226] rounded-2xl p-12 border border-slate-200 dark:border-[#3A2F43] shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-slate-100 dark:bg-[#2A1F33] rounded-full flex items-center justify-center mb-6">
            <MessageSquarePlus size={32} className="text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Chưa có góp ý nào</h3>
          <p className="text-slate-500 dark:text-slate-500 max-w-sm">
            Hiện tại chưa có người dùng nào gửi góp ý về hệ thống.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {feedbacks.map((fb) => (
            <motion.div
              key={fb.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-[#1E1226] rounded-2xl border border-slate-200 dark:border-[#3A2F43] shadow-sm overflow-hidden flex flex-col"
            >
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium">
                    <Clock size={16} />
                    {new Date(fb.created_at).toLocaleString('vi-VN')}
                  </div>
                  <button
                    onClick={() => deleteFeedback(fb.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Xóa góp ý"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <p className="text-slate-800 dark:text-slate-200 text-lg leading-relaxed flex-1 whitespace-pre-wrap">
                  "{fb.content}"
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-[#160B1E]/50 px-6 py-4 border-t border-slate-100 dark:border-[#3A2F43]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <User size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {fb.user_name || 'Người dùng ẩn danh'}
                    </p>
                    {fb.user_email && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                        <Mail size={12} /> {fb.user_email}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
