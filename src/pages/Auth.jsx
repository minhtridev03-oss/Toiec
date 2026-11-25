import { useState, useMemo, useEffect } from 'react';
import { Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Languages,
  LockKeyhole,
  Mail,
  Moon,
  Sparkles,
  Sun,
  ShieldCheck,
  Loader2,
  KeyRound,
  UserPlus,
  Send,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { useTheme } from '../contexts/ThemeContext';
import { signInWithEmail, signUpWithEmail, requestPasswordReset, signInWithGoogle } from '../lib/authApi';
import { parseAuthError } from '../lib/security';
import appLogo from '../assets/logo.png';
import chatbotImage from '../assets/chatbot-transparent.png';
import TransparentImage from '../components/TransparentImage';

const COPY = {
  vi: {
    brandTagline: 'Nền tảng luyện thi tiếng Anh TOEIC thông minh',
    brandBadge: 'TOEIC MASTERY',
    welcome: 'Chào mừng trở lại',
    welcomeSubtitle: 'Đăng nhập để tiếp tục hành trình bứt phá điểm số.',
    createAccount: 'Tạo tài khoản mới',
    createAccountSubtitle: 'Bắt đầu hành trình chinh phục tiếng Anh theo nhịp của riêng bạn.',
    forgotTitle: 'Khôi phục mật khẩu',
    forgotSubtitle: 'Nhập email đã đăng ký, chúng mình sẽ gửi liên kết tạo mật khẩu mới.',
    tabLogin: 'Đăng nhập',
    tabSignup: 'Tạo tài khoản',
    continueGoogle: 'Tiếp tục với Google',
    or: 'hoặc qua Email',
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
    resetLinkSent: 'Đã gửi liên kết khôi phục vào email của bạn. Vui lòng kiểm tra hộp thư (cả mục Spam nhé).',
    loginSuccess: 'Đăng nhập thành công! Đang chuyển hướng...',
    invalidCredentials: 'Email hoặc mật khẩu không chính xác.',
    alreadyRegistered: 'Email này đã được đăng ký. Hãy chuyển sang Đăng nhập nhé.',
    rateLimited: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
    authFailed: 'Không thể xác thực lúc này. Vui lòng thử lại sau.',
    showPassword: 'Hiện mật khẩu',
    hidePassword: 'Ẩn mật khẩu',
    switchLanguage: 'Ngôn ngữ',
    switchTheme: 'Giao diện',
    securityNote: 'Bảo mật tiêu chuẩn SSL · Đồng bộ dữ liệu học tập tức thì',
    strengthWeak: 'Yếu',
    strengthMedium: 'Khá',
    strengthStrong: 'Rất mạnh',
    strengthHint: 'Gợi ý: Thêm số & ký tự đặc biệt để an toàn hơn',
    botWelcome: 'Chào bạn quay lại! Cùng học TOEIC bứt phá hôm nay nhé 🚀',
    botSignup: 'Cùng hơn 15.000 học viên chinh phục tiếng Anh mỗi ngày ✨',
    botForgot: 'Đừng lo, mình sẽ gửi link khôi phục vào email cho bạn ngay 🔑',
    botPassword: 'Yên tâm nha, mật khẩu của bạn luôn được bảo mật tuyệt đối 🤫',
    botSuccess: 'Tuyệt vời quá! Đang mở cánh cửa tri thức... 🎉',
  },
  en: {
    brandTagline: 'Intelligent TOEIC English Learning Platform',
    brandBadge: 'TOEIC MASTERY',
    welcome: 'Welcome back',
    welcomeSubtitle: 'Sign in to continue your English-learning journey.',
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
    loginSuccess: 'Login successful! Redirecting...',
    invalidCredentials: 'Your email or password is incorrect.',
    alreadyRegistered: 'This email is already registered. Please sign in.',
    rateLimited: 'Too many attempts. Please wait a moment before trying again.',
    authFailed: 'We could not authenticate you right now. Please try again.',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    switchLanguage: 'Language',
    switchTheme: 'Theme',
    securityNote: 'SSL End-to-end Encrypted · Real-time multi-device sync',
    strengthWeak: 'Weak',
    strengthMedium: 'Fair',
    strengthStrong: 'Strong',
    strengthHint: 'Tip: Add numbers & special characters for higher security',
    botWelcome: 'Welcome back! Ready for a high-yield study session today? 🚀',
    botSignup: 'Join 15,000+ motivated learners mastering English ✨',
    botForgot: 'No worries, I will send the reset link to your email 🔑',
    botPassword: 'Rest assured, your credentials are fully encrypted 🤫',
    botSuccess: 'Awesome! Opening your learning space... 🎉',
  },
};

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" className="shrink-0">
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

export default function Auth({ initialMode }) {
  const { user } = useAuth();
  const { locale, setLocale } = useLocale();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const text = COPY[locale] || COPY.vi;

  // Mode: 'login' | 'signup' | 'forgot'
  const [mode, setMode] = useState(() => {
    if (initialMode) return initialMode;
    if (location.pathname === '/register') return 'signup';
    if (location.pathname === '/forgot-password') return 'forgot';
    return 'login';
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorState, setErrorState] = useState({ message: '', code: '' });
  const [notice, setNotice] = useState('');

  const clearError = () => {
    if (errorState.message) setErrorState({ message: '', code: '' });
  };

  // Sync mode with route changes
  useEffect(() => {
    if (location.pathname === '/register') setMode('signup');
    else if (location.pathname === '/forgot-password') setMode('forgot');
    else if (location.pathname === '/login') setMode('login');
  }, [location.pathname]);

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
      color: 'bg-emerald-400',
      textColor: 'text-emerald-500',
      width: '100%',
    };
  }, [password, text.strengthMedium, text.strengthStrong, text.strengthWeak]);

  // Mascot dynamic speech bubble
  const botMessage = useMemo(() => {
    if (isSuccess) return text.botSuccess;
    if (isPasswordFocused) return text.botPassword;
    if (mode === 'signup') return text.botSignup;
    if (mode === 'forgot') return text.botForgot;
    return text.botWelcome;
  }, [isPasswordFocused, isSuccess, mode, text.botForgot, text.botPassword, text.botSignup, text.botSuccess, text.botWelcome]);

  if (user && !isSuccess) return <Navigate to="/dashboard" replace />;

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
            particleCount: 60,
            spread: 55,
            origin: { y: 0.65 },
            colors: ['#818cf8', '#c084fc', '#f472b6', '#38bdf8'],
          });
        } catch {}
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1100);
      } else {
        const result = await signUpWithEmail({ email: cleanEmail, password });
        if (result?.session) {
          setIsSuccess(true);
          try {
            confetti({
              particleCount: 60,
              spread: 55,
              origin: { y: 0.65 },
              colors: ['#818cf8', '#c084fc', '#f472b6', '#38bdf8'],
            });
          } catch {}
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 1100);
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
      await signInWithGoogle();
      setTimeout(() => setIsGoogleLoading(false), 2500);
    } catch (error) {
      console.error('Google sign-in failed:', error);
      setErrorState(parseAuthError(error, locale));
      setIsGoogleLoading(false);
    }
  };

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

  const fieldClass =
    'w-full rounded-2xl border border-slate-200/80 bg-white/60 py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/15 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-400 dark:focus:bg-slate-900/90 dark:focus:ring-indigo-500/20';

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden text-slate-900 dark:text-white flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* ========================================================
          1. FULL-BLEED AMBIENT TOKYO LO-FI VIDEO BACKGROUND
      ======================================================== */}
      <div className="fixed inset-0 pointer-events-none -z-20 overflow-hidden transform-gpu">
        <video
          src="/assets/videos/1027.mp4"
          poster="/assets/videos/1027_poster.png"
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover select-none filter brightness-[0.88] contrast-[1.05]"
          style={{ transform: 'scale(1.02)' }}
        />
        {/* Layered Glassmorphic Atmospheric Dimming */}
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[7px] transition-colors duration-500 dark:bg-black/60" />
        {/* Ambient Radial Color Halos */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-indigo-500/25 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-purple-500/25 blur-[120px] pointer-events-none" />
      </div>

      {/* ========================================================
          2. TOP GLASSBAR (BRAND & CONTROLS)
      ======================================================== */}
      <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link
          to="/login"
          className="group flex items-center gap-3 rounded-2xl border border-white/40 bg-white/50 px-3.5 py-1.5 backdrop-blur-xl transition hover:border-white/70 hover:bg-white/70 dark:border-white/10 dark:bg-slate-900/50 dark:hover:border-white/20 dark:hover:bg-slate-900/70 shadow-sm"
        >
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-slate-900/40 p-0.5 shadow-md shadow-indigo-500/30">
            <img src={appLogo} alt="T-English" className="h-full w-full object-contain rounded-lg" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              T-English
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              {text.brandBadge}
            </span>
          </div>
        </Link>

        {/* Controls: Language & Theme Switchers */}
        <div className="flex items-center gap-2">
          {/* Language Switch */}
          <div className="flex items-center rounded-2xl border border-white/50 bg-white/60 p-1 text-xs font-bold shadow-xs backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/60">
            <Languages size={14} className="ml-2 mr-1 text-slate-400" aria-hidden="true" />
            <button
              type="button"
              onClick={() => setLocale('vi')}
              className={`rounded-xl px-2.5 py-1 text-xs font-black transition-all cursor-pointer ${
                locale === 'vi'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              VI
            </button>
            <button
              type="button"
              onClick={() => setLocale('en')}
              className={`rounded-xl px-2.5 py-1 text-xs font-black transition-all cursor-pointer ${
                locale === 'en'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              EN
            </button>
          </div>

          {/* Theme Switch */}
          <button
            type="button"
            onClick={toggleTheme}
            title={text.switchTheme}
            aria-label={text.switchTheme}
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/50 bg-white/60 text-slate-600 shadow-xs backdrop-blur-xl transition hover:border-white/80 hover:text-slate-900 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-white/20 dark:hover:text-white cursor-pointer"
          >
            {isDarkMode ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
          </button>
        </div>
      </header>

      {/* ========================================================
          3. CENTER FOCUSED LIQUID GLASS AUTH MODAL
      ======================================================== */}
      <main className="relative z-10 mx-auto my-auto flex w-full max-w-md px-4 py-4 sm:max-w-lg sm:px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full overflow-hidden rounded-[2.5rem] border border-white/70 bg-white/85 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#0c101d]/90 sm:p-9"
        >
          {/* Subtle top edge liquid glow sheen */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />

          {/* Mascot Header Companion */}
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative shrink-0">
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 p-1 border border-pink-400/30 shadow-md shadow-pink-500/20"
                >
                  <img
                    src={chatbotImage}
                    alt="Mascot Bot"
                    className="h-10 w-10 object-contain drop-shadow-[0_4px_8px_rgba(244,114,182,0.4)]"
                  />
                </motion.div>
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                </span>
              </div>

              {/* Dynamic Friendly Mascot Speech Bubble */}
              <div className="relative rounded-2xl border border-indigo-200/50 bg-indigo-50/70 px-3.5 py-2 text-xs font-bold text-indigo-900 shadow-xs backdrop-blur-md dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200">
                <p className="line-clamp-2 leading-relaxed">{botMessage}</p>
              </div>
            </div>
          </div>

          {/* Modal Title & Subtitle */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {mode === 'login'
                ? text.welcome
                : mode === 'signup'
                  ? text.createAccount
                  : text.forgotTitle}
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
              {mode === 'login'
                ? text.welcomeSubtitle
                : mode === 'signup'
                  ? text.createAccountSubtitle
                  : text.forgotSubtitle}
            </p>
          </div>

          {/* Mode Switcher Tabs (Only visible when not in forgot mode) */}
          {mode !== 'forgot' && (
            <div className="mb-6 flex rounded-2xl border border-slate-200/60 bg-slate-100/70 p-1.5 dark:border-white/5 dark:bg-white/5 backdrop-blur-md">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-black transition-colors cursor-pointer ${
                  mode === 'login'
                    ? 'text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {mode === 'login' && (
                  <motion.div
                    layoutId="auth-tab-pill"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md shadow-indigo-600/30"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <KeyRound size={15} />
                  {text.tabLogin}
                </span>
              </button>

              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs sm:text-sm font-black transition-colors cursor-pointer ${
                  mode === 'signup'
                    ? 'text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {mode === 'signup' && (
                  <motion.div
                    layoutId="auth-tab-pill"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 shadow-md shadow-indigo-600/30"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <UserPlus size={15} />
                  {text.tabSignup}
                </span>
              </button>
            </div>
          )}

          {/* Alerts: Error & Success */}
          <AnimatePresence mode="wait">
            {errorState.message && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                role="alert"
                className="mb-5 flex flex-col gap-1.5 rounded-2xl border border-rose-300/60 bg-rose-50/80 p-3.5 text-xs font-bold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 backdrop-blur-md"
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-500" />
                  <span className="leading-relaxed flex-1">{errorState.message}</span>
                </div>

                {/* Quick 1-click action: if email already registered during signup, switch directly to login */}
                {mode === 'signup' && errorState.code === 'EMAIL_ALREADY_REGISTERED' && (
                  <div className="ml-6 mt-0.5">
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
                  <div className="ml-6 mt-0.5">
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
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                role="status"
                className="mb-5 flex items-start gap-2.5 rounded-2xl border border-emerald-300/60 bg-emerald-50/80 p-3.5 text-xs font-bold text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200 backdrop-blur-md"
              >
                <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-500" />
                <span className="leading-relaxed">{notice}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Google OAuth (Only in login & signup mode) */}
          {mode !== 'forgot' && (
            <>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading || isGoogleLoading || isSuccess}
                className="group relative flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-sm font-extrabold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-white active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:border-white/20 dark:hover:bg-white/10 cursor-pointer"
              >
                {isGoogleLoading ? <Loader2 size={18} className="animate-spin text-indigo-500" /> : <GoogleMark />}
                <span>{text.continueGoogle}</span>
              </button>

              <div className="my-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                <span className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-slate-200 dark:via-white/10 dark:to-white/10" />
                <span>{text.or}</span>
                <span className="h-px flex-1 bg-gradient-to-r from-slate-200 via-slate-200 to-transparent dark:from-white/10 dark:via-white/10" />
              </div>
            </>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="auth-email"
                className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300"
              >
                {text.email}
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors"
                />
                <input
                  id="auth-email"
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
                  className={fieldClass}
                />
              </div>
            </div>

            {/* Password Field (Only for Login & Signup) */}
            {mode !== 'forgot' && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="auth-password"
                    className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                  >
                    {text.password}
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs font-bold text-indigo-600 transition-colors hover:text-indigo-700 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300 cursor-pointer"
                    >
                      {text.forgotPassword}
                    </button>
                  )}
                </div>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors"
                  />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearError();
                    }}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    placeholder={text.passwordPlaceholder}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                    disabled={loading || isSuccess}
                    className={`${fieldClass} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    title={showPassword ? text.hidePassword : text.showPassword}
                    aria-label={showPassword ? text.hidePassword : text.showPassword}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password Strength Meter (Signup Mode Only) */}
                {mode === 'signup' && password.length > 0 && (
                  <div className="mt-2.5 rounded-xl border border-slate-200/50 bg-slate-50/60 p-2.5 dark:border-white/5 dark:bg-white/5">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-500 dark:text-slate-400">Độ mạnh mật khẩu:</span>
                      <span className={passwordStrength.textColor}>{passwordStrength.label}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
                      <div
                        className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: passwordStrength.width }}
                      />
                    </div>
                    <p className="mt-1.5 text-[10px] text-slate-400 leading-tight">
                      {text.strengthHint}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Confirm Password Field (Signup Mode Only) */}
            {mode === 'signup' && (
              <div>
                <label
                  htmlFor="auth-confirm-password"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                >
                  {text.confirmPassword}
                </label>
                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="auth-confirm-password"
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
                    className={`${fieldClass} pr-12 ${
                      confirmPassword && confirmPassword !== password
                        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200 dark:border-rose-500/50'
                        : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    title={showConfirmPassword ? text.hidePassword : text.showPassword}
                    aria-label={showConfirmPassword ? text.hidePassword : text.showPassword}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="mt-1.5 text-xs font-bold text-rose-500">{text.passwordMismatch}</p>
                )}
              </div>
            )}

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={loading || isGoogleLoading || isSuccess}
              className={`group relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl px-5 py-3.5 text-sm font-black text-white shadow-xl transition-all cursor-pointer ${
                isSuccess
                  ? 'bg-emerald-600 shadow-emerald-500/30'
                  : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 shadow-indigo-600/30 hover:shadow-indigo-600/40 hover:brightness-105 active:scale-[0.99]'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {/* Shimmer sweep effect */}
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />

              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>{text.processing}</span>
                </>
              ) : isSuccess ? (
                <>
                  <CheckCircle2 size={18} className="animate-bounce" />
                  <span>{text.loginSuccess}</span>
                </>
              ) : mode === 'forgot' ? (
                <>
                  <Send size={16} />
                  <span>{text.sendResetLink}</span>
                </>
              ) : mode === 'login' ? (
                <>
                  <Sparkles size={16} />
                  <span>{text.signIn}</span>
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  <span>{text.signUp}</span>
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* Back link when in forgot mode */}
          {mode === 'forgot' && (
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300 cursor-pointer"
              >
                <ArrowLeft size={14} />
                {text.backToLogin}
              </button>
            </div>
          )}

          {/* Quick mode toggle footer when in login / signup */}
          {mode !== 'forgot' && (
            <p className="mt-5 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
              {mode === 'login' ? text.noAccount : text.hasAccount}{' '}
              <button
                type="button"
                onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                className="font-black text-indigo-600 hover:text-indigo-700 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300 cursor-pointer"
              >
                {mode === 'login' ? text.signUpNow : text.signInNow}
              </button>
            </p>
          )}

          {/* Trust & Security Badge */}
          <div className="mt-6 flex items-center justify-center gap-2 border-t border-slate-200/50 pt-4 text-[11px] font-semibold text-slate-400 dark:border-white/5 dark:text-slate-500">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span>{text.securityNote}</span>
          </div>
        </motion.div>
      </main>

      {/* ========================================================
          4. SUBTLE FOOTER
      ======================================================== */}
      <footer className="relative z-10 py-3 text-center text-[11px] font-medium text-slate-400 dark:text-slate-500">
        © 2026 T-English. All rights reserved.
      </footer>
    </div>
  );
}
