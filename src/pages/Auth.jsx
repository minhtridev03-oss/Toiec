import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Languages,
  LockKeyhole,
  Mail,
  Moon,
  Sparkles,
  Sun,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { useTheme } from '../contexts/ThemeContext';
import { signInWithEmail, signUpWithEmail } from '../lib/authApi';
import appLogo from '../assets/log.jpg';
import TransparentImage from '../components/TransparentImage';
const COPY = {
  vi: {
    brandTagline: 'Học đều từng ngày',
    heroTitle: 'Một buổi học nhỏ, một bước tiến lớn.',
    heroCopy: 'Luyện từ vựng, nghe và nói trong một nhịp học tập phù hợp với bạn.',
    welcome: 'Chào mừng trở lại',
    createAccount: 'Tạo tài khoản mới',
    loginCopy: 'Đăng nhập để tiếp tục hành trình tiếng Anh của bạn.',
    signUpCopy: 'Bắt đầu hành trình tiếng Anh theo nhịp của riêng bạn.',
    continueGoogle: 'Tiếp tục với Google',
    or: 'hoặc dùng email',
    email: 'Email',
    emailPlaceholder: 'name@example.com',
    password: 'Mật khẩu',
    passwordPlaceholder: 'Nhập mật khẩu của bạn',
    confirmPassword: 'Xác nhận mật khẩu',
    confirmPasswordPlaceholder: 'Nhập lại mật khẩu',
    forgotPassword: 'Quên mật khẩu?',
    signIn: 'Đăng nhập',
    signUp: 'Tạo tài khoản',
    processing: 'Đang xử lý...',
    noAccount: 'Chưa có tài khoản?',
    hasAccount: 'Đã có tài khoản?',
    signUpNow: 'Đăng ký ngay',
    signInNow: 'Đăng nhập',
    passwordMismatch: 'Mật khẩu xác nhận không khớp.',
    passwordShort: 'Mật khẩu cần có ít nhất 6 ký tự.',
    signUpSuccess: 'Đăng ký thành công. Hãy kiểm tra email để xác nhận tài khoản nếu được yêu cầu.',
    invalidCredentials: 'Email hoặc mật khẩu không chính xác.',
    alreadyRegistered: 'Email này đã được đăng ký. Hãy đăng nhập.',
    rateLimited: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
    authFailed: 'Không thể xác thực lúc này. Vui lòng thử lại.',
    showPassword: 'Hiện mật khẩu',
    hidePassword: 'Ẩn mật khẩu',
    switchLanguage: 'Chuyển ngôn ngữ',
    switchTheme: 'Đổi giao diện sáng/tối',
  },
  en: {
    brandTagline: 'Learn a little every day',
    heroTitle: 'A small study session. A meaningful step forward.',
    heroCopy: 'Practise vocabulary, listening, and speaking in a learning rhythm that suits you.',
    welcome: 'Welcome back',
    createAccount: 'Create your account',
    loginCopy: 'Sign in to continue your English-learning journey.',
    signUpCopy: 'Start an English-learning journey at your own pace.',
    continueGoogle: 'Continue with Google',
    or: 'or use email',
    email: 'Email',
    emailPlaceholder: 'name@example.com',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    confirmPassword: 'Confirm password',
    confirmPasswordPlaceholder: 'Enter your password again',
    forgotPassword: 'Forgot password?',
    signIn: 'Sign in',
    signUp: 'Create account',
    processing: 'Working...',
    noAccount: 'New to TEnglish?',
    hasAccount: 'Already have an account?',
    signUpNow: 'Create one',
    signInNow: 'Sign in',
    passwordMismatch: 'The password confirmation does not match.',
    passwordShort: 'Your password must contain at least 6 characters.',
    signUpSuccess: 'Account created. Check your email to confirm it when required.',
    invalidCredentials: 'Your email or password is incorrect.',
    alreadyRegistered: 'This email is already registered. Please sign in.',
    rateLimited: 'Too many attempts. Please wait a moment before trying again.',
    authFailed: 'We could not authenticate you right now. Please try again.',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    switchLanguage: 'Switch language',
    switchTheme: 'Switch light or dark mode',
  },
};
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
export default function Auth() {
  const { user } = useAuth();
  const { locale, setLocale } = useLocale();
  const { isDarkMode, toggleTheme } = useTheme();
  const text = COPY[locale];
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [notice, setNotice] = useState('');
  if (user) return <Navigate to="/dashboard" replace />;
  const getLocalizedError = (error) => {
    const message = String(error?.message || '').toLowerCase();
    const status = error?.status || error?.context?.status;
    if (message.includes('invalid login credentials')) return text.invalidCredentials;
    if (message.includes('already registered')) return text.alreadyRegistered;
    if (status === 429 || message.includes('rate') || message.includes('too many') || message.includes('quá nhanh')) {
      return text.rateLimited;
    }
    return text.authFailed;
  };
  const handleEmailAuth = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    setNotice('');
    if (!isLogin) {
      if (password !== confirmPassword) {
        setErrorMsg(text.passwordMismatch);
        return;
      }
      if (password.length < 6) {
        setErrorMsg(text.passwordShort);
        return;
      }
    }
    setLoading(true);
    try {
      if (isLogin) await signInWithEmail({ email, password });
      else {
        await signUpWithEmail({ email, password });
        setNotice(text.signUpSuccess);
      }
    } catch (error) {
      console.error('Authentication failed:', error);
      setErrorMsg(getLocalizedError(error));
    } finally {
      setLoading(false);
    }
  };
  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setNotice('');
    setIsGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      console.error('Google sign-in failed:', error);
      setErrorMsg(getLocalizedError(error));
      setIsGoogleLoading(false);
    }
  };
  const switchMode = () => {
    setIsLogin((value) => !value);
    setPassword('');
    setConfirmPassword('');
    setErrorMsg('');
    setNotice('');
  };
  const fieldClass = 'w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-indigo-500 dark:focus:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600';
  return (
    <main className="min-h-screen bg-slate-50/70 px-4 py-3 text-slate-900 transition-colors dark:bg-[#0b0f19] dark:text-white sm:px-6 flex flex-col items-center justify-center">
      <div className="relative z-10 mx-auto mb-3 flex w-full max-w-5xl items-center justify-between lg:mb-4">
        <Link to="/login" aria-label="Trang đăng nhập" className="hidden items-center justify-center lg:flex">
          <div className="flex h-16 w-28 items-center justify-center sm:h-20 sm:w-32">
            <TransparentImage src={appLogo} alt="Logo" className="h-full w-full object-contain" tolerance={245} />
          </div>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-slate-200/80 bg-white p-1 text-xs font-bold shadow-xs dark:border-slate-800 dark:bg-slate-800/80">
            <Languages size={14} className="ml-1.5 mr-1 text-slate-400" aria-hidden="true" />
            <button type="button" onClick={() => setLocale('vi')} className={`rounded-lg px-2.5 py-1 transition-colors cursor-pointer ${locale === 'vi' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>VI</button>
            <button type="button" onClick={() => setLocale('en')} className={`rounded-lg px-2.5 py-1 transition-colors cursor-pointer ${locale === 'en' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>EN</button>
          </div>
          <button type="button" onClick={toggleTheme} title={text.switchTheme} aria-label={text.switchTheme} className="rounded-xl border border-slate-200/80 bg-white p-2.5 text-slate-500 shadow-xs transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white cursor-pointer">
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
      <section className="mx-auto grid min-h-[580px] w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50 transition-all dark:border-slate-800 dark:bg-slate-900 dark:shadow-none lg:grid-cols-[1.08fr_0.92fr]">
        <div className="relative hidden min-h-full overflow-hidden lg:block">
          <img src="/assets/screen.png" alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
          <div className="relative z-10 flex h-full max-w-xl flex-col justify-end p-12 text-white">
            <span className="mb-6 flex w-fit items-center gap-2 rounded-md border border-white/35 bg-black/35 px-3 py-2 text-sm font-bold shadow-lg shadow-black/20"><Sparkles size={17} />{text.brandTagline}</span>
            <h1 className="app-display max-w-lg text-4xl font-extrabold leading-tight drop-shadow-[0_4px_18px_rgba(0,0,0,0.78)]">{text.heroTitle}</h1>
            <p className="mt-5 max-w-md text-lg leading-8 text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.78)]">{text.heroCopy}</p>
          </div>
        </div>
        <div className="flex min-w-0 items-center bg-white px-6 py-8 dark:bg-slate-900 sm:px-10 lg:px-12">
          <div className="w-full">
            <div className="mb-10 relative">
              {/* Premium Mobile Icon/Badge */}
              <div className="mb-8 flex justify-center lg:hidden">
                <div className="flex h-20 w-32 items-center justify-center">
                  <TransparentImage src={appLogo} alt="Logo" className="h-full w-full object-contain" tolerance={245} />
                </div>
              </div>
              
              <div className="hidden items-center gap-2 rounded-full border border-indigo-200/60 bg-indigo-50/60 px-3 py-1 mb-4 dark:border-indigo-500/20 dark:bg-indigo-500/10 lg:inline-flex">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse"></div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-700 dark:text-indigo-400">T-English</p>
              </div>
              
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">
                {isLogin ? text.welcome : text.createAccount}
              </h2>
              <p className="text-base leading-relaxed text-slate-500 dark:text-slate-400 max-w-sm">
                {isLogin ? text.loginCopy : text.signUpCopy}
              </p>
            </div>
            {errorMsg && <div role="alert" className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">{errorMsg}</div>}
            {notice && <div role="status" className="mb-5 flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200"><CheckCircle2 size={18} className="shrink-0" />{notice}</div>}
            <button type="button" onClick={handleGoogleLogin} disabled={loading || isGoogleLoading} className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 cursor-pointer shadow-xs">
              <GoogleMark />
              {text.continueGoogle}
            </button>
            <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"><span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" /><span>{text.or}</span><span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" /></div>
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label htmlFor="auth-email" className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">{text.email}</label>
                <div className="relative"><Mail size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input id="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={text.emailPlaceholder} autoComplete="email" required className={fieldClass} /></div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between"><label htmlFor="auth-password" className="text-sm font-bold text-slate-700 dark:text-slate-200">{text.password}</label>{isLogin && <Link to="/forgot-password" className="text-sm font-bold text-indigo-600 transition-colors hover:text-indigo-700 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300">{text.forgotPassword}</Link>}</div>
                <div className="relative"><LockKeyhole size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input id="auth-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={text.passwordPlaceholder} autoComplete={isLogin ? 'current-password' : 'new-password'} required className={`${fieldClass} pr-12`} /><button type="button" onClick={() => setShowPassword((visible) => !visible)} title={showPassword ? text.hidePassword : text.showPassword} aria-label={showPassword ? text.hidePassword : text.showPassword} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 cursor-pointer">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
              </div>
              {!isLogin && <div><label htmlFor="auth-confirm-password" className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">{text.confirmPassword}</label><div className="relative"><LockKeyhole size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input id="auth-confirm-password" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder={text.confirmPasswordPlaceholder} autoComplete="new-password" required className={`${fieldClass} pr-12 ${confirmPassword && confirmPassword !== password ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100 dark:border-rose-500/50' : ''}`} /><button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} title={showConfirmPassword ? text.hidePassword : text.showPassword} aria-label={showConfirmPassword ? text.hidePassword : text.showPassword} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200 cursor-pointer">{showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>{confirmPassword && confirmPassword !== password && <p className="mt-2 text-xs font-semibold text-rose-500">{text.passwordMismatch}</p>}</div>}
              <button type="submit" disabled={loading || isGoogleLoading} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-500/35 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer">{loading ? text.processing : (isLogin ? text.signIn : text.signUp)}{!loading && <ArrowRight size={16} />}</button>
            </form>
            <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">{isLogin ? text.noAccount : text.hasAccount} <button type="button" onClick={switchMode} className="font-bold text-indigo-600 transition-colors hover:text-indigo-700 hover:underline dark:text-indigo-400 dark:hover:text-indigo-300 cursor-pointer">{isLogin ? text.signUpNow : text.signInNow}</button></p>
          </div>
        </div>
      </section>
    </main>
  );
}
