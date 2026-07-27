import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      setErrorMsg('Lỗi cập nhật mật khẩu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-pink-50 dark:bg-[#160B1E] transition-colors">
        <div className="max-w-md w-full bg-white dark:bg-[#1E1226] rounded-3xl shadow-xl border border-pink-200 dark:border-fuchsia-900/40 p-8 text-center transition-colors">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={32} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Đổi mật khẩu thành công!</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
            Mật khẩu của bạn đã được cập nhật. Bây giờ bạn có thể tiếp tục sử dụng hệ thống.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-medium py-3 rounded-xl transition-colors shadow-lg shadow-fuchsia-200 dark:shadow-fuchsia-900/20"
          >
            Vào trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-pink-50 dark:bg-[#160B1E] transition-colors">
      <div className="max-w-md w-full bg-white dark:bg-[#1E1226] rounded-3xl shadow-xl border border-pink-200 dark:border-fuchsia-900/40 p-8 transition-colors">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-fuchsia-100 dark:bg-fuchsia-500/20 rounded-full flex items-center justify-center mx-auto mb-5 transition-colors">
            <Lock size={32} className="text-fuchsia-600 dark:text-fuchsia-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Thiết lập mật khẩu mới</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
            Vui lòng nhập mật khẩu mới cho tài khoản của bạn.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-500/20 flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mật khẩu mới</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ít nhất 6 ký tự" 
                required
                className="w-full px-4 py-3 pr-11 rounded-xl border border-pink-200 dark:border-[#3A2F43] bg-pink-50 dark:bg-[#2A1F33] text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-[#1E1226] focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:border-fuchsia-500 transition-colors"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Xác nhận mật khẩu</label>
            <div className="relative">
              <input 
                type={showConfirmPassword ? 'text' : 'password'} 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu" 
                required
                className={`w-full px-4 py-3 pr-11 rounded-xl border bg-pink-50 dark:bg-[#2A1F33] text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-[#1E1226] focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 transition-colors ${
                  confirmPassword && confirmPassword !== password
                    ? 'border-red-300 focus:border-red-500 dark:border-red-500/50 dark:focus:border-red-500'
                    : 'border-pink-200 dark:border-[#3A2F43] focus:border-fuchsia-500'
                }`}
              />
              <button 
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {confirmPassword && confirmPassword !== password && (
              <p className="text-xs text-red-500 mt-1.5">Mật khẩu không khớp</p>
            )}
          </div>
          
          <button 
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-fuchsia-600 text-white font-medium py-3 rounded-xl hover:bg-fuchsia-500 transition-colors shadow-lg shadow-fuchsia-200 dark:shadow-fuchsia-900/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
          </button>
        </form>

      </div>
    </div>
  );
}
