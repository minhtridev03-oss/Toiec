import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  KeyRound,
  Sparkles,
  ArrowRight,
  LockKeyhole,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  ChevronLeft,
  ShieldCheck,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import { signInWithEmail, signUpWithEmail, requestPasswordReset, signInWithGoogle } from '../../lib/authApi';
import { supabase } from '../../lib/supabaseClient';
import { parseAuthError } from '../../lib/security';
import { removeAppBootSplashImmediate } from '../../utils/bootSplash';

const QUOTES = [
  '✨ 15 phút mỗi ngày, tự tin bứt phá TOEIC',
  '🚀 Mỗi ngày một từ mới, một bước gần thành công',
  '🌱 Học thông minh, tiến bộ vững chắc',
  '🎯 Sẵn sàng chinh phục mục tiêu hôm nay nào!',
  '💡 Luyện tập kiên trì, tự tin làm chủ tiếng Anh'
];

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className="shrink-0">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function MobileSplashAuth({ onComplete }) {
  const { user } = useAuth();
  const { locale } = useLocale();

  // Khởi tạo trạng thái
  const [phase, setPhase] = useState('loading'); // 'loading' | 'actions'
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [isDismissing, setIsDismissing] = useState(false);

  // Bottom Sheet States
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorState, setErrorState] = useState({ message: '', code: '' });
  const [notice, setNotice] = useState('');

  // Ngay khi component mount, xóa DOM splash tĩnh của index.html để React tiếp quản 0ms
  useEffect(() => {
    removeAppBootSplashImmediate();

    // Chạy thanh load từ 0% đến 100% trong 1.3s, sau đó chuyển hóa (morph) sang cụm nút đăng nhập/đăng ký
    const timer = setTimeout(() => {
      setPhase('actions');
    }, 1350);

    return () => clearTimeout(timer);
  }, []);

  // Nếu user đã đăng nhập thành công từ trước hoặc vừa đăng nhập
  useEffect(() => {
    if (user && !isDismissing) {
      setIsDismissing(true);
      const timer = setTimeout(() => {
        onComplete?.();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, isDismissing, onComplete]);

  const openSheet = (mode) => {
    setSheetMode(mode);
    setErrorState({ message: '', code: '' });
    setNotice('');
    setIsSheetOpen(true);
  };

  const closeSheet = () => {
    if (loading || isSuccess) return;
    setIsSheetOpen(false);
    setErrorState({ message: '', code: '' });
    setNotice('');
  };

  const switchSheetMode = (targetMode) => {
    setSheetMode(targetMode);
    setErrorState({ message: '', code: '' });
    setNotice('');
    setPassword('');
    setConfirmPassword('');
  };

  const clearError = useCallback(() => {
    setErrorState((prev) => (prev.message ? { message: '', code: '' } : prev));
  }, []);

  // Đánh giá độ mạnh mật khẩu (Signup Mode)
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '', width: '0%' };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password) || /[A-Z]/.test(password)) score++;

    if (score <= 1) return { score: 1, label: 'Yếu', color: 'bg-rose-500', textColor: 'text-rose-500', width: '33%' };
    if (score <= 3) return { score: 2, label: 'Khá', color: 'bg-amber-500', textColor: 'text-amber-500', width: '66%' };
    return { score: 3, label: 'Rất mạnh', color: 'bg-emerald-500', textColor: 'text-emerald-500', width: '100%' };
  }, [password]);

  // Xử lý đăng nhập / đăng ký qua Email
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setErrorState({ message: '', code: '' });
    setNotice('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorState({ message: 'Vui lòng nhập địa chỉ email.', code: 'INVALID_EMAIL' });
      return;
    }

    // Quên mật khẩu
    if (sheetMode === 'forgot') {
      setLoading(true);
      try {
        await requestPasswordReset(cleanEmail);
        setNotice('Đã gửi liên kết khôi phục vào email của bạn. Vui lòng kiểm tra hộp thư.');
      } catch (err) {
        console.error('Password reset failed:', err);
        setErrorState(parseAuthError(err, locale));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Kiểm tra mật khẩu
    if (!password || password.length < 6) {
      setErrorState({ message: 'Mật khẩu phải có ít nhất 6 ký tự.', code: 'WEAK_PASSWORD' });
      return;
    }

    // Tạo tài khoản: kiểm tra khớp mật khẩu
    if (sheetMode === 'signup') {
      if (password !== confirmPassword) {
        setErrorState({ message: 'Mật khẩu xác nhận không trùng khớp.', code: 'PASSWORD_MISMATCH' });
        return;
      }
    }

    setLoading(true);
    try {
      if (sheetMode === 'login') {
        await signInWithEmail({ email: cleanEmail, password });
      } else {
        await signUpWithEmail({ email: cleanEmail, password });
      }

      setIsSuccess(true);
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {}

      // Mờ dần toàn bộ màn hình Splash và chuyển vào Dashboard
      setTimeout(() => {
        setIsDismissing(true);
        setTimeout(() => {
          onComplete?.();
        }, 500);
      }, 700);
    } catch (err) {
      console.error('Auth action failed:', err);
      setErrorState(parseAuthError(err, locale));
    } finally {
      if (!isSuccess) setLoading(false);
    }
  };

  // Đăng nhập Google OAuth
  const handleGoogleLogin = async () => {
    setErrorState({ message: '', code: '' });
    setNotice('');
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      setTimeout(() => setIsGoogleLoading(false), 2500);
    } catch (err) {
      console.error('Google sign-in failed:', err);
      setErrorState(parseAuthError(err, locale));
      setIsGoogleLoading(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-[#f8fafc] dark:bg-[#090d16] overflow-hidden select-none transition-all duration-500 ${
        isDismissing ? 'opacity-0 scale-105 pointer-events-none filter blur-md' : 'opacity-100 scale-100'
      }`}
      style={{
        paddingTop: 'max(24px, env(safe-area-inset-top, 24px))',
        paddingBottom: 'max(32px, env(safe-area-inset-bottom, 32px))',
      }}
    >
      {/* Ambient Glowing Neon Blobs */}
      <div className="splash-glow-1 pointer-events-none" />
      <div className="splash-glow-2 pointer-events-none" />

      {/* Mascot Glass Showcase Squircle */}
      <motion.div
        animate={{
          scale: isSheetOpen ? 0.78 : 1,
          y: isSheetOpen ? -36 : 0,
          opacity: isSheetOpen ? 0.25 : 1,
        }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="splash-mascot-box"
      >
        <div className="splash-mascot-halo" />
        <img
          src="/mascot.png"
          alt="T-English Mascot"
          className="splash-mascot-img"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = './mascot.png';
          }}
        />
      </motion.div>

      {/* Brand Name & Tagline */}
      <motion.div
        animate={{
          opacity: isSheetOpen ? 0.2 : 1,
          y: isSheetOpen ? -36 : 0,
        }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="text-center"
      >
        <h1 className="splash-brand">T-English</h1>
        <p className="splash-tagline">Học tiếng Anh thông minh • Bứt phá TOEIC</p>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* INTERACTIVE MORPH ZONE: Thanh load chuyển hóa mềm mại thành 2 nút */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div className="relative mt-8 w-full max-w-[290px] px-2 min-h-[128px] flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {phase === 'loading' ? (
            /* Phase 1: Thanh tiến trình nạp ngầm mượt mà */
            <motion.div
              key="loading-track"
              initial={{ opacity: 0, scaleX: 0.8 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scale: 0.85, filter: 'blur(4px)' }}
              transition={{ duration: 0.3 }}
              className="relative w-[150px] h-[5px] rounded-full bg-indigo-500/15 dark:bg-white/10 overflow-hidden"
            >
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-400"
              />
            </motion.div>
          ) : (
            /* Phase 2: Cụm 2 nút Đăng nhập & Tạo tài khoản mở ra nhịp nhàng (NO Guest per instruction) */
            <motion.div
              key="action-buttons"
              initial={{ opacity: 0, y: 18, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', damping: 22, stiffness: 280 }}
              className="w-full flex flex-col gap-3"
            >
              {/* Nút 1: Đăng nhập (Primary Gradient) */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => openSheet('login')}
                className="relative group w-full h-[48px] rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 active:shadow-md transition-all cursor-pointer"
              >
                <KeyRound size={17} className="transition-transform group-hover:rotate-12" />
                <span>Đăng nhập</span>
                <ArrowRight size={15} className="opacity-70 group-hover:translate-x-0.5 transition-transform" />
              </motion.button>

              {/* Nút 2: Tạo tài khoản mới (Glassmorphism Luxury) */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => openSheet('signup')}
                className="w-full h-[48px] rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/15 text-slate-800 dark:text-slate-100 font-extrabold text-sm flex items-center justify-center gap-2 backdrop-blur-xl shadow-xs active:shadow-none hover:bg-white dark:hover:bg-slate-900/80 transition-all cursor-pointer"
              >
                <Sparkles size={16} className="text-amber-500 dark:text-cyan-400" />
                <span>Tạo tài khoản mới</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quote Chip ở đáy màn hình */}
      <motion.div
        animate={{ opacity: isSheetOpen ? 0 : 1 }}
        transition={{ duration: 0.2 }}
        className="splash-quote pointer-events-none"
      >
        <span>{quote}</span>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* LIQUID GLASS BOTTOM SHEET: Khung đăng nhập trượt êm ái từ dưới lên */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {isSheetOpen && (
          <>
            {/* Backdrop làm mờ tinh tế */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={closeSheet}
              className="fixed inset-0 z-[1000000] bg-slate-950/60 dark:bg-black/80 backdrop-blur-[3px]"
            />

            {/* Bottom Sheet Drawer */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed inset-x-0 bottom-0 z-[1000001] max-h-[90vh] rounded-t-[32px] bg-white/95 dark:bg-[#0c1222]/95 border-t border-slate-200/90 dark:border-white/15 backdrop-blur-2xl shadow-2xl flex flex-col overflow-hidden"
              style={{
                paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
              }}
            >
              {/* Top Handle Drag Indicator */}
              <div className="w-full pt-3 pb-1.5 flex items-center justify-center">
                <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              </div>

              {/* Sheet Header */}
              <div className="relative px-6 pt-2 pb-3 flex items-center justify-between border-b border-slate-100 dark:border-white/5">
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    {sheetMode === 'login'
                      ? 'Đăng nhập vào T-English'
                      : sheetMode === 'signup'
                        ? 'Tạo tài khoản mới'
                        : 'Khôi phục mật khẩu'}
                  </h2>
                  <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    {sheetMode === 'login'
                      ? 'Đồng bộ tiến độ học tập và thành tích TOEIC.'
                      : sheetMode === 'signup'
                        ? 'Cùng hơn 15.000 học viên chinh phục tiếng Anh.'
                        : 'Nhập email để nhận liên kết khôi phục.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeSheet}
                  disabled={loading || isSuccess}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Sheet Body Scrollable */}
              <div className="overflow-y-auto px-6 py-4 space-y-4">
                {/* Segment Tabs Switcher: Đăng nhập | Tạo tài khoản (Chỉ hiện khi không ở forgot mode) */}
                {sheetMode !== 'forgot' && (
                  <div className="flex rounded-2xl p-1 bg-slate-100 dark:bg-black/40 border border-slate-200/60 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => switchSheetMode('login')}
                      className={`relative flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        sheetMode === 'login'
                          ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-cyan-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <KeyRound size={13} />
                      <span>Đăng nhập</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => switchSheetMode('signup')}
                      className={`relative flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        sheetMode === 'signup'
                          ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-cyan-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <UserPlus size={13} />
                      <span>Tạo tài khoản</span>
                    </button>
                  </div>
                )}

                {/* Thông báo lỗi & Thành công */}
                <AnimatePresence mode="wait">
                  {errorState.message && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-start gap-2"
                    >
                      <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-500" />
                      <div className="flex-1">
                        <div>{errorState.message}</div>
                        {sheetMode === 'signup' && errorState.code === 'EMAIL_ALREADY_REGISTERED' && (
                          <button
                            type="button"
                            onClick={() => switchSheetMode('login')}
                            className="mt-1 text-[11px] font-black text-indigo-600 underline dark:text-cyan-400 cursor-pointer"
                          >
                            👉 Bấm vào đây để đăng nhập với email này
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {notice && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-start gap-2"
                    >
                      <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-500" />
                      <span>{notice}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Google Sign-In Button */}
                {sheetMode !== 'forgot' && (
                  <>
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={loading || isGoogleLoading || isSuccess}
                      className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2.5 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.99] transition-all cursor-pointer"
                    >
                      {isGoogleLoading ? <Loader2 size={16} className="animate-spin text-indigo-500" /> : <GoogleIcon />}
                      <span>Tiếp tục với Google</span>
                    </button>

                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                      <span>hoặc bằng Email</span>
                      <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                    </div>
                  </>
                )}

                {/* Form nhập liệu */}
                <form onSubmit={handleEmailAuth} className="space-y-3">
                  {/* Email */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                      Địa chỉ Email
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          clearError();
                          if (notice) setNotice('');
                        }}
                        placeholder="name@example.com"
                        autoCapitalize="none"
                        required
                        disabled={loading || isSuccess}
                        className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 py-2.5 pl-10 pr-3 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-600 dark:focus:border-cyan-400 focus:ring-2 focus:ring-indigo-500/10 transition"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  {sheetMode !== 'forgot' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                          Mật khẩu
                        </label>
                        {sheetMode === 'login' && (
                          <button
                            type="button"
                            onClick={() => switchSheetMode('forgot')}
                            className="text-[11px] font-bold text-indigo-600 dark:text-cyan-400 hover:underline cursor-pointer"
                          >
                            Quên mật khẩu?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <LockKeyhole size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            clearError();
                          }}
                          placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                          required
                          disabled={loading || isSuccess}
                          className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 py-2.5 pl-10 pr-10 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-600 dark:focus:border-cyan-400 focus:ring-2 focus:ring-indigo-500/10 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Confirm Password (Signup Mode Only) */}
                  {sheetMode === 'signup' && (
                    <>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">
                          Xác nhận mật khẩu
                        </label>
                        <div className="relative">
                          <LockKeyhole size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => {
                              setConfirmPassword(e.target.value);
                              clearError();
                            }}
                            placeholder="Nhập lại mật khẩu"
                            required
                            disabled={loading || isSuccess}
                            className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white/60 dark:bg-slate-900/60 py-2.5 pl-10 pr-10 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white outline-none focus:border-indigo-600 dark:focus:border-cyan-400 focus:ring-2 focus:ring-indigo-500/10 transition"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword((prev) => !prev)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                          >
                            {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>

                      {/* Password Strength Meter */}
                      {password && (
                        <div className="space-y-1 pt-0.5">
                          <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                            <div className={`h-full transition-all duration-300 ${passwordStrength.color}`} style={{ width: passwordStrength.width }} />
                          </div>
                          <p className={`text-[10px] font-bold ${passwordStrength.textColor}`}>
                            Độ mạnh: {passwordStrength.label}
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading || isSuccess}
                    className="w-full mt-2 h-11 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-indigo-500/20 active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Đang xử lý...</span>
                      </>
                    ) : isSuccess ? (
                      <>
                        <CheckCircle2 size={16} className="text-white" />
                        <span>Đăng nhập thành công!</span>
                      </>
                    ) : sheetMode === 'login' ? (
                      <span>Đăng nhập ngay</span>
                    ) : sheetMode === 'signup' ? (
                      <span>Tạo tài khoản học ngay</span>
                    ) : (
                      <span>Gửi liên kết khôi phục</span>
                    )}
                  </button>

                  {/* Back to Login link if in forgot mode */}
                  {sheetMode === 'forgot' && (
                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => switchSheetMode('login')}
                        className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-cyan-400 cursor-pointer"
                      >
                        <ChevronLeft size={14} />
                        <span>Quay lại đăng nhập</span>
                      </button>
                    </div>
                  )}
                </form>

                {/* Footer SSL Note */}
                <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                  <ShieldCheck size={13} className="text-emerald-500" />
                  <span>Bảo mật tiêu chuẩn SSL · Đồng bộ dữ liệu đa thiết bị</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
