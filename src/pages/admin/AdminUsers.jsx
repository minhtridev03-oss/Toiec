import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { 
  Users, Shield, ShieldAlert, AlertCircle, CheckCircle2, ChevronDown
} from 'lucide-react';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_all_users');
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      showToast('Lỗi tải dữ liệu người dùng: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, currentRole, newRole) => {
    if (currentRole === newRole) return;
    
    if (newRole === 'admin') {
      const confirm = window.confirm('Bạn có chắc chắn muốn cấp quyền Admin cho tài khoản này?');
      if (!confirm) return;
    }

    setActionLoading(userId);
    try {
      const { error } = await supabase.rpc('set_user_role', { 
        target_user_id: userId, 
        new_role: newRole 
      });
      if (error) throw error;
      showToast(`Đã thay đổi quyền thành ${newRole.toUpperCase()}!`);
      // Update local state
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      showToast('Lỗi cập nhật quyền: ' + err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-slate-50 dark:bg-[#0F1117]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
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
              <Users size={26} className="text-indigo-600 dark:text-indigo-400" />
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">Quản lý Tài Khoản</h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Quản lý {users.length} người dùng trên hệ thống</p>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white dark:bg-[#1E1226] rounded-2xl shadow-sm border border-slate-200 dark:border-[#3A2F43] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#232736] border-b border-slate-200 dark:border-[#3A2F43]">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Vai trò</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ngày tham gia</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#3A2F43]">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-[#232736]/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{user.email}</div>
                      <div className="text-xs text-slate-400 mt-1 font-mono">{user.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                        user.role === 'admin' 
                          ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20' 
                          : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
                      }`}>
                        {user.role === 'admin' ? <ShieldAlert size={14} /> : <Shield size={14} />}
                        {user.role === 'admin' ? 'ADMIN' : 'USER'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {new Date(user.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {actionLoading === user.id ? (
                        <div className="inline-block w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <div className="relative inline-block text-left">
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, user.role, e.target.value)}
                            className="appearance-none bg-slate-50 dark:bg-[#0F1117] border border-slate-200 dark:border-[#3A2F43] text-slate-700 dark:text-slate-300 py-1.5 pl-3 pr-8 rounded-lg text-sm font-medium focus:outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-6 py-10 text-center text-slate-500 dark:text-slate-400">
                      Không có người dùng nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
