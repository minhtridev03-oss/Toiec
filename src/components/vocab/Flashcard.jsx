import { useState, useMemo, useRef, useEffect } from 'react';
import { Volume2, CheckCircle2, Circle, RotateCcw, Sparkles } from 'lucide-react';
import { useLocale } from '../../contexts/LocaleContext';

export default function Flashcard({ word, isLearned, onToggleLearned }) {
  const { locale } = useLocale();
  const text = locale === 'vi'
    ? {
        hear: 'Nghe phát âm',
        learned: 'Đã học',
        notLearned: 'Chưa học',
        flip: 'Nhấn để lật thẻ',
        flipBack: 'Lật lại',
        meaning: 'Định nghĩa & Nghĩa',
        example: 'Ví dụ câu',
      }
    : {
        hear: 'Play pronunciation',
        learned: 'Learned',
        notLearned: 'Not learned',
        flip: 'Click to flip card',
        flipBack: 'Flip back',
        meaning: 'Definition & Meaning',
        example: 'Example sentence',
      };

  const [isFlipped, setIsFlipped] = useState(false);
  const backContentRef = useRef(null);

  // Reset flip when word changes
  useEffect(() => {
    setIsFlipped(false);
  }, [word?.id]);

  // Clean pronunciation
  const cleanedData = useMemo(() => {
    if (!word) return null;
    let cleanPro = word.pro || '';
    if (cleanPro.includes('#')) cleanPro = cleanPro.split('#')[0].trim();
    const multiProMatch = cleanPro.match(/^(\[[^\]]+\])/);
    if (multiProMatch) cleanPro = multiProMatch[1];
    return { ...word, pro: cleanPro };
  }, [word]);

  if (!cleanedData) return null;

  const speakWord = (e) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanedData.word);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleToggleLearned = (e) => {
    e.stopPropagation();
    if (onToggleLearned) onToggleLearned();
  };

  const handleFlip = () => {
    setIsFlipped(prev => !prev);
  };

  return (
    <div className="w-full max-w-3xl mx-auto" style={{ perspective: '1400px' }}>
      <div
        onClick={handleFlip}
        className="group relative w-full cursor-pointer transition-transform duration-500 ease-in-out min-h-[380px] sm:min-h-[440px]"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* ══════════════════════════════════════════════════════════ */}
        {/* 1. FRONT FACE (Ultra-Clear Liquid Glass) */}
        {/* ══════════════════════════════════════════════════════════ */}
        <div
          className="absolute inset-0 rounded-[2rem] sm:rounded-[2.5rem] border border-white/60 dark:border-white/15 bg-white/25 dark:bg-slate-950/45 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.08),_inset_0_1px_3px_rgba(255,255,255,0.85),_inset_0_-1px_1px_rgba(0,0,0,0.02)] dark:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.8),_inset_0_1px_2px_rgba(255,255,255,0.3),_inset_0_-1px_1px_rgba(255,255,255,0.05)] backdrop-blur-2xl overflow-hidden flex flex-col justify-between transition-all"
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Ambient Fluid Caustics Blobs inside the glass */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] -z-0">
            <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-gradient-to-br from-indigo-500/20 dark:from-indigo-500/25 via-cyan-400/15 dark:via-cyan-400/20 to-transparent blur-3xl animate-liquid-blob" />
            <div
              className="absolute -bottom-28 -right-28 w-88 h-88 rounded-full bg-gradient-to-tl from-violet-500/20 dark:from-violet-600/25 via-pink-400/15 dark:via-fuchsia-500/15 to-transparent blur-3xl animate-liquid-blob"
              style={{ animationDelay: '-4s' }}
            />
            {/* Top specular rim line */}
            <div className="absolute top-0 inset-x-12 h-[1.5px] bg-gradient-to-r from-transparent via-white/90 dark:via-white/40 to-transparent" />
          </div>

          {/* Front Body */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 sm:p-12">
            {/* Word Typography */}
            <h2 className="text-3xl sm:text-5xl md:text-7xl font-black text-slate-950 dark:text-white tracking-tight mb-4 sm:mb-5 text-center select-none break-all sm:break-words drop-shadow-xs transition-colors">
              {cleanedData.word}
            </h2>

            {/* Phonetics & Part of Speech Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 mb-6 sm:mb-8">
              {cleanedData.pro && (
                <span className="px-3 sm:px-4 py-1 sm:py-1.5 bg-indigo-500/10 dark:bg-cyan-400/10 border border-indigo-500/25 dark:border-cyan-400/30 text-indigo-800 dark:text-cyan-300 font-mono text-xs sm:text-base font-bold rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] select-none">
                  {cleanedData.pro}
                </span>
              )}
              {cleanedData.pos && (
                <span className="px-2.5 sm:px-3.5 py-0.5 sm:py-1 bg-gradient-to-r from-violet-600/15 to-fuchsia-600/15 dark:from-violet-500/20 dark:to-fuchsia-500/20 text-violet-800 dark:text-fuchsia-300 border border-violet-500/25 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-lg select-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]">
                  {cleanedData.pos}
                </span>
              )}
            </div>

            {/* Audio Button (Liquid Sound Drop) */}
            <button
              onClick={speakWord}
              className="h-13 w-13 sm:h-16 sm:w-16 rounded-2xl bg-white/45 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-cyan-500/20 text-indigo-600 dark:text-cyan-300 border border-white/70 dark:border-white/20 hover:border-indigo-400/50 dark:hover:border-cyan-400/50 flex items-center justify-center transition-all duration-300 shadow-[0_8px_20px_rgba(99,102,241,0.15),_inset_0_1px_2px_rgba(255,255,255,0.9)] dark:shadow-[0_8px_25px_rgba(34,211,238,0.2),_inset_0_1px_2px_rgba(255,255,255,0.3)] hover:scale-110 active:scale-95 cursor-pointer"
              title={text.hear}
            >
              <Volume2 size={24} className="sm:w-[30px] sm:h-[30px] transition-transform group-hover:scale-110" />
            </button>
          </div>

          {/* Front Bottom Bar */}
          <div className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-3.5 sm:py-4 bg-white/15 dark:bg-white/[0.02] border-t border-white/30 dark:border-white/10 backdrop-blur-md">
            {/* Status Toggle Button */}
            <button
              onClick={handleToggleLearned}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                isLearned
                  ? 'bg-emerald-500/25 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border-emerald-500/40 dark:border-emerald-400/40 shadow-[0_0_15px_rgba(16,185,129,0.25),_inset_0_1px_1px_rgba(255,255,255,0.7)]'
                  : 'bg-white/40 dark:bg-white/10 text-slate-700 dark:text-slate-300 border-white/50 dark:border-white/15 hover:bg-white/70 dark:hover:bg-white/20 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              {isLearned ? (
                <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Circle size={15} className="text-slate-400" />
              )}
              <span>{isLearned ? text.learned : text.notLearned}</span>
            </button>

            {/* Flip Hint */}
            <span className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-white/30 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-white/40 dark:border-white/10 text-[11px] sm:text-xs font-bold select-none group-hover:text-indigo-600 dark:group-hover:text-cyan-300 transition-colors">
              <RotateCcw size={12} className="transition-transform duration-500 group-hover:-rotate-180" />
              <span>{text.flip}</span>
            </span>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* 2. BACK FACE (Liquid Glass Details & Meaning) */}
        {/* ══════════════════════════════════════════════════════════ */}
        <div
          className="absolute inset-0 rounded-[2rem] sm:rounded-[2.5rem] border border-white/60 dark:border-white/15 bg-white/25 dark:bg-slate-950/45 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.08),_inset_0_1px_3px_rgba(255,255,255,0.85),_inset_0_-1px_1px_rgba(0,0,0,0.02)] dark:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.8),_inset_0_1px_2px_rgba(255,255,255,0.3),_inset_0_-1px_1px_rgba(255,255,255,0.05)] backdrop-blur-2xl overflow-hidden flex flex-col justify-between transition-all"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {/* Ambient Blobs for back face */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] -z-0">
            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-br from-violet-500/20 dark:from-violet-600/25 via-pink-400/15 dark:via-fuchsia-500/15 to-transparent blur-3xl animate-liquid-blob" />
            <div className="absolute top-0 inset-x-12 h-[1.5px] bg-gradient-to-r from-transparent via-white/90 dark:via-white/40 to-transparent" />
          </div>

          {/* Back Header */}
          <div className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-3 sm:py-4 bg-white/15 dark:bg-white/[0.02] border-b border-white/30 dark:border-white/10 shrink-0 backdrop-blur-md">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <h3 className="text-lg sm:text-2xl font-black text-slate-950 dark:text-white tracking-tight truncate">
                {cleanedData.word}
              </h3>
              {cleanedData.pro && (
                <span className="text-[10px] sm:text-xs font-mono font-bold text-indigo-700 dark:text-cyan-300 bg-indigo-500/10 dark:bg-cyan-400/10 px-1.5 sm:px-2 py-0.5 rounded-lg border border-indigo-500/20 dark:border-cyan-400/25 shrink-0">
                  {cleanedData.pro}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                onClick={speakWord}
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-white/40 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-cyan-500/20 text-indigo-600 dark:text-cyan-300 border border-white/50 dark:border-white/15 flex items-center justify-center transition-all cursor-pointer"
                title={text.hear}
              >
                <Volume2 size={15} />
              </button>
              <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-full bg-white/30 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-white/40 dark:border-white/10 text-[10px] sm:text-xs font-bold">
                <RotateCcw size={11} />
                <span>{text.flipBack}</span>
              </span>
            </div>
          </div>

          {/* Back Body — Scrollable Meaning and Example */}
          <div
            ref={backContentRef}
            className="relative z-10 flex-1 overflow-y-auto p-4 sm:px-8 sm:py-7 custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col space-y-4 sm:space-y-6">
              {/* Meaning Section */}
              <div>
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-widest text-indigo-700 dark:text-cyan-400 mb-1.5">
                  <Sparkles size={12} />
                  <span>{text.meaning}</span>
                </div>
                <div className="text-lg sm:text-2xl md:text-3xl font-black text-slate-950 dark:text-white leading-relaxed tracking-tight">
                  {cleanedData.mean}
                </div>
              </div>

              {/* Example Section */}
              {cleanedData.example && (
                <div>
                  <div className="border-t border-white/30 dark:border-white/10 pt-4 sm:pt-5 mb-2">
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-violet-700 dark:text-fuchsia-400">
                      {text.example}
                    </span>
                  </div>
                  <div className="bg-white/30 dark:bg-white/[0.04] p-3.5 sm:p-5 rounded-2xl border border-white/40 dark:border-white/10 backdrop-blur-sm shadow-xs">
                    <p className="text-sm sm:text-lg italic font-bold text-slate-900 dark:text-slate-100 mb-1.5 sm:mb-2 leading-relaxed">
                      "{cleanedData.example}"
                    </p>
                    {cleanedData.example_mean && (
                      <p className="text-xs sm:text-base font-semibold text-slate-700 dark:text-slate-300 pl-2.5 sm:pl-3 border-l-2 border-indigo-500/60 dark:border-cyan-400/60">
                        {cleanedData.example_mean}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Back Bottom Bar */}
          <div className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-3 sm:py-3.5 bg-white/15 dark:bg-white/[0.02] border-t border-white/30 dark:border-white/10 shrink-0 backdrop-blur-md">
            <button
              onClick={handleToggleLearned}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                isLearned
                  ? 'bg-emerald-500/25 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300 border-emerald-500/40 dark:border-emerald-400/40 shadow-[0_0_15px_rgba(16,185,129,0.25),_inset_0_1px_1px_rgba(255,255,255,0.7)]'
                  : 'bg-white/40 dark:bg-white/10 text-slate-700 dark:text-slate-300 border-white/50 dark:border-white/15 hover:bg-white/70 dark:hover:bg-white/20 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              {isLearned ? (
                <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Circle size={15} className="text-slate-400" />
              )}
              <span>{isLearned ? text.learned : text.notLearned}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}