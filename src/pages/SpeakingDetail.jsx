import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Mic, X, Sparkles, MapPin, Users, Target, Play, Volume2, RotateCcw, Languages, Loader2, CheckCircle2, TrendingUp, AlertCircle, Sun, Moon } from 'lucide-react';
import { chatSpeaking, translateText, evaluateSpeaking } from '../lib/gemini';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePracticeSessionTimer } from '../lib/practiceActivity';

const VOICES = [
  { id: 'us-female-1', name: 'Hannah', accent: 'US', gender: 'Female' },
  { id: 'us-female-2', name: 'Lauren', accent: 'US', gender: 'Female' },
  { id: 'us-male-1', name: 'Daniel', accent: 'US', gender: 'Male' },
  { id: 'us-male-2', name: 'Noah', accent: 'US', gender: 'Male' },
  { id: 'gb-female-1', name: 'Amelia', accent: 'GB', gender: 'Female' },
  { id: 'gb-female-2', name: 'Chloe', accent: 'GB', gender: 'Female' },
  { id: 'gb-male-1', name: 'Edward', accent: 'GB', gender: 'Male' },
  { id: 'gb-male-2', name: 'Oliver', accent: 'GB', gender: 'Male' },
];

const SPEEDS = [
  { id: 'slow', label: 'Slow', rate: 0.7 },
  { id: 'normal', label: 'Normal', rate: 1.0 },
  { id: 'fast', label: 'Fast', rate: 1.3 },
];

