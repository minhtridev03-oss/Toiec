import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Eye,
  EyeOff,
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
  Volume2,
  VolumeX,
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
    previousSentence: 'Câu trước',
    replaySentence: 'Nghe lại câu',
    pause: 'Tạm dừng',
    play: 'Phát',
    loopSentence: 'Lặp lại câu',
    nextSentence: 'Câu tiếp',
    autoNext: 'Tự chuyển câu',
    typeWhatYouHear: 'Nhập câu bạn nghe được...',
    clickWordToReveal: 'Bấm vào từ để xem',
    showAll: 'Xem toàn bộ',
    hideAll: 'Ẩn toàn bộ',
    firstLetter: 'Ký tự đầu',
    viewWord: 'Xem từ',
    next: 'Câu tiếp',
    transcript: 'Bản chép lời',
    lessonHints: 'Gợi ý bài học',
    sameLevel: (level) => `Bài cùng cấp độ ${level || ''}`.trim(),
    sameLevelDescription: 'Chọn một bài khác có độ khó tương đương để tiếp tục luyện nghe.',
    loadingHints: 'Đang tìm bài phù hợp...',
    noHints: 'Chưa có bài khác cùng cấp độ.',
    startLesson: 'Mở bài',
    retrySentence: 'Làm lại câu này',
    sentence: 'Câu',
  },
  en: {
    back: 'Back',
    dictation: 'Dictation',
    shadowing: 'Shadowing',
    volume: 'Volume',
    settings: 'Player settings',
    videoQuality: 'Video quality',
    auto: 'Auto',
    previousSentence: 'Previous sentence',
    replaySentence: 'Replay sentence',
    pause: 'Pause',
    play: 'Play',
    loopSentence: 'Loop sentence',
    nextSentence: 'Next sentence',
    autoNext: 'Auto-next',
    typeWhatYouHear: 'Type what you hear...',
    clickWordToReveal: 'Click a word to reveal it',
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
  },
};

const normalize = (value = '') =>
  value.toLowerCase().replace(/[.,!?]/g, '').replace(/\s+/g, ' ').trim();

const normalizeWord = (value = '') => value.toLowerCase().replace(/[^a-z0-9]/gi, '');

