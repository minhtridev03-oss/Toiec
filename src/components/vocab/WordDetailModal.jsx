import { Volume2, X } from 'lucide-react';
import TFlatMeaning from './TFlatMeaning';

export default function WordDetailModal({ word, onClose }) {
  if (!word) return null;

  const speakWord = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word.word);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-[#1E1226] rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 transition-colors">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-[#2A1F33] hover:bg-slate-200 dark:hover:bg-[#32263C] rounded-full text-slate-500 dark:text-slate-400 transition-colors cursor-pointer z-10"
        >
          <X size={20} />
        </button>

        <div className="p-8 pb-6 border-b border-pink-100 dark:border-[#3A2F43] bg-pink-50/50 dark:bg-[#160B1E]/50 shrink-0 transition-colors">
          <div className="flex items-center gap-4">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-fuchsia-700 dark:text-fuchsia-400 tracking-tight transition-colors">
              {word.word}
            </h2>
            <button
              onClick={speakWord}
              className="p-3 text-fuchsia-500 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-500/20 bg-white dark:bg-[#1E1226] border border-pink-200 dark:border-[#3A2F43] rounded-2xl transition-colors cursor-pointer shadow-sm"
              title="Nghe phát âm"
            >
              <Volume2 size={24} />
            </button>
          </div>
          {/* Phiên âm */}
          {word.pro && (
            <div className="mt-3">
              <span className="px-3 py-1 bg-white dark:bg-[#2A1F33] border border-pink-200 dark:border-[#3A2F43] text-slate-500 dark:text-slate-400 font-mono rounded-lg shadow-sm transition-colors">
                {word.pro.split('#')[0]}
              </span>
            </div>
          )}
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-white dark:bg-[#1E1226] transition-colors">
          <TFlatMeaning word={word} />
        </div>
      </div>
    </div>
  );
}
