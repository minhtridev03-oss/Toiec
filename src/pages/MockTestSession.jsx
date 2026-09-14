import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, Headphones, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

// --- DUMMY DATA ---
// We simulate 200 questions:
// Q1 - Q100: Listening
// Q101 - Q200: Reading
const generateQuestions = () => {
  const qs = [];
  for (let i = 1; i <= 200; i++) {
    const isListening = i <= 100;
    qs.push({
      id: i,
      part: isListening ? (i <= 6 ? 1 : i <= 31 ? 2 : i <= 70 ? 3 : 4) : (i <= 130 ? 5 : i <= 146 ? 6 : 7),
      type: isListening ? 'listening' : 'reading',
      questionText: isListening 
        ? (i <= 6 ? 'Look at the picture and listen to the statements.' : 'Listen and choose the best response.')
        : `This is a sample reading question for number ${i}. Choose the correct word to fill in the blank.`,
      options: ['A', 'B', 'C', 'D'],
      audioUrl: isListening ? 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' : null,
      imageUrl: (i <= 6) ? 'https://placehold.co/400x300/e2e8f0/1e293b?text=Part+1+Image' : null,
      passage: (!isListening && i > 146) ? `This is a sample reading passage for part 7. It usually contains emails, memos, articles, or notices. Please read carefully to answer questions ${i} to ${Math.min(i+3, 200)}.` : null
    });
  }
  return qs;
};

const questions = generateQuestions();

