import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Sparkles,
  ShieldCheck,
  Loader2,
  KeyRound,
  UserPlus,
  Send,
  AlertCircle,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import { signInWithEmail, signUpWithEmail, requestPasswordReset } from '../../lib/authApi';
import { parseAuthError } from '../../lib/security';

const COPY = {
  vi: {
    welcome: 'Chào mừng trở lại',
    welcomeSubtitle: 'Đăng nhập để lưu tiến độ và tham gia thi đua cùng bạn bè.',
    createAccount: 'Tạo tài khoản mới',
    createAccountSubtitle: 'Bắt đầu hành trình chinh phục tiếng Anh theo nhịp của riêng bạn.',
    forgotTitle: 'Khôi phục mật khẩu',
    forgotSubtitle: 'Nhập email đã đăng ký, chúng mình sẽ gửi liên kết tạo mật khẩu mới.',
    tabLogin: 'Đăng nhập',
    tabSignup: 'Tạo tài khoản',
    continueGoogle: 'Tiếp tục với Google',
    or: 'hoặc bằng Email',
    email: 'Địa chỉ Email',
    emailPlaceholder: 'name@example.com',
    password: 'Mật khẩu',
    passwordPlaceholder: 'Nhập mật khẩu (tối thiểu 6 ký tự)',
    confirmPassword: 'Xác nhận mật khẩu',
    confirmPasswordPlaceholder: 'Nhập lại mật khẩu vừa nhập',
    forgotPassword: 'Quên mật khẩu?',
    backToLogin: 'Quay lại đăng nhập',
    sendResetLink: 'Gửi liên kết khôi phục',
    signIn: 'Đăng nhập vào hệ thống',
    signUp: 'Tạo tài khoản học ngay',
    processing: 'Đang xử lý...',
    noAccount: 'Chưa có tài khoản?',
    hasAccount: 'Đã có tài khoản?',
    signUpNow: 'Tạo tài khoản mới',
    signInNow: 'Đăng nhập ngay',
    passwordMismatch: 'Mật khẩu xác nhận không trùng khớp.',
    passwordShort: 'Mật khẩu phải có ít nhất 6 ký tự.',
    signUpSuccess: 'Đăng ký thành công! Hãy kiểm tra email để xác nhận tài khoản nếu được yêu cầu.',
    resetLinkSent: 'Đã gửi liên kết khôi phục vào email của bạn. Vui lòng kiểm tra hộp thư.',
    loginSuccess: 'Đăng nhập thành công! Đang vào hệ thống...',
    invalidCredentials: 'Email hoặc mật khẩu không chính xác.',
    alreadyRegistered: 'Email này đã được đăng ký. Hãy chuyển sang Đăng nhập nhé.',
    rateLimited: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
    authFailed: 'Không thể xác thực lúc này. Vui lòng thử lại sau.',
    showPassword: 'Hiện mật khẩu',
    hidePassword: 'Ẩn mật khẩu',
    securityNote: 'Bảo mật tiêu chuẩn SSL · Đồng bộ dữ liệu đa thiết bị',
    strengthWeak: 'Yếu',
    strengthMedium: 'Khá',
    strengthStrong: 'Rất mạnh',
    botWelcome: 'Chào bạn quay lại! Cùng học TOEIC bứt phá hôm nay nhé 🚀',
    botSignup: 'Cùng hơn 15.000 học viên chinh phục tiếng Anh mỗi ngày ✨',
    botForgot: 'Đừng lo, mình sẽ gửi link khôi phục vào email cho bạn ngay 🔑',
    botPassword: 'Yên tâm nha, mật khẩu của bạn luôn được bảo mật tuyệt đối 🤫',
    botSuccess: 'Tuyệt vời quá! Đang mở cánh cửa tri thức... 🎉',
  },
  en: {
    welcome: 'Welcome back',
    welcomeSubtitle: 'Sign in to save your learning progress & join the leaderboard.',
    createAccount: 'Create an account',
    createAccountSubtitle: 'Start an English-learning journey at your own rhythm.',
    forgotTitle: 'Recover Password',
    forgotSubtitle: 'Enter your registered email and we will send a password reset link.',
    tabLogin: 'Sign in',
    tabSignup: 'Sign up',
    continueGoogle: 'Continue with Google',
    or: 'or use Email',
    email: 'Email address',
    emailPlaceholder: 'name@example.com',
    password: 'Password',
    passwordPlaceholder: 'Enter your password (min 6 chars)',
    confirmPassword: 'Confirm password',
    confirmPasswordPlaceholder: 'Re-enter your password',
    forgotPassword: 'Forgot password?',
    backToLogin: 'Back to sign in',
    sendResetLink: 'Send reset link',
    signIn: 'Sign in to dashboard',
    signUp: 'Create account now',
    processing: 'Working...',
    noAccount: 'New to T-English?',
    hasAccount: 'Already have an account?',
    signUpNow: 'Create one',
    signInNow: 'Sign in',
    passwordMismatch: 'The password confirmation does not match.',
    passwordShort: 'Your password must contain at least 6 characters.',
    signUpSuccess: 'Account created! Please check your email for confirmation.',
    resetLinkSent: 'Reset link sent! Please check your inbox (including spam folder).',
    loginSuccess: 'Login successful! Opening your space...',
    invalidCredentials: 'Your email or password is incorrect.',
    alreadyRegistered: 'This email is already registered. Please sign in.',
    rateLimited: 'Too many attempts. Please wait a moment before trying again.',
    authFailed: 'We could not authenticate you right now. Please try again.',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    securityNote: 'SSL End-to-end Encrypted · Real-time multi-device sync',
    strengthWeak: 'Weak',
    strengthMedium: 'Fair',
    strengthStrong: 'Strong',
    botWelcome: 'Welcome back! Ready for a high-yield study session today? 🚀',
    botSignup: 'Join 15,000+ motivated learners mastering English ✨',
    botForgot: 'No worries, I will send the reset link to your email 🔑',
    botPassword: 'Rest assured, your credentials are fully encrypted 🤫',
    botSuccess: 'Awesome! Opening your learning space... 🎉',
  },
};

