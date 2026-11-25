import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronLeft,
  Headphones,
  Lightbulb,
  List,
  Loader2,
  Mic,
  MicOff,
  MonitorPlay,
  Pause,
  Play,
  Radio,
  Repeat,
  RotateCcw,
  Settings,
  SkipBack,
  SkipForward,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePracticeSessionTimer } from '../lib/practiceActivity';
import { useLocale } from '../contexts/LocaleContext';
import { supabase } from '../lib/supabaseClient';
import LessonMediaPlayer from './LessonMediaPlayer';
import { useAudioRecorder } from '../lib/useAudioRecorder';
import { transcribeAudio } from '../lib/gemini';
import { usePlatform } from '../hooks/usePlatform';
import { playWordAudio } from '../lib/audioService';

const QUALITY_LABELS = {
  default: 'Auto',
  small: '240p',
  medium: '360p',
  large: '480p',
  hd720: '720p',
  hd1080: '1080p',
  highres: '1440p+',
};

const COPY = {
  vi: {
    back: 'Quay lại',
    dictation: 'Chép chính tả',
    shadowing: 'Luyện nhại',
    volume: 'Âm lượng',
    settings: 'Cài đặt',
    videoQuality: 'Chất lượng video',
    auto: 'Tự động',
    previousSentence: 'Câu trước (Alt+←)',
    replaySentence: 'Nghe lại câu gốc (Tab / R)',
    play: 'Phát video (Ctrl+Space)',
    pause: 'Tạm dừng (Ctrl+Space)',
    loopSentence: 'Lặp lại câu',
    nextSentence: 'Câu tiếp (Enter)',
    autoNext: 'Tự chuyển câu',
    startRecording: 'Chạm mic để bắt đầu nói',
    stopRecording: 'Chạm để dừng thu âm',
    listening: 'Đang lắng nghe... Nói nhại theo câu mẫu',
    transcribing: 'Đang phân tích phát âm với AI...',
    spoken: 'Kết quả nhận diện',
    correct: 'Chuẩn xác',
    completed: 'Đã hoàn thành',
    notRecorded: 'Chưa thu âm',
    recordToCheck: 'Thu âm để AI phân tích và chấm điểm ngữ điệu',
    said: (word) => `Bạn nói: "${word}"`,
    notRecognized: 'Chưa nhận diện từ này',
    extraWord: 'Từ nói thêm / từ đệm',
    transcript: 'Bản chép lời',
    lessonHints: 'Gợi ý bài học',
    sameLevel: (level) => `Bài cùng cấp độ ${level || ''}`.trim(),
    sameLevelDescription: 'Chọn một bài khác có độ khó tương đương để tiếp tục luyện phản xạ nói.',
    loadingHints: 'Đang tìm bài phù hợp...',
    noHints: 'Chưa có bài khác cùng cấp độ.',
    startLesson: 'Mở bài',
    retrySentence: 'Luyện lại câu này',
    sentence: 'Câu',
    browserUnsupported: 'Trình duyệt này chưa hỗ trợ nhận diện giọng nói. Vui lòng dùng Chrome hoặc Edge.',
    clickToListenWord: 'Bấm vào từ để nghe phát âm & xem nghĩa nhanh',
    listenNative: 'Nghe câu gốc (Tab)',
    listenYourVoice: 'Nghe giọng bạn vừa nói (P)',
    scoreLabel: 'Điểm phát âm',
    excellent: 'Xuất sắc! Phát âm rất chuẩn',
    good: 'Khá tốt! Đạt chuẩn phản xạ',
    needsPractice: 'Cần luyện thêm để đạt chuẩn ≥80%',
    pressEnterToNext: 'Đạt chuẩn! Nhấn Enter để qua câu tiếp',
    celebrationTitle: 'Chúc mừng! Hoàn thành 100% bài luyện nhại',
    celebrationDesc: 'Bạn đã hoàn thành xuất sắc tất cả các câu trong bài học này!',
    replayAll: 'Luyện lại từ đầu',
    nextLesson: 'Chọn bài khác',
    close: 'Đóng',
    segmentDuration: 'Thời lượng câu',
  },
  en: {
    back: 'Back',
    dictation: 'Dictation',
    shadowing: 'Shadowing',
    volume: 'Volume',
    settings: 'Player settings',
    videoQuality: 'Video quality',
    auto: 'Auto',
    previousSentence: 'Previous (Alt+←)',
    replaySentence: 'Replay native (Tab / R)',
    play: 'Play (Ctrl+Space)',
    pause: 'Pause (Ctrl+Space)',
    loopSentence: 'Loop sentence',
    nextSentence: 'Next sentence (Enter)',
    autoNext: 'Auto-next',
    startRecording: 'Tap mic to start speaking',
    stopRecording: 'Tap to stop recording',
    listening: 'Listening... Shadow along with the speaker',
    transcribing: 'Analyzing pronunciation with AI...',
    spoken: 'Recognition result',
    correct: 'Accurate',
    completed: 'Completed',
    notRecorded: 'Not recorded',
    recordToCheck: 'Record yourself to analyze and score speech',
    said: (word) => `You said: "${word}"`,
    notRecognized: 'Word not recognized',
    extraWord: 'Extra word spoken',
    transcript: 'Transcript',
    lessonHints: 'Lesson hints',
    sameLevel: (level) => `More ${level || ''} lessons`.trim(),
    sameLevelDescription: 'Choose another lesson at a similar difficulty to keep practicing speaking.',
    loadingHints: 'Finding suitable lessons...',
    noHints: 'No other lessons at this level yet.',
    startLesson: 'Open lesson',
    retrySentence: 'Retry this sentence',
    sentence: 'Sentence',
    browserUnsupported: 'Your browser does not support speech recognition. Please use Chrome or Edge.',
    clickToListenWord: 'Click word to hear pronunciation & quick meaning',
    listenNative: 'Listen to native (Tab)',
    listenYourVoice: 'Listen to your voice (P)',
    scoreLabel: 'Speech Score',
    excellent: 'Excellent! Very accurate',
    good: 'Good! Reflex standard met',
    needsPractice: 'Needs practice to reach ≥80%',
    pressEnterToNext: 'Standard met! Press Enter to advance',
    celebrationTitle: 'Awesome! 100% Shadowing Completed',
    celebrationDesc: 'You have mastered all sentences in this lesson!',
    replayAll: 'Practice from start',
    nextLesson: 'Try another lesson',
    close: 'Close',
    segmentDuration: 'Sentence duration',
  },
};

/**
 * Contraction equivalence mapping
 */
