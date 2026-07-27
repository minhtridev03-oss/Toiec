import { useState, useMemo, useRef, useEffect } from 'react';
import { Volume2, CheckCircle2, Circle, RotateCcw } from 'lucide-react';
import TFlatMeaning from './TFlatMeaning';
import { useLocale } from '../../contexts/LocaleContext';
export default function Flashcard({ word, isLearned, onToggleLearned }) {
    const { locale } = useLocale();
    const text = locale === 'vi'
        ? { hear: 'Nghe phát âm', learned: 'Đã học', notLearned: 'Chưa học', flip: 'Nhấn để lật thẻ', flipBack: 'Lật lại', meaning: 'Nghĩa', example: 'Ví dụ' }
        : { hear: 'Play pronunciation', learned: 'Learned', notLearned: 'Not learned', flip: 'Click to flip the card', flipBack: 'Flip back', meaning: 'Meaning', example: 'Example' };
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
        <div className="w-full max-w-3xl mx-auto" style={{ perspective: '1200px' }}>
            <div
                onClick={handleFlip}
                className="relative w-full cursor-pointer transition-transform duration-500 ease-in-out"
                style={{
                    transformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    minHeight: '420px',
                }}
            >
                {/* ════ FRONT FACE ════ */}
                <div
                    className="absolute inset-0 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-[#0D0F17]/50 border border-pink-200 dark:border-[#3A2F43] overflow-hidden flex flex-col transition-colors"
                    style={{ backfaceVisibility: 'hidden' }}
                >
                    {/* Gradient background */}
                    <div className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 bg-gradient-to-br from-pink-50 via-white to-fuchsia-50 dark:from-[#1E2333] dark:via-[#1E1226] dark:to-[#181C28] transition-colors">
                        {/* Word */}
                        <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-slate-800 dark:text-white tracking-tight mb-5 text-center select-none transition-colors break-words">
                            {cleanedData.word}
                        </h2>
                        {/* Pronunciation & POS */}
                        <div className="flex flex-col items-center gap-3 mb-8">
                            {cleanedData.pro && (
                                <span className="px-5 py-2 bg-white/80 dark:bg-black/20 border border-pink-200 dark:border-[#3A2F43] text-slate-500 dark:text-slate-400 font-mono text-lg rounded-2xl shadow-sm select-none transition-colors">
                                    {cleanedData.pro}
                                </span>
                            )}
                            {cleanedData.pos && (
                                <span className="px-4 py-1.5 bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-400 text-sm font-bold uppercase tracking-wider rounded-xl select-none">
                                    {cleanedData.pos}
                                </span>
                            )}
                        </div>
                        {/* Audio Button */}
                        <button
                            onClick={speakWord}
                            className="p-4 text-fuchsia-600 dark:text-fuchsia-400 bg-white dark:bg-[#2A1F33] hover:bg-fuchsia-50 dark:hover:bg-[#32263C] border border-fuchsia-100 dark:border-[#3A2F43] hover:border-fuchsia-200 dark:hover:border-fuchsia-500/50 rounded-2xl transition-all shadow-sm group cursor-pointer"
                            title={text.hear}
                        >
                            <Volume2 size={28} className="group-hover:scale-110 transition-transform" />
                        </button>
                    </div>
                    {/* Bottom bar */}
                    <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-[#1E1226] border-t border-pink-100 dark:border-[#3A2F43] transition-colors">
                        <button
                            onClick={handleToggleLearned}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-bold transition-all cursor-pointer ${isLearned
                                    ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-500/20'
                                    : 'bg-white dark:bg-[#2A1F33] border-pink-200 dark:border-[#3A2F43] text-slate-500 dark:text-slate-400 hover:bg-pink-50 dark:hover:bg-[#32263C]'
                                }`}
                        >
                            {isLearned ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                            {isLearned ? text.learned : text.notLearned}
                        </button>
                        <span className="text-sm text-slate-400 dark:text-slate-500 font-medium select-none flex items-center gap-1.5">
                            <RotateCcw size={14} />
                            {text.flip}
                        </span>
                    </div>
                </div>
                {/* ════ BACK FACE ════ */}
                <div
                    className="absolute inset-0 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-[#0D0F17]/50 border border-pink-200 dark:border-[#3A2F43] overflow-hidden flex flex-col bg-white dark:bg-[#1E1226] transition-colors"
                    style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 sm:px-8 py-4 bg-pink-50 dark:bg-[#160B1E] border-b border-pink-100 dark:border-[#3A2F43] shrink-0 transition-colors">
                        <div className="flex items-center gap-3">
                            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white transition-colors">{cleanedData.word}</h3>
                            {cleanedData.pro && (
                                <span className="text-sm text-slate-400 dark:text-slate-500 font-mono hidden sm:inline">{cleanedData.pro}</span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={speakWord}
                                className="p-2 text-fuchsia-500 dark:text-fuchsia-400 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-500/10 rounded-lg transition-colors cursor-pointer"
                                title={text.hear}
                            >
                                <Volume2 size={20} />
                            </button>
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium select-none flex items-center gap-1">
                                <RotateCcw size={12} />
                                {text.flipBack}
                            </span>
                        </div>
                    </div>
                    {/* Meaning content — scrollable */}
                    <div
                        ref={backContentRef}
                        className="flex-1 overflow-y-auto p-6 sm:px-8 sm:py-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex flex-col space-y-6 sm:space-y-8">
                            {/* Meaning Section */}
                            <div>
                                <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                                    {text.meaning}
                                </div>
                                <div className="text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white leading-tight">
                                    {cleanedData.mean}
                                </div>
                            </div>
                            {cleanedData.example && (
                                <>
                                    <hr className="border-slate-100 dark:border-[#3A2F43]" />
                                    {/* Example Section */}
                                    <div>
                                        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                                            {text.example}
                                        </div>
                                        <div className="text-xl sm:text-2xl italic font-medium text-slate-700 dark:text-slate-200 mb-2">
                                            {cleanedData.example}
                                        </div>
                                        {cleanedData.example_mean && (
                                            <div className="text-base sm:text-lg text-slate-500 dark:text-slate-400">
                                                {cleanedData.example_mean}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    {/* Bottom bar */}
                    <div className="flex items-center justify-between px-6 py-3 bg-pink-50 dark:bg-[#160B1E] border-t border-pink-100 dark:border-[#3A2F43] shrink-0 transition-colors">
                        <button
                            onClick={handleToggleLearned}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all cursor-pointer ${isLearned
                                    ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-500/20'
                                    : 'bg-white dark:bg-[#2A1F33] border-pink-200 dark:border-[#3A2F43] text-slate-500 dark:text-slate-400 hover:bg-pink-50 dark:hover:bg-[#32263C]'
                                }`}
                        >
                            {isLearned ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                            {isLearned ? text.learned : text.notLearned}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}