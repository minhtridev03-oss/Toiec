import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Headphones,
  Lightbulb,
  List,
  Loader2,
  Mic,
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
    play: 'Phát',
    pause: 'Tạm dừng',
    loopSentence: 'Lặp lại câu',
    nextSentence: 'Câu tiếp',
    autoNext: 'Tự chuyển câu',
    startRecording: 'Bấm để bắt đầu ghi âm (tối đa 30 giây)',
    listening: 'Đang nghe...',
    spoken: 'Bạn đã nói',
    correct: 'Đúng',
    wordsCorrect: (correct, total) => `${correct}/${total} từ đúng`,
    completed: 'Đã hoàn thành',
    notRecorded: 'Chưa ghi âm',
    recordToCheck: 'Bấm ghi âm để kiểm tra câu nói',
    said: (word) => `Bạn nói: ${word}`,
    notRecognized: 'Chưa nhận diện',
    extraWord: 'Từ thừa so với đáp án',
    transcript: 'Bản chép lời',
    lessonHints: 'Gợi ý bài học',
    sameLevel: (level) => `Bài cùng cấp độ ${level || ''}`.trim(),
    sameLevelDescription: 'Chọn một bài khác có độ khó tương đương để tiếp tục luyện nói.',
    loadingHints: 'Đang tìm bài phù hợp...',
    noHints: 'Chưa có bài khác cùng cấp độ.',
    startLesson: 'Mở bài',
    retrySentence: 'Làm lại câu này',
    sentence: 'Câu',
    browserUnsupported: 'Trình duyệt này chưa hỗ trợ nhận diện giọng nói. Vui lòng dùng Chrome hoặc Edge.',
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
    play: 'Play',
    pause: 'Pause',
    loopSentence: 'Loop sentence',
    nextSentence: 'Next sentence',
    autoNext: 'Auto-next',
    startRecording: 'Press to start recording (max 30 seconds)',
    listening: 'Listening...',
    spoken: 'You said',
    correct: 'Correct',
    wordsCorrect: (correct, total) => `${correct}/${total} words correct`,
    completed: 'Completed',
    notRecorded: 'Not recorded',
    recordToCheck: 'Record yourself to check this sentence',
    said: (word) => `You said: ${word}`,
    notRecognized: 'Not recognised',
    extraWord: 'Extra word not in the answer',
    transcript: 'Transcript',
    lessonHints: 'Lesson hints',
    sameLevel: (level) => `More ${level || ''} lessons`.trim(),
    sameLevelDescription: 'Choose another lesson at a similar difficulty to keep practising.',
    loadingHints: 'Finding suitable lessons...',
    noHints: 'No other lessons at this level yet.',
    startLesson: 'Open lesson',
    retrySentence: 'Retry this sentence',
    sentence: 'Sentence',
    browserUnsupported: 'Your browser does not support speech recognition. Please use Chrome or Edge.',
  },
};

const normalizeWord = (value = '') => value.toLowerCase().replace(/[^a-z0-9]/gi, '');

const getSpeechWords = (value = '') => value
  .trim()
  .split(/\s+/)
  .map((raw) => ({ raw, normalized: normalizeWord(raw) }))
  .filter((word) => word.normalized);

const findExactSequenceStart = (targetWords, spokenWords) => {
  if (!targetWords.length || spokenWords.length < targetWords.length) return -1;

  for (let start = 0; start <= spokenWords.length - targetWords.length; start += 1) {
    const matches = targetWords.every((word, index) => (
      spokenWords[start + index]?.normalized === word.normalized
    ));
    if (matches) return start;
  }

  return -1;
};

const containsSpeechSequence = (target = '', spoken = '') => (
  findExactSequenceStart(getSpeechWords(target), getSpeechWords(spoken)) !== -1
);

