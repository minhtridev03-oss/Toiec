import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Eye,
  EyeOff,
  HelpCircle,
  Keyboard,
  Lightbulb,
  List,
  Loader2,
  MonitorPlay,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  Settings,
  SkipBack,
  SkipForward,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePracticeSessionTimer } from '../lib/practiceActivity';
import { useLocale } from '../contexts/LocaleContext';
import { supabase } from '../lib/supabaseClient';
import LessonMediaPlayer from './LessonMediaPlayer';

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
    previousSentence: 'Câu trước (Alt+↑)',
    replaySentence: 'Nghe lại câu (Alt+← hoặc Tab)',
    pause: 'Tạm dừng (Ctrl+Space)',
    play: 'Phát (Ctrl+Space)',
    loopSentence: 'Lặp lại câu',
    nextSentence: 'Câu tiếp (Alt+→ hoặc Enter)',
    autoNext: 'Tự chuyển câu',
    typeWhatYouHear: 'Nhập câu bạn nghe được...',
    clickWordToReveal: 'Bấm từ để nghe phát âm & xem gợi ý',
    showAll: 'Xem toàn bộ',
    hideAll: 'Ẩn toàn bộ',
    firstLetter: 'Ký tự đầu',
    viewWord: 'Xem từ',
    next: 'Câu tiếp theo',
    transcript: 'Bản chép lời',
    lessonHints: 'Gợi ý bài học',
    sameLevel: (level) => `Bài cùng cấp độ ${level || ''}`.trim(),
    sameLevelDescription: 'Chọn một bài khác có độ khó tương đương để tiếp tục luyện nghe.',
    loadingHints: 'Đang tìm bài phù hợp...',
    noHints: 'Chưa có bài khác cùng cấp độ.',
    startLesson: 'Mở bài nghe',
    retrySentence: 'Làm lại câu này',
    sentence: 'Câu',
    celebrationTitle: 'Xuất sắc! Hoàn thành 100%',
    celebrationDesc: 'Bạn đã chép chính tả chuẩn xác toàn bộ bài nghe này!',
    replayAll: 'Luyện lại từ đầu',
    nextLesson: 'Học bài tiếp theo',
    close: 'Đóng',
    segmentDuration: 'Thời lượng câu',
    completedSentence: 'Câu đã hoàn thành chuẩn xác',
    pressEnterToNext: 'Gõ đúng! Nhấn Enter để qua câu ngay',
    lookupDictionary: 'Tra từ điển',
  },
  en: {
    back: 'Back',
    dictation: 'Dictation',
    shadowing: 'Shadowing',
    volume: 'Volume',
    settings: 'Player settings',
    videoQuality: 'Video quality',
    auto: 'Auto',
    previousSentence: 'Previous (Alt+↑)',
    replaySentence: 'Replay (Alt+← or Tab)',
    pause: 'Pause (Ctrl+Space)',
    play: 'Play (Ctrl+Space)',
    loopSentence: 'Loop sentence',
    nextSentence: 'Next (Alt+→ or Enter)',
    autoNext: 'Auto-next',
    typeWhatYouHear: 'Type what you hear...',
    clickWordToReveal: 'Click word for audio & hint',
    showAll: 'Show all',
    hideAll: 'Hide all',
    firstLetter: 'First letter',
    viewWord: 'View words',
    next: 'Next sentence',
    transcript: 'Transcript',
    lessonHints: 'Lesson hints',
    sameLevel: (level) => `More ${level || ''} lessons`.trim(),
    sameLevelDescription: 'Choose another lesson at a similar difficulty to keep practising.',
    loadingHints: 'Finding suitable lessons...',
    noHints: 'No other lessons at this level yet.',
    startLesson: 'Open lesson',
    retrySentence: 'Retry this sentence',
    sentence: 'Sentence',
    celebrationTitle: 'Awesome! 100% Completed',
    celebrationDesc: 'You have accurately transcribed the entire lesson!',
    replayAll: 'Replay from start',
    nextLesson: 'Next lesson',
    close: 'Close',
    segmentDuration: 'Sentence duration',
    completedSentence: 'Sentence accurately completed',
    pressEnterToNext: 'Correct! Press Enter to advance immediately',
    lookupDictionary: 'Look up dictionary',
  },
};

const getLevelColor = (level) => {
  const l = (level || '').toUpperCase();
  if (l === 'A1' || l === 'A2') return 'bg-emerald-500 text-white';
  if (l === 'B1' || l === 'B2') return 'bg-amber-500 text-white';
  if (l === 'C1' || l === 'C2') return 'bg-purple-600 text-white';
  return 'bg-indigo-600 text-white';
};

/**
 * Bulletproof Unicode Normalizer:
 * Chuyển dấu nháy cong, gạch ngang dài (em-dash), ngoặc kép cong về dạng chuẩn,
 * loại bỏ dấu câu không bắt buộc để người học gõ chính xác không bao giờ bị kẹt.
 */