const CONTRACTIONS = {
  "it's": ['it', 'is'],
  "its": ['it', 'is'],
  "don't": ['do', 'not'],
  "doesn't": ['does', 'not'],
  "didn't": ['did', 'not'],
  "can't": ['cannot', 'can', 'not'],
  "won't": ['will', 'not'],
  "i'm": ['i', 'am'],
  "you're": ['you', 'are'],
  "we're": ['we', 'are'],
  "they're": ['they', 'are'],
  "that's": ['that', 'is'],
  "what's": ['what', 'is'],
  "there's": ['there', 'is'],
  "here's": ['here', 'is'],
  "let's": ['let', 'us'],
  "gonna": ['going', 'to'],
  "wanna": ['want', 'to'],
  "gotta": ['got', 'to'],
};

/**
 * US/UK spelling variants
 */
const SPELLING_VARIANTS = {
  kilometres: 'kilometers',
  kilometre: 'kilometer',
  metres: 'meters',
  metre: 'meter',
  centre: 'center',
  theatre: 'theater',
  colour: 'color',
  flavour: 'flavor',
  favourite: 'favorite',
  realise: 'realize',
  organise: 'organize',
  analyse: 'analyze',
  travelling: 'traveling',
  cancelled: 'canceled',
};

const normalizeWord = (value = '') => {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/[\u2018\u2019\u201A\u201B`]/g, "'")
    .replace(/[^a-z0-9']/gi, '')
    .trim();
};

const getCanonicalWord = (word = '') => {
  const norm = normalizeWord(word);
  return SPELLING_VARIANTS[norm] || norm;
};

const levenshtein = (a, b) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i += 1) matrix[i] = [i];
  for (let j = 0; j <= a.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i += 1) {
    for (let j = 1; j <= a.length; j += 1) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

const getSpeechWords = (value = '') =>
  (value || '')
    .trim()
    .split(/\s+/)
    .map((raw) => ({ raw, normalized: normalizeWord(raw), canonical: getCanonicalWord(raw) }))
    .filter((word) => word.normalized);

/**
 * Intelligent Fuzzy Token Alignment & Speech Scoring
 */
const buildSpeechComparison = (target = '', spoken = '') => {
  const targetWords = getSpeechWords(target);
  const spokenWords = getSpeechWords(spoken);

  if (!targetWords.length) {
    return {
      rows: [],
      extraWords: spokenWords,
      correctCount: 0,
      nearCount: 0,
      totalCount: 0,
      accuracy: 0,
      isComplete: false,
    };
  }

  const usedSpokenIndexes = new Set();
  const rows = [];

  // Match target words against spoken words with sliding forward window
  let searchWindowStart = 0;

  for (let i = 0; i < targetWords.length; i += 1) {
    const targetItem = targetWords[i];
    let bestSpokenIndex = -1;
    let bestMatchQuality = null; // 'exact' | 'variant' | 'near'

    // Look ahead within 4 positions
    const searchLimit = Math.min(spokenWords.length, searchWindowStart + 5);

    for (let j = searchWindowStart; j < searchLimit; j += 1) {
      if (usedSpokenIndexes.has(j)) continue;
      const spokenItem = spokenWords[j];

      // 1. Exact match
      if (spokenItem.normalized === targetItem.normalized) {
        bestSpokenIndex = j;
        bestMatchQuality = 'exact';
        break;
      }

      // 2. Canonical variant match (UK/US)
      if (spokenItem.canonical === targetItem.canonical) {
        bestSpokenIndex = j;
        bestMatchQuality = 'variant';
        break;
      }

      // 3. Contraction match
      const targetExp = CONTRACTIONS[targetItem.normalized];
      const spokenExp = CONTRACTIONS[spokenItem.normalized];
      if (
        (targetExp && targetExp.includes(spokenItem.normalized)) ||
        (spokenExp && spokenExp.includes(targetItem.normalized))
      ) {
        bestSpokenIndex = j;
        bestMatchQuality = 'variant';
        break;
      }

      // 4. Fuzzy Levenshtein match (distance <= 2 for words >= 4 chars, distance <= 1 for 3 chars)
      const dist = levenshtein(targetItem.canonical, spokenItem.canonical);
      const maxLen = Math.max(targetItem.canonical.length, spokenItem.canonical.length);
      if (dist <= 2 && dist / maxLen <= 0.35) {
        if (bestSpokenIndex === -1) {
          bestSpokenIndex = j;
          bestMatchQuality = 'near';
        }
      }
    }

    if (bestSpokenIndex !== -1) {
      usedSpokenIndexes.add(bestSpokenIndex);
      searchWindowStart = bestSpokenIndex + 1;
      const spokenItem = spokenWords[bestSpokenIndex];
      const isExact = bestMatchQuality === 'exact' || bestMatchQuality === 'variant';

      rows.push({
        key: `${targetItem.normalized}-${i}`,
        target: targetItem.raw,
        spoken: spokenItem.raw,
        status: isExact ? 'correct' : 'near',
      });
    } else {
      rows.push({
        key: `${targetItem.normalized}-${i}`,
        target: targetItem.raw,
        spoken: '',
        status: 'missing',
      });
    }
  }

  // Extra words not matched to target
  const extraWords = spokenWords.filter((_, idx) => !usedSpokenIndexes.has(idx));

  const correctCount = rows.filter((r) => r.status === 'correct').length;
  const nearCount = rows.filter((r) => r.status === 'near').length;
  const totalCount = targetWords.length;

  // Accuracy calculation: 1.0 for correct, 0.75 for near match
  const points = correctCount * 1.0 + nearCount * 0.75;
  const accuracy = totalCount > 0 ? Math.min(100, Math.round((points / totalCount) * 100)) : 0;

  // Passing threshold: >= 80% or all target words either correct/near
  const isComplete = accuracy >= 80 || (correctCount + nearCount === totalCount && totalCount > 0);

  return {
    rows,
    extraWords,
    correctCount,
    nearCount,
    totalCount,
    accuracy,
    isComplete,
  };
};

const formatTime = (seconds) => {
  if (!seconds || Number.isNaN(seconds)) return '00:00';
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
};

const formatSecondsDecimal = (seconds) => {
  const s = Math.max(0, Number(seconds) || 0);
  return `${s.toFixed(1)}s`;
};

/**
 * Web Audio API Success Chime
 */
const playSuccessChime = () => {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    // Web audio blocked
  }
};

/**
 * Text-to-speech for words using Shared Audio Service (Google Translate TTS + fallback)
 */
const speakWord = (wordText) => {
  if (!wordText) return;
  playWordAudio(wordText, 'en');
};

export default function VideoShadowingPlayer({ videoData, segments }) {
  const { user } = useAuth();
  const { locale } = useLocale();
  const navigate = useNavigate();
  const { isNative, isMobile } = usePlatform();
  const text = COPY[locale] || COPY.vi;

  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [autoNext, setAutoNext] = useState(true);
  const [completedSegments, setCompletedSegments] = useState(new Set());
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [sidebarTab, setSidebarTab] = useState('transcript');
  const [relatedLessons, setRelatedLessons] = useState([]);
  const [isLoadingHints, setIsLoadingHints] = useState(false);
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState('00:00');
  const [durationDisplay, setDurationDisplay] = useState('00:00');
  const [volume, setVolume] = useState(75);
  const [isVolumeMenuOpen, setIsVolumeMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [availableQualities, setAvailableQualities] = useState(['default']);
  const [quality, setQuality] = useState('default');
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);

  // User Voice Recorded Audio URL
  const [userAudioUrl, setUserAudioUrl] = useState(null);
  const [isUserAudioPlaying, setIsUserAudioPlaying] = useState(false);
  const userAudioElementRef = useRef(null);

  // Mini segment scrubber state
  const [segmentProgress, setSegmentProgress] = useState({ percent: 0, elapsed: 0, duration: 0 });

  usePracticeSessionTimer('shadowing', user, Boolean(videoData && segments.length > 0), isPlaying);

  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const hasResumedRef = useRef(false);
  const autoNextTimeoutRef = useRef(null);
  const completeCurrentSegmentRef = useRef(null);
  const currentSegmentAnswerRef = useRef('');
  const activeSentenceRef = useRef(null);

  const segment = segments[currentSegmentIndex] || segments[0];
  const segmentId = segment?.id;

  // Auto-scroll active sentence into view inside the desktop sidebar only
  useEffect(() => {
    if (activeSentenceRef.current && sidebarTab === 'transcript') {
      // Chỉ cuộn tự động trên màn hình Desktop (khi danh sách câu nằm cố định bên cột phải)
      // Trên Mobile (danh sách câu nằm ở cuối trang), không gọi scrollIntoView để tránh kéo giật màn hình làm mất khung Video & Mic
      if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
        activeSentenceRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [currentSegmentIndex, sidebarTab]);
  const segmentStartTime = segment?.start_time;
  const isCurrentSegmentCompleted = completedSegments.has(segmentId);

  useEffect(() => {
    currentSegmentAnswerRef.current = segment?.answer || '';
  }, [segment?.answer]);

  const [isTranscribing, setIsTranscribing] = useState(false);

  // Handle recorded audio completion
  const handleStopRecording = useCallback(async (audioData) => {
    setIsTranscribing(true);
    let transcript = '';

    if (audioData) {
      if (audioData.url) {
        setUserAudioUrl(audioData.url);
      }
      if (audioData.base64) {
        const inlineData = {
          mimeType: audioData.mimeType,
          data: audioData.base64.split(',')[1],
        };
        transcript = await transcribeAudio(inlineData);
      }
    }

    setIsTranscribing(false);
    setSpeechTranscript(transcript);

    if (currentSegmentAnswerRef.current && transcript) {
      const comp = buildSpeechComparison(currentSegmentAnswerRef.current, transcript);
      if (comp.isComplete) {
        completeCurrentSegmentRef.current?.();
      }
    }
  }, []);

  const { isRecording, startRecording, stopRecording } = useAudioRecorder({
    onStop: handleStopRecording,
  });

  const speechComparison = useMemo(() => {
    return buildSpeechComparison(segment?.answer, speechTranscript);
  }, [segment?.answer, speechTranscript]);

  const hasSpeechTranscript = speechTranscript.trim().length > 0;
  const isSpeechSuccess = speechComparison.isComplete;
  const isSpeechPanelSuccess = hasSpeechTranscript ? isSpeechSuccess : isCurrentSegmentCompleted;
  const progressPercent = segments.length
    ? Math.round((completedSegments.size / segments.length) * 100)
    : 0;

  // Smart Resume & fetch completed progress
  useEffect(() => {
    let cancelled = false;

    const fetchProgress = async () => {
      if (!user?.id || !videoData?.id) return;
      const { data, error } = await supabase
        .from('user_dictation_progress')
        .select('segment_id')
        .eq('user_id', user.id)
        .eq('video_id', videoData.id)
        .eq('is_completed', true);

      if (!cancelled && !error && data) {
        const completedSet = new Set(data.map((item) => item.segment_id));
        setCompletedSegments(completedSet);

        // Smart Resume: Auto-jump to the first uncompleted sentence
        if (!hasResumedRef.current && segments.length > 0) {
          hasResumedRef.current = true;
          const firstUncompletedIndex = segments.findIndex((seg) => !completedSet.has(seg.id));
          if (firstUncompletedIndex > 0) {
            setCurrentSegmentIndex(firstUncompletedIndex);
          }
        }
      }
    };

    fetchProgress();
    return () => {
      cancelled = true;
    };
  }, [user?.id, videoData?.id, segments]);

  // Fetch related lessons
  useEffect(() => {
    let cancelled = false;

    const fetchRelatedLessons = async () => {
      if (!videoData?.id || !videoData?.level) {
        setRelatedLessons([]);
        return;
      }

      setIsLoadingHints(true);
      const { data, error } = await supabase
        .from('dictation_videos')
        .select('id, title, thumbnail_url, level, category')
        .eq('level', videoData.level)
        .neq('id', videoData.id)
        .limit(6);

      if (!cancelled) {
        setRelatedLessons(error ? [] : data || []);
        setIsLoadingHints(false);
      }
    };

    fetchRelatedLessons();
    return () => {
      cancelled = true;
    };
  }, [videoData?.id, videoData?.level]);

  // Complete current segment callback
  const completeCurrentSegment = useCallback(() => {
    if (!segmentId) return;

    playSuccessChime();
    setCompletedSegments((previous) => {
      const next = new Set(previous);
      next.add(segmentId);
      if (next.size === segments.length && segments.length > 0) {
        setShowCelebrationModal(true);
      }
      return next;
    });

    if (user?.id && videoData?.id) {
      supabase
        .from('user_dictation_progress')
        .upsert(
          {
            user_id: user.id,
            video_id: videoData.id,
            segment_id: segmentId,
            is_completed: true,
          },
          { onConflict: 'user_id,segment_id' }
        )
        .then(({ error }) => {
          if (error) console.error('Unable to save shadowing progress:', error);
        });
    }

    if (autoNext && currentSegmentIndex < segments.length - 1) {
      if (autoNextTimeoutRef.current) clearTimeout(autoNextTimeoutRef.current);
      autoNextTimeoutRef.current = window.setTimeout(() => {
        setCurrentSegmentIndex((index) => index + 1);
      }, 1200);
    }
  }, [segmentId, autoNext, currentSegmentIndex, segments.length, user?.id, videoData?.id]);

  useEffect(() => {
    completeCurrentSegmentRef.current = completeCurrentSegment;
  }, [completeCurrentSegment]);

  // When segment changes: Reset recording & speech results, seek video
  useEffect(() => {
    if (!segmentId) return;
    setSpeechTranscript('');
    setUserAudioUrl(null);
    setIsUserAudioPlaying(false);
    if (userAudioElementRef.current) {
      userAudioElementRef.current.pause();
      userAudioElementRef.current = null;
    }
    if (isRecording) stopRecording();

    if (playerRef.current?.seekTo) {
      playerRef.current.seekTo(segmentStartTime, true);
      playerRef.current.playVideo();
    }

    return () => {
      if (autoNextTimeoutRef.current) clearTimeout(autoNextTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentId, segmentStartTime]);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const forceCaptionsOff = () => {
    const player = playerRef.current;
    if (!player) return;

    try {
      player.unloadModule?.('captions');
      player.unloadModule?.('cc');
      player.setOption?.('captions', 'track', {});
      player.setOption?.('captions', 'reload', false);
      player.setOption?.('captions', 'fontSize', -1);
    } catch {
      // Captions module safeguard
    }
  };

  const updateQualityOptions = () => {
    const levels = playerRef.current?.getAvailableQualityLevels?.() || [];
    setAvailableQualities(['default', ...levels.filter((level) => level !== 'default')]);
  };

  const onPlayerReady = (event) => {
    playerRef.current = event.target;
    event.target.setPlaybackRate(playbackRate);
    event.target.setVolume(volume);
    event.target.unMute?.();
    setDurationDisplay(formatTime(event.target.getDuration()));

    if (segment) {
      event.target.seekTo(segment.start_time, true);
      event.target.playVideo();
    }

    forceCaptionsOff();
    window.setTimeout(forceCaptionsOff, 500);
    window.setTimeout(forceCaptionsOff, 1500);
    window.setTimeout(updateQualityOptions, 300);
  };

  const checkTime = () => {
    if (!playerRef.current || !segment) return;
    const currentTime = playerRef.current.getCurrentTime();
    setCurrentTimeDisplay(formatTime(currentTime));
    forceCaptionsOff();

    // Segment progress tracking
    const segDuration = Math.max(0.1, segment.end_time - segment.start_time);
    const segElapsed = Math.max(0, Math.min(currentTime - segment.start_time, segDuration));
    const percent = Math.min(100, Math.max(0, (segElapsed / segDuration) * 100));
    setSegmentProgress({ percent, elapsed: segElapsed, duration: segDuration });

    if (currentTime >= segment.end_time) {
      if (isLooping) {
        playerRef.current.seekTo(segment.start_time, true);
      } else {
        playerRef.current.pauseVideo();
      }
    }
  };

  const onPlayerStateChange = (event) => {
    if (event.data === 1) {
      setIsPlaying(true);
      forceCaptionsOff();
      updateQualityOptions();
      if (!intervalRef.current) intervalRef.current = window.setInterval(checkTime, 100);
      return;
    }

    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handlePlayPause = () => {
    if (!playerRef.current || !segment) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
      return;
    }

    if (playerRef.current.getCurrentTime() >= segment.end_time) {
      playerRef.current.seekTo(segment.start_time, true);
    }
    playerRef.current.playVideo();
  };

  const replaySegment = useCallback(() => {
    if (!playerRef.current || !segment) return;
    playerRef.current.seekTo(segment.start_time, true);
    playerRef.current.playVideo();
  }, [segment]);

  const toggleRecording = useCallback(() => {
    if (isTranscribing) return;

    if (isRecording) {
      stopRecording();
      return;
    }

    setSpeechTranscript('');
    startRecording();
  }, [isTranscribing, isRecording, startRecording, stopRecording]);

  // Play user voice recording
  const playUserVoice = useCallback(() => {
    if (!userAudioUrl) return;

    if (isUserAudioPlaying && userAudioElementRef.current) {
      userAudioElementRef.current.pause();
      setIsUserAudioPlaying(false);
      return;
    }

    const audio = new Audio(userAudioUrl);
    userAudioElementRef.current = audio;
    setIsUserAudioPlaying(true);

    audio.onended = () => {
      setIsUserAudioPlaying(false);
      userAudioElementRef.current = null;
    };
    audio.onerror = () => {
      setIsUserAudioPlaying(false);
      userAudioElementRef.current = null;
    };

    audio.play().catch(() => {
      setIsUserAudioPlaying(false);
    });
  }, [userAudioUrl, isUserAudioPlaying]);

  const handleVolumeChange = (nextVolume) => {
    const normalizedVolume = Number(nextVolume);
    setVolume(normalizedVolume);
    playerRef.current?.setVolume?.(normalizedVolume);
    if (normalizedVolume > 0) playerRef.current?.unMute?.();
  };

  const changeSpeed = (speed) => {
    setPlaybackRate(speed);
    playerRef.current?.setPlaybackRate?.(speed);
  };

  const changeQuality = (nextQuality) => {
    setQuality(nextQuality);
    try {
      playerRef.current?.setPlaybackQuality?.(nextQuality);
    } catch {
      // Quality fallback
    }
  };

  const handleMiniScrub = (event) => {
    if (!segment || !playerRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = segment.start_time + ratio * (segment.end_time - segment.start_time);
    playerRef.current.seekTo(targetTime, true);
    if (!isPlaying) playerRef.current.playVideo();
  };

  // Reset segment with true database delete
  const resetSegment = async (event, targetSegmentId) => {
    event?.stopPropagation?.();
    setCompletedSegments((previous) => {
      const next = new Set(previous);
      next.delete(targetSegmentId);
      return next;
    });

    if (segmentId === targetSegmentId) {
      setSpeechTranscript('');
      setUserAudioUrl(null);
    }

    if (user?.id && videoData?.id) {
      try {
        await supabase
          .from('user_dictation_progress')
          .delete()
          .eq('user_id', user.id)
          .eq('segment_id', targetSegmentId);
      } catch (err) {
        console.error('Error deleting segment progress:', err);
      }
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;

      // Space: Toggle Recording
      if (e.code === 'Space') {
        e.preventDefault();
        toggleRecording();
        return;
      }

      // Tab or R: Replay native video segment
      if (e.key === 'Tab' || e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        replaySegment();
        return;
      }

      // P: Play user's recorded audio
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        playUserVoice();
        return;
      }

      // Enter: Advance to next sentence
      if (e.key === 'Enter') {
        e.preventDefault();
        if (currentSegmentIndex < segments.length - 1) {
          setCurrentSegmentIndex((i) => i + 1);
        }
        return;
      }

      // Alt + ArrowLeft: Prev sentence
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentSegmentIndex > 0) {
          setCurrentSegmentIndex((i) => i - 1);
        }
        return;
      }

      // Alt + ArrowRight: Next sentence
      if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentSegmentIndex < segments.length - 1) {
          setCurrentSegmentIndex((i) => i + 1);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleRecording, replaySegment, playUserVoice, currentSegmentIndex, segments.length]);

  const opts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      modestbranding: 1,
      rel: 0,
      iv_load_policy: 3,
      cc_load_policy: 0,
      cc_lang_pref: 'none',
      hl: 'en',
    },
  };

  // Target sentence words for Click-to-Listen TTS
  const sentenceWords = useMemo(() => {
    return (segment?.answer || '').trim().split(/\s+/).filter(Boolean);
  }, [segment?.answer]);

  return (
    <div 
      className="flex flex-1 min-h-0 w-full flex-col overflow-y-auto bg-transparent text-slate-800 dark:text-white lg:flex-row lg:h-full lg:overflow-hidden p-2 sm:p-4 lg:p-5 gap-3.5 lg:gap-5 max-w-[1700px] mx-auto pb-24 lg:pb-5 relative"
      style={{
        paddingTop: isNative ? 'max(env(safe-area-inset-top, 0px), 52px)' : 'max(env(safe-area-inset-top, 0px), 16px)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 80px)',
      }}
    >
      {/* LEFT COLUMN: CINEMA VIDEO & STUDIO INTERACTION AREA */}
      <section className="w-full shrink-0 lg:shrink flex min-w-0 flex-col lg:flex-1 gap-3.5 lg:overflow-y-auto pr-0 lg:pr-1 hide-scrollbar pb-4 lg:pb-6">
        {/* 1. TOPBAR DOCK */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 p-2.5 sm:p-3 sm:px-5 rounded-2xl sm:rounded-3xl backdrop-blur-2xl bg-white/70 dark:bg-slate-900/80 border border-white/50 dark:border-white/10 shadow-lg shadow-black/5">
          <Link
            to="/shadowing"
            className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-slate-800/50 hover:text-rose-500 transition-all cursor-pointer"
          >
            <ChevronLeft size={19} />
            <span>{text.back}</span>
          </Link>

          {/* Studio Mode Switcher */}
          <div className="flex items-center rounded-xl sm:rounded-2xl bg-white/25 dark:bg-slate-800/35 border border-white/30 dark:border-white/5 p-1 shadow-inner">
            <button
              type="button"
              onClick={() => navigate(`/dictation/${videoData?.id}`)}
              className="flex items-center gap-2 rounded-lg sm:rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white/40 dark:hover:bg-slate-800/60 transition-all cursor-pointer"
            >
              <Headphones size={16} />
              <span className="hidden sm:inline">{text.dictation}</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/25 px-3.5 py-1.5 text-xs sm:text-sm font-black transition-all"
            >
              <Mic size={16} />
              <span className="hidden sm:inline">{text.shadowing}</span>
            </button>
          </div>

          {/* Right Tools: Volume & Settings */}
          <div className="flex items-center gap-1.5">
            {/* Volume */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsVolumeMenuOpen((open) => !open);
                  setIsSettingsOpen(false);
                }}
                title={text.volume}
                aria-label={text.volume}
                className="rounded-xl p-2 text-slate-700 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-slate-800/50 hover:text-rose-500 transition-all cursor-pointer"
              >
                {volume === 0 ? <VolumeX size={19} /> : <Volume2 size={19} />}
              </button>
              {isVolumeMenuOpen && (
                <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-2xl border border-white/40 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="mb-3 flex items-center justify-between text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    <span>{text.volume}</span>
                    <span className="text-rose-500 font-extrabold">{volume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={volume}
                    onChange={(event) => handleVolumeChange(event.target.value)}
                    className="accent-rose-500 w-full cursor-pointer"
                    aria-label={text.volume}
                  />
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsSettingsOpen((open) => !open);
                  setIsVolumeMenuOpen(false);
                }}
                title={text.settings}
                aria-label={text.settings}
                className="rounded-xl p-2 text-slate-700 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-slate-800/50 hover:text-rose-500 transition-all cursor-pointer"
              >
                <Settings size={19} />
              </button>
              {isSettingsOpen && (
                <div className="absolute right-0 top-full z-40 mt-2 w-64 rounded-2xl border border-white/40 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                  <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    {text.videoQuality}
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {availableQualities.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => changeQuality(option)}
                        className={`rounded-xl px-2 py-2 text-xs font-bold transition-all cursor-pointer ${
                          quality === option
                            ? 'bg-rose-500 text-white shadow-md shadow-rose-500/25'
                            : 'bg-white/40 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        {option === 'default' ? text.auto : QUALITY_LABELS[option] || option}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* 2. CINEMA VIDEO PLAYER */}
        <div className="relative w-full shrink-0 overflow-hidden rounded-3xl border border-white/30 dark:border-white/10 bg-black shadow-2xl aspect-video max-h-[250px] sm:max-h-[290px] xl:max-h-[360px] 2xl:max-h-[420px]">
          <LessonMediaPlayer
            videoData={videoData}
            opts={opts}
            onReady={onPlayerReady}
            onStateChange={onPlayerStateChange}
            className="absolute inset-0 h-full w-full pointer-events-none"
          />
        </div>

        {/* 3. CONTROL DOCK + MINI SEGMENT SCRUBBER */}
        <div className="shrink-0 flex flex-col gap-2.5 sm:gap-3 rounded-2xl sm:rounded-3xl backdrop-blur-2xl bg-white/40 dark:bg-slate-900/50 border border-white/40 dark:border-white/10 p-3 sm:p-4 shadow-lg shadow-black/5">
          {/* Upper Row on Mobile (Time + Auto-Next) / Unified on Desktop */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 w-full">
            {/* Top row on mobile: Time on left, Auto-Next switch on right */}
            <div className="flex items-center justify-between w-full sm:w-auto gap-2">
              {/* Time Display */}
              <div className="shrink-0 whitespace-nowrap text-[11px] sm:text-xs font-black font-mono tabular-nums text-slate-800 dark:text-slate-100 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-white/30 dark:bg-slate-800/40 border border-white/30 dark:border-white/5 shadow-inner">
                {currentTimeDisplay} / {durationDisplay}
              </div>

              {/* Auto-Next Switch on Mobile (Never overflows!) */}
              <div className="sm:hidden">
                <button
                  type="button"
                  onClick={() => setAutoNext((v) => !v)}
                  title={text.autoNext}
                  className="flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/30 dark:bg-slate-800/40 border border-white/30 dark:border-white/5 font-bold text-xs text-slate-700 dark:text-slate-300 hover:text-rose-500 transition-colors cursor-pointer select-none"
                >
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{text.autoNext}:</span>
                  <span
                    className={`flex h-4 w-7 items-center rounded-full p-0.5 transition-colors ${
                      autoNext
                        ? 'bg-gradient-to-r from-rose-500 to-pink-500 shadow-sm shadow-rose-500/30'
                        : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${
                        autoNext ? 'translate-x-3' : 'translate-x-0'
                      }`}
                    />
                  </span>
                </button>
              </div>
            </div>

            {/* Central Transport Buttons (Always spacious, centered, touch-friendly) */}
            <div className="flex items-center justify-center gap-2 sm:gap-2.5 py-0.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => currentSegmentIndex > 0 && setCurrentSegmentIndex((i) => i - 1)}
                disabled={currentSegmentIndex === 0}
                title={text.previousSentence}
                className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-800/50 hover:text-rose-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-95"
              >
                <SkipBack size={20} />
              </button>

              <button
                type="button"
                onClick={replaySegment}
                title={text.replaySentence}
                className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-800/50 hover:text-rose-500 transition-all cursor-pointer active:scale-95"
              >
                <RotateCcw size={20} />
              </button>

              {/* Central Glowing Play/Pause */}
              <button
                type="button"
                onClick={handlePlayPause}
                title={isPlaying ? text.pause : text.play}
                className="flex h-12 w-12 sm:h-13 sm:w-13 items-center justify-center rounded-full bg-gradient-to-tr from-rose-500 via-rose-600 to-pink-500 text-white shadow-xl shadow-rose-500/35 hover:scale-105 active:scale-95 transition-all cursor-pointer mx-1 sm:mx-2 shrink-0"
              >
                {isPlaying ? <Pause size={22} className="fill-current" /> : <Play size={22} className="ml-0.5 fill-current" />}
              </button>

              <button
                type="button"
                onClick={() => setIsLooping((looping) => !looping)}
                title={text.loopSentence}
                className={`p-2 rounded-xl transition-all cursor-pointer active:scale-95 ${
                  isLooping
                    ? 'bg-rose-500/20 border border-rose-500/40 text-rose-500 shadow-md shadow-rose-500/10'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-800/50 hover:text-rose-500'
                }`}
              >
                <Repeat size={20} />
              </button>

              <button
                type="button"
                onClick={() => currentSegmentIndex < segments.length - 1 && setCurrentSegmentIndex((i) => i + 1)}
                disabled={currentSegmentIndex === segments.length - 1}
                title={text.nextSentence}
                className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-800/50 hover:text-rose-500 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer active:scale-95"
              >
                <SkipForward size={20} />
              </button>
            </div>

            {/* Auto-Next Switch on Desktop */}
            <div className="hidden sm:flex shrink-0">
              <button
                type="button"
                onClick={() => setAutoNext((v) => !v)}
                title={text.autoNext}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/30 dark:bg-slate-800/40 border border-white/30 dark:border-white/5 font-bold text-xs text-slate-700 dark:text-slate-300 hover:text-rose-500 transition-colors cursor-pointer select-none"
              >
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">{text.autoNext}:</span>
                <span
                  className={`flex h-5 w-8 items-center rounded-full p-0.5 transition-colors ${
                    autoNext
                      ? 'bg-gradient-to-r from-rose-500 to-pink-500 shadow-sm shadow-rose-500/30'
                      : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                      autoNext ? 'translate-x-3.5' : 'translate-x-0'
                    }`}
                  />
                </span>
              </button>
            </div>
          </div>

          {/* Mini Segment Progress Scrubber */}
          <div className="relative flex flex-col gap-1 px-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>{text.segmentDuration}:</span>
                <span className="font-mono text-slate-700 dark:text-slate-200 font-extrabold">
                  {formatSecondsDecimal(segmentProgress.elapsed)} / {formatSecondsDecimal(segmentProgress.duration)}
                </span>
              </span>
              <span className="font-mono text-rose-500 font-bold">
                {Math.round(segmentProgress.percent)}%
              </span>
            </div>
            <div
              role="slider"
              aria-valuenow={Math.round(segmentProgress.percent)}
              aria-valuemin="0"
              aria-valuemax="100"
              onClick={handleMiniScrub}
              className="group relative h-2.5 w-full cursor-pointer rounded-full bg-slate-200/70 dark:bg-slate-800/80 overflow-hidden shadow-inner"
              title="Nhấp để tua nhanh trong phạm vi câu hiện tại"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-500 via-pink-400 to-purple-500 transition-all duration-100 relative"
                style={{ width: `${segmentProgress.percent}%` }}
              />
            </div>
          </div>

          {/* Sentence Tracker + Speed Pills */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/20 dark:border-white/10 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300">
              <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 font-black">
                {text.sentence} {currentSegmentIndex + 1}/{segments.length}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                ({progressPercent}% hoàn thành)
              </span>
            </div>

            {/* Speed Pills */}
            <div className="flex items-center gap-0.5 sm:gap-1 rounded-xl bg-white/20 dark:bg-slate-800/30 border border-white/25 dark:border-white/5 p-0.5 sm:p-1 font-black shrink-0">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider px-1 hidden sm:inline">Tốc độ:</span>
              {[0.5, 0.75, 1, 1.25, 1.5].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => changeSpeed(speed)}
                  className={`rounded-lg px-1.5 sm:px-2.5 py-1 text-[11px] sm:text-xs transition-all cursor-pointer ${
                    playbackRate === speed
                      ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/30'
                      : 'text-slate-600 dark:text-slate-300 hover:text-rose-500 hover:bg-white/40 dark:hover:bg-slate-700/40'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4. SHADOWING REFLEX STUDIO CONSOLE */}
        <div className="shrink-0 p-4 sm:p-5 rounded-3xl backdrop-blur-2xl bg-white/30 dark:bg-slate-900/40 border border-white/35 dark:border-white/10 shadow-lg shadow-black/5 flex flex-col items-center gap-4">
          {/* Click-to-Listen Target Sentence */}
          <div className="w-full text-center">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-center gap-1.5">
              <Sparkles size={14} className="text-rose-500" />
              <span>{text.clickToListenWord}</span>
            </p>

            <div className={`p-4 rounded-2xl border transition-all ${
              isCurrentSegmentCompleted
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
                : 'bg-white/40 dark:bg-slate-800/40 border-white/40 dark:border-white/5 text-slate-900 dark:text-white'
            }`}>
              <div className="flex flex-wrap items-center justify-center gap-1.5 text-lg sm:text-xl md:text-2xl font-bold leading-relaxed">
                {sentenceWords.map((word, wIdx) => (
                  <button
                    key={`target-word-${wIdx}-${word}`}
                    type="button"
                    onClick={() => {
                      speakWord(word);
                      const clean = word.replace(/[^a-zA-Z]/g, '').trim();
                      if (clean) {
                        window.dispatchEvent(new CustomEvent('quick-word:open', { detail: { word: clean } }));
                      }
                    }}
                    title={`Click để nghe phát âm & tra nghĩa "${word}"`}
                    className="rounded-lg px-2 py-0.5 transition-all hover:bg-rose-500/20 hover:text-rose-600 dark:hover:text-rose-300 hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    {word}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Studio Recording Mic Button with Dynamic Audio Wave Bars */}
          <div className="relative flex flex-col items-center justify-center my-1">
            <button
              type="button"
              onClick={toggleRecording}
              disabled={isTranscribing}
              className={`relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full text-white transition-all cursor-pointer ${
                isTranscribing
                  ? 'bg-slate-400 dark:bg-slate-700 cursor-wait'
                  : isRecording
                  ? 'bg-gradient-to-tr from-rose-600 to-red-500 shadow-xl shadow-rose-600/40'
                  : 'bg-gradient-to-tr from-rose-500 via-rose-600 to-pink-500 shadow-xl shadow-rose-500/35 hover:scale-105 hover:shadow-2xl hover:shadow-rose-500/50'
              }`}
            >
              {isTranscribing ? (
                <Loader2 size={36} className="animate-spin" />
              ) : isRecording ? (
                <MicOff size={36} />
              ) : (
                <Mic size={36} />
              )}
            </button>

            <p className="mt-2 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 text-center">
              {isTranscribing
                ? text.transcribing
                : isRecording
                ? text.listening
                : (isNative || isMobile)
                ? (locale === 'en' ? 'Tap mic to start speaking' : 'Chạm mic để bắt đầu nói')
                : text.startRecording}
            </p>
          </div>

          {/* Dual Audio Listen Dock */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={replaySegment}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/40 dark:bg-slate-800/40 border border-white/40 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-rose-500 hover:bg-white/60 dark:hover:bg-slate-700/60 transition-all cursor-pointer shadow-xs"
            >
              <RotateCcw size={14} />
              <span>{(isNative || isMobile) ? (locale === 'en' ? 'Listen native' : 'Nghe câu gốc') : text.listenNative}</span>
            </button>

            {userAudioUrl && (
              <button
                type="button"
                onClick={playUserVoice}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-xs ${
                  isUserAudioPlaying
                    ? 'bg-rose-500 text-white border-rose-500 ring-2 ring-rose-500/20 shadow-md'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-300 hover:bg-rose-500/20'
                }`}
              >
                {isUserAudioPlaying ? <Pause size={14} /> : <Play size={14} />}
                <span>{(isNative || isMobile) ? (locale === 'en' ? 'Your voice' : 'Nghe giọng bạn') : text.listenYourVoice}</span>
              </button>
            )}
          </div>

          {/* FUZZY SPEECH COMPARISON & SCORE METER */}
          <div className="w-full max-w-3xl mt-1">
            <div
              className={`rounded-2xl border p-4 transition-all ${
                isSpeechPanelSuccess
                  ? 'border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/5'
                  : hasSpeechTranscript
                  ? 'border-rose-500/20 bg-white/50 dark:bg-slate-800/50'
                  : 'border-white/30 dark:border-white/10 bg-white/20 dark:bg-slate-800/20'
              }`}
            >
              {/* Score & Status Header */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/20 dark:border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {text.spoken}
                  </span>
                  {hasSpeechTranscript && (
                    <span className="text-xs font-mono font-black text-rose-600 dark:text-rose-300">
                      {text.scoreLabel}: {speechComparison.accuracy}%
                    </span>
                  )}
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-black flex items-center gap-1.5 ${
                    isSpeechPanelSuccess
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                      : hasSpeechTranscript
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                      : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {isSpeechPanelSuccess ? (
                    <>
                      <CheckCircle2 size={13} />
                      <span>{speechComparison.accuracy >= 90 ? text.excellent : text.good}</span>
                    </>
                  ) : hasSpeechTranscript ? (
                    <span>{text.needsPractice}</span>
                  ) : (
                    <span>{isCurrentSegmentCompleted ? text.completed : text.notRecorded}</span>
                  )}
                </span>
              </div>

              {/* Token Comparison Diff */}
              <div className="flex min-h-10 flex-wrap items-center justify-center gap-1.5 text-sm sm:text-base font-semibold">
                {hasSpeechTranscript ? (
                  <>
                    {speechComparison.rows.map((row) => (
                      <span
                        key={row.key}
                        title={row.spoken ? text.said(row.spoken) : text.notRecognized}
                        className={`rounded-lg px-2.5 py-1 transition-all flex items-center gap-1 ${
                          row.status === 'correct'
                            ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30'
                            : row.status === 'near'
                            ? 'bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/25 line-through opacity-75'
                        }`}
                      >
                        <span>{row.spoken || row.target}</span>
                      </span>
                    ))}

                    {/* Extra spoken words */}
                    {speechComparison.extraWords.map((word, index) => (
                      <span
                        key={`extra-${word.normalized}-${index}`}
                        title={text.extraWord}
                        className="rounded-lg bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 px-2.5 py-1 text-xs"
                      >
                        +{word.raw}
                      </span>
                    ))}
                  </>
                ) : (
                  <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 py-1">
                    {isTranscribing
                      ? text.transcribing
                      : isRecording
                      ? text.listening
                      : text.recordToCheck}
                  </span>
                )}
              </div>

              {/* Press Enter hint when successful */}
              {isSpeechPanelSuccess && autoNext && (
                <p className="mt-2 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-pulse">
                  {text.pressEnterToNext}
                </p>
              )}
            </div>
          </div>

          {/* Ergonomic Shortcut Pill Hint (Desktop keyboard shortcuts, hidden on mobile / native app) */}
          {!isNative && !isMobile && (
            <div className="hidden sm:flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span className="flex items-center gap-1 font-medium">
                <kbd className="px-1.5 py-0.5 rounded bg-white/60 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px]">
                  Space
                </kbd>
                <span>Bật/Tắt Mic</span>
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="flex items-center gap-1 font-medium">
                <kbd className="px-1.5 py-0.5 rounded bg-white/60 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px]">
                  Tab
                </kbd>
                <span>Nghe mẫu</span>
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="flex items-center gap-1 font-medium">
                <kbd className="px-1.5 py-0.5 rounded bg-white/60 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px]">
                  P
                </kbd>
                <span>Nghe giọng bạn</span>
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="flex items-center gap-1 font-medium">
                <kbd className="px-1.5 py-0.5 rounded bg-white/60 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px]">
                  Enter
                </kbd>
                <span>Câu tiếp</span>
              </span>
            </div>
          )}
        </div>
      </section>

      {/* RIGHT COLUMN: SIDEBAR */}
      <aside className="flex w-full shrink-0 flex-col rounded-3xl backdrop-blur-2xl bg-white/30 dark:bg-slate-900/40 border border-white/35 dark:border-white/10 shadow-lg shadow-black/5 lg:w-[390px] xl:w-[420px] overflow-hidden min-h-[450px] lg:min-h-0 lg:h-full">
        {/* Segmented Tabs */}
        <div className="flex items-center gap-2 border-b border-white/20 dark:border-white/10 p-2.5 sm:p-3">
          <button
            type="button"
            onClick={() => setSidebarTab('transcript')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              sidebarTab === 'transcript'
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/25'
                : 'text-slate-600 dark:text-slate-300 hover:text-rose-500 hover:bg-white/40 dark:hover:bg-slate-800/40'
            }`}
          >
            <List size={16} />
            <span>{text.transcript} ({completedSegments.size}/{segments.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSidebarTab('hints')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              sidebarTab === 'hints'
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/25'
                : 'text-slate-600 dark:text-slate-300 hover:text-rose-500 hover:bg-white/40 dark:hover:bg-slate-800/40'
            }`}
          >
            <Lightbulb size={16} />
            <span>{text.lessonHints}</span>
          </button>
        </div>

        {sidebarTab === 'transcript' ? (
          <>
            {/* Progress Strip */}
            <div className="border-b border-white/20 dark:border-white/10 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-black">
                <span className="text-slate-700 dark:text-slate-300">
                  {completedSegments.size} / {segments.length} câu hoàn thành
                </span>
                <span className="text-rose-500 text-sm font-black">
                  {progressPercent}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-800/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Scrollable Sentence List (flex-1 overflow-y-auto KHÔNG BỊ TRÀN) */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2 hide-scrollbar">
              {segments.map((item, index) => {
                const isActive = index === currentSegmentIndex;
                const isCompleted = completedSegments.has(item.id);
                const durationSec = Math.max(0, item.end_time - item.start_time);

                return (
                  <div
                    key={item.id}
                    ref={isActive ? activeSentenceRef : null}
                    className={`group relative rounded-2xl border transition-all ${
                      isActive
                        ? 'border-rose-500/40 bg-rose-500/15 shadow-md shadow-rose-500/10 ring-2 ring-rose-500/20'
                        : isCompleted
                        ? 'border-white/20 dark:border-white/5 bg-white/20 dark:bg-slate-800/20 hover:bg-white/40 dark:hover:bg-slate-800/40'
                        : 'border-transparent hover:bg-white/30 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setCurrentSegmentIndex(index)}
                      className="flex w-full items-start gap-3 p-3 pr-16 text-left cursor-pointer"
                    >
                      <span
                        className={`mt-0.5 shrink-0 ${
                          isCompleted
                            ? 'text-emerald-500'
                            : isActive
                            ? 'text-rose-500'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 size={18} />
                        ) : (
                          <span className="block h-[18px] w-[18px] rounded-full border-2 border-current" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="mb-0.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          <span>
                            {text.sentence} {index + 1}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">
                            ({formatSecondsDecimal(durationSec)})
                          </span>
                        </span>
                        <span
                          className={`block text-xs sm:text-sm font-medium leading-relaxed ${
                            isCompleted
                              ? 'text-slate-700 dark:text-slate-200'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {item.answer}
                        </span>
                      </span>
                    </button>

                    {/* Item Quick Actions */}
                    <div className="absolute right-2 top-2.5 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          speakWord(item.answer);
                        }}
                        title="Nghe câu này"
                        className="rounded-lg p-1.5 text-slate-400 hover:text-rose-500 hover:bg-white/40 dark:hover:bg-slate-700/50 transition-all cursor-pointer"
                      >
                        <Volume2 size={14} />
                      </button>

                      {isCompleted && (
                        <button
                          type="button"
                          onClick={(event) => resetSegment(event, item.id)}
                          title={text.retrySentence}
                          aria-label={text.retrySentence}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-rose-500 hover:bg-white/40 dark:hover:bg-slate-700/50 transition-all cursor-pointer"
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* Tab 2: Hints */
          <div className="flex-1 overflow-y-auto p-4 space-y-3 hide-scrollbar">
            <div className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
              <p className="font-bold text-sm text-slate-800 dark:text-white">
                {text.sameLevel(videoData?.level)}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {text.sameLevelDescription}
              </p>
            </div>

            {isLoadingHints ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400">
                <Loader2 size={18} className="animate-spin" />
                <span>{text.loadingHints}</span>
              </div>
            ) : relatedLessons.length ? (
              <div className="space-y-3">
                {relatedLessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => navigate(`/shadowing/${lesson.id}`)}
                    className="group flex w-full gap-3 rounded-2xl border border-white/20 dark:border-white/10 bg-white/30 dark:bg-slate-800/30 p-3 text-left transition-all hover:border-rose-500/40 hover:bg-white/50 dark:hover:bg-slate-800/50 cursor-pointer"
                  >
                    {lesson.thumbnail_url ? (
                      <img
                        src={lesson.thumbnail_url}
                        alt=""
                        className="h-16 w-24 shrink-0 rounded-xl object-cover shadow-xs"
                      />
                    ) : (
                      <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-500">
                        <MonitorPlay size={20} />
                      </div>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-rose-500">
                        {lesson.level || videoData?.level}
                      </span>
                      <span className="line-clamp-2 block text-xs sm:text-sm font-bold leading-snug text-slate-800 dark:text-white">
                        {lesson.title}
                      </span>
                      <span className="mt-2 flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-300">
                        <span>{text.startLesson}</span>
                        <ArrowRight
                          size={13}
                          className="transition-transform group-hover:translate-x-0.5"
                        />
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/30 dark:border-white/10 p-8 text-center text-xs text-slate-400">
                {text.noHints}
              </div>
            )}
          </div>
        )}
      </aside>

      {/* 5. CELEBRATION MODAL (Khi hoàn thành 100% bài học) */}
      {showCelebrationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-white/40 dark:border-white/15 p-6 shadow-2xl backdrop-blur-2xl text-center flex flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-xl shadow-rose-500/35 mb-4 animate-bounce">
              <Trophy size={32} />
            </div>

            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">
              {text.celebrationTitle}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mb-6">
              {text.celebrationDesc}
            </p>

            <div className="w-full grid grid-cols-2 gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                <span className="block text-[10px] font-extrabold uppercase text-slate-400">
                  Tổng số câu
                </span>
                <span className="text-lg font-black text-rose-500">{segments.length} câu</span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <span className="block text-[10px] font-extrabold uppercase text-slate-400">
                  Tiến độ
                </span>
                <span className="text-lg font-black text-emerald-500">100% Đạt</span>
              </div>
            </div>

            <div className="flex w-full gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCelebrationModal(false);
                  setCurrentSegmentIndex(0);
                }}
                className="flex-1 py-2.5 rounded-xl bg-white/40 dark:bg-slate-800/40 border border-white/40 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-700/60 transition-all cursor-pointer"
              >
                {text.replayAll}
              </button>
              <button
                type="button"
                onClick={() => navigate('/shadowing')}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold hover:shadow-lg hover:shadow-rose-500/30 transition-all cursor-pointer"
              >
                {text.nextLesson}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
