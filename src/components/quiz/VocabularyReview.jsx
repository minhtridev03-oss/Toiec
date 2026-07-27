import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, XCircle, Volume2, List, Keyboard, Eye } from 'lucide-react';

// Mock data cứng
const MOCK_WORDS = [
  { id: 1, word: "Accommodate", meaning: "Cung cấp chỗ ở, đáp ứng" },
  { id: 2, word: "Ambiguous", meaning: "Mơ hồ, khó hiểu" },
  { id: 3, magnet: "Brief", meaning: "Ngắn gọn, vắn tắt" },
  { id: 4, word: "Commence", meaning: "Bắt đầu, khởi đầu" },
  { id: 5, word: "Determine", meaning: "Xác định, quyết định" },
  { id: 6, word: "Evaluate", meaning: "Đánh giá, định giá" },
  { id: 7, word: "Implement", meaning: "Thực hiện, tiến hành" },
  { id: 8, word: "Mandatory", meaning: "Bắt buộc" },
  { id: 9, word: "Negotiate", meaning: "Đàm phán, thương lượng" },
  { id: 10, word: "Persuade", meaning: "Thuyết phục" },
  { id: 11, word: "Substitute", meaning: "Thay thế" },
  { id: 12, word: "Validate", meaning: "Xác nhận, phê chuẩn" },
];

