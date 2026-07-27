import { useState } from 'react'

export default function Flashcard({ wordData }) {
  const [isFlipped, setIsFlipped] = useState(false)

  const handleSpeak = (e) => {
    e.stopPropagation()
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(wordData.word)
      utterance.lang = 'en-US'
      utterance.rate = 0.85
      utterance.pitch = 1
      window.speechSynthesis.speak(utterance)
    }
  }

  const handleFlip = () => {
    setIsFlipped((prev) => !prev)
  }

  return (
    <div
      className="perspective w-full h-72 cursor-pointer select-none"
      onClick={handleFlip}
    >
      <div className={`card-inner ${isFlipped ? 'flipped' : ''}`}>
        {/* === FRONT === */}
        <div className="card-front bg-white border border-border rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col items-center justify-center p-6">
          {/* Category Badge */}
          <span className="absolute top-4 left-4 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-600 bg-primary-50 rounded-lg">
            {wordData.category}
          </span>

          {/* Part of Speech */}
          <span className="text-xs font-medium text-text-light italic mb-2">
            {wordData.part_of_speech}
          </span>

          {/* Word */}
          <h2 className="text-3xl sm:text-4xl font-bold text-text-heading tracking-tight mb-1">
            {wordData.word}
          </h2>

          {/* Phonetic */}
          <p className="text-sm text-text-light mb-5 font-mono">
            {wordData.phonetic}
          </p>

          {/* Speaker Button */}
          <button
            onClick={handleSpeak}
            className="w-11 h-11 rounded-full bg-primary-50 hover:bg-primary-100 text-primary-600 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
            title="Nghe phát âm"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          </button>

          {/* Hint */}
          <p className="absolute bottom-4 text-[11px] text-text-light/60">
            Nhấn để lật thẻ
          </p>
        </div>

        {/* === BACK === */}
        <div className="card-back bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl shadow-md flex flex-col items-start justify-center p-6 text-white">
          {/* Phonetic */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-bold">{wordData.word}</span>
            <span className="text-sm opacity-75 font-mono">{wordData.phonetic}</span>
          </div>

          <span className="text-xs opacity-60 italic mb-4">
            {wordData.part_of_speech}
          </span>

          {/* Meaning */}
          <div className="w-full mb-4">
            <p className="text-xs uppercase tracking-wider opacity-50 mb-1">Nghĩa</p>
            <p className="text-xl font-semibold leading-snug">
              {wordData.meaning}
            </p>
          </div>

          {/* Example */}
          <div className="w-full bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wider opacity-50 mb-2">Ví dụ</p>
            <p className="text-sm font-medium leading-relaxed mb-1">
              "{wordData.example_en}"
            </p>
            <p className="text-sm opacity-70 leading-relaxed">
              → {wordData.example_vi}
            </p>
          </div>

          {/* Hint */}
          <p className="absolute bottom-4 right-6 text-[11px] opacity-40">
            Nhấn để lật lại
          </p>
        </div>
      </div>
    </div>
  )
}