export default function SpeakingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  
  const [scenario, setScenario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isTranslatingDesc, setIsTranslatingDesc] = useState(false);
  const [descTranslation, setDescTranslation] = useState('');

  useEffect(() => {
    fetchScenario();
  }, [id]);

  const fetchScenario = async () => {
    try {
      const { data, error } = await supabase
        .from('speaking_scenarios')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;

      if (data) {
        setScenario({
          id: data.id,
          level: data.level,
          title: data.title,
          description: data.description,
          partner: {
            name: data.partner_name,
            role: data.partner_role,
            initial: data.partner_initial,
          },
          image: data.image_url,
          suggestions: data.suggestions
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [phase, setPhase] = useState('intro'); // 'intro' | 'chat' | 'evaluating' | 'result'
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0]);
  const [selectedSpeed, setSelectedSpeed] = useState(SPEEDS[1]);

  usePracticeSessionTimer('speaking', user, Boolean(scenario && phase !== 'intro' && phase !== 'result'));
  
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [evaluation, setEvaluation] = useState(null);

  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const latestHandleUserMessage = useRef();
  const selectedVoiceRef = useRef(VOICES[0]);
  const selectedSpeedRef = useRef(SPEEDS[1]);
  const transcriptRef = useRef('');
  const timeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages, isAIThinking]);

  // Setup Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let final = '';
        for (let i = 0; i < event.results.length; ++i) {
          final += event.results[i][0].transcript;
        }
        transcriptRef.current = final;
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
        clearTimeout(timeoutRef.current);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
        clearTimeout(timeoutRef.current);
        if (transcriptRef.current.trim() && latestHandleUserMessage.current) {
          latestHandleUserMessage.current(transcriptRef.current.trim());
          transcriptRef.current = '';
        }
      };
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      clearTimeout(timeoutRef.current);
      window.speechSynthesis.cancel();
    };
  }, []);

  const handleStart = async () => {
    setPhase('chat');
    setIsAIThinking(true);
    try {
      const greeting = await chatSpeaking(
        scenario.title,
        scenario.description,
        scenario.partner.name,
        scenario.partner.role,
        `[SYSTEM: The user just started the conversation. Start naturally with a greeting. Keep it short (1-2 sentences).]`,
        []
      );
      const aiText = typeof greeting === 'string' ? greeting : (greeting?.reply || `Hi there! I'm ${scenario.partner.name}. Nice to meet you!`);
      const initialSuggestions = Array.isArray(greeting?.suggestions) && greeting.suggestions.length > 0
        ? greeting.suggestions
        : (Array.isArray(scenario.suggestions) ? scenario.suggestions : []);
      const initialMessages = [{ role: 'ai', content: aiText }];
      setMessages(initialMessages);
      setSuggestions(initialSuggestions);
      playAudio(aiText);
    } catch {
      const fallbackMsg = [{ role: 'ai', content: `Hi there! I'm ${scenario.partner.name}. Nice to meet you!` }];
      setMessages(fallbackMsg);
      setSuggestions(Array.isArray(scenario.suggestions) ? scenario.suggestions : []);
    } finally {
      setIsAIThinking(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      transcriptRef.current = '';
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
        timeoutRef.current = setTimeout(() => {
          recognitionRef.current?.stop();
        }, 30000);
      } catch (e) {
        console.error("Failed to start recognition", e);
      }
    }
  };

  const handleUserMessage = async (text) => {
    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setIsAIThinking(true);
    setSuggestions([]); // Clear suggestions while AI thinks

    try {
      const aiReply = await chatSpeaking(
        scenario.title,
        scenario.description,
        scenario.partner.name,
        scenario.partner.role,
        text,
        messages,
        scenario.level
      );
      const aiText = typeof aiReply === 'string' ? aiReply : (aiReply?.reply || "Could you repeat that?");
      const nextSuggestions = Array.isArray(aiReply?.suggestions) ? aiReply.suggestions : [];
      const updatedMessages = [...newMessages, { role: 'ai', content: aiText }];
      setMessages(updatedMessages);
      setSuggestions(nextSuggestions);
      playAudio(aiText);
    } catch (error) {
      console.error(error);
      const fallback = [...newMessages, { role: 'ai', content: "Sorry, I couldn't understand. Could you try again?" }];
      setMessages(fallback);
    } finally {
      setIsAIThinking(false);
    }
  };

  useEffect(() => {
    latestHandleUserMessage.current = handleUserMessage;
  }, [scenario, messages, handleUserMessage]);

  const handleSuggestionClick = (word) => {
    handleUserMessage(word);
  };

  const playAudio = (text, customVoice = null, customSpeed = null) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Use refs to always get the latest selected voice/speed
    const voiceToUse = customVoice || selectedVoiceRef.current;
    const speedToUse = customSpeed || selectedSpeedRef.current;

    utterance.lang = voiceToUse.accent === 'GB' ? 'en-GB' : 'en-US';
    utterance.rate = speedToUse.rate;
    
    const voices = window.speechSynthesis.getVoices();
    const langPrefix = voiceToUse.accent === 'GB' ? 'en-GB' : 'en-US';
    // Try to find a voice matching the preferred lang
    const match = voices.find(v => v.lang.startsWith(langPrefix))
      || voices.find(v => v.lang.startsWith('en'));
    if (match) utterance.voice = match;
    
    window.speechSynthesis.speak(utterance);
  };

  const previewVoice = (voice) => {
    setSelectedVoice(voice);
    selectedVoiceRef.current = voice;
    playAudio(`Hi, I'm ${voice.name}. Let's practice English together!`, voice, selectedSpeedRef.current);
  };

  const handleTranslateMessage = async (idx, text) => {
    // Optimistic UI update: Set a loading flag on the message
    setMessages(prev => {
      const newMsgs = [...prev];
      newMsgs[idx] = { ...newMsgs[idx], isTranslating: true };
      return newMsgs;
    });

    const translated = await translateText(text);

    setMessages(prev => {
      const newMsgs = [...prev];
      newMsgs[idx] = { ...newMsgs[idx], translation: translated, isTranslating: false };
      return newMsgs;
    });
  };

  const handleTranslateDesc = async () => {
    if (descTranslation) {
      setDescTranslation(''); // toggle off
      return;
    }
    setIsTranslatingDesc(true);
    const translated = await translateText(scenario.description);
    setDescTranslation(translated);
    setIsTranslatingDesc(false);
  };

  const handleEndSession = async () => {
    window.speechSynthesis.cancel();
    setPhase('evaluating');
    
    try {
      const result = await evaluateSpeaking(
        scenario.title, 
        scenario.description, 
        scenario.partner.name, 
        messages
      );
      setEvaluation(result);
      setPhase('result');
    } catch (error) {
      console.error(error);
      alert('Could not generate evaluation. Please try again later.');
      navigate('/speaking');
    }
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center p-10 text-slate-500">Loading scenario...</div>;
  }

  if (!scenario) {
    return <div className="flex-1 flex items-center justify-center p-10 text-slate-500">Scenario not found.</div>;
  }

  // ==================== INTRO PHASE ====================
  if (phase === 'intro') {
    return (
      <div className="flex-1 flex items-center justify-center bg-pink-50 dark:bg-[#160B1E] overflow-y-auto p-4 md:p-10 transition-colors">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl bg-white dark:bg-[#1E1226] rounded-3xl overflow-hidden shadow-2xl border border-pink-200 dark:border-fuchsia-900/40 relative transition-colors"
        >
          {/* Close button */}
          <button 
            onClick={() => navigate('/speaking')} 
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/30 text-white/80 hover:bg-black/50 hover:text-white transition-colors backdrop-blur-sm"
          >
            <X size={20} />
          </button>

          {/* Hero Image */}
          <div className="relative h-52 md:h-64 overflow-hidden">
            <img src={scenario.image} alt={scenario.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#1E1226] via-white/40 dark:via-[#1E1226]/40 to-transparent transition-colors" />
            
            {/* Title overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-fuchsia-600 flex items-center justify-center shadow-lg">
                  <Sparkles size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-fuchsia-600 dark:text-fuchsia-400 uppercase tracking-wider">Conversation Script</p>
                  <h1 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white transition-colors">{scenario.title}</h1>
                </div>
              </div>
              <span className="px-3 py-1 bg-teal-500 text-white text-xs font-extrabold rounded-lg shadow">{scenario.level}</span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-5">
            {/* Context */}
            <div className="bg-pink-100 dark:bg-[#2A1F33] rounded-2xl p-5 border border-pink-200 dark:border-fuchsia-900/30 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-fuchsia-600 dark:text-fuchsia-400">
                  <MapPin size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Context</span>
                </div>
                <button 
                  onClick={handleTranslateDesc}
                  disabled={isTranslatingDesc}
                  className="flex items-center gap-1.5 text-xs text-fuchsia-400/70 hover:text-fuchsia-300 transition-colors disabled:opacity-50"
                >
                  {isTranslatingDesc ? <Loader2 size={14} className="animate-spin" /> : <Languages size={14} />}
                  <span>{descTranslation ? 'Hide Translation' : 'Translate'}</span>
                </button>
              </div>
              <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed transition-colors">
                {scenario.description}
              </p>
              {descTranslation && (
                <div className="mt-3 pt-3 border-t border-pink-200 dark:border-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-200/90 text-sm leading-relaxed transition-colors">
                  {descTranslation}
                </div>
              )}
            </div>

            {/* Conversation Partner */}
            <div className="bg-pink-100 dark:bg-[#2A1F33] rounded-2xl p-5 border border-pink-200 dark:border-fuchsia-900/30 transition-colors">
              <div className="flex items-center gap-2 text-fuchsia-600 dark:text-fuchsia-400 mb-3">
                <Users size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Conversation Partner</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-fuchsia-100 dark:bg-fuchsia-600/20 border-2 border-fuchsia-400 dark:border-fuchsia-500/50 flex items-center justify-center text-fuchsia-600 dark:text-fuchsia-400 font-extrabold text-lg shrink-0 transition-colors">
                  {scenario.partner.initial}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white text-lg transition-colors">{scenario.partner.name}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm transition-colors">{scenario.partner.role}</p>
                </div>
              </div>
            </div>

            {/* Your Turn */}
            <div className="bg-fuchsia-50 dark:bg-fuchsia-950/50 rounded-2xl p-5 border border-fuchsia-200 dark:border-fuchsia-600/40 transition-colors">
              <div className="flex items-center gap-2 text-fuchsia-600 dark:text-fuchsia-400 mb-3">
                <Target size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Your Turn</span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed transition-colors">
                Listen, then press the microphone to respond. Try using the suggested words to keep the conversation flowing naturally.
              </p>
            </div>

            {/* Voice Selection */}
            <div>
              <p className="text-xs font-bold text-fuchsia-400/70 uppercase tracking-wider mb-3">Voice</p>
              <div className="flex flex-wrap gap-2">
                {VOICES.map(voice => (
                  <button
                    key={voice.id}
                    onClick={() => previewVoice(voice)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-all border ${
                      selectedVoice.id === voice.id
                        ? 'bg-fuchsia-100 dark:bg-fuchsia-600/20 border-fuchsia-500 text-fuchsia-700 dark:text-fuchsia-300'
                        : 'bg-pink-100 dark:bg-[#2A1F33] border-pink-200 dark:border-[#3A2F43] text-slate-600 dark:text-slate-400 hover:border-fuchsia-400 dark:hover:border-fuchsia-600/40 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    <span className="text-fuchsia-500 text-[10px]">{voice.accent}</span>
                    <span className="font-extrabold text-slate-800 dark:text-white transition-colors">{voice.name}</span>
                    <span className="text-slate-500">{voice.gender}</span>
                    <Play size={10} className="text-fuchsia-400" />
                  </button>
                ))}
              </div>
            </div>

            {/* Speed Selection */}
            <div>
              <p className="text-xs font-bold text-fuchsia-400/70 uppercase tracking-wider mb-3">Speed</p>
              <div className="grid grid-cols-3 gap-2">
                {SPEEDS.map(speed => (
                  <button
                    key={speed.id}
                    onClick={() => { setSelectedSpeed(speed); selectedSpeedRef.current = speed; }}
                    className={`py-2.5 rounded-full text-sm font-bold transition-all border ${
                      selectedSpeed.id === speed.id
                        ? 'bg-fuchsia-100 dark:bg-fuchsia-600/20 border-fuchsia-500 text-fuchsia-700 dark:text-fuchsia-300'
                        : 'bg-pink-100 dark:bg-[#2A1F33] border-pink-200 dark:border-[#3A2F43] text-slate-600 dark:text-slate-400 hover:border-fuchsia-400 dark:hover:border-fuchsia-600/40'
                    }`}
                  >
                    {speed.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStart}
              className="w-full py-4 bg-gradient-to-r from-fuchsia-600 to-pink-500 text-white font-extrabold text-lg rounded-2xl hover:from-fuchsia-500 hover:to-pink-400 transition-all shadow-lg shadow-fuchsia-600/30 flex items-center justify-center gap-3"
            >
              <Sparkles size={22} />
              Got it, let's start!
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ==================== EVALUATING PHASE ====================
  if (phase === 'evaluating') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-[calc(100vh-80px)] bg-pink-50 dark:bg-[#160B1E] transition-colors">
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="w-20 h-20 bg-fuchsia-600/20 rounded-full flex items-center justify-center mb-6 border-2 border-fuchsia-500/50"
        >
          <Sparkles size={32} className="text-fuchsia-400" />
        </motion.div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 transition-colors">Analyzing your conversation...</h2>
        <p className="text-slate-600 dark:text-slate-400 text-center max-w-md transition-colors">
          Our AI teacher is reviewing your grammar, vocabulary, and fluency. This might take a few seconds.
        </p>
      </div>
    );
  }

  // ==================== RESULT PHASE ====================
  if (phase === 'result' && evaluation) {
    return (
      <div className="flex-1 overflow-y-auto bg-pink-50 dark:bg-[#160B1E] p-4 md:p-10 transition-colors">
        <div className="max-w-3xl mx-auto space-y-8 pb-10">
          
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2 transition-colors">
              <Target className="text-fuchsia-500" /> Session Evaluation
            </h1>
            <button 
              onClick={() => navigate('/speaking')}
              className="px-5 py-2 bg-[#3A2F43] text-white rounded-xl font-bold hover:bg-[#3A2F43] transition-colors"
            >
              Done
            </button>
          </div>

          <div className="bg-white dark:bg-[#1E1226] rounded-3xl p-6 md:p-8 border border-pink-200 dark:border-fuchsia-900/40 shadow-2xl relative overflow-hidden transition-colors">
            <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="flex flex-col md:flex-row gap-8 items-center mb-10 relative z-10">
              {/* Score Circle */}
              <div className="relative w-40 h-40 shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#3A2F43" strokeWidth="8" />
                  <motion.circle 
                    initial={{ strokeDasharray: "0 1000" }}
                    animate={{ strokeDasharray: `${(evaluation.score / 100) * 283} 1000` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    cx="50" cy="50" r="45" fill="none" stroke="#d946ef" strokeWidth="8" strokeLinecap="round" 
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-extrabold text-slate-800 dark:text-white transition-colors">{evaluation.score}</span>
                  <span className="text-xs text-fuchsia-600 dark:text-fuchsia-400 font-bold uppercase tracking-wider">Score</span>
                </div>
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 transition-colors">Teacher's Feedback</h3>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm md:text-base transition-colors">
                  {evaluation.feedback}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 relative z-10">
              {/* Strengths */}
              <div className="bg-emerald-50 dark:bg-[#3A2F43]/50 rounded-2xl p-5 border border-emerald-200 dark:border-emerald-900/30 transition-colors">
                <h4 className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold mb-4">
                  <CheckCircle2 size={20} /> Strengths
                </h4>
                <ul className="space-y-3">
                  {evaluation.strengths?.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300 transition-colors">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Improvements */}
              <div className="bg-amber-50 dark:bg-[#3A2F43]/50 rounded-2xl p-5 border border-amber-200 dark:border-amber-900/30 transition-colors">
                <h4 className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold mb-4">
                  <TrendingUp size={20} /> Areas to Improve
                </h4>
                <ul className="space-y-3">
                  {evaluation.improvements?.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300 transition-colors">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    );
  }

  // ==================== CHAT PHASE ====================
  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-80px)] bg-pink-50 dark:bg-[#160B1E] transition-colors relative">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-3 md:px-6 bg-white dark:bg-[#1E1226] border-b border-pink-200 dark:border-[#3A2F43] z-10 shrink-0 transition-colors gap-2">
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          <button 
            onClick={() => { window.speechSynthesis.cancel(); navigate('/speaking'); }}
            className="p-1.5 md:p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-pink-100 dark:hover:bg-[#2A1F33] hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-fuchsia-100 dark:bg-fuchsia-600/20 border-2 border-fuchsia-400 dark:border-fuchsia-500/50 flex items-center justify-center text-fuchsia-600 dark:text-fuchsia-400 font-extrabold text-sm md:text-base shrink-0 transition-colors">
            {scenario.partner.initial}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-slate-800 dark:text-white text-sm transition-colors truncate">{scenario.partner.name}</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 transition-colors truncate">
              <span className="text-teal-600 dark:text-teal-400 font-bold mr-1">{scenario.level}</span>
              {scenario.title}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          <button 
            onClick={toggleTheme}
            className="flex items-center justify-center w-8 h-8 md:w-auto md:px-3 md:py-1.5 bg-pink-100 dark:bg-[#2A1F33] rounded-full text-xs text-slate-700 dark:text-slate-300 hover:bg-pink-200 dark:hover:bg-[#321F3F] transition-colors border border-pink-200 dark:border-[#3A2F43] cursor-pointer shrink-0"
          >
            {isDarkMode ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-slate-500" />}
          </button>
          <div className="flex items-center justify-center w-8 h-8 md:w-auto md:px-3 md:py-1.5 gap-2 bg-pink-100 dark:bg-[#2A1F33] rounded-full text-xs text-slate-700 dark:text-slate-300 border border-pink-200 dark:border-[#3A2F43] shrink-0">
            <Volume2 size={14} className="text-fuchsia-600 dark:text-fuchsia-400 transition-colors" />
            <span className="hidden md:inline">{selectedVoice.accent} {selectedVoice.name}</span>
          </div>
          <button 
            onClick={handleEndSession}
            className="flex items-center justify-center w-8 h-8 md:w-auto md:px-3 md:py-1.5 gap-1.5 bg-pink-100 dark:bg-[#2A1F33] rounded-full text-xs text-slate-700 dark:text-slate-300 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors border border-pink-200 dark:border-[#3A2F43] cursor-pointer shrink-0"
          >
            <X size={14} />
            <span className="hidden md:inline">End</span>
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
          {/* Scenario Card */}
          <div className="bg-white dark:bg-[#1E1226] rounded-2xl p-5 border border-pink-200 dark:border-[#3A2F43] text-center transition-colors">
            <p className="text-xs font-bold text-fuchsia-600 dark:text-fuchsia-400 uppercase tracking-wider mb-2">Script</p>
            <h3 className="font-bold text-slate-800 dark:text-white mb-2 transition-colors">{scenario.title}</h3>
            <p className="text-slate-700 dark:text-slate-400 text-sm leading-relaxed transition-colors">{scenario.description}</p>
          </div>

          {/* Messages */}
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              {msg.role === 'ai' ? (
                <div className="space-y-2">
                  {/* AI avatar + name */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-fuchsia-100 dark:bg-fuchsia-600/20 border border-fuchsia-400 dark:border-fuchsia-500/50 flex items-center justify-center text-fuchsia-600 dark:text-fuchsia-400 font-bold text-sm shrink-0 transition-colors">
                      {scenario.partner.initial}
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors">{scenario.partner.name}</span>
                  </div>
                  {/* AI bubble */}
                  <div className="ml-11 bg-white dark:bg-[#1E1226] rounded-2xl rounded-tl-sm p-4 border border-pink-200 dark:border-[#3A2F43] text-slate-700 dark:text-slate-200 leading-relaxed transition-colors">
                    {msg.content}
                    {msg.translation && (
                      <div className="mt-3 pt-3 border-t border-pink-100 dark:border-[#3A2F43] text-fuchsia-600 dark:text-fuchsia-300 text-sm transition-colors">
                        {msg.translation}
                      </div>
                    )}
                  </div>
                  {/* AI action buttons */}
                  <div className="ml-11 flex items-center gap-4 text-xs text-slate-500">
                    <button onClick={() => playAudio(msg.content)} className="flex items-center gap-1 hover:text-fuchsia-400 transition-colors">
                      <RotateCcw size={12} /> Replay
                    </button>
                    <button 
                      onClick={() => handleTranslateMessage(idx, msg.content)} 
                      disabled={msg.isTranslating}
                      className="flex items-center gap-1 hover:text-fuchsia-400 transition-colors disabled:opacity-50"
                    >
                      {msg.isTranslating ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />} 
                      Translate
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-fuchsia-600 text-white rounded-2xl rounded-br-sm p-4 leading-relaxed shadow-lg shadow-fuchsia-600/10">
                    {msg.content}
                  </div>
                </div>
              )}
            </motion.div>
          ))}

          {/* AI Thinking */}
          {isAIThinking && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-fuchsia-100 dark:bg-fuchsia-600/20 border border-fuchsia-400 dark:border-fuchsia-500/50 flex items-center justify-center text-fuchsia-600 dark:text-fuchsia-400 font-bold text-sm shrink-0 transition-colors">
                {scenario.partner.initial}
              </div>
              <div className="bg-white dark:bg-[#1E1226] rounded-2xl rounded-tl-sm p-4 border border-pink-200 dark:border-[#3A2F43] flex gap-1.5 transition-colors">
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} className="h-4" />
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="bg-white dark:bg-[#1E1226] border-t border-pink-200 dark:border-[#3A2F43] p-4 md:p-6 transition-colors">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="bg-pink-100 dark:bg-[#2A1F33] rounded-2xl p-4 border border-pink-200 dark:border-fuchsia-900/30 transition-colors">
              <p className="text-xs text-fuchsia-600 dark:text-fuchsia-400 font-bold mb-3 flex items-center gap-1.5">
                <Target size={12} /> Try using these words:
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((word, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(word)}
                    disabled={isAIThinking}
                    className="px-4 py-2 bg-white dark:bg-[#1E1226] border border-pink-300 dark:border-[#3A2F43] rounded-full text-sm text-slate-700 dark:text-slate-300 font-medium hover:border-fuchsia-500 hover:text-fuchsia-600 dark:hover:text-fuchsia-300 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {word}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mic Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={toggleRecording}
              disabled={isAIThinking}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg cursor-pointer ${
                isRecording
                  ? 'bg-red-500 shadow-red-500/30 animate-pulse scale-110'
                  : 'bg-fuchsia-600 shadow-fuchsia-600/30 hover:bg-fuchsia-500 hover:scale-105'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Mic size={28} className="text-white" />
            </button>
            <p className="text-xs text-slate-500 font-medium">
              {isRecording ? 'Listening...' : 'Press to speak'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
