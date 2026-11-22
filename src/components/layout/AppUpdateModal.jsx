import React from 'react';
import { createPortal } from 'react-dom';
import { Rocket, Download, Sparkles, X, AlertTriangle, ArrowRight } from 'lucide-react';
import { CURRENT_APP_VERSION, openApkDownload, dismissUpdateForSession } from '../../lib/appUpdateService';

export default function AppUpdateModal({ updateInfo, onClose }) {
  if (!updateInfo || !updateInfo.hasUpdate) return null;
  if (typeof document === 'undefined') return null;

  const handleDownload = () => {
    openApkDownload(updateInfo.apkUrl);
  };

  const handleDismiss = () => {
    dismissUpdateForSession(updateInfo.version);
    if (onClose) onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-[3px] animate-in fade-in duration-200"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !updateInfo.isForce) {
          handleDismiss();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-update-dialog-title"
        className="relative w-full max-w-md overflow-hidden rounded-[2.2rem] border border-white/80 dark:border-white/15 bg-white/95 dark:bg-[#0c0d18]/95 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] p-6 sm:p-7 flex flex-col transform-gpu"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Glow Accent Bar */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400" />

        {/* Close button (only when not forced) */}
        {!updateInfo.isForce && (
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
            title="Đóng"
          >
            <X size={18} />
          </button>
        )}

        {/* Header: Icon & Title */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="h-13 w-13 rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
            <Rocket size={24} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-cyan-400">
              <Sparkles size={12} />
              <span>Nâng cấp ứng dụng</span>
            </div>
            <h3 id="app-update-dialog-title" className="text-xl font-black text-slate-950 dark:text-white tracking-tight">
              Đã có bản cập nhật mới!
            </h3>
          </div>
        </div>

        {/* Version Badge Comparison */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 mb-4">
          <div className="space-y-0.5">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Phiên bản hiện tại
            </span>
            <span className="text-xs font-black text-slate-700 dark:text-slate-300">
              v{CURRENT_APP_VERSION}
            </span>
          </div>

          <div className="flex items-center text-indigo-500 dark:text-cyan-400">
            <ArrowRight size={16} />
          </div>

          <div className="space-y-0.5 text-right">
            <span className="block text-[10px] font-bold text-indigo-600 dark:text-cyan-400 uppercase tracking-wider">
              Bản mới nhất
            </span>
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              v{updateInfo.version}
            </span>
          </div>
        </div>

        {/* Release Notes */}
        <div className="space-y-1.5 mb-5">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Điểm mới trong bản này:
          </span>
          <div className="max-h-48 overflow-y-auto p-3.5 rounded-2xl bg-white dark:bg-black/30 border border-slate-200/80 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line custom-scrollbar">
            {updateInfo.releaseNotes}
          </div>
        </div>

        {/* Notice if forced */}
        {updateInfo.isForce && (
          <div className="mb-4 flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
            <AlertTriangle size={15} className="shrink-0" />
            <span>Vui lòng cập nhật để tiếp tục sử dụng các tính năng mới nhất.</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-sm shadow-lg shadow-indigo-500/25 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.98]"
          >
            <Download size={18} />
            <span>Tải & Cập nhật ngay (APK)</span>
          </button>

          {!updateInfo.isForce && (
            <button
              type="button"
              onClick={handleDismiss}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition cursor-pointer"
            >
              Để sau
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
