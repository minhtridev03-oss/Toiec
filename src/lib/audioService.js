/**
 * Shared Audio Service:
 * Phát âm thanh tiếng Anh chuẩn bản ngữ đa nền tảng:
 * 1. Trên Native Android APK: Sử dụng AndroidTTS bridge trực tiếp từ Android OS TextToSpeech (100% không phụ thuộc mạng, không bị lỗi 404, không trễ).
 * 2. Trên Web/Desktop: Ưu tiên Youdao Audio CDN cho từ vựng, Google Translate TTS cho câu dài, và SpeechSynthesis làm dự phòng cuối cùng.
 */

let currentAudio = null;

export function stopWordAudio() {
  // 1. Dừng Native Android TTS nếu có
  if (typeof window !== 'undefined' && window.AndroidTTS && typeof window.AndroidTTS.stop === 'function') {
    try {
      window.AndroidTTS.stop();
    } catch {}
  }

  // 2. Dừng HTML5 Audio nếu đang phát
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    } catch {}
  }

  // 3. Dừng Web SpeechSynthesis
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

export function playWordAudio(wordText, lang = 'en', onEnded) {
  if (!wordText || typeof window === 'undefined') return;

  const clean = String(wordText).replace(/[^a-zA-Z0-9\s'-]/g, ' ').trim();
  if (!clean) return;

  // Dừng mọi âm thanh đang phát trước đó
  stopWordAudio();

  // ══════════════════════════════════════════════════════════
  // 1. ƯU TIÊN SỐ 1 TRÊN NATIVE ANDROID APK: Native Android OS TTS
  // ══════════════════════════════════════════════════════════
  if (window.AndroidTTS && typeof window.AndroidTTS.speak === 'function') {
    try {
      window.AndroidTTS.speak(clean);
      if (onEnded) {
        const words = clean.split(/\s+/).length;
        const estDuration = Math.max(700, words * 380);
        setTimeout(onEnded, estDuration);
      }
      return;
    } catch (err) {
      console.warn('Native AndroidTTS failed, falling back to Web audio:', err);
    }
  }

  // ══════════════════════════════════════════════════════════
  // 2. TRÊN WEB / DESKTOP HOẶC KHI NATIVE TTS CHƯA SẴN SÀNG
  // ══════════════════════════════════════════════════════════
  const words = clean.split(/\s+/).filter(Boolean);
  const ttsLang = lang.startsWith('en') ? 'en' : lang;

  // Với từ đơn và cụm từ ngắn (<= 5 từ): thử Youdao Voice CDN
  if (words.length <= 5 && ttsLang === 'en') {
    try {
      const youdaoUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(clean)}&type=2`;
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = youdaoUrl;
      currentAudio = audio;

      let hasEnded = false;
      const handleFinish = () => {
        if (!hasEnded) {
          hasEnded = true;
          currentAudio = null;
          if (onEnded) onEnded();
        }
      };

      audio.onended = handleFinish;
      audio.onerror = () => {
        // Fallback sang Google TTS khi Youdao lỗi
        playViaGoogleTTS(clean, ttsLang, onEnded);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          playViaGoogleTTS(clean, ttsLang, onEnded);
        });
      }
      return;
    } catch (err) {
      console.warn('Youdao audio init error, trying Google TTS:', err);
    }
  }

  // Với câu dài: phát qua Google TTS
  playViaGoogleTTS(clean, ttsLang, onEnded);
}

function playViaGoogleTTS(cleanText, ttsLang, onEnded) {
  try {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${ttsLang}&client=tw-ob&q=${encodeURIComponent(cleanText)}`;
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = url;
    currentAudio = audio;

    let hasEnded = false;
    const handleFinish = () => {
      if (!hasEnded) {
        hasEnded = true;
        currentAudio = null;
        if (onEnded) onEnded();
      }
    };

    audio.onended = handleFinish;
    audio.onerror = () => {
      // Fallback sang Web SpeechSynthesis
      fallbackSpeechSynthesis(cleanText, ttsLang, onEnded);
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        fallbackSpeechSynthesis(cleanText, ttsLang, onEnded);
      });
    }
  } catch (err) {
    fallbackSpeechSynthesis(cleanText, ttsLang, onEnded);
  }
}

function fallbackSpeechSynthesis(cleanText, lang = 'en-US', onEnded) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnded) onEnded();
    return;
  }
  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang.startsWith('en') ? 'en-US' : lang;
    utterance.rate = 0.95;

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const enVoice = voices.find((v) => v.lang === 'en-US' || v.lang.startsWith('en'));
      if (enVoice) utterance.voice = enVoice;
    }

    if (onEnded) {
      utterance.onend = onEnded;
      utterance.onerror = onEnded;
    }
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.error('SpeechSynthesis error:', e);
    if (onEnded) onEnded();
  }
}
