import React from 'react';
import { Home, RefreshCw, AlertTriangle } from 'lucide-react';

const COPY = {
  vi: {
    title: 'Đã xảy ra sự cố',
    subtitle: 'Ứng dụng gặp lỗi không mong muốn. Hãy thử tải lại trang hoặc quay về trang chủ.',
    home: 'Về trang chủ',
    reload: 'Tải lại trang',
    details: 'Chi tiết lỗi',
  },
  en: {
    title: 'Something went wrong',
    subtitle: 'The app encountered an unexpected error. Try reloading the page or go back home.',
    home: 'Go home',
    reload: 'Reload page',
    details: 'Error details',
  },
};

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    let locale = 'vi';
    try {
      locale = localStorage.getItem('locale') || 'vi';
    } catch { /* ignore */ }
    const text = COPY[locale] || COPY.vi;

    return (
      <div className="flex min-h-screen items-center justify-center bg-pink-50 px-4 dark:bg-[#160B1E]">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-pink-200/40 blur-3xl dark:bg-pink-500/10" />
          <div className="absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-fuchsia-200/40 blur-3xl dark:bg-fuchsia-500/10" />
        </div>

        <div className="relative z-10 flex max-w-lg flex-col items-center text-center">
          {/* Icon */}
          <div className="relative mb-6">
            <div className="flex h-28 w-28 items-center justify-center rounded-3xl border border-pink-200/60 bg-white shadow-xl shadow-pink-200/30 dark:border-[#3A2F43] dark:bg-[#211126] dark:shadow-pink-950/20">
              <AlertTriangle size={52} className="text-pink-500 dark:text-pink-400" strokeWidth={1.5} />
            </div>
            <div className="absolute -inset-3 animate-spin rounded-[2rem] border-2 border-dashed border-pink-300/40 dark:border-pink-500/20" style={{ animationDuration: '12s' }} />
          </div>

          <h1 className="mt-4 text-3xl font-extrabold text-slate-800 dark:text-white sm:text-4xl">
            {text.title}
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-slate-500 dark:text-slate-400">
            {text.subtitle}
          </p>

          {/* Error message (collapsed) */}
          {this.state.error && (
            <details className="mt-4 w-full rounded-lg border border-pink-200/60 bg-white p-3 text-left dark:border-[#3A2F43] dark:bg-[#211126]">
              <summary className="cursor-pointer text-xs font-bold text-slate-500 dark:text-slate-400">
                {text.details}
              </summary>
              <pre className="mt-2 max-h-32 overflow-auto text-xs text-red-600 dark:text-red-400">
                {this.state.error.message || String(this.state.error)}
              </pre>
            </details>
          )}

          {/* Actions */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-[#DC4E99] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-pink-500/25 transition-all hover:bg-[#c83f87] hover:shadow-pink-500/35 active:scale-[0.97]"
            >
              <Home size={18} />
              {text.home}
            </a>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-xl border border-pink-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-pink-300 hover:bg-pink-50 active:scale-[0.97] dark:border-[#3A2F43] dark:bg-[#211126] dark:text-slate-200 dark:hover:bg-[#2A1F33] cursor-pointer"
            >
              <RefreshCw size={18} />
              {text.reload}
            </button>
          </div>

          {/* Brand */}
          <div className="mt-12 flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-pink-400" />
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-orange-400" />
            <span className="ml-2 font-bold">T-ENGLISH</span>
          </div>
        </div>
      </div>
    );
  }
}
