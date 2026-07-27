import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Languages,
  LockKeyhole,
  Mail,
  Moon,
  Sparkles,
  Sun,
  UserPlus,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useLocale } from '../contexts/LocaleContext';
import { useTheme } from '../contexts/ThemeContext';
import { signInWithEmail, signUpWithEmail } from '../lib/authApi';
import shinTLogo from '../assets/shinT.jpg';
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
  const fieldClass = 'w-full rounded-2xl border-2 border-pink-100/50 bg-[#fffafd] py-3 pl-11 pr-4 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-pink-500 focus:bg-white focus:ring-4 focus:ring-pink-500/10 dark:border-pink-500/20 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-pink-400 dark:focus:bg-white/10 hover:border-pink-300 dark:hover:border-pink-500/40';
  return (
    <main className="min-h-screen bg-[#fff5fa] px-4 py-4 lg:py-8 text-slate-900 transition-colors dark:bg-[#100813] dark:text-white sm:px-6 sm:py-6 flex flex-col items-center justify-center">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between mb-6 lg:mb-8 z-10 relative">
        <Link to="/login" className="flex items-center gap-2 font-extrabold tracking-wide text-[#31162d] dark:text-white">
          <div className="flex h-9 w-9 items-center justify-center">
            <TransparentImage src={shinTLogo} alt="Logo" className="h-full w-full scale-125 object-contain" tolerance={245} />
          </div>
          <span>TENGLISH</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-pink-200 bg-white p-1 text-xs font-bold shadow-sm dark:border-pink-500/20 dark:bg-white/5">
            <Languages size={15} className="ml-1.5 mr-1 text-pink-500" aria-hidden="true" />
            <button type="button" onClick={() => setLocale('vi')} className={`rounded-md px-2.5 py-1.5 transition-colors ${locale === 'vi' ? 'bg-pink-500 text-white' : 'text-slate-500 hover:text-pink-600 dark:text-slate-400 dark:hover:text-pink-200'}`}>VI</button>
            <button type="button" onClick={() => setLocale('en')} className={`rounded-md px-2.5 py-1.5 transition-colors ${locale === 'en' ? 'bg-pink-500 text-white' : 'text-slate-500 hover:text-pink-600 dark:text-slate-400 dark:hover:text-pink-200'}`}>EN</button>
          </div>
          <button type="button" onClick={toggleTheme} title={text.switchTheme} aria-label={text.switchTheme} className="rounded-lg border border-pink-200 bg-white p-2.5 text-slate-500 shadow-sm transition-colors hover:border-pink-300 hover:text-pink-600 dark:border-pink-500/20 dark:bg-white/5 dark:text-slate-300 dark:hover:border-pink-400 dark:hover:text-pink-200">
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
      <section className="mx-auto grid min-h-[580px] w-full max-w-5xl overflow-hidden rounded-[2.5rem] border border-pink-100 bg-white shadow-[0_24px_70px_rgba(178,36,112,0.1)] transition-all hover:shadow-[0_30px_80px_rgba(178,36,112,0.15)] dark:border-pink-500/10 dark:bg-[#1b0d20] lg:grid-cols-[1.08fr_0.92fr]">
        <div className="relative hidden min-h-full overflow-hidden lg:block">
          <img src="/assets/screen.png" alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
          <div className="relative z-10 flex h-full max-w-xl flex-col justify-end p-12 text-white">
            <span className="mb-6 flex w-fit items-center gap-2 rounded-md border border-white/35 bg-black/35 px-3 py-2 text-sm font-bold shadow-lg shadow-black/20"><Sparkles size={17} />{text.brandTagline}</span>
            <h1 className="app-display max-w-lg text-4xl font-extrabold leading-tight drop-shadow-[0_4px_18px_rgba(0,0,0,0.78)]">{text.heroTitle}</h1>
            <p className="mt-5 max-w-md text-lg leading-8 text-white drop-shadow-[0_3px_12px_rgba(0,0,0,0.78)]">{text.heroCopy}</p>
          </div>
        </div>
        <div className="flex min-w-0 items-center bg-white px-6 py-8 dark:bg-[#1b0d20] sm:px-10 lg:px-12">
          <div className="w-full">
            <div className="mb-10 relative">
              {/* Premium Mobile Icon/Badge */}
              <div className="mb-8 flex flex-col items-start lg:hidden">
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-pink-500 to-fuchsia-500 opacity-20 blur-xl"></div>
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-white to-pink-50 border border-pink-100 shadow-xl shadow-pink-900/5 dark:from-[#231526] dark:to-[#1a0f1d] dark:border-[#3A2F43] dark:shadow-black/50">
                    <Sparkles className="absolute top-2 right-2 text-pink-400 opacity-60" size={12} />
                    {isLogin ? <KeyRound size={28} className="text-pink-600 dark:text-pink-400" /> : <UserPlus size={28} className="text-fuchsia-600 dark:text-fuchsia-400" />}
                  </div>
                </div>
              </div>
              
              <div className="inline-flex items-center gap-2 rounded-full border border-pink-200/60 bg-pink-50/50 px-3 py-1 mb-4 dark:border-pink-500/20 dark:bg-pink-500/10">
                <div className="h-1.5 w-1.5 rounded-full bg-pink-500 animate-pulse"></div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-pink-600 dark:text-pink-400">Tenglish</p>
              </div>
              
              <h2 className="app-display text-3xl font-extrabold text-[#261321] dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 mb-3">
                {isLogin ? text.welcome : text.createAccount}
              </h2>
              <p className="text-base leading-relaxed text-slate-500 dark:text-slate-400 max-w-sm">
                {isLogin ? text.loginCopy : text.signUpCopy}
              </p>
            </div>
            {errorMsg && <div role="alert" className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">{errorMsg}</div>}
            {notice && <div role="status" className="mb-5 flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200"><CheckCircle2 size={18} className="shrink-0" />{notice}</div>}
            <button type="button" onClick={handleGoogleLogin} disabled={loading || isGoogleLoading} className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-pink-100/50 bg-white px-4 py-3.5 font-bold text-slate-700 transition-all hover:border-pink-300 hover:bg-pink-50 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 dark:border-pink-500/20 dark:bg-white/5 dark:text-slate-100 dark:hover:border-pink-400 dark:hover:bg-pink-500/10">
              <GoogleMark />
              {text.continueGoogle}
            </button>
            <div className="my-6 flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"><span className="h-px flex-1 bg-pink-100 dark:bg-white/10" /><span>{text.or}</span><span className="h-px flex-1 bg-pink-100 dark:bg-white/10" /></div>
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label htmlFor="auth-email" className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">{text.email}</label>
                <div className="relative"><Mail size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-pink-400" /><input id="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={text.emailPlaceholder} autoComplete="email" required className={fieldClass} /></div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between"><label htmlFor="auth-password" className="text-sm font-bold text-slate-700 dark:text-slate-200">{text.password}</label>{isLogin && <Link to="/forgot-password" className="text-sm font-bold text-pink-600 transition-colors hover:text-pink-700 hover:underline dark:text-pink-300 dark:hover:text-pink-200">{text.forgotPassword}</Link>}</div>
                <div className="relative"><LockKeyhole size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-pink-400" /><input id="auth-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={text.passwordPlaceholder} autoComplete={isLogin ? 'current-password' : 'new-password'} required className={`${fieldClass} pr-12`} /><button type="button" onClick={() => setShowPassword((visible) => !visible)} title={showPassword ? text.hidePassword : text.showPassword} aria-label={showPassword ? text.hidePassword : text.showPassword} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-400 transition-colors hover:bg-pink-50 hover:text-pink-600 dark:hover:bg-pink-500/10 dark:hover:text-pink-200">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
              </div>
              {!isLogin && <div><label htmlFor="auth-confirm-password" className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">{text.confirmPassword}</label><div className="relative"><LockKeyhole size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-pink-400" /><input id="auth-confirm-password" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder={text.confirmPasswordPlaceholder} autoComplete="new-password" required className={`${fieldClass} pr-12 ${confirmPassword && confirmPassword !== password ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100 dark:border-rose-500/50' : ''}`} /><button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} title={showConfirmPassword ? text.hidePassword : text.showPassword} aria-label={showConfirmPassword ? text.hidePassword : text.showPassword} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-400 transition-colors hover:bg-pink-50 hover:text-pink-600 dark:hover:bg-pink-500/10 dark:hover:text-pink-200">{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{confirmPassword && confirmPassword !== password && <p className="mt-2 text-xs font-semibold text-rose-500">{text.passwordMismatch}</p>}</div>}
              <button type="submit" disabled={loading || isGoogleLoading} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-5 py-3.5 font-bold text-white shadow-lg shadow-pink-500/25 transition-all hover:from-pink-600 hover:to-fuchsia-600 hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60">{loading ? text.processing : (isLogin ? text.signIn : text.signUp)}{!loading && <ArrowRight size={18} />}</button>
            </form>
            <p className="mt-7 text-center text-sm text-slate-500 dark:text-slate-400">{isLogin ? text.noAccount : text.hasAccount} <button type="button" onClick={switchMode} className="font-bold text-pink-600 transition-colors hover:text-pink-700 hover:underline dark:text-pink-300 dark:hover:text-pink-200">{isLogin ? text.signUpNow : text.signInNow}</button></p>
          </div>
        </div>
      </section>
    </main>
  );
}
