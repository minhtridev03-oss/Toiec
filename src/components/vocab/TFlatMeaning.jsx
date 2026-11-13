import { useEffect, useMemo, useState } from 'react';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { decodeTFlatAv, parseTFlatEntry } from '../../utils/tflatParser';

function cleanFallbackMean(mean = '') {
  return mean
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#;=_*+@-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const getPosBadgeClass = (pos = '') => {
  const p = pos.toLowerCase();
  if (p.includes('danh') || p.includes('n')) {
    return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
  }
  if (p.includes('động') || p.includes('v')) {
    return 'bg-indigo-500/15 text-indigo-700 dark:text-cyan-300 border-indigo-500/30';
  }
  if (p.includes('tính') || p.includes('adj')) {
    return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
  }
  if (p.includes('trạng') || p.includes('adv')) {
    return 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30';
  }
  return 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30';
};

export default function TFlatMeaning({ word }) {
  const [decodedSource, setDecodedSource] = useState('');
  const [isDecoding, setIsDecoding] = useState(false);
  const [decodeError, setDecodeError] = useState(null);

  useEffect(() => {
    let isActive = true;
    const source = word?.av || '';

    setDecodedSource('');
    setDecodeError(null);

    if (!source) {
      setIsDecoding(false);
      return () => {
        isActive = false;
      };
    }

    setIsDecoding(true);
    decodeTFlatAv(source)
      .then((decoded) => {
        if (!isActive) return;
        setDecodedSource(decoded);
      })
      .catch((error) => {
        if (!isActive) return;
        console.error('Unable to decode TFlat av data:', error);
        setDecodeError(error);
        setDecodedSource(source);
      })
      .finally(() => {
        if (isActive) setIsDecoding(false);
      });

    return () => {
      isActive = false;
    };
  }, [word?.av]);

  const entry = useMemo(() => parseTFlatEntry(decodedSource), [decodedSource]);

  if (isDecoding) {
    return (
      <div className="flex items-center gap-3 py-8 text-slate-500 dark:text-slate-400">
        <Loader2 size={22} className="animate-spin text-indigo-600 dark:text-cyan-400" />
        <span className="text-sm font-bold">Đang giải mã dữ liệu từ điển TFlat...</span>
      </div>
    );
  }

  if (!entry?.sections?.length) {
    const cleanMean = cleanFallbackMean(word?.mean || '');

    if (!cleanMean && decodeError) {
      return (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-semibold flex items-center gap-2">
          <AlertCircle size={18} />
          <span>Không đọc được dữ liệu chi tiết của từ này trong kho TFlat.</span>
        </div>
      );
    }

    if (!cleanMean) return null;

    return (
      <div className="p-4 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 text-slate-800 dark:text-slate-200 text-base leading-relaxed font-semibold">
        {cleanMean}
      </div>
    );
  }

  return (
    <div className="space-y-7 text-left">
      {/* Root inflection notice */}
      {word?._note && (
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 dark:bg-cyan-500/10 px-4 py-3 text-xs sm:text-sm font-bold text-indigo-800 dark:text-cyan-300 flex items-center gap-2">
          <Sparkles size={16} className="text-indigo-500 dark:text-cyan-400 shrink-0" />
          <span>{word._note}</span>
        </div>
      )}

      {entry.pronunciation && !word?.pro && (
        <div className="font-mono text-sm font-bold text-slate-600 dark:text-slate-400 bg-white/50 dark:bg-white/10 px-3 py-1 rounded-lg inline-block">
          {entry.pronunciation}
        </div>
      )}

      {/* Sections by Part of Speech */}
      {entry.sections.map((section, sectionIndex) => (
        <div
          key={`${section.pos || 'general'}-${sectionIndex}`}
          className="pb-7 border-b border-white/50 dark:border-white/10 last:border-0 last:pb-0 space-y-4"
        >
          {section.pos && (
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-3.5 py-1 rounded-xl text-xs font-black tracking-wider uppercase border shadow-2xs ${getPosBadgeClass(
                  section.pos
                )}`}
              >
                {section.pos}
              </span>
            </div>
          )}

          {/* Definitions */}
          {section.meanings.length > 0 && (
            <div className="space-y-4">
              {section.meanings.map((meaning, meaningIndex) => (
                <div key={`${meaning.text}-${meaningIndex}`} className="flex items-start gap-3.5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white text-xs font-black shadow-xs">
                    {meaningIndex + 1}
                  </span>

                  <div className="min-w-0 flex-1 space-y-2">
                    {meaning.text && (
                      <p
                        className={`text-base leading-relaxed ${
                          meaning.isEnglish
                            ? 'text-slate-600 dark:text-slate-400 font-medium italic'
                            : 'text-slate-950 dark:text-white font-bold'
                        }`}
                      >
                        {meaning.isEnglish ? `[EN] ${meaning.text}` : meaning.text}
                      </p>
                    )}

                    {/* Example Sentences */}
                    {meaning.examples.length > 0 && (
                      <div className="space-y-2 pt-1">
                        {meaning.examples.map((example, exampleIndex) => (
                          <div
                            key={`${example.en}-${exampleIndex}`}
                            className="p-3.5 rounded-xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 border-l-4 border-l-indigo-500 dark:border-l-cyan-400 shadow-2xs space-y-1 transition-all hover:bg-white/60 dark:hover:bg-white/10"
                          >
                            {example.en && (
                              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                {example.en}
                              </p>
                            )}
                            {example.vi && (
                              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                <span className="opacity-70 font-bold">→</span>
                                <span>{example.vi}</span>
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Phrases & Idioms */}
          {section.phrases.length > 0 && (
            <div className="mt-5 rounded-2xl border border-white/50 dark:border-white/10 bg-white/40 dark:bg-white/5 p-4 sm:p-5 backdrop-blur-md space-y-3">
              <div className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-cyan-400 flex items-center gap-1.5">
                <Sparkles size={14} />
                <span>Cụm từ & thành ngữ thông dụng ({section.phrases.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {section.phrases.map((phrase, phraseIndex) => (
                  <div
                    key={`${phrase.text}-${phraseIndex}`}
                    className="p-3 rounded-xl bg-white/60 dark:bg-black/25 border border-white/50 dark:border-white/10 hover:border-indigo-500/40 transition-all flex flex-col justify-between"
                  >
                    <span className="font-black text-slate-950 dark:text-white text-sm">
                      {phrase.text}
                    </span>
                    {phrase.meaning && (
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">
                        {phrase.meaning}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
