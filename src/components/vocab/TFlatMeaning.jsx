import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { decodeTFlatAv, parseTFlatEntry } from '../../utils/tflatParser';

function cleanFallbackMean(mean = '') {
  return mean
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#;=_*+@-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        <Loader2 size={18} className="animate-spin text-fuchsia-500" />
        <span>Đang đọc dữ liệu từ điển...</span>
      </div>
    );
  }

  if (!entry?.sections?.length) {
    const cleanMean = cleanFallbackMean(word?.mean || '');

    if (!cleanMean && decodeError) {
      return (
        <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed">
          Không đọc được dữ liệu chi tiết của từ này.
        </p>
      );
    }

    if (!cleanMean) return null;

    return (
      <p className="text-slate-700 dark:text-slate-300 text-base leading-relaxed">{cleanMean}</p>
    );
  }

  return (
    <div className="space-y-6 text-left text-slate-800 dark:text-slate-200">
      {word?._note && (
        <div className="rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-3 py-2 text-sm text-fuchsia-700 dark:border-fuchsia-500/20 dark:bg-fuchsia-500/10 dark:text-fuchsia-300">
          {word._note}
        </div>
      )}

      {entry.pronunciation && !word?.pro && (
        <div className="font-mono text-sm text-slate-500 dark:text-slate-400">{entry.pronunciation}</div>
      )}

      {entry.sections.map((section, sectionIndex) => (
        <div
          key={`${section.pos || 'general'}-${sectionIndex}`}
          className="border-b border-pink-200 pb-6 transition-colors last:border-0 last:pb-0 dark:border-[#3A2F43]"
        >
          {section.pos && (
            <div className="mb-4">
              <span className="inline-block rounded-lg border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 text-xs font-bold tracking-wider text-fuchsia-700 transition-colors dark:border-fuchsia-500/20 dark:bg-fuchsia-500/10 dark:text-fuchsia-400">
                {section.pos}
              </span>
            </div>
          )}

          {section.meanings.length > 0 && (
            <div className="space-y-5">
              {section.meanings.map((meaning, meaningIndex) => (
                <div key={`${meaning.text}-${meaningIndex}`} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-semibold text-slate-500 transition-colors dark:bg-[#2A1F33] dark:text-slate-400">
                    {meaningIndex + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    {meaning.text && (
                      <p
                        className={`text-base leading-relaxed ${
                          meaning.isEnglish
                            ? 'text-slate-500 dark:text-slate-400'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {meaning.isEnglish ? `[EN] ${meaning.text}` : meaning.text}
                      </p>
                    )}

                    {meaning.examples.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {meaning.examples.map((example, exampleIndex) => (
                          <div
                            key={`${example.en}-${exampleIndex}`}
                            className="space-y-0.5 border-l-2 border-slate-300 pl-3 dark:border-slate-600"
                          >
                            {example.en && (
                              <p className="text-sm italic text-slate-600 dark:text-slate-400">{example.en}</p>
                            )}
                            {example.vi && (
                              <p className="text-sm text-slate-500 dark:text-slate-500">→ {example.vi}</p>
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

          {section.phrases.length > 0 && (
            <div className="mt-6 rounded-xl border border-pink-100 bg-pink-50/80 p-4 dark:border-[#3A2F43] dark:bg-[#160B1E]">
              <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Cụm từ & thành ngữ
              </div>
              <div className="space-y-3">
                {section.phrases.map((phrase, phraseIndex) => (
                  <div key={`${phrase.text}-${phraseIndex}`} className="grid gap-1 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] sm:gap-4">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{phrase.text}</span>
                    {phrase.meaning && (
                      <span className="text-slate-500 dark:text-slate-400">{phrase.meaning}</span>
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