const buildSpeechComparison = (target = '', spoken = '') => {
  const targetWords = getSpeechWords(target);
  const spokenWords = getSpeechWords(spoken);
  const exactStart = findExactSequenceStart(targetWords, spokenWords);
  const compareStart = exactStart >= 0 ? exactStart : 0;
  const rows = targetWords.map((targetWord, index) => {
    const spokenWord = spokenWords[compareStart + index];
    const isCorrect = Boolean(spokenWord) && spokenWord.normalized === targetWord.normalized;
    return {
      key: `${targetWord.normalized}-${index}`,
      target: targetWord.raw,
      spoken: spokenWord?.raw || '',
      status: spokenWord ? (isCorrect ? 'correct' : 'wrong') : 'missing',
    };
  });

  return {
    rows,
    extraWords: exactStart >= 0
      ? [...spokenWords.slice(0, exactStart), ...spokenWords.slice(exactStart + targetWords.length)]
      : spokenWords.slice(targetWords.length),
    correctCount: rows.filter((row) => row.status === 'correct').length,
    totalCount: targetWords.length,
    isComplete: exactStart >= 0,
  };
};

const formatTime = (seconds) => {
  if (!seconds || Number.isNaN(seconds)) return '00:00';
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
};

export default function VideoShadowingPlayer({ videoData, segments }) {
  const { user } = useAuth();
  const { locale } = useLocale();
  const navigate = useNavigate();
  const text = COPY[locale];

  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const [autoNext, setAutoNext] = useState(true);
  const [completedSegments, setCompletedSegments] = useState(new Set());
  const [isRecording, setIsRecording] = useState(false);
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

  usePracticeSessionTimer('shadowing', user, Boolean(videoData && segments.length > 0), isPlaying);

  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const recognitionRef = useRef(null);
  const captionLastHiddenAtRef = useRef(0);
  const segment = segments[currentSegmentIndex] || segments[0];
  const segmentId = segment?.id;
  const segmentStartTime = segment?.start_time;
  const isCurrentSegmentCompleted = completedSegments.has(segmentId);
  const speechComparison = buildSpeechComparison(segment?.answer, speechTranscript);
  const hasSpeechTranscript = speechTranscript.trim().length > 0;
  const isSpeechCorrect = speechComparison.isComplete;
  const isSpeechPanelSuccess = hasSpeechTranscript ? isSpeechCorrect : isCurrentSegmentCompleted;
  const progressPercent = segments.length
    ? Math.round((completedSegments.size / segments.length) * 100)
    : 0;

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

  const completeCurrentSegment = () => {
    if (!segmentId) return;

    recognitionRef.current?.stop();
    setIsRecording(false);
    setCompletedSegments((previous) => new Set(previous).add(segmentId));

    if (user?.id && videoData?.id) {
      supabase
        .from('user_dictation_progress')
        .upsert({
          user_id: user.id,
          video_id: videoData.id,
          segment_id: segmentId,
          is_completed: true,
        }, { onConflict: 'user_id,segment_id' })
        .then(({ error }) => {
          if (error) console.error('Unable to save shadowing progress:', error);
        });
    }

    if (autoNext && currentSegmentIndex < segments.length - 1) {
      window.setTimeout(() => setCurrentSegmentIndex((index) => index + 1), 900);
    }
  };

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return undefined;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      let transcript = '';
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }
      setSpeechTranscript(transcript);
      if (segment?.answer && containsSpeechSequence(segment.answer, transcript)) {
        completeCurrentSegment();
      }
    };
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      if (recognitionRef.current === recognition) recognitionRef.current = null;
    };
    // Recognition must follow the active sentence, current user, and its auto-next setting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment?.answer, segmentId, autoNext, currentSegmentIndex, segments.length, user?.id, videoData?.id]);

  useEffect(() => {
    if (!segmentId) return;
    setSpeechTranscript('');
    recognitionRef.current?.stop();
    setIsRecording(false);

    if (playerRef.current?.seekTo) {
      playerRef.current.seekTo(segmentStartTime, true);
      playerRef.current.playVideo();
    }
  }, [segmentId, segmentStartTime]);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
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

    if (currentTime >= segment.end_time) {
      if (isLooping) playerRef.current.seekTo(segment.start_time, true);
      else playerRef.current.pauseVideo();
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

  const replaySegment = () => {
    if (!playerRef.current || !segment) return;
    playerRef.current.seekTo(segment.start_time, true);
    playerRef.current.playVideo();
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    if (!recognitionRef.current) {
      window.alert(text.browserUnsupported);
      return;
    }

    setSpeechTranscript('');
    try {
      recognitionRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Unable to start speech recognition:', error);
    }
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
      // YouTube keeps the nearest available quality when a preference is unavailable.
    }
  };

  const resetSegment = (event, targetSegmentId) => {
    event.stopPropagation();
    setCompletedSegments((previous) => {
      const next = new Set(previous);
      next.delete(targetSegmentId);
      return next;
    });
    if (segmentId === targetSegmentId) setSpeechTranscript('');
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
    },
  };

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto bg-[#fff7fb] text-slate-800 dark:bg-[#100813] dark:text-white lg:flex-row lg:overflow-hidden">
      <section className="flex min-w-0 flex-1 flex-col bg-white/70 dark:bg-[#120a17] lg:overflow-y-auto">
        <header className="relative z-20 flex min-h-20 items-center justify-between gap-3 border-b border-pink-100 bg-white/95 px-4 py-3 dark:border-white/5 dark:bg-[#160c1c] sm:px-6">
          <Link to="/shadowing" className="flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-pink-600 dark:text-slate-400 dark:hover:text-pink-200">
            <ChevronLeft size={19} />
            <span>{text.back}</span>
          </Link>

          <div className="flex items-center rounded-xl bg-pink-50 p-1 dark:bg-white/5">
            <button onClick={() => navigate(`/dictation/${videoData?.id}`)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-500 transition-colors hover:text-pink-600 dark:text-slate-400 dark:hover:text-pink-200">
              <Headphones size={17} />
              <span className="hidden sm:inline">{text.dictation}</span>
            </button>
            <button className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-bold text-pink-600 shadow-sm dark:bg-pink-500/15 dark:text-pink-200">
              <Mic size={17} />
              <span className="hidden sm:inline">{text.shadowing}</span>
            </button>
          </div>

          <div className="flex min-w-[72px] items-center justify-end gap-1.5">
            <div className="relative">
              <button type="button" onClick={() => { setIsVolumeMenuOpen((open) => !open); setIsSettingsOpen(false); }} title={text.volume} aria-label={text.volume} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-pink-50 hover:text-pink-600 dark:text-slate-400 dark:hover:bg-pink-500/10 dark:hover:text-pink-200">
                {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              {isVolumeMenuOpen && <div className="absolute right-0 top-full z-30 mt-2 w-52 rounded-xl border border-pink-100 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-[#24152c]"><div className="mb-3 flex items-center justify-between text-sm font-bold text-slate-700 dark:text-white"><span>{text.volume}</span><span className="text-pink-600 dark:text-pink-300">{volume}%</span></div><input type="range" min="0" max="100" step="5" value={volume} onChange={(event) => handleVolumeChange(event.target.value)} className="w-full accent-pink-500" aria-label={text.volume} /></div>}
            </div>

            <div className="relative">
              <button type="button" onClick={() => { setIsSettingsOpen((open) => !open); setIsVolumeMenuOpen(false); }} title={text.settings} aria-label={text.settings} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-pink-50 hover:text-pink-600 dark:text-slate-400 dark:hover:bg-pink-500/10 dark:hover:text-pink-200"><Settings size={20} /></button>
              {isSettingsOpen && <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border border-pink-100 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-[#24152c]"><p className="mb-2 text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">{text.videoQuality}</p><div className="grid grid-cols-3 gap-1.5">{availableQualities.map((option) => <button key={option} type="button" onClick={() => changeQuality(option)} className={`rounded-lg px-2 py-2 text-xs font-bold transition-colors ${quality === option ? 'bg-pink-500 text-white' : 'bg-pink-50 text-slate-600 hover:bg-pink-100 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'}`}>{option === 'default' ? text.auto : QUALITY_LABELS[option] || option}</button>)}</div></div>}
            </div>
          </div>
        </header>

        <div className="relative aspect-video w-full shrink-0 bg-black">
          <LessonMediaPlayer
            videoData={videoData}
            opts={opts}
            onReady={onPlayerReady}
            onStateChange={onPlayerStateChange}
            className="absolute inset-0 h-full w-full pointer-events-none"
          />
        </div>

        <div className="flex flex-col gap-4 border-b border-pink-100 bg-white px-4 py-4 dark:border-white/5 dark:bg-[#160c1c] sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="w-24 text-sm font-bold tabular-nums text-slate-500 dark:text-slate-400">{currentTimeDisplay} / {durationDisplay}</div>
          <div className="flex items-center justify-center gap-2 sm:gap-4">
            <button type="button" onClick={() => currentSegmentIndex > 0 && setCurrentSegmentIndex((index) => index - 1)} disabled={currentSegmentIndex === 0} title={text.previousSentence} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-pink-50 hover:text-pink-600 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-400 dark:hover:bg-pink-500/10 dark:hover:text-pink-200"><SkipBack size={20} /></button>
            <button type="button" onClick={replaySegment} title={text.replaySentence} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-pink-50 hover:text-pink-600 dark:text-slate-400 dark:hover:bg-pink-500/10 dark:hover:text-pink-200"><RotateCcw size={20} /></button>
            <button type="button" onClick={handlePlayPause} title={isPlaying ? text.pause : text.play} className="flex h-11 w-11 items-center justify-center rounded-full bg-pink-500 text-white shadow-lg shadow-pink-500/25 transition-colors hover:bg-pink-600">{isPlaying ? <Pause size={20} className="fill-current" /> : <Play size={20} className="ml-0.5 fill-current" />}</button>
            <button type="button" onClick={() => setIsLooping((looping) => !looping)} title={text.loopSentence} className={`rounded-lg p-2 transition-colors ${isLooping ? 'bg-pink-50 text-pink-600 dark:bg-pink-500/15 dark:text-pink-200' : 'text-slate-500 hover:bg-pink-50 hover:text-pink-600 dark:text-slate-400 dark:hover:bg-pink-500/10 dark:hover:text-pink-200'}`}><Repeat size={20} /></button>
            <button type="button" onClick={() => currentSegmentIndex < segments.length - 1 && setCurrentSegmentIndex((index) => index + 1)} disabled={currentSegmentIndex === segments.length - 1} title={text.nextSentence} className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-pink-50 hover:text-pink-600 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-400 dark:hover:bg-pink-500/10 dark:hover:text-pink-200"><SkipForward size={20} /></button>
          </div>
          <div className="flex items-center justify-center gap-1 rounded-lg bg-pink-50 p-1 text-xs font-bold dark:bg-white/5">{[0.5, 0.75, 1, 1.25, 1.5].map((speed) => <button key={speed} type="button" onClick={() => changeSpeed(speed)} className={`rounded-md px-2.5 py-1.5 transition-colors ${playbackRate === speed ? 'bg-white text-pink-600 shadow-sm dark:bg-pink-500 dark:text-white' : 'text-slate-500 hover:text-pink-600 dark:text-slate-400 dark:hover:text-pink-200'}`}>{speed}x</button>)}</div>
        </div>

        <div className="border-b border-pink-100 bg-[#fffafd] px-4 py-3 text-sm dark:border-white/5 dark:bg-[#120a17] sm:px-6">
          <button type="button" onClick={() => setAutoNext((value) => !value)} className="flex items-center gap-2 font-semibold text-slate-500 transition-colors hover:text-pink-600 dark:text-slate-400 dark:hover:text-pink-200"><span className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${autoNext ? 'bg-pink-500' : 'bg-slate-300 dark:bg-slate-700'}`}><span className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${autoNext ? 'translate-x-4' : ''}`} /></span>{text.autoNext}</button>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center p-6">
          <p className={`mb-10 text-center text-2xl font-semibold transition-colors md:text-3xl ${isCurrentSegmentCompleted ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-800 dark:text-white'}`}>{segment?.answer}</p>
          <button type="button" onClick={toggleRecording} className={`flex h-24 w-24 items-center justify-center rounded-full text-white transition-all ${isRecording ? 'scale-110 animate-pulse bg-rose-500 shadow-lg shadow-rose-500/50' : 'bg-pink-500 shadow-lg shadow-pink-500/30 hover:scale-105 hover:bg-pink-600'}`}><Mic size={40} /></button>
          <p className="mt-4 font-medium text-slate-500 dark:text-slate-400">{isRecording ? text.listening : text.startRecording}</p>

          <div className="mt-5 w-full max-w-3xl">
            <div className={`rounded-2xl border px-4 py-3 transition-colors ${isSpeechPanelSuccess ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10' : hasSpeechTranscript ? 'border-pink-100 bg-white dark:border-pink-500/20 dark:bg-[#1e1226]' : 'border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5'}`}>
              <div className="mb-3 flex items-center justify-between gap-3"><span className="text-sm font-bold text-slate-600 dark:text-slate-300">{text.spoken}</span><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${isSpeechPanelSuccess ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : hasSpeechTranscript ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300' : 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}>{hasSpeechTranscript ? (isSpeechCorrect ? text.correct : text.wordsCorrect(speechComparison.correctCount, speechComparison.totalCount)) : (isCurrentSegmentCompleted ? text.completed : text.notRecorded)}</span></div>
              <div className="flex min-h-8 flex-wrap items-center justify-center gap-2 text-base font-semibold sm:text-lg">{hasSpeechTranscript ? <>{speechComparison.rows.map((row) => <span key={row.key} title={row.spoken ? text.said(row.spoken) : text.notRecognized} className={`rounded-lg px-2.5 py-1 transition-colors ${row.status === 'correct' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : row.status === 'wrong' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300' : 'bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400'}`}>{row.spoken || row.target}</span>)}{speechComparison.extraWords.map((word, index) => <span key={`extra-${word.normalized}-${index}`} title={text.extraWord} className="rounded-lg bg-amber-100 px-2.5 py-1 text-amber-700 transition-colors dark:bg-amber-500/20 dark:text-amber-300">{word.raw}</span>)}</> : <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{isRecording ? text.listening : text.recordToCheck}</span>}</div>
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
              <div className="mb-2 flex items-center justify-between text-sm font-bold text-slate-500 dark:text-slate-400">
                <span>{completedSegments.size}/{segments.length}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-pink-100 dark:bg-white/10">
                <div className="h-full rounded-full bg-pink-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            <div className="max-h-[540px] flex-1 overflow-y-auto p-2 lg:max-h-none">
              {segments.map((item, index) => {
                const isActive = index === currentSegmentIndex;
                const isCompleted = completedSegments.has(item.id);

                return (
                  <div key={item.id} className={`relative mb-1 rounded-xl border transition-colors ${isActive ? 'border-pink-200 bg-pink-50 dark:border-pink-500/25 dark:bg-pink-500/10' : 'border-transparent hover:bg-pink-50 dark:hover:bg-white/5'}`}>
                    <button type="button" onClick={() => setCurrentSegmentIndex(index)} className="flex w-full items-start gap-3 p-4 pr-11 text-left">
                      <span className={`mt-0.5 shrink-0 ${isCompleted ? 'text-emerald-500' : isActive ? 'text-pink-500' : 'text-slate-300 dark:text-slate-600'}`}>
                        {isCompleted ? <CheckCircle2 size={18} /> : <span className="block h-[18px] w-[18px] rounded-full border-2 border-current" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{text.sentence} {index + 1}</span>
                        <span className={`block text-sm font-medium leading-relaxed ${isCompleted ? 'text-slate-700 dark:text-slate-200' : 'text-slate-600 dark:text-slate-400'}`}>{item.answer}</span>
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

            {isLoadingHints ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400"><Loader2 size={18} className="animate-spin" />{text.loadingHints}</div>
            ) : relatedLessons.length ? (
              <div className="space-y-3">
                {relatedLessons.map((lesson) => (
                  <button key={lesson.id} type="button" onClick={() => navigate(`/shadowing/${lesson.id}`)} className="group flex w-full gap-3 rounded-xl border border-pink-100 bg-white p-3 text-left transition-colors hover:border-pink-300 hover:bg-pink-50 dark:border-white/10 dark:bg-white/5 dark:hover:border-pink-500/40 dark:hover:bg-pink-500/10">
                    {lesson.thumbnail_url ? <img src={lesson.thumbnail_url} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" /> : <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg bg-pink-100 text-pink-500 dark:bg-pink-500/15"><MonitorPlay size={21} /></div>}
                    <span className="min-w-0 flex-1"><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-pink-500">{lesson.level || videoData?.level}</span><span className="line-clamp-2 block text-sm font-bold leading-snug text-slate-800 dark:text-white">{lesson.title}</span><span className="mt-2 flex items-center gap-1 text-xs font-bold text-pink-600 dark:text-pink-200">{text.startLesson}<ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" /></span></span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-pink-200 p-8 text-center text-sm text-slate-400 dark:border-white/10 dark:text-slate-500">{text.noHints}</div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
