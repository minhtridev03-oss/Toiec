import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Mic,
  MicOff,
  X,
  Sparkles,
  MapPin,
  Users,
  Target,
  Play,
  Volume2,
  RotateCcw,
  Languages,
  Loader2,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Square,
  Award,
  ChevronLeft,
  Flame,
  Clock,
  Compass,
  ArrowRight,
} from 'lucide-react';
import { chatSpeaking, chatSpeakingStream, translateText, evaluateSpeaking } from '../lib/gemini';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { usePracticeSessionTimer } from '../lib/practiceActivity';
import { useAudioRecorder } from '../lib/useAudioRecorder';

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
  { id: 'slow', label: 'Chậm (0.7x)', rate: 0.7 },
  { id: 'normal', label: 'Chuẩn (1.0x)', rate: 1.0 },
  { id: 'fast', label: 'Nhanh (1.3x)', rate: 1.3 },
];

const LEVEL_THEMES = {
  A1: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  A2: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  B1: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
  B2: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
  C1: 'bg-indigo-500/15 text-indigo-700 dark:text-cyan-300 border-indigo-500/30',
};

export default function SpeakingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [scenario, setScenario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isTranslatingDesc, setIsTranslatingDesc] = useState(false);
  const [descTranslation, setDescTranslation] = useState('');

  const [phase, setPhase] = useState('intro'); // 'intro' | 'chat' | 'evaluating' | 'result'
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0]);
  const [selectedSpeed, setSelectedSpeed] = useState(SPEEDS[1]);
  const [isAISpeaking, setIsAISpeaking] = useState(false);

  usePracticeSessionTimer('speaking', user, Boolean(scenario && phase !== 'intro' && phase !== 'result'));

  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [isEnded, setIsEnded] = useState(false);

  const messagesEndRef = useRef(null);
  const latestHandleUserMessage = useRef();
  const selectedVoiceRef = useRef(VOICES[0]);
  const selectedSpeedRef = useRef(SPEEDS[1]);
  const pendingTranscriptRef = useRef('');

  useEffect(() => {
    fetchScenario();
  }, [id]);

  const fetchScenario = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('speaking_scenarios')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setScenario({
          id: data.id,
          level: data.level || 'A1',
          title: data.title,
          description: data.description,
          partner: {
            name: data.partner_name || 'AI Assistant',
            role: data.partner_role || 'Partner',
            initial: data.partner_initial || (data.partner_name ? data.partner_name[0] : 'A'),
          },
          image: data.image_url,
          suggestions: data.suggestions || [],
        });
      }
    } catch (err) {
      console.error('Error fetching scenario:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalTranscript = useCallback((transcript) => {
    pendingTranscriptRef.current = transcript;
  }, []);

  const handleRecordingEnd = useCallback(() => {
    const transcript = pendingTranscriptRef.current.trim();
    pendingTranscriptRef.current = '';
    if (transcript && latestHandleUserMessage.current) {
      latestHandleUserMessage.current(transcript);
    }
  }, []);

  const {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
  } = useAudioRecorder({
    onStop: async (data) => {
      if (data && data.base64) {
        const base64Clean = data.base64.split(',')[1];
        const inlineData = {
          mimeType: data.mimeType,
          data: base64Clean,
        };
        await latestHandleUserMessage.current('', inlineData);
      }
    },
  });

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAIThinking]);

  useEffect(() => () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // Pro Spacebar shortcut to speak during chat
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (phase !== 'chat') return;
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        toggleRecording();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, isRecording]);

  const handleStart = async () => {
    if (window.speechSynthesis) {
      const unlockUtterance = new SpeechSynthesisUtterance('');
      unlockUtterance.volume = 0;
      window.speechSynthesis.speak(unlockUtterance);
    }

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
      const aiText = typeof greeting === 'string'
        ? greeting
        : (greeting?.reply || `Hi there! I'm ${scenario.partner.name}. Nice to meet you!`);
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
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleUserMessage = async (textInput, inlineData = null) => {
    setIsAIThinking(true);
    setSuggestions([]);

    const initialUserText = textInput || (inlineData ? '🎤 Đang nhận diện giọng nói...' : '');
    // Append user bubble and empty AI placeholder immediately
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: initialUserText },
      { role: 'ai', content: '' },
    ]);

    let finalReply = '';
    let finalTranscript = textInput || '';
    let finalSuggestions = [];

    try {
      await chatSpeakingStream({
        scenarioTitle: scenario.title,
        scenarioDesc: scenario.description,
        partnerName: scenario.partner.name,
        partnerRole: scenario.partner.role,
        userMessage: textInput,
        history: messages,
        level: scenario.level,
        audioData: inlineData,
        onChunk: (chunk) => {
          finalReply += chunk;
          setMessages((prev) => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (updated[lastIdx]?.role === 'ai') {
              updated[lastIdx] = { ...updated[lastIdx], content: finalReply };
            }
            return updated;
          });
        },
        onMeta: ({ suggestions: newSuggestions, userTranscript, isFinished }) => {
          if (newSuggestions && newSuggestions.length > 0) {
            finalSuggestions = newSuggestions;
          }
          if (inlineData && userTranscript) {
            finalTranscript = userTranscript;
            setMessages((prev) => {
              if (prev.length < 2) return prev;
              const updated = [...prev];
              const userIdx = updated.length - 2;
              if (updated[userIdx]?.role === 'user') {
                updated[userIdx] = { ...updated[userIdx], content: userTranscript };
              }
              return updated;
            });
          }
          if (isFinished) {
            setIsEnded(true);
          }
        },
        onDone: () => {},
      });

      setSuggestions(finalSuggestions);
      if (finalReply) playAudio(finalReply);
    } catch (error) {
      console.error(error);
      setMessages((prev) => {
        if (prev.length === 0) return prev;
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (updated[lastIdx]?.role === 'ai') {
          updated[lastIdx] = {
            role: 'ai',
            content: "Sorry, I couldn't catch that clearly. Could you say it again?",
          };
        }
        return updated;
      });
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

  const playAudio = (textToSpeak, customVoice = null, customSpeed = null) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    const voiceToUse = customVoice || selectedVoiceRef.current;
    const speedToUse = customSpeed || selectedSpeedRef.current;

    utterance.lang = voiceToUse.accent === 'GB' ? 'en-GB' : 'en-US';
    utterance.rate = speedToUse.rate;

    const voices = window.speechSynthesis.getVoices();
    const langPrefix = voiceToUse.accent === 'GB' ? 'en-GB' : 'en-US';
    const match = voices.find((v) => v.lang.startsWith(langPrefix)) || voices.find((v) => v.lang.startsWith('en'));
    if (match) utterance.voice = match;

    utterance.onstart = () => setIsAISpeaking(true);
    utterance.onend = () => setIsAISpeaking(false);
    utterance.onerror = () => setIsAISpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const previewVoice = (voice) => {
    setSelectedVoice(voice);
    selectedVoiceRef.current = voice;
    playAudio(`Hi, I'm ${voice.name}. Let's practice English together!`, voice, selectedSpeedRef.current);
  };

  const handleTranslateMessage = async (idx, textToTranslate) => {
    setMessages((prev) => {
      const newMsgs = [...prev];
      newMsgs[idx] = { ...newMsgs[idx], isTranslating: true };
      return newMsgs;
    });

    const translated = await translateText(textToTranslate);

    setMessages((prev) => {
      const newMsgs = [...prev];
      newMsgs[idx] = { ...newMsgs[idx], translation: translated, isTranslating: false };
      return newMsgs;
    });
  };

  const handleTranslateDesc = async () => {
    if (descTranslation) {
      setDescTranslation('');
      return;
    }
    setIsTranslatingDesc(true);
    const translated = await translateText(scenario.description);
    setDescTranslation(translated);
    setIsTranslatingDesc(false);
  };

  const handleEndSession = async () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
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
      alert('Không thể tạo đánh giá lúc này. Vui lòng thử lại sau.');
      navigate('/speaking');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3 p-8 rounded-3xl bg-white/30 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/35 dark:border-white/10 shadow-xl text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Đang chuẩn bị phòng hội thoại AI...
          </p>
        </div>
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3 p-8 rounded-3xl bg-white/30 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/35 dark:border-white/10 shadow-xl text-center max-w-md">
          <p className="text-base font-bold text-slate-800 dark:text-slate-100">
            Không tìm thấy tình huống hội thoại
          </p>
          <button
            type="button"
            onClick={() => navigate('/speaking')}
            className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors cursor-pointer shadow-lg shadow-indigo-600/20"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  // ==================== 1. INTRO PHASE ====================
  if (phase === 'intro') {
    const levelStyle = LEVEL_THEMES[scenario.level] || LEVEL_THEMES.A1;

    return (
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 flex flex-col justify-start lg:justify-center items-center hide-scrollbar">
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-5xl my-auto rounded-3xl backdrop-blur-2xl bg-white/45 dark:bg-slate-900/60 border border-white/50 dark:border-white/10 shadow-2xl relative overflow-hidden p-4 sm:p-6 lg:p-7"
        >
          {/* Main 2-Column Responsive Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
            {/* LEFT COLUMN (Artwork & Partner Persona Card) */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-3.5">
              {/* Scenario Artwork - Generous aspect ratio with object-top to prevent head cropping */}
              <div className="relative rounded-2xl overflow-hidden border border-white/30 dark:border-white/10 shadow-lg bg-slate-950/60 aspect-[16/10] sm:aspect-[16/11] shrink-0 group">
                <img
                  src={scenario.image}
                  alt={scenario.title}
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-black/20 pointer-events-none" />

                {/* Level Badge */}
                <div className="absolute top-3 left-3 pointer-events-none">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-black border backdrop-blur-md shadow-md ${levelStyle}`}>
                    {scenario.level}
                  </span>
                </div>
              </div>

              {/* Partner Persona Card */}
              <div className="rounded-2xl p-3.5 backdrop-blur-xl bg-white/30 dark:bg-slate-800/35 border border-white/30 dark:border-white/5 flex items-center gap-3.5">
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-indigo-600/30">
                    {scenario.partner.initial}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                      {scenario.partner.name}
                    </h3>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Sẵn sàng
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-medium">
                    {scenario.partner.role}
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (Header, Context, Audio Controls & Launch CTA) */}
            <div className="lg:col-span-7 flex flex-col justify-between gap-4">
              {/* Header with Title and Close Button */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-cyan-400 text-[11px] font-black uppercase tracking-wider">
                    <Sparkles size={12} />
                    <span>AI Speaking Studio</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                    {scenario.title}
                  </h1>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/speaking')}
                  className="p-2 rounded-xl bg-white/40 dark:bg-slate-800/60 border border-white/30 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700/80 transition-all cursor-pointer shrink-0 shadow-xs"
                  title="Đóng và quay lại"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scenario Context Box */}
              <div className="rounded-2xl p-3.5 sm:p-4 backdrop-blur-xl bg-white/30 dark:bg-slate-800/30 border border-white/30 dark:border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-black text-indigo-600 dark:text-cyan-400 uppercase tracking-wider">
                    <MapPin size={14} />
                    <span>Bối cảnh tình huống</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleTranslateDesc}
                    disabled={isTranslatingDesc}
                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-cyan-400 hover:text-indigo-700 dark:hover:text-cyan-300 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isTranslatingDesc ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />}
                    <span>{descTranslation ? 'Ẩn dịch' : 'Dịch tiếng Việt'}</span>
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                  {scenario.description}
                </p>
                {descTranslation && (
                  <div className="mt-2 pt-2 border-t border-white/20 dark:border-white/10 text-xs sm:text-sm text-indigo-800 dark:text-cyan-300 leading-relaxed font-semibold italic">
                    {descTranslation}
                  </div>
                )}
              </div>

              {/* Audio Controls (Voice & Speed) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Voice Picker */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Volume2 size={13} className="text-indigo-500 dark:text-cyan-400" />
                    <span>Giọng đọc ({selectedVoice.accent})</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {VOICES.map((v) => {
                      const isSelected = selectedVoice.id === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => previewVoice(v)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm shadow-indigo-500/25'
                              : 'bg-white/30 dark:bg-slate-800/40 border border-white/25 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:bg-white/50'
                          }`}
                        >
                          <span className="text-[10px] opacity-80">{v.accent}</span>
                          <span>{v.name}</span>
                          <Play size={9} className="opacity-80" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Speed Picker */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Clock size={13} className="text-indigo-500 dark:text-cyan-400" />
                    <span>Tốc độ</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {SPEEDS.map((s) => {
                      const isSelected = selectedSpeed.id === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSelectedSpeed(s);
                            selectedSpeedRef.current = s;
                          }}
                          className={`py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer text-center ${
                            isSelected
                              ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-sm shadow-indigo-500/25'
                              : 'bg-white/30 dark:bg-slate-800/40 border border-white/25 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:bg-white/50'
                          }`}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Launch CTA Button */}
              <button
                type="button"
                onClick={handleStart}
                className="w-full py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white font-black text-sm sm:text-base shadow-xl shadow-indigo-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles size={18} />
                <span>Bắt đầu cuộc trò chuyện cùng {scenario.partner.name}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ==================== 2. EVALUATING PHASE ====================
  if (phase === 'evaluating') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-transparent text-slate-800 dark:text-white">
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="relative w-24 h-24 rounded-3xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center shadow-2xl shadow-indigo-500/40 mb-6"
        >
          <Sparkles size={38} className="text-white animate-spin" style={{ animationDuration: '4s' }} />
        </motion.div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 text-center">
          AI Đang phân tích cuộc hội thoại...
        </h2>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 text-center max-w-md">
          Đang đánh giá ngữ pháp, từ vựng và độ trôi chảy phản xạ tự nhiên của bạn. Vui lòng đợi trong giây lát.
        </p>
      </div>
    );
  }

  // ==================== 3. RESULT PHASE ====================
  if (phase === 'result' && evaluation) {
    const score = evaluation.score || 85;

    return (
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-transparent text-slate-800 dark:text-white hide-scrollbar">
        <div className="max-w-3xl mx-auto space-y-6 pb-12">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="text-indigo-500" />
              <span>Đánh giá kết quả phản xạ</span>
            </h1>
            <button
              type="button"
              onClick={() => navigate('/speaking')}
              className="px-4 py-2 rounded-xl bg-white/30 dark:bg-slate-800/40 border border-white/35 dark:border-white/10 text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-white/50 cursor-pointer"
            >
              Hoàn thành
            </button>
          </div>

          {/* Hero Result Glass Card */}
          <div className="rounded-3xl p-6 sm:p-8 backdrop-blur-2xl bg-white/35 dark:bg-slate-900/45 border border-white/40 dark:border-white/10 shadow-2xl relative overflow-hidden space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 border-b border-white/20 dark:border-white/10 pb-6">
              {/* Score Dial */}
              <div className="relative w-36 h-36 shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="8" />
                  <motion.circle
                    initial={{ strokeDasharray: '0 1000' }}
                    animate={{ strokeDasharray: `${(score / 100) * 276} 1000` }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-slate-900 dark:text-white tabular-nums">{score}</span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500 dark:text-cyan-400">Điểm tổng</span>
                </div>
              </div>

              {/* Feedback Summary */}
              <div className="space-y-2 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-black">
                  <CheckCircle2 size={14} />
                  <span>{score >= 80 ? 'Phản xạ giao tiếp rất tốt!' : 'Hoàn thành buổi luyện tập!'}</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Nhận xét từ đối tác {scenario.partner.name}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {evaluation.feedback}
                </p>
              </div>
            </div>

            {/* Strengths & Improvements Columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Strengths */}
              <div className="rounded-2xl p-4 sm:p-5 bg-emerald-500/10 border border-emerald-500/25 space-y-3">
                <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 size={16} />
                  <span>Điểm mạnh ghi nhận</span>
                </h4>
                <ul className="space-y-2">
                  {(evaluation.strengths || ['Phát âm rõ ràng', 'Duy trì hội thoại tốt']).map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-200 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Improvements */}
              <div className="rounded-2xl p-4 sm:p-5 bg-amber-500/10 border border-amber-500/25 space-y-3">
                <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  <TrendingUp size={16} />
                  <span>Điểm cần cải thiện</span>
                </h4>
                <ul className="space-y-2">
                  {(evaluation.improvements || ['Thử nối âm tự nhiên hơn']).map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 dark:text-slate-200 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-white/20 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  setPhase('intro');
                  setMessages([]);
                  setEvaluation(null);
                  setIsEnded(false);
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/40 dark:bg-slate-800/40 border border-white/40 dark:border-white/10 text-xs font-black text-slate-800 dark:text-white hover:bg-white/60 cursor-pointer shadow-sm"
              >
                <RotateCcw size={15} />
                <span>Luyện lại tình huống này</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/speaking')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white text-xs font-black hover:shadow-lg transition-all cursor-pointer shadow-md shadow-indigo-500/25"
              >
                <span>Khám phá tình huống khác</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== 4. CHAT PHASE (ACTIVE STUDIO) ====================
  return (
    <div className="flex flex-1 min-h-0 w-full flex-col bg-transparent text-slate-800 dark:text-white h-full overflow-hidden p-2 sm:p-4 lg:p-5 max-w-5xl mx-auto gap-3 relative">
      {/* 1. TOPBAR STUDIO DOCK */}
      <header className="relative z-30 flex items-center justify-between gap-3 p-3 sm:px-5 rounded-2xl sm:rounded-3xl backdrop-blur-2xl bg-white/30 dark:bg-slate-900/40 border border-white/35 dark:border-white/10 shadow-lg shadow-black/5 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => {
              if (window.speechSynthesis) window.speechSynthesis.cancel();
              navigate('/speaking');
            }}
            className="flex items-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-slate-800/50 hover:text-indigo-600 dark:hover:text-cyan-400 transition-all cursor-pointer"
          >
            <ChevronLeft size={18} />
            <span className="hidden sm:inline">Thoát</span>
          </button>

          <div className="h-5 w-px bg-white/20 dark:bg-white/10 shrink-0" />

          {/* Partner Avatar & Status */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center font-black text-sm shadow-md">
                {scenario.partner.initial}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${isAISpeaking ? 'bg-indigo-500 animate-ping' : 'bg-emerald-500'}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                  {scenario.partner.name}
                </h2>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md font-extrabold bg-indigo-500/15 text-indigo-700 dark:text-cyan-300 border border-indigo-500/30">
                  {scenario.level}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-semibold">
                {scenario.partner.role} • {selectedVoice.name} ({selectedVoice.accent})
              </p>
            </div>
          </div>
        </div>

        {/* Right Action: End Session */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleEndSession}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white text-xs font-black shadow-md shadow-indigo-500/25 hover:shadow-lg transition-all cursor-pointer"
          >
            <CheckCircle2 size={14} />
            <span className="hidden sm:inline">Kết thúc & Chấm điểm</span>
            <span className="sm:hidden">Kết thúc</span>
          </button>
        </div>
      </header>

      {/* 2. CHAT STREAM CONTAINER */}
      <section className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-4 hide-scrollbar min-h-0">
        {/* Scenario Context Banner */}
        <div className="rounded-2xl p-3 sm:p-4 backdrop-blur-xl bg-white/20 dark:bg-slate-800/25 border border-white/25 dark:border-white/5 text-center">
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-cyan-400">
            Tình huống: {scenario.title}
          </span>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
            {scenario.description}
          </p>
        </div>

        {/* Message Bubbles */}
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            {msg.role === 'ai' ? (
              <div className="space-y-1.5 max-w-[90%] sm:max-w-[80%]">
                {/* AI Bubble */}
                <div className="rounded-2xl rounded-tl-sm p-3.5 sm:p-4 backdrop-blur-xl bg-white/40 dark:bg-slate-800/50 border border-white/35 dark:border-white/10 text-slate-800 dark:text-slate-100 shadow-xs leading-relaxed font-medium text-sm sm:text-base">
                  {msg.content === '' ? (
                    <div className="flex gap-1.5 items-center h-5 py-1">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                    </div>
                  ) : (
                    <>
                      <div>{msg.content}</div>
                      {msg.translation && (
                        <div className="mt-2.5 pt-2.5 border-t border-white/25 dark:border-white/10 text-xs sm:text-sm text-indigo-700 dark:text-cyan-300 font-semibold italic">
                          {msg.translation}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* AI Bubble Actions */}
                {msg.content && (
                  <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 pl-1">
                    <button
                      type="button"
                      onClick={() => playAudio(msg.content)}
                      className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
                    >
                      <RotateCcw size={12} />
                      <span>Nghe lại</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTranslateMessage(idx, msg.content)}
                      disabled={msg.isTranslating}
                      className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-cyan-400 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {msg.isTranslating ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />}
                      <span>Dịch nghĩa</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* User Bubble */
              <div className="flex justify-end">
                <div className="max-w-[90%] sm:max-w-[80%] rounded-2xl rounded-br-sm p-3.5 sm:p-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-medium text-sm sm:text-base shadow-lg shadow-indigo-500/20 leading-relaxed">
                  {msg.content}
                </div>
              </div>
            )}
          </motion.div>
        ))}

        {isAIThinking && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-white/20 dark:bg-slate-800/20 border border-white/20 text-xs font-bold text-slate-500 dark:text-slate-400 w-fit">
            <Loader2 size={14} className="animate-spin text-indigo-500" />
            <span>{scenario.partner.name} đang suy nghĩ câu trả lời...</span>
          </div>
        )}

        <div ref={messagesEndRef} className="h-2" />
      </section>

      {/* 3. STUDIO INTERACTION DOCK */}
      <footer className="rounded-2xl sm:rounded-3xl backdrop-blur-2xl bg-white/30 dark:bg-slate-900/40 border border-white/35 dark:border-white/10 p-3 sm:p-4 shadow-lg shadow-black/5 shrink-0 space-y-3">
        {/* Suggestion Chips */}
        {suggestions.length > 0 && !isEnded && (
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar py-0.5">
            <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-cyan-400 shrink-0">
              <Target size={12} />
              <span>Gợi ý:</span>
            </span>
            {suggestions.map((word, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSuggestionClick(word)}
                disabled={isAIThinking}
                className="shrink-0 px-3 py-1.5 rounded-xl backdrop-blur-md bg-white/40 dark:bg-slate-800/40 border border-white/40 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-cyan-300 transition-all cursor-pointer shadow-xs disabled:opacity-40"
              >
                {word}
              </button>
            ))}
          </div>
        )}

        {/* Main Microphone Interaction */}
        {isEnded ? (
          <div className="flex flex-col items-center justify-center py-2 text-center gap-2">
            <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              Cuộc trò chuyện đã hoàn thành!
            </p>
            <button
              type="button"
              onClick={() => setPhase('evaluating')}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white text-xs font-black shadow-md shadow-indigo-500/25 cursor-pointer"
            >
              Xem báo cáo đánh giá
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2">
            {/* Dynamic Waveform & Mic Button */}
            <div className="relative flex items-center justify-center">
              {isRecording && (
                <>
                  <span className="absolute w-28 h-28 rounded-full bg-red-500/20 animate-ping pointer-events-none" style={{ animationDuration: '1.8s' }} />
                  <span className="absolute w-24 h-24 rounded-full bg-red-500/30 animate-pulse pointer-events-none" />
                </>
              )}

              <button
                type="button"
                onClick={toggleRecording}
                disabled={isAIThinking}
                className={`relative z-10 w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center text-white transition-all duration-300 shadow-xl cursor-pointer ${
                  isRecording
                    ? 'scale-110 bg-gradient-to-tr from-red-600 to-rose-500 shadow-red-500/50 ring-4 ring-red-500/30'
                    : isAIThinking
                    ? 'bg-slate-400 dark:bg-slate-700 opacity-60 cursor-wait'
                    : 'bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-600 shadow-indigo-600/35 hover:scale-105 active:scale-95'
                }`}
                title="Bấm hoặc nhấn Space để nói"
              >
                {isRecording ? (
                  <Square size={24} className="fill-current animate-pulse" />
                ) : (
                  <Mic size={28} />
                )}
              </button>
            </div>

            {/* Live Audio Waves Bars when recording */}
            {isRecording && (
              <div className="flex items-center gap-1 mt-1">
                {[10, 22, 34, 16, 38, 24, 42, 18, 32, 20].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-gradient-to-t from-red-500 to-pink-400 animate-pulse"
                    style={{
                      height: `${h}px`,
                      animationDuration: `${0.4 + (i % 4) * 0.15}s`,
                    }}
                  />
                ))}
                <span className="ml-2 font-mono text-xs font-black text-red-500 tabular-nums">
                  {formatTime(recordingTime)}
                </span>
              </div>
            )}

            {/* Status text & Spacebar ergonomic pill */}
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              <span>
                {isRecording
                  ? 'Đang lắng nghe giọng bạn...'
                  : isAIThinking
                  ? 'AI đang suy nghĩ...'
                  : 'Bấm Mic hoặc nhấn Space để bắt đầu nói'}
              </span>
              <kbd className="hidden sm:inline px-1.5 py-0.5 rounded bg-white/60 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px]">
                Space
              </kbd>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}