function GoogleMark() {
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

export default function AuthModal() {
  const { authModalOpen, authModalMode, closeAuthModal } = useAuth();
  const { locale } = useLocale();
  const text = COPY[locale] || COPY.vi;

  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'
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

  const modalRef = useRef(null);

  const clearError = useCallback(() => {
    setErrorState((prev) => (prev.message ? { message: '', code: '' } : prev));
  }, []);

  // Sync mode whenever parent triggers opening with a specific mode
  useEffect(() => {
    if (authModalMode) {
      setMode(authModalMode);
      setErrorState({ message: '', code: '' });
      setNotice('');
    }
  }, [authModalMode, authModalOpen]);

  const handleClose = useCallback(() => {
    if (['/login', '/register', '/forgot-password'].includes(window.location.pathname)) {
      window.history.replaceState(null, '', '/dashboard');
    }
    closeAuthModal();
  }, [closeAuthModal]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && authModalOpen && !loading) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authModalOpen, loading, handleClose]);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '', width: '0%' };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password) || /[A-Z]/.test(password)) score++;

    if (score <= 1) {
      return {
        score: 1,
        label: text.strengthWeak,
        color: 'bg-rose-500',
        textColor: 'text-rose-500',
        width: '33%',
      };
    }
    if (score <= 3) {
      return {
        score: 2,
        label: text.strengthMedium,
        color: 'bg-amber-400',
        textColor: 'text-amber-500',
        width: '66%',
      };
    }
    return {
      score: 3,
      label: text.strengthStrong,
      color: 'bg-emerald-400 dark:bg-cyan-400',
      textColor: 'text-emerald-500 dark:text-cyan-400',
      width: '100%',
    };
  }, [password, text.strengthMedium, text.strengthStrong, text.strengthWeak]);

  const switchMode = (targetMode) => {
    setMode(targetMode);
    setErrorState({ message: '', code: '' });
    setNotice('');
    setPassword('');
    setConfirmPassword('');
    if (targetMode === 'signup') {
      window.history.replaceState(null, '', '/register');
    } else if (targetMode === 'login') {
      window.history.replaceState(null, '', '/login');
    } else if (targetMode === 'forgot') {
      window.history.replaceState(null, '', '/forgot-password');
    }
  };

  const handleEmailAuth = async (event) => {
    event.preventDefault();
    setErrorState({ message: '', code: '' });
    setNotice('');

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorState({
        message: locale === 'vi' ? 'Vui lòng nhập địa chỉ email.' : 'Please enter your email address.',
        code: 'INVALID_EMAIL',
      });
      return;
    }

    if (mode === 'forgot') {
      setLoading(true);
      try {
        await requestPasswordReset(cleanEmail);
        setNotice(text.resetLinkSent);
      } catch (error) {
        console.error('Password reset failed:', error);
        setErrorState(parseAuthError(error, locale));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setErrorState({ message: text.passwordMismatch, code: 'PASSWORD_MISMATCH' });
        return;
      }
      if (password.length < 6) {
        setErrorState({ message: text.passwordShort, code: 'PASSWORD_TOO_SHORT' });
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmail({ email: cleanEmail, password });
        setIsSuccess(true);
        try {
          confetti({
            particleCount: 50,
            spread: 55,
            origin: { y: 0.6 },
            colors: ['#818cf8', '#c084fc', '#f472b6', '#38bdf8'],
          });
        } catch {}
        setTimeout(() => {
          setIsSuccess(false);
          handleClose();
        }, 950);
      } else {
        const result = await signUpWithEmail({ email: cleanEmail, password });
        if (result?.session) {
          setIsSuccess(true);
          try {
            confetti({
              particleCount: 50,
              spread: 55,
              origin: { y: 0.6 },
              colors: ['#818cf8', '#c084fc', '#f472b6', '#38bdf8'],
            });
          } catch {}
          setTimeout(() => {
            setIsSuccess(false);
            handleClose();
          }, 950);
        } else {
          setNotice(text.signUpSuccess);
        }
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      setErrorState(parseAuthError(error, locale));
    } finally {
      if (!isSuccess) setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorState({ message: '', code: '' });
    setNotice('');
    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Google sign-in failed:', error);
      setErrorState(parseAuthError(error, locale));
      setIsGoogleLoading(false);
    }
  };

  if (!authModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        {/* Backdrop: Liquid glass dimming overlay synchronized with web ambient */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (!loading && !isSuccess) handleClose();
          }}
          className="fixed inset-0 bg-slate-950/45 dark:bg-black/70 backdrop-blur-[8px] transition-colors"
        />

        {/* Modal Window: 100% Synchronized Glass Panel */}
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-[460px] overflow-hidden rounded-[2.2rem] glass-panel bg-white/85 dark:bg-[#0f172a]/92 p-5 sm:p-7 shadow-[0_25px_80px_rgba(0,0,0,0.55)] border border-white/60 dark:border-white/10 backdrop-blur-2xl my-auto"
        >
          {/* Subtle top edge liquid glow */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-500/50 dark:via-cyan-400/50 to-transparent" />

          {/* Close Button [✕] at top-right */}
          <button
            type="button"
            onClick={handleClose}
            disabled={loading || isSuccess}
            className="absolute top-5 right-5 z-20 flex h-8 w-8 items-center justify-center rounded-xl glass-panel text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Đóng (ESC)"
          >
            <X size={16} />
          </button>

          {/* Title & Subtitle */}
          <div className="mb-4">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {mode === 'login'
                ? text.welcome
                : mode === 'signup'
                  ? text.createAccount
                  : text.forgotTitle}
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
              {mode === 'login'
                ? text.welcomeSubtitle
                : mode === 'signup'
                  ? text.createAccountSubtitle
                  : text.forgotSubtitle}
            </p>
          </div>

          {/* Tab Switcher - Exactly Synchronized with Dashboard/Sidebar glass tabs */}
          {mode !== 'forgot' && (
            <div className="mb-4 flex rounded-2xl p-1 glass-panel dark:bg-black/40 dark:border-white/10 shadow-xs">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'glass-pill-active text-indigo-900 font-black shadow-xs dark:bg-black dark:text-cyan-400 dark:border dark:border-cyan-500/30'
                    : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                <KeyRound size={14} className={mode === 'login' ? 'text-indigo-600 dark:text-cyan-400' : ''} />
                <span>{text.tabLogin}</span>
              </button>

              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'glass-pill-active text-indigo-900 font-black shadow-xs dark:bg-black dark:text-cyan-400 dark:border dark:border-cyan-500/30'
                    : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                <UserPlus size={14} className={mode === 'signup' ? 'text-indigo-600 dark:text-cyan-400' : ''} />
                <span>{text.tabSignup}</span>
              </button>
            </div>
          )}

          {/* Alerts: Error & Notice */}
          <AnimatePresence mode="wait">
            {errorState.message && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                role="alert"
                className="mb-4 flex flex-col gap-1.5 rounded-xl border border-rose-300/60 bg-rose-50/80 p-3 text-xs font-bold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 backdrop-blur-md"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-500" />
                  <span className="leading-tight flex-1">{errorState.message}</span>
                </div>

                {/* Quick 1-click action: if email already registered during signup, switch directly to login */}
                {mode === 'signup' && errorState.code === 'EMAIL_ALREADY_REGISTERED' && (
                  <div className="ml-5 mt-0.5">
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="inline-flex items-center gap-1 text-[11px] font-black text-indigo-600 underline hover:text-indigo-700 dark:text-cyan-400 dark:hover:text-cyan-300 cursor-pointer"
                    >
                      <span>{locale === 'vi' ? '👉 Đăng nhập ngay với email này' : '👉 Sign in now with this email'}</span>
                    </button>
                  </div>
                )}

                {/* Quick 1-click action: if invalid credentials during login, offer password recovery */}
                {mode === 'login' && errorState.code === 'INVALID_CREDENTIALS' && (
                  <div className="ml-5 mt-0.5">
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="inline-flex items-center gap-1 text-[11px] font-black text-indigo-600 underline hover:text-indigo-700 dark:text-cyan-400 dark:hover:text-cyan-300 cursor-pointer"
                    >
                      <span>{locale === 'vi' ? '👉 Bạn quên mật khẩu? Bấm để lấy lại' : '👉 Forgot password? Reset here'}</span>
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {notice && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                role="status"
                className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-300/60 bg-emerald-50/80 p-3 text-xs font-bold text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200 backdrop-blur-md"
              >
                <CheckCircle2 size={15} className="shrink-0 mt-0.5 text-emerald-500" />
                <span className="leading-tight">{notice}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Google OAuth Button */}
          {mode !== 'forgot' && (
            <>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading || isGoogleLoading || isSuccess}
                className="group flex w-full items-center justify-center gap-2.5 rounded-xl border border-slate-200/80 bg-white/75 dark:border-white/10 dark:bg-black/30 px-3.5 py-2.5 text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-200 shadow-2xs transition-all hover:bg-white dark:hover:bg-black/50 hover:border-slate-300 dark:hover:border-white/20 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {isGoogleLoading ? <Loader2 size={16} className="animate-spin text-indigo-500" /> : <GoogleMark />}
                <span>{text.continueGoogle}</span>
              </button>

              <div className="my-3.5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <span className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-slate-200 dark:via-white/10 dark:to-white/10" />
                <span>{text.or}</span>
                <span className="h-px flex-1 bg-gradient-to-r from-slate-200 via-slate-200 to-transparent dark:from-white/10 dark:via-white/10" />
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3">
            {/* Email Field */}
            <div>
              <label
                htmlFor="modal-email"
                className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300"
              >
                {text.email}
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="modal-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearError();
                    if (notice) setNotice('');
                  }}
                  placeholder={text.emailPlaceholder}
                  autoComplete="email"
                  required
                  disabled={loading || isSuccess}
                  className="w-full rounded-xl border border-slate-200/80 bg-white/60 dark:border-white/10 dark:bg-black/40 py-2.5 pl-10 pr-3 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white outline-none transition placeholder:text-slate-400 focus:border-indigo-600 dark:focus:border-cyan-400 focus:ring-2 focus:ring-indigo-500/10 dark:focus:ring-cyan-500/20"
                />
              </div>
            </div>

            {/* Password Field */}
            {mode !== 'forgot' && (
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label
                    htmlFor="modal-password"
                    className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                  >
                    {text.password}
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-[11px] font-bold text-indigo-600 dark:text-cyan-400 hover:underline cursor-pointer"
                    >
                      {text.forgotPassword}
                    </button>
                  )}
                </div>

                <div className="relative">
                  <LockKeyhole
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="modal-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearError();
                    }}
                    placeholder={text.passwordPlaceholder}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                    disabled={loading || isSuccess}
                    className="w-full rounded-xl border border-slate-200/80 bg-white/60 dark:border-white/10 dark:bg-black/40 py-2.5 pl-10 pr-10 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white outline-none transition placeholder:text-slate-400 focus:border-indigo-600 dark:focus:border-cyan-400 focus:ring-2 focus:ring-indigo-500/10 dark:focus:ring-cyan-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    title={showPassword ? text.hidePassword : text.showPassword}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {/* Password Strength Meter (Signup Mode Only) */}
                {mode === 'signup' && password.length > 0 && (
                  <div className="mt-2 rounded-xl border border-slate-200/50 bg-slate-50/60 dark:border-white/5 dark:bg-black/30 p-2">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-slate-500 dark:text-slate-400">Độ mạnh mật khẩu:</span>
                      <span className={passwordStrength.textColor}>{passwordStrength.label}</span>
                    </div>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                      <div
                        className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: passwordStrength.width }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Confirm Password Field (Signup Mode Only) */}
            {mode === 'signup' && (
              <div>
                <label
                  htmlFor="modal-confirm-password"
                  className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                >
                  {text.confirmPassword}
                </label>
                <div className="relative">
                  <LockKeyhole
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="modal-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      clearError();
                    }}
                    placeholder={text.confirmPasswordPlaceholder}
                    autoComplete="new-password"
                    required
                    disabled={loading || isSuccess}
                    className="w-full rounded-xl border border-slate-200/80 bg-white/60 dark:border-white/10 dark:bg-black/40 py-2.5 pl-10 pr-10 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white outline-none transition placeholder:text-slate-400 focus:border-indigo-600 dark:focus:border-cyan-400 focus:ring-2 focus:ring-indigo-500/10 dark:focus:ring-cyan-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    title={showConfirmPassword ? text.hidePassword : text.showPassword}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="mt-1 text-[11px] font-bold text-rose-500">{text.passwordMismatch}</p>
                )}
              </div>
            )}

            {/* Primary Action Button - Synchronized with Dashboard/Sidebar gradients */}
            <button
              type="submit"
              disabled={loading || isGoogleLoading || isSuccess}
              className={`group relative mt-1 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-3 text-xs sm:text-sm font-black text-white shadow-md transition-all cursor-pointer ${
                isSuccess
                  ? 'bg-emerald-600 shadow-emerald-500/30'
                  : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 dark:from-indigo-600 dark:via-purple-600 dark:to-cyan-500 shadow-indigo-600/30 hover:brightness-105 active:scale-[0.99]'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{text.processing}</span>
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle2 size={16} className="animate-bounce" />
                  <span>{text.loginSuccess}</span>
                </>
              ) : mode === 'forgot' ? (
                <>
                  <Send size={15} />
                  <span>{text.sendResetLink}</span>
                </>
              ) : mode === 'login' ? (
                <>
                  <Sparkles size={15} />
                  <span>{text.signIn}</span>
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                </>
              ) : (
                <>
                  <UserPlus size={15} />
                  <span>{text.signUp}</span>
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* Mode Switcher Footer */}
          {mode === 'forgot' ? (
            <div className="mt-3.5 text-center">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-cyan-400 hover:underline cursor-pointer"
              >
                <ArrowLeft size={13} />
                {text.backToLogin}
              </button>
            </div>
          ) : (
            <p className="mt-3.5 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
              {mode === 'login' ? text.noAccount : text.hasAccount}{' '}
              <button
                type="button"
                onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                className="font-black text-indigo-600 dark:text-cyan-400 hover:underline cursor-pointer"
              >
                {mode === 'login' ? text.signUpNow : text.signInNow}
              </button>
            </p>
          )}

          {/* Security Badge */}
          <div className="mt-4 flex items-center justify-center gap-1.5 border-t border-slate-200/50 dark:border-white/10 pt-3 text-[10px] font-semibold text-slate-400 dark:text-slate-500">
            <ShieldCheck size={13} className="text-emerald-500" />
            <span>{text.securityNote}</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