const normalize = (value = '') => {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/[\u2018\u2019\u201A\u201B`]/g, "'") // Dấu nháy đơn cong về '
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"') // Dấu ngoặc kép cong về "
    .replace(/[\u2014\u2013\u2015\u2212]/g, ' ') // Em-dash, en-dash về space
    .replace(/[.,/#!$%^&*;:{}=\-_~()?"…]/g, '') // Bỏ các dấu câu phụ
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizeWord = (value = '') => {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/[\u2018\u2019\u201A\u201B`]/g, "'")
    .replace(/[^a-z0-9']/gi, '')
    .trim();
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

const maskText = (value = '') => value.replace(/[a-zA-Z0-9]/g, '•');

const maskWithFirstLetter = (value = '') => {
  let hasRevealedLetter = false;
  return value.replace(/[a-zA-Z0-9]/g, (character) => {
    if (!hasRevealedLetter) {
      hasRevealedLetter = true;
      return character;
    }
    return '•';
  });
};

/**
 * Web Audio API Success Chime:
 * Tạo âm thanh "Ding" trong trẻo (tần số 880Hz lên 1320Hz) nhẹ nhàng,
 * không cần file mp3 ngoài, không lo lỗi mạng hay độ trễ.
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
    osc.frequency.setValueAtTime(880, now); // A5
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12); // E6

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    // Web audio blocked or unsupported
  }
};

/**
 * Web Speech API: Phát âm sạch từ vựng
 */
const speakWord = (wordText) => {
  if (typeof window === 'undefined' || !window.speechSynthesis || !wordText) return;
  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.cancel();
    const clean = wordText.replace(/[^a-zA-Z0-9']/g, '').trim();
    if (!clean) return;
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Speech synthesis fallback
  }
};

// Memoized sidebar item: only re-renders when its own active/completed state changes
const TranscriptSentenceItem = React.memo(function TranscriptSentenceItem({
  item,
  index,
  isActive,
  isCompleted,
  displayText,
  onSelect,
  onReset,
  text,
  activeRef,
}) {
  return (
    <div
      ref={activeRef}
      className={`relative rounded-2xl border transition-all ${
        isActive
          ? 'border-indigo-500/40 dark:border-cyan-400/35 bg-indigo-500/15 dark:bg-cyan-500/10 shadow-md shadow-indigo-500/10'
          : 'border-transparent hover:bg-white/30 dark:hover:bg-slate-800/30'
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(index)}
        className="flex w-full items-start gap-3 p-3.5 pr-11 text-left cursor-pointer"
      >
        <span
          className={`mt-0.5 shrink-0 ${
            isCompleted
              ? 'text-emerald-500'
              : isActive
              ? 'text-indigo-600 dark:text-cyan-400'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          {isCompleted ? (
            <CheckCircle2 size={18} />
          ) : (
            <span className="block h-[18px] w-[18px] rounded-full border-2 border-current" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="mb-0.5 block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {text.sentence} {index + 1}
          </span>
          <span
            className={`block text-xs sm:text-sm leading-relaxed ${
              isCompleted
                ? 'text-slate-800 dark:text-slate-100 font-bold'
                : 'text-slate-500 dark:text-slate-400 font-semibold'
            }`}
          >
            {displayText}
          </span>
        </span>
      </button>
      {isCompleted && (
        <button
          type="button"
          onClick={(event) => onReset(event, item.id)}
          title={text.retrySentence}
          aria-label={text.retrySentence}
          className="absolute right-3 top-3 p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-cyan-400 hover:bg-white/50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
        >
          <RotateCcw size={15} />
        </button>
      )}
    </div>
  );
});

export default function VideoDictationPlayer({ videoData, segments }) {
  const { user } = useAuth();
  const { locale } = useLocale();
  const navigate = useNavigate();
  const text = COPY[locale] || COPY.vi;

  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [autoNext, setAutoNext] = useState(true);
  const [completedSegments, setCompletedSegments] = useState(new Set());
  const [showAllHints, setShowAllHints] = useState(false);
  const [showFirstLetters, setShowFirstLetters] = useState(false);
  const [revealedWordIndexes, setRevealedWordIndexes] = useState(new Set());
  const [currentTimeDisplay, setCurrentTimeDisplay] = useState('00:00');
  const [durationDisplay, setDurationDisplay] = useState('00:00');
  const [sidebarTab, setSidebarTab] = useState('transcript');
  const [relatedLessons, setRelatedLessons] = useState([]);
  const [isLoadingHints, setIsLoadingHints] = useState(false);
  const [volume, setVolume] = useState(75);
  const [isVolumeMenuOpen, setIsVolumeMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [availableQualities, setAvailableQualities] = useState(['default']);
  const [quality, setQuality] = useState('default');
  const [showCelebration, setShowCelebration] = useState(false);
  const [isJustCorrect, setIsJustCorrect] = useState(false);

  // Segment mini-scrubber timeline state: { elapsed, duration, percent }
  const [segmentProgress, setSegmentProgress] = useState({
    elapsed: 0,
    duration: 0,
    percent: 0,
  });

  usePracticeSessionTimer('dictation', user, Boolean(videoData && segments.length > 0), isPlaying);

  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const completedSegmentsRef = useRef(new Set());
  const captionLastHiddenAtRef = useRef(0);
  const activeSegmentRef = useRef(null);
  const sidebarListRef = useRef(null);
  const textareaRef = useRef(null);
  const autoNextTimeoutRef = useRef(null);
  const lastTimeDisplayRef = useRef('00:00');
  const celebrationShownRef = useRef(false);
  const hasResumedRef = useRef(false);

  // Draft memory: lưu tạm những gì đang gõ dở cho từng câu
  const draftInputsRef = useRef({});

  // Synchronized state refs to avoid stale closures in intervals & shortcuts
  const currentSegmentIndexRef = useRef(currentSegmentIndex);
  const segmentRef = useRef(segments[currentSegmentIndex] || segments[0]);
  const isLoopingRef = useRef(isLooping);
  const isPlayingRef = useRef(isPlaying);
  const inputValueRef = useRef(inputValue);
  const volumeMenuRef = useRef(null);
  const settingsMenuRef = useRef(null);

  const segment = segments[currentSegmentIndex] || segments[0];
  const segmentId = segment?.id;
  const segmentAnswer = segment?.answer;
  const segmentStartTime = segment?.start_time;
  const answerWords = useMemo(
    () => segment?.answer?.split(/\s+/).filter(Boolean) || [],
    [segment?.answer]
  );
  const progressPercent = segments.length
    ? Math.round((completedSegments.size / segments.length) * 100)
    : 0;

  // Keep references updated synchronously
  useEffect(() => {
    currentSegmentIndexRef.current = currentSegmentIndex;
    segmentRef.current = segments[currentSegmentIndex] || segments[0];
  }, [currentSegmentIndex, segments]);

  useEffect(() => {
    isLoopingRef.current = isLooping;
  }, [isLooping]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    completedSegmentsRef.current = completedSegments;
  }, [completedSegments]);

  useEffect(() => {
    inputValueRef.current = inputValue;
  }, [inputValue]);

  // Trigger celebration modal when 100% completed
  useEffect(() => {
    if (segments.length > 0 && completedSegments.size === segments.length && !celebrationShownRef.current) {
      celebrationShownRef.current = true;
      setShowCelebration(true);
    }
  }, [completedSegments.size, segments.length]);

  // Isolated smooth scroll inside sidebar container (Không làm giật toàn trang)
  useEffect(() => {
    if (activeSegmentRef.current && sidebarListRef.current) {
      const container = sidebarListRef.current;
      const item = activeSegmentRef.current;
      const itemTop = item.offsetTop;
      const itemHeight = item.offsetHeight;
      const containerScrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;

      if (itemTop < containerScrollTop || itemTop + itemHeight > containerScrollTop + containerHeight) {
        container.scrollTo({
          top: Math.max(0, itemTop - containerHeight / 2 + itemHeight / 2),
          behavior: 'smooth',
        });
      }
    }
  }, [currentSegmentIndex, sidebarTab]);

  // Click outside listener for volume and settings menus
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (volumeMenuRef.current && !volumeMenuRef.current.contains(event.target)) {
        setIsVolumeMenuOpen(false);
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target)) {
        setIsSettingsOpen(false);
      }
    };

    if (isVolumeMenuOpen || isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVolumeMenuOpen, isSettingsOpen]);

  // Cleanup auto-next timeout on unmount or segment switch
  useEffect(() => {
    return () => {
      if (autoNextTimeoutRef.current) {
        clearTimeout(autoNextTimeoutRef.current);
        autoNextTimeoutRef.current = null;
      }
    };
  }, [currentSegmentIndex]);

  // Load progress from Database or LocalStorage (Guest fallback) + Smart Resume
  useEffect(() => {
    let cancelled = false;

    const fetchProgress = async () => {
      if (!videoData?.id) return;

      let completedSet = new Set();

      if (user?.id) {
        const { data, error } = await supabase
          .from('user_dictation_progress')
          .select('segment_id')
          .eq('user_id', user.id)
          .eq('video_id', videoData.id)
          .eq('is_completed', true);

        if (!cancelled && !error && data) {
          completedSet = new Set(data.map((item) => item.segment_id));
        }
      } else {
        // Guest mode fallback
        try {
          const localKey = `dictation_progress_${videoData.id}`;
          const saved = JSON.parse(localStorage.getItem(localKey) || '[]');
          completedSet = new Set(saved);
        } catch {
          // ignore
        }
      }

      if (!cancelled) {
        setCompletedSegments(completedSet);

        // Smart Resume: Tự động nhảy đến câu đầu tiên chưa hoàn thành
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

  // Related lessons fetch
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

  // Change segment handler with Draft saving
  const changeSegment = useCallback(
    (nextIndex) => {
      if (nextIndex < 0 || nextIndex >= segments.length) return;

      // Save draft for previous segment if uncompleted
      const currentSeg = segmentRef.current;
      if (currentSeg && !completedSegmentsRef.current.has(currentSeg.id)) {
        draftInputsRef.current[currentSeg.id] = inputValueRef.current;
      }

      if (autoNextTimeoutRef.current) {
        clearTimeout(autoNextTimeoutRef.current);
        autoNextTimeoutRef.current = null;
      }

      setCurrentSegmentIndex(nextIndex);
    },
    [segments.length]
  );

  // When segment changes: Restore Draft/Answer, reset hints, seek, and auto-focus textarea
  useEffect(() => {
    if (!segmentId) return;

    setShowAllHints(false);
    setShowFirstLetters(false);
    setRevealedWordIndexes(new Set());
    setIsJustCorrect(false);

    // Restore answer or draft
    if (completedSegmentsRef.current.has(segmentId)) {
      setInputValue(segmentAnswer || '');
    } else if (draftInputsRef.current[segmentId] !== undefined) {
      setInputValue(draftInputsRef.current[segmentId]);
    } else {
      setInputValue('');
    }

    if (playerRef.current?.seekTo) {
      playerRef.current.seekTo(segmentStartTime, true);
      playerRef.current.playVideo();
    }

    // Auto-focus without jumping viewport
    const timer = setTimeout(() => {
      textareaRef.current?.focus({ preventScroll: true });
    }, 50);

    return () => clearTimeout(timer);
  }, [segmentAnswer, segmentId, segmentStartTime]);

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
      // Captions module fallback
    }
  };

  const updateQualityOptions = () => {
    const player = playerRef.current;
    if (!player?.getAvailableQualityLevels) return;
    const levels = player.getAvailableQualityLevels();
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

  const onPlayerStateChange = (event) => {
    if (event.data === 1) {
      setIsPlaying(true);
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

  // Performance-optimized checkTime: calculates Mini Timeline & loops safely
  const checkTime = () => {
    const currentSeg = segmentRef.current;
    const looping = isLoopingRef.current;
    if (!playerRef.current || !currentSeg) return;

    const currentTime = playerRef.current.getCurrentTime ? playerRef.current.getCurrentTime() : 0;

    // Segment Mini Scrubber calculation
    const start = currentSeg.start_time;
    const end = currentSeg.end_time;
    const segDuration = Math.max(0.1, end - start);
    const segElapsed = Math.max(0, Math.min(currentTime - start, segDuration));
    const percent = Math.min(100, Math.max(0, (segElapsed / segDuration) * 100));

    setSegmentProgress({
      elapsed: segElapsed,
      duration: segDuration,
      percent,
    });

    // Throttle state updates: only set state when formatted second changes
    const formatted = formatTime(currentTime);
    if (formatted !== lastTimeDisplayRef.current) {
      lastTimeDisplayRef.current = formatted;
      setCurrentTimeDisplay(formatted);
    }

    if (currentTime >= end) {
      if (looping) {
        playerRef.current.seekTo(start, true);
      } else {
        playerRef.current.pauseVideo();
      }
    }
  };

  // Play/Pause with Boundary Guard: không bao giờ phát lệch ra ngoài câu
  const handlePlayPause = useCallback(() => {
    const player = playerRef.current;
    const currentSeg = segmentRef.current;
    if (!player || !currentSeg) return;

    if (isPlayingRef.current) {
      player.pauseVideo();
      return;
    }

    const currentTime = player.getCurrentTime ? player.getCurrentTime() : 0;
    if (currentTime >= currentSeg.end_time || currentTime < currentSeg.start_time - 0.3) {
      player.seekTo(currentSeg.start_time, true);
    }
    player.playVideo();
  }, []);

  const handleReplaySegment = useCallback(() => {
    const player = playerRef.current;
    const currentSeg = segmentRef.current;
    if (!player || !currentSeg) return;
    player.seekTo(currentSeg.start_time, true);
    player.playVideo();
  }, []);

  // Click on mini timeline scrubber to seek inside segment
  const handleMiniScrub = (event) => {
    const player = playerRef.current;
    if (!player || !segment) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const duration = Math.max(0.1, segment.end_time - segment.start_time);
    const targetTime = segment.start_time + ratio * duration;
    player.seekTo(targetTime, true);
    player.playVideo();
  };

  // Pro keyboard shortcuts (Ergonomic: Ctrl+Space, Shift+Space, Tab, Enter)
  useEffect(() => {
    const handleShortcut = (event) => {
      const isAlt = event.altKey;
      const isCtrl = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      // Play / Pause: Ctrl + Space, Shift + Space, or Alt + Space
      if (((isCtrl || isAlt) && event.code === 'Space') || (event.shiftKey && event.code === 'Space')) {
        event.preventDefault();
        handlePlayPause();
        return;
      }

      // Replay current sentence: Alt + ArrowLeft
      if (isAlt && event.key === 'ArrowLeft') {
        event.preventDefault();
        handleReplaySegment();
        return;
      }

      // Next sentence: Alt + ArrowRight
      if (isAlt && event.key === 'ArrowRight') {
        event.preventDefault();
        if (currentSegmentIndexRef.current < segments.length - 1) {
          changeSegment(currentSegmentIndexRef.current + 1);
        }
        return;
      }

      // Previous sentence: Alt + ArrowUp
      if (isAlt && event.key === 'ArrowUp') {
        event.preventDefault();
        if (currentSegmentIndexRef.current > 0) {
          changeSegment(currentSegmentIndexRef.current - 1);
        }
        return;
      }

      // First letters: Alt + H
      if (isAlt && key === 'h') {
        event.preventDefault();
        setShowFirstLetters((value) => !value);
        return;
      }

      // Show all hints: Alt + R
      if (isAlt && key === 'r') {
        event.preventDefault();
        setShowAllHints((value) => !value);
        return;
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [handlePlayPause, handleReplaySegment, changeSegment, segments.length]);

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
      // YouTube fallback
    }
  };

  // Keyboard ergonomics inside Textarea
  const handleTextareaKeyDown = (e) => {
    // Enter without Shift:
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();

      // If correct or pending auto-next, advance immediately!
      if (segment && normalize(inputValue) === normalize(segment.answer)) {
        if (autoNextTimeoutRef.current) {
          clearTimeout(autoNextTimeoutRef.current);
          autoNextTimeoutRef.current = null;
        }
        if (currentSegmentIndex < segments.length - 1) {
          changeSegment(currentSegmentIndex + 1);
        }
      } else {
        // If not finished, replay sentence audio so learner can listen again
        handleReplaySegment();
      }
      return;
    }

    // Tab key: Replay sentence without leaving textarea
    if (e.key === 'Tab') {
      e.preventDefault();
      handleReplaySegment();
      return;
    }

    // Escape key: Clear input
    if (e.key === 'Escape') {
      e.preventDefault();
      setInputValue('');
      if (segment) {
        delete draftInputsRef.current[segment.id];
      }
      return;
    }
  };

  const handleTextareaFocus = () => {
    setTimeout(() => {
      textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 280);
  };

  const handleInputChange = (event) => {
    const value = event.target.value;
    setInputValue(value);

    if (!segment) return;

    // Save draft
    draftInputsRef.current[segment.id] = value;

    if (normalize(value) !== normalize(segment.answer)) return;

    // Correct answer!
    playSuccessChime();
    setIsJustCorrect(true);
    setTimeout(() => setIsJustCorrect(false), 1200);

    const segId = segment.id;
    setCompletedSegments((previous) => new Set(previous).add(segId));
    delete draftInputsRef.current[segId];

    // Save to Database (if logged in) or LocalStorage (if guest)
    if (user?.id && videoData?.id) {
      supabase
        .from('user_dictation_progress')
        .upsert(
          {
            user_id: user.id,
            video_id: videoData.id,
            segment_id: segId,
            is_completed: true,
          },
          { onConflict: 'user_id,segment_id' }
        )
        .then(({ error }) => {
          if (error) console.error('Unable to save dictation progress:', error);
          window.dispatchEvent(new CustomEvent('dictation-progress-updated'));
        });
    } else if (videoData?.id) {
      try {
        const localKey = `dictation_progress_${videoData.id}`;
        const saved = JSON.parse(localStorage.getItem(localKey) || '[]');
        if (!saved.includes(segId)) {
          saved.push(segId);
          localStorage.setItem(localKey, JSON.stringify(saved));
        }
        window.dispatchEvent(new CustomEvent('dictation-progress-updated'));
      } catch {
        // ignore
      }
    }

    if (autoNext && currentSegmentIndex < segments.length - 1) {
      if (autoNextTimeoutRef.current) clearTimeout(autoNextTimeoutRef.current);
      autoNextTimeoutRef.current = window.setTimeout(() => {
        changeSegment(currentSegmentIndex + 1);
      }, 750);
    }
  };

  // Reset sentence: removes from local state AND removes from database/localStorage
  const resetSegment = useCallback(
    async (event, segmentIdToReset) => {
      event.stopPropagation();

      // Remove locally
      setCompletedSegments((previous) => {
        const next = new Set(previous);
        next.delete(segmentIdToReset);
        return next;
      });

      // Clear draft
      if (draftInputsRef.current[segmentIdToReset]) {
        delete draftInputsRef.current[segmentIdToReset];
      }

      if (segmentRef.current?.id === segmentIdToReset) {
        setInputValue('');
        textareaRef.current?.focus({ preventScroll: true });
      }

      // Delete in Supabase
      if (user?.id && videoData?.id) {
        try {
          await supabase
            .from('user_dictation_progress')
            .delete()
            .eq('user_id', user.id)
            .eq('video_id', videoData.id)
            .eq('segment_id', segmentIdToReset);
        } catch (err) {
          console.error('Error resetting segment in database:', err);
        }
      } else if (videoData?.id) {
        // Guest mode
        try {
          const localKey = `dictation_progress_${videoData.id}`;
          const saved = JSON.parse(localStorage.getItem(localKey) || '[]');
          const updated = saved.filter((id) => id !== segmentIdToReset);
          localStorage.setItem(localKey, JSON.stringify(updated));
        } catch {
          // ignore
        }
      }

      // Invalidate list cache
      window.dispatchEvent(new CustomEvent('dictation-progress-updated'));
    },
    [user?.id, videoData?.id]
  );

  const handleWordTokenClick = (word, index, hasTypedWord) => {
    speakWord(word);
    if (!hasTypedWord) {
      setRevealedWordIndexes((previous) => {
        const next = new Set(previous);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        return next;
      });
    }
  };

  // Open Global Dictionary for specific word
  const handleLookupWord = (word) => {
    const clean = word.replace(/[^a-zA-Z]/g, '').trim();
    if (!clean) return;
    window.dispatchEvent(new CustomEvent('global-dictionary:open', { detail: { word: clean } }));
  };

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

  return (
    <div 
      className="flex flex-1 min-h-0 w-full flex-col overflow-y-auto bg-transparent text-slate-800 dark:text-white lg:flex-row lg:overflow-hidden p-3 sm:p-5 lg:p-6 gap-5 lg:gap-6 max-w-[1700px] mx-auto pb-24 lg:pb-6 relative"
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 80px)',
      }}
    >
      {/* LEFT COLUMN: CINEMA VIDEO & DICTATION CONSOLE */}
      <section className="flex min-w-0 flex-1 flex-col gap-4 lg:overflow-y-auto pr-0 lg:pr-1 hide-scrollbar">
        {/* 1. TOPBAR DOCK */}
        <header className="relative z-30 flex items-center justify-between gap-3 p-3 sm:px-5 rounded-2xl sm:rounded-3xl backdrop-blur-2xl bg-white/30 dark:bg-slate-900/40 border border-white/35 dark:border-white/10 shadow-lg shadow-black/5">
          <Link
            to="/dictation"
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-cyan-400 hover:bg-white/40 dark:hover:bg-slate-800/40 transition-all cursor-pointer"
          >
            <ChevronLeft size={18} />
            <span>{text.back}</span>
          </Link>

          {/* Mode Switcher */}
          <div className="flex items-center rounded-xl sm:rounded-2xl bg-white/25 dark:bg-slate-800/35 border border-white/30 dark:border-white/5 p-1 shadow-inner">
            <button className="flex items-center gap-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-500/30 px-3.5 py-1.5 text-xs sm:text-sm font-extrabold transition-all cursor-pointer">
              <Keyboard size={16} />
              <span className="hidden sm:inline">{text.dictation}</span>
            </button>
            <button
              onClick={() => navigate(`/shadowing/${videoData?.id}`)}
              className="flex items-center gap-2 rounded-lg sm:rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-cyan-400 hover:bg-white/40 dark:hover:bg-slate-700/40 transition-all cursor-pointer"
            >
              <MonitorPlay size={16} />
              <span className="hidden sm:inline">{text.shadowing}</span>
            </button>
          </div>

          {/* Top Actions: Volume & Settings */}
          <div className="flex items-center gap-1.5">
            {/* Volume */}
            <div className="relative" ref={volumeMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsVolumeMenuOpen((open) => !open);
                  setIsSettingsOpen(false);
                }}
                title={text.volume}
                aria-label={text.volume}
                className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-slate-800/50 hover:text-indigo-600 dark:hover:text-cyan-400 transition-all cursor-pointer"
              >
                {volume === 0 ? <VolumeX size={19} /> : <Volume2 size={19} />}
              </button>
              {isVolumeMenuOpen && (
                <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-2xl border border-white/40 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                  <div className="mb-3 flex items-center justify-between text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                    <span>{text.volume}</span>
                    <span className="text-indigo-600 dark:text-cyan-400 font-extrabold">{volume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={volume}
                    onChange={(event) => handleVolumeChange(event.target.value)}
                    className="accent-indigo-600 w-full cursor-pointer"
                    aria-label={text.volume}
                  />
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="relative" ref={settingsMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setIsSettingsOpen((open) => !open);
                  setIsVolumeMenuOpen(false);
                }}
                title={text.settings}
                aria-label={text.settings}
                className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-slate-800/50 hover:text-indigo-600 dark:hover:text-cyan-400 transition-all cursor-pointer"
              >
                <Settings size={19} />
              </button>
              {isSettingsOpen && (
                <div className="absolute right-0 top-full z-40 mt-2 w-64 rounded-2xl border border-white/40 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                  <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {text.videoQuality}
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {availableQualities.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => changeQuality(option)}
                        className={`rounded-xl px-2 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                          quality === option
                            ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md'
                            : 'bg-white/40 dark:bg-slate-800/50 hover:bg-white/70 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200'
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

        {/* 2. CINEMA GLASS VIDEO FRAME */}
        <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-white/40 dark:border-white/10 shadow-2xl shadow-indigo-500/10 aspect-video bg-black shrink-0 group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 via-blue-500/15 to-cyan-400/20 rounded-3xl blur-2xl -z-10 pointer-events-none opacity-60"></div>

          <LessonMediaPlayer
            videoData={videoData}
            opts={opts}
            onReady={onPlayerReady}
            onStateChange={onPlayerStateChange}
            className="absolute inset-0 h-full w-full pointer-events-none"
          />
        </div>

        {/* 3. ERGONOMIC STUDIO MEDIA DOCK */}
        <div className="p-3 sm:p-4 rounded-2xl sm:rounded-3xl backdrop-blur-2xl bg-white/30 dark:bg-slate-900/40 border border-white/35 dark:border-white/10 shadow-lg shadow-black/5 flex flex-col gap-3">
          {/* Upper Row: Time Display + Central Playback Controls + Auto-Next Toggle */}
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Time Display */}
            <div className="shrink-0 whitespace-nowrap text-xs sm:text-sm font-black tabular-nums text-slate-800 dark:text-slate-100 px-3 py-1.5 rounded-xl bg-white/20 dark:bg-slate-800/30 border border-white/30 dark:border-white/5 shadow-inner">
              {currentTimeDisplay} / {durationDisplay}
            </div>

            {/* Center Playback Controls */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => changeSegment(currentSegmentIndex - 1)}
                disabled={currentSegmentIndex === 0}
                title={text.previousSentence}
                className="p-1.5 sm:p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-800/50 hover:text-indigo-600 dark:hover:text-cyan-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <SkipBack size={19} />
              </button>

              <button
                type="button"
                onClick={handleReplaySegment}
                title={text.replaySentence}
                className="p-1.5 sm:p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-800/50 hover:text-indigo-600 dark:hover:text-cyan-400 transition-all cursor-pointer"
              >
                <RotateCcw size={19} />
              </button>

              {/* Central Glowing Play/Pause */}
              <button
                type="button"
                onClick={handlePlayPause}
                title={isPlaying ? text.pause : text.play}
                className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-600 text-white shadow-xl shadow-indigo-500/35 hover:scale-105 active:scale-95 transition-all cursor-pointer mx-0.5 sm:mx-1"
              >
                {isPlaying ? <Pause size={20} className="fill-current" /> : <Play size={20} className="ml-0.5 fill-current" />}
              </button>

              <button
                type="button"
                onClick={() => setIsLooping((looping) => !looping)}
                title={text.loopSentence}
                className={`p-1.5 sm:p-2 rounded-xl transition-all cursor-pointer ${
                  isLooping
                    ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-600 dark:text-cyan-300 shadow-md shadow-cyan-500/10'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-800/50 hover:text-indigo-600 dark:hover:text-cyan-400'
                }`}
              >
                <Repeat size={19} />
              </button>

              <button
                type="button"
                onClick={() => changeSegment(currentSegmentIndex + 1)}
                disabled={currentSegmentIndex === segments.length - 1}
                title={text.nextSentence}
                className="p-1.5 sm:p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-800/50 hover:text-indigo-600 dark:hover:text-cyan-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <SkipForward size={19} />
              </button>
            </div>

            {/* Auto-Next Toggle */}
            <button
              type="button"
              onClick={() => setAutoNext((value) => !value)}
              title={text.autoNext}
              className="shrink-0 flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/20 dark:bg-slate-800/30 border border-white/30 dark:border-white/5 font-bold text-xs text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
            >
              <span
                className={`flex h-4 w-7 sm:h-5 sm:w-8 items-center rounded-full p-0.5 transition-colors ${
                  autoNext
                    ? 'bg-gradient-to-r from-indigo-600 to-cyan-500 shadow-sm shadow-indigo-500/30'
                    : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`h-3 w-3 sm:h-4 sm:w-4 rounded-full bg-white shadow-sm transition-transform ${
                    autoNext ? 'translate-x-3 sm:translate-x-3.5' : 'translate-x-0'
                  }`}
                />
              </span>
              <span className="hidden sm:inline">{text.autoNext}</span>
            </button>
          </div>

          {/* Mini Segment Progress Scrubber: Trực quan tiến độ riêng của câu */}
          <div className="relative flex flex-col gap-1 px-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                <span>{text.segmentDuration}:</span>
                <span className="font-mono text-slate-700 dark:text-slate-200 font-extrabold">
                  {formatSecondsDecimal(segmentProgress.elapsed)} / {formatSecondsDecimal(segmentProgress.duration)}
                </span>
              </span>
              <span className="font-mono text-indigo-600 dark:text-cyan-400 font-bold">
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
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-blue-500 transition-all duration-100 relative"
                style={{ width: `${segmentProgress.percent}%` }}
              />
            </div>
          </div>

          {/* Lower Sub-strip: Sentence Tracker + Speed Pills */}
          <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-white/20 dark:border-white/10 text-xs">
            {/* Sentence Tracker */}
            <div className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300">
              <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-cyan-300 font-black">
                {text.sentence} {currentSegmentIndex + 1}/{segments.length}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden xs:inline">
                ({progressPercent}% hoàn thành)
              </span>
            </div>

            {/* Speed Pills */}
            <div className="flex items-center gap-1 rounded-xl bg-white/20 dark:bg-slate-800/30 border border-white/25 dark:border-white/5 p-1 font-black shrink-0">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider px-1.5 hidden sm:inline">Tốc độ:</span>
              {[0.5, 0.75, 1, 1.25, 1.5].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => changeSpeed(speed)}
                  className={`rounded-lg px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs transition-all cursor-pointer ${
                    playbackRate === speed
                      ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/30'
                      : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-cyan-300 hover:bg-white/40 dark:hover:bg-slate-700/40'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4. TYPING CANVAS & WORD MATRIX */}
        <div className="p-4 sm:p-6 rounded-3xl backdrop-blur-2xl bg-white/30 dark:bg-slate-900/40 border border-white/35 dark:border-white/10 shadow-lg shadow-black/5 flex flex-col gap-4">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleTextareaKeyDown}
              onFocus={handleTextareaFocus}
              placeholder={text.typeWhatYouHear}
              className={`min-h-28 sm:min-h-32 w-full resize-none rounded-2xl p-3.5 sm:p-4 text-base sm:text-lg font-semibold outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-inner ${
                completedSegments.has(segment?.id)
                  ? 'bg-emerald-500/10 border-2 border-emerald-500/60 text-emerald-900 dark:text-emerald-100 shadow-emerald-500/10'
                  : isJustCorrect
                  ? 'bg-emerald-500/20 border-2 border-emerald-400 ring-4 ring-emerald-400/20 text-emerald-900 dark:text-emerald-100 scale-[1.005]'
                  : 'bg-white/30 dark:bg-slate-800/35 border border-white/40 dark:border-white/10 text-slate-900 dark:text-white focus:border-indigo-500 focus:bg-white/45 dark:focus:bg-slate-800/55 focus:ring-4 focus:ring-indigo-500/15'
              }`}
            />
          </div>

          {/* Mobile Ergonomic Action Bar (Thumb-friendly when keyboard opens) */}
          <div className="flex sm:hidden items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handleReplaySegment}
              className="flex-1 py-2 px-2.5 rounded-xl bg-white/40 dark:bg-slate-800/60 border border-white/40 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-xs"
            >
              <RotateCcw size={14} className="text-indigo-600 dark:text-cyan-400" />
              <span>Nghe lại</span>
            </button>
            <button
              type="button"
              onClick={() => changeSpeed(playbackRate === 1 ? 0.75 : 1)}
              className="py-2 px-3 rounded-xl bg-white/40 dark:bg-slate-800/60 border border-white/40 dark:border-white/10 text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-1 active:scale-95 transition-all shadow-xs"
            >
              <span>{playbackRate}x</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (segment && normalize(inputValue) === normalize(segment.answer)) {
                  if (currentSegmentIndex < segments.length - 1) {
                    changeSegment(currentSegmentIndex + 1);
                  }
                } else {
                  handleReplaySegment();
                }
              }}
              className="flex-1 py-2 px-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-xs font-black flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-indigo-500/25"
            >
              <CheckCircle2 size={14} />
              <span>{segment && normalize(inputValue) === normalize(segment.answer) ? 'Tiếp ➔' : 'Kiểm tra'}</span>
            </button>
          </div>

          {/* Ergonomic Shortcut Pill Hint */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 px-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 font-medium">
                <kbd className="px-1.5 py-0.5 rounded bg-white/60 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px] text-slate-700 dark:text-slate-300">
                  Ctrl+Space
                </kbd>
                <span>Phát/Dừng</span>
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="flex items-center gap-1 font-medium">
                <kbd className="px-1.5 py-0.5 rounded bg-white/60 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px] text-slate-700 dark:text-slate-300">
                  Enter
                </kbd>
                <span>Kiểm tra / Tiếp</span>
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="flex items-center gap-1 font-medium">
                <kbd className="px-1.5 py-0.5 rounded bg-white/60 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono text-[10px] text-slate-700 dark:text-slate-300">
                  Tab
                </kbd>
                <span>Nghe lại câu</span>
              </span>
            </div>

            {completedSegments.has(segment?.id) && (
              <span className="inline-flex items-center gap-1 font-extrabold text-emerald-600 dark:text-emerald-400 text-xs animate-in fade-in">
                <CheckCircle2 size={15} />
                <span>{text.completedSentence}</span>
              </span>
            )}
          </div>

          <div className="space-y-4">
            {/* Word Hints Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-2 font-bold">
                <Eye size={16} className="text-indigo-600 dark:text-cyan-400" />
                <span>{text.clickWordToReveal}</span>
              </span>
              <button
                type="button"
                onClick={() => setShowAllHints((value) => !value)}
                className="flex items-center gap-1.5 rounded-xl bg-white/30 dark:bg-slate-800/40 border border-white/35 dark:border-white/10 px-3.5 py-1.5 text-xs font-black text-indigo-700 dark:text-cyan-300 hover:bg-white/50 dark:hover:bg-slate-800/60 transition-all cursor-pointer shadow-sm"
              >
                {showAllHints ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>{showAllHints ? text.hideAll : text.showAll}</span>
              </button>
            </div>

            {/* Word Tokens Grid with Speech Synthesis & Dictionary Hook */}
            <div className="flex flex-wrap gap-2">
              {answerWords.map((word, index) => {
                const typedWords = inputValue.trim().split(/\s+/).filter(Boolean);
                const typedWord = typedWords[index] || '';
                const hasTypedWord = Boolean(typedWord);
                const isCorrect = hasTypedWord && normalizeWord(typedWord) === normalizeWord(word);
                const isRevealed = showAllHints || revealedWordIndexes.has(index) || isCorrect;
                const visibleWord = isRevealed ? word : showFirstLetters ? maskWithFirstLetter(word) : maskText(word);

                return (
                  <div key={`${word}-${index}`} className="relative group/token inline-block">
                    <button
                      type="button"
                      onClick={() => handleWordTokenClick(word, index, hasTypedWord)}
                      title={isRevealed ? `Bấm để nghe phát âm "${word}"` : 'Bấm để mở từ & nghe phát âm'}
                      className={`rounded-xl border px-3.5 py-2 font-mono text-xs sm:text-sm font-black tracking-wide transition-all cursor-pointer ${
                        isCorrect
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shadow-md shadow-emerald-500/10 hover:bg-emerald-500/25'
                          : hasTypedWord
                          ? 'border-rose-500/35 bg-rose-500/15 text-rose-600 dark:text-rose-400 line-through'
                          : isRevealed
                          ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-700 dark:text-cyan-300 shadow-sm hover:bg-indigo-500/25'
                          : 'border-white/35 dark:border-white/10 bg-white/20 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 hover:border-indigo-500/40 hover:text-indigo-600 dark:hover:text-cyan-300 hover:bg-white/40'
                      }`}
                    >
                      {visibleWord}
                    </button>

                    {/* Quick dictionary tooltip button when revealed */}
                    {isRevealed && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLookupWord(word);
                        }}
                        title={text.lookupDictionary}
                        className="opacity-0 group-hover/token:opacity-100 transition-opacity absolute -top-2.5 -right-2 p-1 rounded-full bg-indigo-600 text-white shadow-md hover:scale-110 z-20 cursor-pointer"
                      >
                        <BookOpen size={11} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer Action Buttons with Shortcuts Info */}
            <div className="flex flex-col gap-3 border-t border-white/25 dark:border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFirstLetters((value) => !value)}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    showFirstLetters
                      ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25'
                      : 'bg-white/25 dark:bg-slate-800/35 border border-white/35 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Keyboard size={16} />
                  <span>{text.firstLetter}</span>
                  <kbd className="rounded border border-current/30 px-1.5 py-0.5 text-[10px] opacity-75 font-mono">Alt+H</kbd>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAllHints((value) => !value)}
                  className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    showAllHints
                      ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-500/25'
                      : 'bg-white/25 dark:bg-slate-800/35 border border-white/35 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-white/40 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Eye size={16} />
                  <span>{text.viewWord}</span>
                  <kbd className="rounded border border-current/30 px-1.5 py-0.5 text-[10px] opacity-75 font-mono">Alt+R</kbd>
                </button>
              </div>

              <button
                type="button"
                onClick={() => changeSegment(currentSegmentIndex + 1)}
                disabled={currentSegmentIndex === segments.length - 1}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 px-6 py-2.5 text-xs sm:text-sm font-black text-white shadow-lg shadow-indigo-500/25 hover:scale-105 active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                <span>{text.next}</span>
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* RIGHT COLUMN: SIDEBAR (TRANSCRIPT & COMPANION) */}
      <aside className="flex w-full shrink-0 flex-col rounded-3xl backdrop-blur-2xl bg-white/30 dark:bg-slate-900/40 border border-white/35 dark:border-white/10 shadow-lg shadow-black/5 lg:w-[390px] xl:w-[420px] overflow-hidden min-h-[450px] lg:min-h-0 lg:h-full">
        {/* Segmented Tabs */}
        <div className="flex items-center gap-2 border-b border-white/20 dark:border-white/10 p-2.5 sm:p-3">
          <button
            type="button"
            onClick={() => setSidebarTab('transcript')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              sidebarTab === 'transcript'
                ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-500/25'
                : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-cyan-400 hover:bg-white/40 dark:hover:bg-slate-800/40'
            }`}
          >
            <List size={16} />
            <span>{text.transcript}</span>
          </button>
          <button
            type="button"
            onClick={() => setSidebarTab('hints')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              sidebarTab === 'hints'
                ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-500/25'
                : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-cyan-400 hover:bg-white/40 dark:hover:bg-slate-800/40'
            }`}
          >
            <Lightbulb size={16} />
            <span>{text.lessonHints}</span>
          </button>
        </div>

        {/* Tab 1: Transcript */}
        {sidebarTab === 'transcript' ? (
          <>
            {/* Progress Strip */}
            <div className="border-b border-white/20 dark:border-white/10 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-black">
                <span className="text-slate-700 dark:text-slate-300">
                  {completedSegments.size} / {segments.length} câu hoàn thành
                </span>
                <span className="text-indigo-600 dark:text-cyan-400 text-sm font-black">
                  {progressPercent}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-800/60">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Performance-Optimized Sentences List using isolated ref scroll */}
            <div ref={sidebarListRef} className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-2 hide-scrollbar">
              {segments.map((item, index) => {
                const isActive = index === currentSegmentIndex;
                const isCompleted = completedSegments.has(item.id);
                const displayText = isCompleted || (showAllHints && isActive)
                  ? item.answer
                  : maskText(item.answer);

                return (
                  <TranscriptSentenceItem
                    key={item.id}
                    item={item}
                    index={index}
                    isActive={isActive}
                    isCompleted={isCompleted}
                    displayText={displayText}
                    onSelect={changeSegment}
                    onReset={resetSegment}
                    text={text}
                    activeRef={isActive ? activeSegmentRef : null}
                  />
                );
              })}
            </div>
          </>
        ) : (
          /* Tab 2: Hints & Related Lessons */
          <div className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar">
            <div className="rounded-2xl border border-white/30 dark:border-white/10 bg-white/20 dark:bg-slate-800/30 p-4">
              <p className="font-black text-sm text-slate-800 dark:text-white flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500" />
                <span>{text.sameLevel(videoData?.level)}</span>
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {text.sameLevelDescription}
              </p>
            </div>

            {isLoadingHints ? (
              <div className="flex items-center justify-center gap-2 py-12 text-xs font-bold text-slate-400">
                <Loader2 size={18} className="animate-spin text-indigo-600 dark:text-cyan-400" />
                <span>{text.loadingHints}</span>
              </div>
            ) : relatedLessons.length ? (
              <div className="space-y-3">
                {relatedLessons.map((lesson) => (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => navigate(`/dictation/${lesson.id}`)}
                    className="group flex w-full gap-3 rounded-2xl border border-white/35 dark:border-white/10 bg-white/25 dark:bg-slate-800/35 backdrop-blur-xl p-3 text-left transition-all hover:bg-white/40 dark:hover:bg-slate-800/50 hover:border-indigo-500/40 cursor-pointer shadow-sm"
                  >
                    {lesson.thumbnail_url ? (
                      <img
                        src={lesson.thumbnail_url}
                        alt=""
                        className="h-16 w-24 shrink-0 rounded-xl object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-cyan-400">
                        <MonitorPlay size={20} />
                      </div>
                    )}
                    <span className="min-w-0 flex-1">
                      <span
                        className={`inline-block mb-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${getLevelColor(
                          lesson.level || videoData?.level
                        )}`}
                      >
                        {lesson.level || videoData?.level}
                      </span>
                      <span className="line-clamp-2 block text-xs sm:text-sm font-bold text-slate-800 dark:text-white leading-snug group-hover:text-indigo-600 dark:group-hover:text-cyan-400 transition-colors">
                        {lesson.title}
                      </span>
                      <span className="mt-1.5 flex items-center gap-1 text-[11px] font-black text-indigo-600 dark:text-cyan-400">
                        <span>{text.startLesson}</span>
                        <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/30 dark:border-white/10 p-8 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                {text.noHints}
              </div>
            )}
          </div>
        )}
      </aside>

      {/* VICTORY CELEBRATION MODAL */}
      {showCelebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white/85 dark:bg-slate-900/90 backdrop-blur-3xl border border-white/50 dark:border-white/10 shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowCelebration(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-xl shadow-orange-500/30">
              <Trophy size={32} />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {text.celebrationTitle}
              </h3>
              <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
                {text.celebrationDesc}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-white/40 dark:bg-slate-800/50 border border-white/30 dark:border-white/5 text-xs font-bold text-slate-700 dark:text-slate-300">
              Đã hoàn thành xuất sắc {segments.length} / {segments.length} câu chép chính tả! 🎉
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                onClick={() => {
                  celebrationShownRef.current = false;
                  changeSegment(0);
                  setShowCelebration(false);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl border border-white/40 dark:border-white/10 bg-white/50 dark:bg-slate-800/60 font-extrabold text-xs text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer"
              >
                {text.replayAll}
              </button>

              {relatedLessons.length > 0 && (
                <button
                  onClick={() => {
                    celebrationShownRef.current = false;
                    setShowCelebration(false);
                    navigate(`/dictation/${relatedLessons[0].id}`);
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 font-extrabold text-xs text-white shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>{text.nextLesson}</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