export default function MockTestSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { 1: 'A', 2: 'C' }
  const [timeLeft, setTimeLeft] = useState(120 * 60); // 120 minutes in seconds
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Timer Effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectAnswer = (qId, option) => {
    setAnswers(prev => ({ ...prev, [qId]: option }));
  };

  const handleSubmit = () => {
    if (window.confirm("Bạn có chắc chắn muốn nộp bài?")) {
      alert("Đã nộp bài! (Tính năng chấm điểm đang được phát triển)");
      navigate('/mock-tests');
    }
  };

  const currentQ = questions[currentQIndex];

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-[#160B1E]">
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-[#1E1226] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/mock-tests')}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="font-bold text-slate-800 dark:text-white uppercase text-sm sm:text-base">
                {id.replace(/-/g, ' ')}
              </h1>
              <p className="text-xs text-slate-500 font-medium">Part {currentQ.part} - {currentQ.type.toUpperCase()}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className={`flex items-center gap-2 font-mono text-xl sm:text-2xl font-bold ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-slate-800 dark:text-white'}`}>
              <Clock className="w-5 h-5" />
              {formatTime(timeLeft)}
            </div>
            
            <button 
              onClick={handleSubmit}
              className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-2 rounded-xl font-bold transition-colors shadow-sm hidden sm:block"
            >
              Nộp bài
            </button>

            {/* Mobile Sidebar Toggle */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 bg-slate-200 dark:bg-slate-800 rounded-lg"
            >
              <BookOpen className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            </button>
          </div>
        </header>

        {/* Question Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="max-w-4xl mx-auto h-full flex flex-col">
            
            {/* Split View for Reading Part 7 or Full View for others */}
            <div className={`flex-1 flex ${currentQ.passage ? 'flex-col lg:flex-row gap-8' : 'flex-col'}`}>
              
              {/* Passage Side (Left) */}
              {currentQ.passage && (
                <div className="flex-1 bg-white dark:bg-[#1E1226] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-y-auto">
                  <h3 className="font-bold text-slate-700 dark:text-slate-300 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                    Questions {currentQ.id} - {Math.min(currentQ.id + 3, 200)} refer to the following passage:
                  </h3>
                  <div className="text-slate-800 dark:text-slate-200 leading-relaxed font-serif">
                    {currentQ.passage}
                  </div>
                </div>
              )}

              {/* Question Side (Right or Full) */}
              <div className={`bg-white dark:bg-[#1E1226] p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 ${currentQ.passage ? 'flex-1 lg:max-w-md' : 'max-w-3xl mx-auto w-full'}`}>
                
                <div className="mb-6 flex items-center justify-between">
                  <span className="bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 font-bold px-3 py-1 rounded-lg text-sm">
                    Question {currentQ.id}
                  </span>
                  {currentQ.type === 'listening' ? <Headphones className="text-pink-500 w-5 h-5" /> : <BookOpen className="text-pink-500 w-5 h-5" />}
                </div>

                {currentQ.imageUrl && (
                  <div className="mb-6 flex justify-center">
                    <img src={currentQ.imageUrl} alt="Part 1" className="rounded-lg max-w-full h-auto shadow-sm border border-slate-200" />
                  </div>
                )}

                {currentQ.audioUrl && (
                  <div className="mb-8 p-4 bg-slate-50 dark:bg-[#2A1D35] rounded-xl border border-slate-100 dark:border-slate-700">
                    <audio controls className="w-full" src={currentQ.audioUrl} />
                    <p className="text-xs text-slate-500 text-center mt-2">Audio is unlocked for testing purposes.</p>
                  </div>
                )}

                <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">
                  {currentQ.questionText}
                </h2>

                <div className="space-y-3">
                  {currentQ.options.map((opt, idx) => {
                    const isSelected = answers[currentQ.id] === opt;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelectAnswer(currentQ.id, opt)}
                        className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                          isSelected 
                            ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300'
                            : 'border-slate-200 dark:border-slate-700 hover:border-pink-300 dark:hover:border-pink-700/50 hover:bg-slate-50 dark:hover:bg-[#2A1D35] text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                          isSelected ? 'bg-pink-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {opt}
                        </div>
                        {/* Placeholder text for options */}
                        <span>Option {opt} description</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Navigation Buttons Footer */}
            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQIndex === 0}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-white dark:bg-[#1E1226] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Câu trước
              </button>
              
              <button
                onClick={() => setCurrentQIndex(prev => Math.min(questions.length - 1, prev + 1))}
                disabled={currentQIndex === questions.length - 1}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                Câu tiếp theo <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            
          </div>
        </main>
      </div>

      {/* Right Sidebar (Question Grid) */}
      <aside className={`absolute lg:relative right-0 top-0 h-full w-80 bg-white dark:bg-[#1E1226] border-l border-slate-200 dark:border-slate-800 flex flex-col z-20 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
        
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#2A1D35]">
          <h3 className="font-bold text-slate-700 dark:text-slate-200">Danh sách câu hỏi</h3>
          <span className="text-sm font-semibold text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-900/30 px-2 py-1 rounded-lg">
            {Object.keys(answers).length} / {questions.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          
          {/* Listening Section Map */}
          <div className="mb-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Headphones className="w-4 h-4" /> Listening (1-100)
            </h4>
            <div className="grid grid-cols-5 gap-2">
              {questions.slice(0, 100).map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = currentQIndex === q.id - 1;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQIndex(q.id - 1)}
                    className={`h-10 w-full rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                      isCurrent 
                        ? 'ring-2 ring-pink-500 ring-offset-2 dark:ring-offset-[#1E1226] bg-pink-100 text-pink-700' 
                        : isAnswered
                          ? 'bg-pink-500 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {q.id}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Reading Section Map */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Reading (101-200)
            </h4>
            <div className="grid grid-cols-5 gap-2">
              {questions.slice(100, 200).map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = currentQIndex === q.id - 1;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQIndex(q.id - 1)}
                    className={`h-10 w-full rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                      isCurrent 
                        ? 'ring-2 ring-pink-500 ring-offset-2 dark:ring-offset-[#1E1226] bg-pink-100 text-pink-700' 
                        : isAnswered
                          ? 'bg-pink-500 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {q.id}
                  </button>
                )
              })}
            </div>
          </div>

        </div>
        
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 lg:hidden">
          <button 
            onClick={handleSubmit}
            className="w-full bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-xl font-bold transition-colors"
          >
            Nộp bài
          </button>
        </div>
      </aside>
      
    </div>
  );
}
