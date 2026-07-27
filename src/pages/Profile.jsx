import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { User, Camera, Mail, Shield, Save, Loader2, AlertCircle, CheckCircle2, Upload } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.user_metadata?.custom_full_name || user?.user_metadata?.full_name || '',
    avatarUrl: user?.user_metadata?.custom_avatar_url || user?.user_metadata?.avatar_url || '',
  });

  const fileInputRef = useRef(null);

  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
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
      // Tạo tên file duy nhất
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload lên Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Lấy public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Cập nhật avatar_url vào user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { 
          avatar_url: publicUrl,
          custom_avatar_url: publicUrl 
        }
      });

      if (updateError) throw updateError;

      setFormData(f => ({ ...f, avatarUrl: publicUrl }));
      showToast('Cập nhật ảnh đại diện thành công!');
    } catch (err) {
      console.error('Upload error:', err);
      showToast('Lỗi tải ảnh: ' + err.message, 'error');
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
          custom_avatar_url: formData.avatarUrl
        }
      });

      if (error) throw error;
      showToast('Cập nhật thông tin thành công!');
    } catch (err) {
      showToast('Lỗi cập nhật: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const emailInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';

  return (
    <div className="flex-1 overflow-y-auto bg-pink-50 dark:bg-[#160B1E] transition-colors">
      <div className="max-w-3xl mx-auto p-6 md:p-10">
        
        {/* Toast */}
        {toast && (
          <div className={`fixed top-6 right-6 z-[100] flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-300 ${
            toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
          }`}>
            {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            {toast.message}
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400 flex items-center justify-center transition-colors">
              <User size={24} />
            </div>
            Hồ sơ cá nhân
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 pl-15 transition-colors">
            Quản lý thông tin tài khoản và cài đặt cá nhân của bạn.
          </p>
        </div>

        <div className="bg-white dark:bg-[#1E1226] rounded-3xl p-8 shadow-sm border border-pink-200 dark:border-[#3A2F43] transition-colors">
          <form onSubmit={handleUpdate} className="space-y-8">
            
            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-pink-100 dark:border-[#3A2F43] transition-colors">
              <div className="relative group shrink-0">
                {formData.avatarUrl ? (
                  <img src={formData.avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-pink-50 dark:border-[#2A1F33] shadow-md transition-colors" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-fuchsia-100 dark:bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400 font-bold text-3xl flex items-center justify-center border-4 border-pink-50 dark:border-[#2A1F33] shadow-md transition-colors">
                    {emailInitial}
                  </div>
                )}
                {/* Overlay click to upload */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {uploading ? (
                    <Loader2 size={24} className="text-white animate-spin" />
                  ) : (
                    <Camera size={24} className="text-white" />
                  )}
                </button>
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <div className="flex-1 w-full text-center sm:text-left">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1 transition-colors">Ảnh đại diện</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 transition-colors">Nhấn vào ảnh hoặc nút bên dưới để tải ảnh lên. Tối đa 2MB.</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-pink-100 dark:bg-[#2A1F33] text-slate-700 dark:text-slate-300 text-sm font-medium rounded-xl hover:bg-pink-200 dark:hover:bg-[#32263C] transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Đang tải lên...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Chọn ảnh từ máy
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Information Section */}
            <div className="space-y-5">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 transition-colors">Thông tin cơ bản</h3>
              
              <div>
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2 transition-colors">Tên hiển thị</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User size={18} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData(f => ({ ...f, fullName: e.target.value }))}
                    className="w-full bg-pink-50 dark:bg-[#2A1F33] border border-pink-200 dark:border-[#3A2F43] rounded-xl pl-11 pr-4 py-3 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-fuchsia-500 transition-colors"
                    placeholder="Nhập tên của bạn"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2 transition-colors">Địa chỉ Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail size={18} className="text-slate-400" />
                  </div>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full bg-pink-100 dark:bg-[#2A1F33]/50 border border-pink-200 dark:border-[#3A2F43] rounded-xl pl-11 pr-4 py-3 text-sm text-slate-500 dark:text-slate-500 cursor-not-allowed transition-colors"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  <Shield size={12} /> Email được đồng bộ từ tài khoản đăng nhập, không thể thay đổi.
                </p>
              </div>
            </div>

            <div className="pt-6 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-medium px-6 py-3 rounded-xl transition-colors shadow-lg shadow-fuchsia-200 dark:shadow-fuchsia-900/20 disabled:opacity-70"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
