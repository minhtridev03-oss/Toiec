import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Languages,
  Mail,
  Moon,
  Send,
  Sparkles,
  Sun,
} from 'lucide-react';
import { requestPasswordReset } from '../lib/authApi';
import { useLocale } from '../contexts/LocaleContext';
import appLogo from '../assets/log.jpg';
import TransparentImage from '../components/TransparentImage';
import { useTheme } from '../contexts/ThemeContext';
const COPY = {
  vi: {
    brandTagline: 'Học đều từng ngày',
    heroTitle: 'Một buổi học nhỏ, một bước tiến lớn.',
    heroCopy: 'Lấy lại mật khẩu để tiếp tục hành trình học tiếng Anh theo nhịp của riêng bạn.',
    eyebrow: 'KHÔI PHỤC TÀI KHOẢN',
    title: 'Quên mật khẩu?',
    description: 'Nhập email đã đăng ký. Chúng tôi sẽ gửi liên kết để bạn tạo mật khẩu mới.',
    email: 'Email',
    emailPlaceholder: 'name@example.com',
    send: 'Gửi liên kết đặt lại',
    sending: 'Đang gửi...',
    backToLogin: 'Quay lại đăng nhập',
    emailRequired: 'Vui lòng nhập địa chỉ email.',
    invalidEmail: 'Địa chỉ email không hợp lệ.',
    rateLimited: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
    requestFailed: 'Không thể gửi liên kết lúc này. Vui lòng thử lại.',
    sentEyebrow: 'EMAIL ĐÃ ĐƯỢC GỬI',
    sentTitle: 'Kiểm tra hộp thư của bạn',
    sentCopyStart: 'Chúng tôi đã gửi liên kết đặt lại mật khẩu đến',
    sentCopyEnd: 'Hãy kiểm tra cả mục Spam nếu chưa thấy email.',
    sendAgain: 'Gửi lại bằng email khác',
    switchTheme: 'Đổi giao diện sáng/tối',
  },
  en: {
    brandTagline: 'Learn a little every day',
    heroTitle: 'A small study session. A meaningful step forward.',
    heroCopy: 'Recover your password and return to learning at a pace that suits you.',
    eyebrow: 'ACCOUNT RECOVERY',
    title: 'Forgot your password?',
    description: 'Enter the email linked to your account and we will send a reset link.',
    email: 'Email',
    emailPlaceholder: 'name@example.com',
    send: 'Send reset link',
    sending: 'Sending...',
    backToLogin: 'Back to sign in',
    emailRequired: 'Please enter your email address.',
    invalidEmail: 'Please enter a valid email address.',
    rateLimited: 'Too many requests. Please wait a moment before trying again.',
    requestFailed: 'We could not send a reset link right now. Please try again.',
    sentEyebrow: 'EMAIL SENT',
    sentTitle: 'Check your inbox',
    sentCopyStart: 'We sent a password-reset link to',
    sentCopyEnd: 'Check your spam folder too if it does not arrive shortly.',
    sendAgain: 'Use a different email',
    switchTheme: 'Switch light or dark mode',
  },
};
export default function ForgotPassword() {
  const { locale, setLocale } = useLocale();
  const { isDarkMode, toggleTheme } = useTheme();
  const text = COPY[locale];
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const getLocalizedError = (error) => {
    const message = String(error?.message || '').toLowerCase();
    const status = error?.status || error?.context?.status;
    if (status === 429 || message.includes('rate') || message.includes('too many') || message.includes('quá nhanh')) return text.rateLimited;
    if (message.includes('email')) return text.invalidEmail;
    return text.requestFailed;
  };
  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg('');
    if (!email.trim()) {
      setErrorMsg(text.emailRequired);
      return;
    }
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (error) {
      setErrorMsg(getLocalizedError(error));
    } finally {
      setLoading(false);
    }
  };
  const fieldClass = 'w-full rounded-2xl border-2 border-pink-100/50 bg-[#fffafd] py-3 pl-11 pr-4 text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-pink-500 focus:bg-white focus:ring-4 focus:ring-pink-500/10 dark:border-pink-500/20 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-pink-400 dark:focus:bg-white/10 hover:border-pink-300 dark:hover:border-pink-500/40';
  return (
    <main className="min-h-screen bg-[#fff5fa] px-4 py-2 text-slate-900 transition-colors dark:bg-[#100813] dark:text-white sm:px-6 sm:py-3 lg:py-4 flex flex-col items-center justify-center">
      <div className="relative z-10 mx-auto mb-3 flex w-full max-w-5xl items-center justify-between lg:mb-4">
        <Link to="/login" aria-label="Trang đăng nhập" className="hidden items-center justify-center lg:flex">
          <div className="flex h-16 w-28 items-center justify-center sm:h-20 sm:w-32">
            <TransparentImage src={appLogo} alt="Logo" className="h-full w-full object-contain" tolerance={245} />
          </div>
        </Link>
        <div className="ml-auto flex items-center gap-2">
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
            {sent ? (
              <div>
                <div className="mb-8">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"><CheckCircle2 size={28} /></div>
                  <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-pink-500">{text.sentEyebrow}</p>
                  <h2 className="app-display text-2xl font-extrabold text-[#261321] dark:text-white">{text.sentTitle}</h2>
                  <p className="mt-3 max-w-md leading-6 text-slate-500 dark:text-slate-400">{text.sentCopyStart} <strong className="font-bold text-slate-800 dark:text-white">{email}</strong>. {text.sentCopyEnd}</p>
                </div>
                <div className="space-y-3">
                  <Link to="/login" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-5 py-3.5 font-bold text-white shadow-lg shadow-pink-500/25 transition-all hover:from-pink-600 hover:to-fuchsia-600 hover:-translate-y-0.5 hover:shadow-xl"><ArrowLeft size={18} />{text.backToLogin}</Link>
                  <button type="button" onClick={() => { setSent(false); setEmail(''); }} className="w-full px-5 py-3 text-sm font-bold text-pink-600 transition-colors hover:text-pink-700 dark:text-pink-300 dark:hover:text-pink-200">{text.sendAgain}</button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <div className="mb-6 flex justify-center lg:hidden">
                    <div className="flex h-20 w-32 items-center justify-center">
                      <TransparentImage src={appLogo} alt="Logo" className="h-full w-full object-contain" tolerance={245} />
                    </div>
                  </div>
                  <div className="mb-6 hidden h-12 w-12 items-center justify-center rounded-2xl bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-200 lg:flex"><KeyRound size={24} /></div>
                  <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-pink-500">{text.eyebrow}</p>
                  <h2 className="app-display text-2xl font-extrabold text-[#261321] dark:text-white">{text.title}</h2>
                  <p className="mt-3 max-w-md leading-6 text-slate-500 dark:text-slate-400">{text.description}</p>
                </div>
                {errorMsg && <div role="alert" className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200">{errorMsg}</div>}
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="reset-email" className="mb-2 block text-sm font-bold text-slate-700 dark:text-slate-200">{text.email}</label>
                    <div className="relative"><Mail size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-pink-400" /><input id="reset-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={text.emailPlaceholder} autoComplete="email" required className={fieldClass} /></div>
                  </div>
                  <button type="submit" disabled={loading} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-500 px-5 py-3.5 font-bold text-white shadow-lg shadow-pink-500/25 transition-all hover:from-pink-600 hover:to-fuchsia-600 hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60">{loading ? text.sending : text.send}{!loading && <Send size={16} />}</button>
                </form>
                <Link to="/login" className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition-colors hover:text-pink-600 dark:text-slate-400 dark:hover:text-pink-200"><ArrowLeft size={17} />{text.backToLogin}</Link>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