const formatTime = (seconds) => {
  if (!seconds || Number.isNaN(seconds)) return '00:00';
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
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

export default function VideoDictationPlayer({ videoData, segments }) {
  const { user } = useAuth();
  const { locale } = useLocale();
  const navigate = useNavigate();
  const text = COPY[locale];

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

  usePracticeSessionTimer('dictation', user, Boolean(videoData && segments.length > 0), isPlaying);

  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const completedSegmentsRef = useRef(new Set());
  const captionLastHiddenAtRef = useRef(0);
  const segment = segments[currentSegmentIndex] || segments[0];
  const segmentId = segment?.id;
  const segmentAnswer = segment?.answer;
  const segmentStartTime = segment?.start_time;
  const answerWords = useMemo(() => segment?.answer?.split(/\s+/).filter(Boolean) || [], [segment?.answer]);
  const progressPercent = segments.length
    ? Math.round((completedSegments.size / segments.length) * 100)
    : 0;

  useEffect(() => {
    completedSegmentsRef.current = completedSegments;
  }, [completedSegments]);

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
        setCompletedSegments(new Set(data.map((item) => item.segment_id)));
      }
    };

    fetchProgress();
    return () => {
      cancelled = true;
    };
  }, [user?.id, videoData?.id]);

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

  useEffect(() => {
    if (!segmentId) return;

    setShowAllHints(false);
    setShowFirstLetters(false);
    setRevealedWordIndexes(new Set());
    setInputValue(completedSegmentsRef.current.has(segmentId) ? segmentAnswer : '');

    if (playerRef.current?.seekTo) {
      playerRef.current.seekTo(segmentStartTime, true);
      playerRef.current.playVideo();
    }
  }, [segmentAnswer, segmentId, segmentStartTime]);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    const handleShortcut = (event) => {
      if (!event.altKey) return;
      if (event.key.toLowerCase() === 'h') {
        event.preventDefault();
        setShowFirstLetters((value) => !value);
      }
      if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        setShowAllHints((value) => !value);
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  const forceCaptionsOff = () => {
    const player = playerRef.current;
    if (!player) return;
    const now = Date.now();
    if (now - captionLastHiddenAtRef.current < 750) return;
    captionLastHiddenAtRef.current = now;

    try {
      player.unloadModule?.('captions');
      player.setOption?.('captions', 'track', { languageCode: '' });
    } catch {
      // A video may not expose the captions module through the IFrame API.
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
      forceCaptionsOff();
      if (!intervalRef.current) intervalRef.current = window.setInterval(checkTime, 100);
      return;
    }

    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const checkTime = () => {
    if (!playerRef.current || !segment) return;
    const currentTime = playerRef.current.getCurrentTime();
    forceCaptionsOff();
    setCurrentTimeDisplay(formatTime(currentTime));

    if (currentTime >= segment.end_time) {
      if (isLooping) playerRef.current.seekTo(segment.start_time, true);
      else playerRef.current.pauseVideo();
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

  const handleReplaySegment = () => {
    if (!playerRef.current || !segment) return;
    playerRef.current.seekTo(segment.start_time, true);
    playerRef.current.playVideo();
  };

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
      // YouTube will keep the nearest available quality if the requested option is not supported.
    }
  };

  const handleInputChange = (event) => {
    const value = event.target.value;
    setInputValue(value);
    if (!segment || normalize(value) !== normalize(segment.answer)) return;

    setCompletedSegments((previous) => new Set(previous).add(segment.id));
    if (user?.id && videoData?.id) {
      supabase
        .from('user_dictation_progress')
        .upsert({
          user_id: user.id,
          video_id: videoData.id,
          segment_id: segment.id,
          is_completed: true,
        }, { onConflict: 'user_id,segment_id' })
        .then(({ error }) => {
          if (error) console.error('Unable to save dictation progress:', error);
        });
    }

    if (autoNext && currentSegmentIndex < segments.length - 1) {
      window.setTimeout(() => setCurrentSegmentIndex((index) => index + 1), 900);
    }
  };

  const resetSegment = (event, segmentId) => {
    event.stopPropagation();
    setCompletedSegments((previous) => {
      const next = new Set(previous);
      next.delete(segmentId);
      return next;
    });
    if (segment?.id === segmentId) setInputValue('');
  };

  const toggleRevealedWord = (index) => {
    setRevealedWordIndexes((previous) => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const transcriptValue = (item, index) => (
    completedSegments.has(item.id) || (showAllHints && index === currentSegmentIndex)
      ? item.answer
      : maskText(item.answer)
  );

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
    },
  };

  return (
    <div className="flex flex-1 min-h-0 w-full flex-col overflow-y-auto bg-[#fff7fb] text-slate-800 dark:bg-[#100813] dark:text-white lg:flex-row lg:overflow-hidden">
      <section className="flex min-w-0 flex-1 flex-col bg-white/70 dark:bg-[#120a17] lg:overflow-y-auto">
        <header className="relative z-20 flex min-h-20 items-center justify-between gap-3 border-b border-pink-100 bg-white/95 px-4 py-3 dark:border-white/5 dark:bg-[#160c1c] sm:px-6">
          <Link to="/dictation" className="flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-pink-600 dark:text-slate-400 dark:hover:text-pink-300">
            <ChevronLeft size={19} />
            <span>{text.back}</span>
          </Link>

          <div className="flex items-center rounded-xl bg-pink-50 p-1 dark:bg-white/5">
            <button className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-bold text-pink-600 shadow-sm dark:bg-pink-500/15 dark:text-pink-200">
              <Keyboard size={17} />
              <span className="hidden sm:inline">{text.dictation}</span>
            </button>
            <button
              onClick={() => navigate(`/shadowing/${videoData?.id}`)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 transition-colors hover:text-pink-600 dark:text-slate-400 dark:hover:text-pink-200"
            >
              <MonitorPlay size={17} />
              <span className="hidden sm:inline">{text.shadowing}</span>
            </button>
          </div>

          <div className="flex min-w-[72px] items-center justify-end gap-1.5">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsVolumeMenuOpen((open) => !open);
                  setIsSettingsOpen(false);
                }}
                title={text.volume}
                aria-label={text.volume}
                aria-expanded={isVolumeMenuOpen}
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-pink-50 hover:text-pink-600 dark:text-slate-400 dark:hover:bg-pink-500/10 dark:hover:text-pink-200"
              >
                {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              {isVolumeMenuOpen && (
                <div className="absolute right-0 top-full z-30 mt-2 w-52 rounded-xl border border-pink-100 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-[#24152c]">
                  <div className="mb-3 flex items-center justify-between text-sm font-bold text-slate-700 dark:text-white">
                    <span>{text.volume}</span>
                    <span className="text-pink-600 dark:text-pink-300">{volume}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={volume}
                    onChange={(event) => handleVolumeChange(event.target.value)}
                    className="accent-pink-500 w-full"
                    aria-label={text.volume}
                  />
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsSettingsOpen((open) => !open);
                  setIsVolumeMenuOpen(false);
                }}
                title={text.settings}
                aria-label={text.settings}
                aria-expanded={isSettingsOpen}
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-pink-50 hover:text-pink-600 dark:text-slate-400 dark:hover:bg-pink-500/10 dark:hover:text-pink-200"
              >
                <Settings size={20} />
              </button>
              {isSettingsOpen && (
                <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border border-pink-100 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-[#24152c]">
                  <p className="mb-2 text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">{text.videoQuality}</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {availableQualities.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => changeQuality(option)}
                        className={`rounded-lg px-2 py-2 text-xs font-bold transition-colors ${
                          quality === option
                            ? 'bg-pink-500 text-white'
                            : 'bg-pink-50 text-slate-600 hover:bg-pink-100 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'
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

        <div className="relative w-full shrink-0 aspect-video bg-black">
          <LessonMediaPlayer
            videoData={videoData}
            opts={opts}
            onReady={onPlayerReady}
            onStateChange={onPlayerStateChange}
            className="absolute inset-0 h-full w-full pointer-events-none"
          />
        </div>

        <div className="flex flex-col gap-4 border-b border-pink-100 bg-white px-4 py-4 dark:border-white/5 dark:bg-[#160c1c] sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="w-24 text-sm font-bold tabular-nums text-slate-500 dark:text-slate-400">
            {currentTimeDisplay} / {durationDisplay}
          </div>

          <div className="flex items-center justify-center gap-2 sm:gap-4">
            <button type="button" onClick={() => currentSegmentIndex > 0 && setCurrentSegmentIndex((index) => index - 1)} disabled={currentSegmentIndex === 0} title={text.previousSentence} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-pink-50 hover:text-pink-600 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-400 dark:hover:bg-pink-500/10 dark:hover:text-pink-200"><SkipBack size={20} /></button>
            <button type="button" onClick={handleReplaySegment} title={text.replaySentence} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-pink-50 hover:text-pink-600 dark:text-slate-400 dark:hover:bg-pink-500/10 dark:hover:text-pink-200"><RotateCcw size={20} /></button>
            <button type="button" onClick={handlePlayPause} title={isPlaying ? text.pause : text.play} className="flex h-11 w-11 items-center justify-center rounded-full bg-pink-500 text-white shadow-lg shadow-pink-500/25 transition-colors hover:bg-pink-600">{isPlaying ? <Pause size={20} className="fill-current" /> : <Play size={20} className="ml-0.5 fill-current" />}</button>
            <button type="button" onClick={() => setIsLooping((looping) => !looping)} title={text.loopSentence} className={`rounded-lg p-2 transition-colors ${isLooping ? 'bg-pink-50 text-pink-600 dark:bg-pink-500/15 dark:text-pink-200' : 'text-slate-500 hover:bg-pink-50 hover:text-pink-600 dark:text-slate-400 dark:hover:bg-pink-500/10 dark:hover:text-pink-200'}`}><Repeat size={20} /></button>
            <button type="button" onClick={() => currentSegmentIndex < segments.length - 1 && setCurrentSegmentIndex((index) => index + 1)} disabled={currentSegmentIndex === segments.length - 1} title={text.nextSentence} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-pink-50 hover:text-pink-600 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-400 dark:hover:bg-pink-500/10 dark:hover:text-pink-200"><SkipForward size={20} /></button>
          </div>

          <div className="flex items-center justify-center gap-1 rounded-lg bg-pink-50 p-1 text-xs font-bold dark:bg-white/5">
            {[0.5, 0.75, 1, 1.25, 1.5].map((speed) => (
              <button key={speed} type="button" onClick={() => changeSpeed(speed)} className={`rounded-md px-2.5 py-1.5 transition-colors ${playbackRate === speed ? 'bg-white text-pink-600 shadow-sm dark:bg-pink-500 dark:text-white' : 'text-slate-500 hover:text-pink-600 dark:text-slate-400 dark:hover:text-pink-200'}`}>{speed}x</button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pink-100 bg-[#fffafd] px-4 py-3 text-sm dark:border-white/5 dark:bg-[#120a17] sm:px-6">
          <button type="button" onClick={() => setAutoNext((value) => !value)} className="flex items-center gap-2 font-semibold text-slate-500 transition-colors hover:text-pink-600 dark:text-slate-400 dark:hover:text-pink-200">
            <span className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${autoNext ? 'bg-pink-500' : 'bg-slate-300 dark:bg-slate-700'}`}><span className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${autoNext ? 'translate-x-4' : ''}`} /></span>
            {text.autoNext}
          </button>
        </div>

        <div className="flex flex-1 flex-col p-4 sm:p-6">
          <textarea
            value={inputValue}
            onChange={handleInputChange}
            placeholder={text.typeWhatYouHear}
            className={`min-h-32 w-full resize-none rounded-2xl border-2 bg-white p-4 text-lg font-medium text-slate-800 outline-none transition-colors placeholder:text-slate-400 dark:bg-[#1c1022] dark:text-white dark:placeholder:text-slate-500 ${completedSegments.has(segment?.id) ? 'border-emerald-400 focus:border-emerald-500' : 'border-pink-100 focus:border-pink-400 dark:border-white/10 dark:focus:border-pink-400'}`}
          />

          <div className="mt-5 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-2 font-medium"><Eye size={16} />{text.clickWordToReveal}</span>
              <button type="button" onClick={() => setShowAllHints((value) => !value)} className="flex items-center gap-1.5 rounded-lg bg-pink-50 px-3 py-2 text-xs font-bold text-pink-600 transition-colors hover:bg-pink-100 dark:bg-pink-500/10 dark:text-pink-200 dark:hover:bg-pink-500/20">
                {showAllHints ? <EyeOff size={14} /> : <Eye size={14} />}
                {showAllHints ? text.hideAll : text.showAll}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {answerWords.map((word, index) => {
                const typedWord = inputValue.split(/\s+/)[index] || '';
                const hasTypedWord = Boolean(typedWord);
                const isCorrect = hasTypedWord && normalizeWord(typedWord) === normalizeWord(word);
                const isRevealed = showAllHints || revealedWordIndexes.has(index) || isCorrect;
                const visibleWord = isRevealed ? word : (showFirstLetters ? maskWithFirstLetter(word) : maskText(word));

                return (
                  <button
                    key={`${word}-${index}`}
                    type="button"
                    onClick={() => !hasTypedWord && toggleRevealedWord(index)}
                    className={`rounded-lg border px-3 py-2 font-mono text-sm font-bold tracking-wide transition-colors ${
                      isCorrect
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                        : hasTypedWord
                          ? 'border-rose-300 bg-rose-50 text-rose-600 line-through dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300'
                          : isRevealed
                            ? 'border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-500/30 dark:bg-pink-500/10 dark:text-pink-200'
                            : 'border-pink-100 bg-white text-slate-500 hover:border-pink-300 hover:text-pink-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:border-pink-400 dark:hover:text-pink-200'
                    }`}
                  >
                    {visibleWord}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 border-t border-pink-100 pt-4 dark:border-white/5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setShowFirstLetters((value) => !value)} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${showFirstLetters ? 'bg-pink-500 text-white' : 'bg-pink-50 text-slate-600 hover:bg-pink-100 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'}`}><Keyboard size={16} />{text.firstLetter}<kbd className="rounded border border-current/20 px-1.5 py-0.5 text-[10px] opacity-70">Alt+H</kbd></button>
                <button type="button" onClick={() => setShowAllHints((value) => !value)} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${showAllHints ? 'bg-pink-500 text-white' : 'bg-pink-50 text-slate-600 hover:bg-pink-100 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'}`}><Eye size={16} />{text.viewWord}<kbd className="rounded border border-current/20 px-1.5 py-0.5 text-[10px] opacity-70">Alt+R</kbd></button>
              </div>
              <button type="button" onClick={() => currentSegmentIndex < segments.length - 1 && setCurrentSegmentIndex((index) => index + 1)} disabled={currentSegmentIndex === segments.length - 1} className="flex items-center justify-center gap-2 rounded-lg bg-pink-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-pink-500/20 transition-colors hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-40">{text.next}<ArrowRight size={17} /></button>
            </div>
          </div>
        </div>
      </section>

      <aside className="flex w-full shrink-0 flex-col border-t border-pink-100 bg-white dark:border-white/5 dark:bg-[#160c1c] lg:w-[390px] lg:border-l lg:border-t-0">
        <div className="flex items-center gap-4 border-b border-pink-100 px-4 pt-4 dark:border-white/5">
          <button type="button" onClick={() => setSidebarTab('transcript')} className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-bold transition-colors ${sidebarTab === 'transcript' ? 'border-pink-500 text-slate-800 dark:text-white' : 'border-transparent text-slate-400 hover:text-pink-600 dark:text-slate-500 dark:hover:text-pink-200'}`}><List size={17} />{text.transcript}</button>
          <button type="button" onClick={() => setSidebarTab('hints')} className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-bold transition-colors ${sidebarTab === 'hints' ? 'border-pink-500 text-slate-800 dark:text-white' : 'border-transparent text-slate-400 hover:text-pink-600 dark:text-slate-500 dark:hover:text-pink-200'}`}><Lightbulb size={17} />{text.lessonHints}</button>
        </div>

        {sidebarTab === 'transcript' ? (
          <>
            <div className="border-b border-pink-100 p-5 dark:border-white/5">
              <div className="mb-2 flex items-center justify-between text-sm font-bold text-slate-500 dark:text-slate-400"><span>{completedSegments.size}/{segments.length}</span><span>{progressPercent}%</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-pink-100 dark:bg-white/10"><div className="h-full rounded-full bg-pink-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} /></div>
            </div>
            <div className="max-h-[540px] flex-1 overflow-y-auto p-2 lg:max-h-none">
              {segments.map((item, index) => {
                const isActive = index === currentSegmentIndex;
                const isCompleted = completedSegments.has(item.id);
                return (
                  <div key={item.id} className={`relative mb-1 rounded-xl border transition-colors ${isActive ? 'border-pink-200 bg-pink-50 dark:border-pink-500/25 dark:bg-pink-500/10' : 'border-transparent hover:bg-pink-50 dark:hover:bg-white/5'}`}>
                    <button type="button" onClick={() => setCurrentSegmentIndex(index)} className="flex w-full items-start gap-3 p-4 pr-11 text-left">
                      <span className={`mt-0.5 shrink-0 ${isCompleted ? 'text-emerald-500' : isActive ? 'text-pink-500' : 'text-slate-300 dark:text-slate-600'}`}>{isCompleted ? <CheckCircle2 size={18} /> : <span className="block h-[18px] w-[18px] rounded-full border-2 border-current" />}</span>
                      <span className="min-w-0 flex-1">
                        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{text.sentence} {index + 1}</span>
                        <span className={`block text-sm leading-relaxed font-medium ${isCompleted ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>{transcriptValue(item, index)}</span>
                      </span>
                    </button>
                    {isCompleted && <button type="button" onClick={(event) => resetSegment(event, item.id)} title={text.retrySentence} aria-label={text.retrySentence} className="absolute right-3 top-3 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-pink-600 dark:hover:bg-white/10 dark:hover:text-pink-200"><RotateCcw size={15} /></button>}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="max-h-[540px] flex-1 overflow-y-auto p-4 lg:max-h-none">
            <div className="mb-4 rounded-xl border border-pink-100 bg-pink-50 p-4 dark:border-pink-500/15 dark:bg-pink-500/10">
              <p className="font-bold text-slate-800 dark:text-white">{text.sameLevel(videoData?.level)}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{text.sameLevelDescription}</p>
            </div>
            {isLoadingHints ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400"><Loader2 size={18} className="animate-spin" />{text.loadingHints}</div> : relatedLessons.length ? <div className="space-y-3">{relatedLessons.map((lesson) => <button key={lesson.id} type="button" onClick={() => navigate(`/dictation/${lesson.id}`)} className="group flex w-full gap-3 rounded-xl border border-pink-100 bg-white p-3 text-left transition-colors hover:border-pink-300 hover:bg-pink-50 dark:border-white/10 dark:bg-white/5 dark:hover:border-pink-500/40 dark:hover:bg-pink-500/10">{lesson.thumbnail_url ? <img src={lesson.thumbnail_url} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" /> : <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg bg-pink-100 text-pink-500 dark:bg-pink-500/15"><MonitorPlay size={21} /></div>}<span className="min-w-0 flex-1"><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-pink-500">{lesson.level || videoData?.level}</span><span className="line-clamp-2 block text-sm font-bold leading-snug text-slate-800 dark:text-white">{lesson.title}</span><span className="mt-2 flex items-center gap-1 text-xs font-bold text-pink-600 dark:text-pink-200">{text.startLesson}<ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" /></span></span></button>)}</div> : <div className="rounded-xl border border-dashed border-pink-200 p-8 text-center text-sm text-slate-400 dark:border-white/10 dark:text-slate-500">{text.noHints}</div>}
          </div>
        )}
      </aside>
    </div>
  );
}
