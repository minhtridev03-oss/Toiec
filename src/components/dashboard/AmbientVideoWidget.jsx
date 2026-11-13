import {
  Check,
  Film,
} from 'lucide-react';
import { useAmbient } from '../../contexts/AmbientContext';

export default function AmbientVideoWidget() {
  const {
    videoEnabled,
    toggleVideo,
  } = useAmbient();

  return (
    <div className="glass-panel rounded-[1.75rem] p-4 sm:p-4.5 shadow-xl transition-all duration-300 w-full select-none">
      {/* Header */}
      <div className="flex items-center justify-between gap-2.5 pb-2.5 border-b border-slate-300/40 dark:border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-500/15 dark:bg-cyan-500/15 text-indigo-700 dark:text-cyan-400">
            <Film size={16} />
          </span>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white truncate">
              Video Nền Web
            </span>
            <span className="text-[10px] font-bold text-indigo-700 dark:text-cyan-400 truncate">
              {videoEnabled ? 'Đang phát video nền' : 'Đã tắt video nền'}
            </span>
          </div>
        </div>

        {/* Video On/Off Toggle Switch */}
        <button
          type="button"
          onClick={toggleVideo}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            videoEnabled ? 'bg-indigo-600 dark:bg-cyan-500' : 'bg-slate-300 dark:bg-white/20'
          }`}
          role="switch"
          aria-checked={videoEnabled}
          title={videoEnabled ? 'Tắt video nền' : 'Bật video nền'}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              videoEnabled ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Nền 1 Button */}
      <div className="my-3">
        <button
          type="button"
          onClick={toggleVideo}
          className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
            videoEnabled
              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30 dark:bg-cyan-500 dark:text-slate-950 dark:border-cyan-400 scale-[1.01]'
              : 'bg-white/60 dark:bg-white/5 text-slate-800 dark:text-slate-200 border-white/60 dark:border-white/10 hover:bg-white/90 dark:hover:bg-white/10'
          }`}
          title={videoEnabled ? 'Nhấn để tắt nền video' : 'Nhấn để bật nền video'}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
              videoEnabled ? 'bg-white/20 text-white dark:text-slate-950' : 'bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-slate-400'
            }`}>
              <Film size={16} />
            </span>
            <div className="flex flex-col text-left min-w-0">
              <span className="text-xs font-black truncate">Nền 1: Tokyo Lo-Fi</span>
              <span className={`text-[10px] font-bold truncate ${
                videoEnabled ? 'text-indigo-100 dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'
              }`}>
                {videoEnabled ? 'Video động • Đang phát' : 'Nhấn để bật video'}
              </span>
            </div>
          </div>
          {videoEnabled && (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/25 dark:bg-slate-950/25">
              <Check size={12} strokeWidth={3} />
            </span>
          )}
        </button>
      </div>

      {/* Notice tooltip */}
      <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 leading-tight">
        * Tự động dừng khi đổi tab trình duyệt để tiết kiệm pin & RAM.
      </p>
    </div>
  );
}