export default function VocabularyReview({ onBack }) {
  const [gameMode, setGameMode] = useState(null); // 'choice' or 'typing'
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  
  // States for choice mode
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);

  // States for typing mode
  const [typingInput, setTypingInput] = useState('');
  const [typingStatus, setTypingStatus] = useState('idle'); // 'idle', 'correct', 'incorrect', 'revealed'
  
  // Xử lý mock data cho word bị sai key 'magnet'
  const validWords = MOCK_WORDS.map(w => ({...w, word: w.word || w.magnet}));
  const currentWordData = validWords[currentWordIndex];

  // ===================== LOGIC CHO TRẮC NGHIỆM =====================
  useEffect(() => {
    if (gameMode === 'choice') {
      generateOptions();
    }
  }, [currentWordIndex, gameMode]);

  const generateOptions = () => {
    const correctMeaning = validWords[currentWordIndex].meaning;
    const otherMeanings = validWords.filter(w => w.meaning !== correctMeaning).map(w => w.meaning);
    const shuffledOtherMeanings = [...otherMeanings].sort(() => 0.5 - Math.random());
    const wrongOptions = shuffledOtherMeanings.slice(0, 3);
    const allOptions = [correctMeaning, ...wrongOptions];
    const shuffledOptions = allOptions.sort(() => 0.5 - Math.random());
    setOptions(shuffledOptions);
    setSelectedOption(null);
  };

  const handleSelectOption = (option) => {
    if (selectedOption) return;
    setSelectedOption(option);
  };

  // ===================== LOGIC CHO GÕ TỪ =====================
  const handleCheckTyping = () => {
    if (typingInput.trim().toLowerCase() === currentWordData.word.toLowerCase()) {
      setTypingStatus('correct');
    } else {
      setTypingStatus('incorrect');
    }
  };

  const handleReveal = () => {
    setTypingInput(currentWordData.word);
    setTypingStatus('revealed');
  };

  // ===================== ĐIỀU HƯỚNG =====================
  const handleNext = () => {
    if (currentWordIndex < validWords.length - 1) {
      setCurrentWordIndex(prev => prev + 1);
      // Reset typing states
      setTypingInput('');
      setTypingStatus('idle');
    } else {
      onBack();
    }
  };

  const speakWord = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentWordData.word);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  // ===================== GIAO DIỆN CHỌN CHẾ ĐỘ =====================
  if (!gameMode) {
    return (
      <div className="p-8 mx-auto w-full h-full flex flex-col items-center justify-center relative bg-pink-50 dark:bg-[#160B1E] transition-colors">
        <button 
          onClick={onBack}
          className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Quay lại</span>
        </button>
        
        <h2 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-10 transition-colors">Chọn chế độ ôn luyện</h2>
        
        <div className="flex flex-col sm:flex-row gap-6">
          <button 
            onClick={() => setGameMode('choice')}
            className="p-8 rounded-3xl bg-white dark:bg-[#1E1226] border border-pink-100 dark:border-white/10 shadow-xl hover:-translate-y-2 hover:shadow-2xl hover:border-fuchsia-200 dark:hover:border-fuchsia-500/50 transition-all w-72 flex flex-col items-center text-center group cursor-pointer"
          >
            <div className="w-20 h-20 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <List size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-3 transition-colors">Trắc nghiệm</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">Ôn tập với 4 đáp án lựa chọn để củng cố khả năng nhận diện từ vựng.</p>
          </button>
          
          <button 
            onClick={() => setGameMode('typing')}
            className="p-8 rounded-3xl bg-white dark:bg-[#1E1226] border border-pink-100 dark:border-white/10 shadow-xl hover:-translate-y-2 hover:shadow-2xl hover:border-fuchsia-200 dark:hover:border-fuchsia-500/50 transition-all w-72 flex flex-col items-center text-center group cursor-pointer"
          >
            <div className="w-20 h-20 rounded-2xl bg-fuchsia-50 dark:bg-fuchsia-900/20 text-fuchsia-600 dark:text-fuchsia-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Keyboard size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-3 transition-colors">Gõ lại từ</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">Nhập lại chính xác từ tiếng Anh dựa trên nghĩa để luyện tập chính tả.</p>
          </button>
        </div>
      </div>
    );
  }

  // ===================== GIAO DIỆN CHUNG CHO 2 CHẾ ĐỘ =====================
  return (
    <div className={`p-8 w-full h-full flex flex-col transition-colors ${gameMode === 'typing' ? 'bg-[#110815] text-white' : 'bg-pink-50 dark:bg-[#160B1E]'}`}>
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
        <button 
          onClick={() => setGameMode(null)}
          className={`flex items-center gap-2 mb-6 w-fit transition-colors cursor-pointer ${gameMode === 'typing' ? 'text-white/60 hover:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'}`}
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Quay lại chọn chế độ</span>
        </button>

        {/* ----------------- CHẾ ĐỘ GÕ TỪ ----------------- */}
        {gameMode === 'typing' && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-full max-w-2xl text-center mb-8">
               <p className="text-sm font-semibold text-white/50 tracking-wider uppercase mb-2">
                Câu hỏi {currentWordIndex + 1} / {validWords.length}
              </p>
            </div>
            
            <div className="w-full max-w-2xl bg-[#1A0E24] border border-fuchsia-900/30 rounded-3xl p-10 shadow-2xl flex flex-col items-center justify-center min-h-[300px]">
              <p className="text-sm font-medium text-white/50 tracking-widest uppercase mb-6">
                Gõ từ tiếng Anh cho:
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 tracking-wide text-center">
                {currentWordData.meaning}
              </h2>
            </div>

            <div className="w-full max-w-2xl mt-6 space-y-4">
              <div className="relative">
                <input 
                  type="text"
                  value={typingInput}
                  onChange={(e) => setTypingInput(e.target.value)}
                  disabled={typingStatus === 'correct' || typingStatus === 'revealed'}
                  placeholder="Nhập câu trả lời..."
                  className={`w-full bg-transparent border-2 rounded-xl px-6 py-4 text-center text-xl font-medium outline-none transition-colors ${
                    typingStatus === 'correct' || typingStatus === 'revealed' ? 'border-green-500 text-green-400' :
                    typingStatus === 'incorrect' ? 'border-red-500 text-red-400' :
                    'border-fuchsia-800 text-white focus:border-fuchsia-500'
                  }`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (typingStatus === 'idle' || typingStatus === 'incorrect') handleCheckTyping();
                      else if (typingStatus === 'correct' || typingStatus === 'revealed') handleNext();
                    }
                  }}
                  autoFocus
                />
                {(typingStatus === 'correct' || typingStatus === 'revealed') && (
                  <CheckCircle2 size={24} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" />
                )}
                {typingStatus === 'incorrect' && (
                  <XCircle size={24} className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500" />
                )}
              </div>

              {typingStatus === 'idle' || typingStatus === 'incorrect' ? (
                <div className="flex gap-4">
                  <button 
                    onClick={handleReveal}
                    className="flex-1 flex items-center justify-center gap-2 border border-white/20 text-white/80 hover:bg-white/5 py-4 rounded-xl font-medium transition-colors cursor-pointer"
                  >
                    <Eye size={20} /> Hiện đáp án
                  </button>
                  <button 
                    onClick={handleCheckTyping}
                    className="flex-[2] bg-[#9d2466] hover:bg-[#b52a76] text-white py-4 rounded-xl font-semibold transition-colors cursor-pointer shadow-lg shadow-fuchsia-900/20"
                  >
                    Kiểm tra
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 pt-4 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex items-center gap-3 mb-2">
                    <button 
                      onClick={speakWord}
                      className="p-3 text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
                      title="Nghe phát âm"
                    >
                      <Volume2 size={24} />
                    </button>
                  </div>
                  <button 
                    onClick={handleNext}
                    className="w-full bg-[#9d2466] hover:bg-[#b52a76] text-white py-4 rounded-xl font-semibold transition-colors cursor-pointer shadow-lg shadow-fuchsia-900/20"
                  >
                    {currentWordIndex < validWords.length - 1 ? 'Tiếp tục' : 'Hoàn thành'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ----------------- CHẾ ĐỘ TRẮC NGHIỆM ----------------- */}
        {gameMode === 'choice' && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="bg-white dark:bg-[#1E1226] rounded-3xl p-10 shadow-xl border border-slate-100 dark:border-white/10 w-full max-w-2xl transition-colors">
              
              <div className="text-center mb-8">
                <p className="text-sm font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase mb-2">
                  Câu hỏi {currentWordIndex + 1} / {validWords.length}
                </p>
                <div className="flex items-center justify-center gap-4">
                  <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-800 dark:text-white transition-colors">
                    {currentWordData.word}
                  </h2>
                  <button 
                    onClick={speakWord}
                    className="p-2 text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full transition-colors cursor-pointer"
                    title="Nghe phát âm"
                  >
                    <Volume2 size={24} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {options.map((option, index) => {
                  const isCorrect = option === currentWordData.meaning;
                  let statusClass = 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 shadow-sm cursor-pointer';
                  
                  if (selectedOption) {
                    if (isCorrect) {
                      statusClass = 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-400 shadow-sm shadow-green-100 dark:shadow-green-900/20';
                    } else if (option === selectedOption) {
                      statusClass = 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-400 shadow-sm shadow-red-100 dark:shadow-red-900/20';
                    } else {
                      statusClass = 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-600 opacity-60';
                    }
                  }
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleSelectOption(option)}
                      disabled={!!selectedOption}
                      className={`relative p-5 text-left rounded-2xl border-2 font-medium transition-all duration-200 ${statusClass}`}
                    >
                      <span className="block pr-8">{option}</span>
                      
                      {selectedOption && isCorrect && (
                        <CheckCircle2 size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-600 dark:text-green-500" />
                      )}
                      {selectedOption === option && !isCorrect && (
                        <XCircle size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-red-600 dark:text-red-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedOption && (
                <div className="mt-10 flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <button 
                    onClick={handleNext}
                    className="bg-slate-900 dark:bg-fuchsia-600 text-white hover:bg-slate-800 dark:hover:bg-fuchsia-500 px-8 py-3 rounded-xl font-semibold transition-colors shadow-lg cursor-pointer"
                  >
                    {currentWordIndex < validWords.length - 1 ? 'Tiếp tục' : 'Hoàn thành'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
