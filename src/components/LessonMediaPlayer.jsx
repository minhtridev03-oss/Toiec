import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import YouTube from 'react-youtube';
import { Headphones, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useLocale } from '../contexts/LocaleContext';

const AUDIO_BUCKET = 'listening-audio';
const SIGNED_URL_TTL_SECONDS = 4 * 60 * 60;

const COPY = {
  vi: {
    label: 'Bài luyện nghe',
    loading: 'Đang tải audio...',
    unavailable: 'Audio tạm thời chưa thể tải.',
  },
  en: {
    label: 'Audio listening',
    loading: 'Loading audio...',
    unavailable: 'Audio is temporarily unavailable.',
  },
};

const LessonMediaPlayer = forwardRef(function LessonMediaPlayer({ videoData, opts, onReady, onStateChange, className }, forwardedRef) {
  const { locale } = useLocale();
  const text = COPY[locale];
  const audioRef = useRef(null);
  const audioAdapterRef = useRef(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [audioError, setAudioError] = useState('');
  const audioStoragePath = videoData?.audio_storage_path;
  const isAudioLesson = Boolean(audioStoragePath);

  if (!audioAdapterRef.current) {
    audioAdapterRef.current = {
      seekTo(seconds) {
        if (audioRef.current && Number.isFinite(Number(seconds))) {
          audioRef.current.currentTime = Math.max(0, Number(seconds));
        }
      },
      playVideo() {
        audioRef.current?.play?.().catch(() => {
          // Browsers can require an explicit user action before starting audio.
        });
      },
      pauseVideo() {
        audioRef.current?.pause?.();
      },
      getCurrentTime() {
        return audioRef.current?.currentTime || 0;
      },
      getDuration() {
        return audioRef.current?.duration || 0;
      },
      setPlaybackRate(rate) {
        if (audioRef.current) audioRef.current.playbackRate = Number(rate) || 1;
      },
      setVolume(volume) {
        if (audioRef.current) audioRef.current.volume = Math.min(1, Math.max(0, Number(volume) / 100));
      },
      unMute() {},
      unloadModule() {},
      setOption() {},
      getAvailableQualityLevels() {
        return [];
      },
      setPlaybackQuality() {},
    };
  }

  useImperativeHandle(forwardedRef, () => audioAdapterRef.current, []);

  useEffect(() => {
    let cancelled = false;

    const loadAudioUrl = async () => {
      setAudioUrl('');
      setAudioError('');
      if (!audioStoragePath) return;

      const { data, error } = await supabase.storage
        .from(AUDIO_BUCKET)
        .createSignedUrl(audioStoragePath, SIGNED_URL_TTL_SECONDS);

      if (cancelled) return;
      if (error || !data?.signedUrl) {
        console.error('Unable to create listening audio URL:', error);
        setAudioError(text.unavailable);
        return;
      }

      setAudioUrl(data.signedUrl);
    };

    loadAudioUrl();
    return () => {
      cancelled = true;
    };
  }, [audioStoragePath, text.unavailable]);

  if (!isAudioLesson) {
    // Đảm bảo bóc tách đúng ID 11 ký tự nếu đầu vào là 1 URL đầy đủ
    const rawId = videoData?.youtube_id || '';
    const match = rawId.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    const safeVideoId = match ? match[1] : rawId;

    return (
      <YouTube
        videoId={safeVideoId}
        opts={opts}
        onReady={onReady}
        onStateChange={onStateChange}
        className={className}
      />
    );
  }

  return (
    <div className={`absolute inset-0 flex items-center justify-center overflow-hidden bg-[#211126] ${className || ''}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(236,72,153,0.28),_transparent_48%),linear-gradient(135deg,_#16091c,_#2b1230)]" />
      <div className="relative z-10 flex max-w-md flex-col items-center px-6 text-center text-white">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-pink-500/20 text-pink-200 ring-1 ring-pink-200/25">
          <Headphones size={38} />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-pink-200">{text.label}</p>
        <h2 className="mt-2 text-xl font-bold leading-snug sm:text-2xl">{videoData?.title}</h2>
        {videoData?.description && <p className="mt-2 text-sm leading-relaxed text-pink-100/75">{videoData.description}</p>}
        {!audioUrl && !audioError && <div className="mt-5 flex items-center gap-2 text-sm text-pink-100/80"><Loader2 size={16} className="animate-spin" />{text.loading}</div>}
        {audioError && <p className="mt-5 text-sm text-rose-200">{audioError}</p>}
      </div>
      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        preload="metadata"
        onLoadedMetadata={() => onReady?.({ target: audioAdapterRef.current })}
        onPlay={() => onStateChange?.({ data: 1 })}
        onPause={() => onStateChange?.({ data: 2 })}
        onEnded={() => onStateChange?.({ data: 0 })}
      />
    </div>
  );
});

export default LessonMediaPlayer;
