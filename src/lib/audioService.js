/**
 * Shared Audio Service:
 * Phát âm thanh tiếng Anh chuẩn bản ngữ đa nền tảng (Android Native APK & Web)
 * 1. Trên Native Android APK: Sử dụng AndroidTTS bridge trực tiếp từ Android OS:
 *    - Ưu tiên MediaPlayer phát trực tiếp MP3 chuẩn từ Youdao CDN / Google TTS (Zero CORS, Zero Referer, không phụ thuộc bộ đọc máy)
 *    - Tự động kiểm tra và mở âm lượng Media (AudioManager) nếu máy đang tắt tiếng
 *    - Dự phòng tự động qua Android TextToSpeech nếu rớt mạng
 * 2. Trên Web/Desktop: Ưu tiên Youdao Audio CDN, Google TTS, và SpeechSynthesis làm dự phòng cuối cùng.
 */

let currentAudio = null;
let audioCleanupTimer = null;

export function stopWordAudio() {
  if (audioCleanupTimer) {
    clearTimeout(audioCleanupTimer);
    audioCleanupTimer = null;
  }

  // 1. Dừng Native Android Audio (MediaPlayer + TTS) nếu có
  if (typeof window !== 'undefined' && window.AndroidTTS && typeof window.AndroidTTS.stop === 'function') {
    try {
      window.AndroidTTS.stop();
    } catch {}
  }

  // 2. Dừng HTML5 Audio nếu đang phát trên Web
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    } catch {}
  }
  if (typeof window !== 'undefined') {
    window.__currentAudioElement = null;
    window.__currentSpeakingUtterance = null;
  }

  // 3. Dừng Web SpeechSynthesis
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

export function playWordAudio(wordText, lang = 'en', onEnded) {
  if (!wordText || typeof window === 'undefined') {
    if (onEnded) onEnded();
    return;
  }

  const clean = String(wordText).replace(/[^a-zA-Z0-9\s'-]/g, ' ').trim();
  if (!clean) {
    if (onEnded) onEnded();
    return;
  }

  // Dừng âm thanh đang phát trước đó
  stopWordAudio();

  const words = clean.split(/\s+/).filter(Boolean);
  const ttsLang = lang.startsWith('en') ? 'en' : lang;

  // Xây dựng URL audio chất lượng cao:
  // Với từ vựng hoặc cụm ngắn (<= 5 từ): Dùng Youdao CDN phát âm chuẩn phòng thu
  // Với câu dài: Dùng Google TTS
  const youdaoUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(clean)}&type=2`;
  const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${ttsLang}&client=tw-ob&q=${encodeURIComponent(clean)}`;
  const preferredUrl = (words.length <= 5 && ttsLang === 'en') ? youdaoUrl : googleUrl;

  // ══════════════════════════════════════════════════════════
  // 1. ƯU TIÊN SỐ 1 TRÊN NATIVE ANDROID APK: Native Bridge
  // ══════════════════════════════════════════════════════════
  if (window.AndroidTTS) {
    try {
      if (typeof window.AndroidTTS.playAudio === 'function') {
        window.AndroidTTS.playAudio(clean, preferredUrl);
      } else if (typeof window.AndroidTTS.speak === 'function') {
        window.AndroidTTS.speak(clean);
      }

      if (onEnded) {
        const estDuration = Math.max(900, words.length * 380);
        audioCleanupTimer = setTimeout(onEnded, estDuration);
      }
      return;
    } catch (err) {
      console.warn('Native AndroidTTS call error, falling back to Web audio:', err);
    }
  }

  // ══════════════════════════════════════════════════════════
  // 2. TRÊN WEB / DESKTOP HOẶC KHI NATIVE CHƯA SẴN SÀNG
  // ══════════════════════════════════════════════════════════
  playViaWebAudio(preferredUrl, clean, ttsLang, onEnded);
}

function playViaWebAudio(preferredUrl, cleanText, ttsLang, onEnded) {
  try {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = preferredUrl;
    currentAudio = audio;
    window.__currentAudioElement = audio; // Giữ tham chiếu tránh V8 garbage collection

    let hasEnded = false;
    const handleFinish = () => {
      if (!hasEnded) {
        hasEnded = true;
        currentAudio = null;
        window.__currentAudioElement = null;
        if (onEnded) onEnded();
      }
    };

    audio.onended = handleFinish;
    audio.onerror = () => {
      // Nếu Youdao lỗi, thử Google TTS
      if (preferredUrl.includes('youdao.com')) {
        const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${ttsLang}&client=tw-ob&q=${encodeURIComponent(cleanText)}`;
        playViaGoogleAudio(googleUrl, cleanText, ttsLang, onEnded);
      } else {
        fallbackSpeechSynthesis(cleanText, ttsLang, onEnded);
      }
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

function playViaGoogleAudio(googleUrl, cleanText, ttsLang, onEnded) {
  try {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = googleUrl;
    currentAudio = audio;
    window.__currentAudioElement = audio;

    let hasEnded = false;
    const handleFinish = () => {
      if (!hasEnded) {
        hasEnded = true;
        currentAudio = null;
        window.__currentAudioElement = null;
        if (onEnded) onEnded();
      }
    };

    audio.onended = handleFinish;
    audio.onerror = () => {
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

/**
 * Phát âm câu hội thoại trong phòng luyện nói Speaking với chất lượng cao:
 * - Tự động phát âm thanh bản ngữ qua Android Native Bridge (AndroidTTS) trên điện thoại
 * - Tự động kiểm tra và mở âm lượng Media nếu máy đang tắt tiếng
 * - Hỗ trợ accent giọng Anh - Mỹ (US) hoặc Anh - Anh (GB)
 * - Tự động kích hoạt callback onStart và onEnded
 * - Hỗ trợ điều chỉnh tốc độ đọc (rate)
 */
export function playSpeakingAudio(text, {
  lang = 'en-US',
  rate = 1.0,
  accent = 'US',
  onStart,
  onEnded,
} = {}) {
  if (!text || typeof window === 'undefined') {
    if (onEnded) onEnded();
    return;
  }

  stopWordAudio();

  const clean = String(text).trim();
  if (!clean) {
    if (onEnded) onEnded();
    return;
  }

  if (onStart) onStart();

  const isGB = accent === 'GB' || lang.toLowerCase().includes('gb') || lang.toLowerCase().includes('uk');
  const targetLang = isGB ? 'en-GB' : 'en-US';
  const words = clean.split(/\s+/).filter(Boolean);
  const speechRate = Number(rate) || 1.0;

  // ══════════════════════════════════════════════════════════
  // 1. NATIVE ANDROID APK (AndroidTTS Bridge)
  // ══════════════════════════════════════════════════════════
  if (window.AndroidTTS) {
    try {
      // Với câu vừa phải (<= 180 ký tự): tạo Google TTS URL để Android MediaPlayer phát âm thanh MP3
      // Với câu dài (> 180 ký tự) hoặc mạng chậm: phát qua Native Android TextToSpeech engine
      if (clean.length <= 180 && typeof window.AndroidTTS.playAudio === 'function') {
        const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${targetLang}&client=tw-ob&q=${encodeURIComponent(clean)}`;
        window.AndroidTTS.playAudio(clean, audioUrl);
      } else if (typeof window.AndroidTTS.speak === 'function') {
        window.AndroidTTS.speak(clean);
      }

      if (onEnded) {
        const estDuration = Math.max(1200, (words.length * 360) / speechRate);
        audioCleanupTimer = setTimeout(() => {
          onEnded();
        }, estDuration);
      }
      return;
    } catch (err) {
      console.warn('Native AndroidTTS Speaking call error:', err);
    }
  }

  // ══════════════════════════════════════════════════════════
  // 2. TRÊN WEB / DESKTOP (Web Audio hoặc Web SpeechSynthesis)
  // ══════════════════════════════════════════════════════════
  if (clean.length <= 180) {
    const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${targetLang}&client=tw-ob&q=${encodeURIComponent(clean)}`;
    try {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.playbackRate = speechRate;
      audio.src = googleUrl;
      currentAudio = audio;
      window.__currentAudioElement = audio;

      let hasEnded = false;
      const handleFinish = () => {
        if (!hasEnded) {
          hasEnded = true;
          currentAudio = null;
          window.__currentAudioElement = null;
          if (onEnded) onEnded();
        }
      };

      audio.onended = handleFinish;
      audio.onerror = () => {
        fallbackSpeechSynthesisAdvanced(clean, targetLang, speechRate, onEnded);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          fallbackSpeechSynthesisAdvanced(clean, targetLang, speechRate, onEnded);
        });
      }
      return;
    } catch (err) {
      fallbackSpeechSynthesisAdvanced(clean, targetLang, speechRate, onEnded);
      return;
    }
  }

  // Với câu dài (> 180 ký tự) trên Web: Dùng SpeechSynthesis nâng cao
  fallbackSpeechSynthesisAdvanced(clean, targetLang, speechRate, onEnded);
}

function fallbackSpeechSynthesisAdvanced(text, lang = 'en-US', rate = 1.0, onEnded) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnded) onEnded();
    return;
  }

  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;

    // Giữ global reference để V8 garbage collection không hủy utterance giữa chừng
    window.__currentSpeakingUtterance = utterance;

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      const targetPrefix = lang.toLowerCase().replace('_', '-');
      const match = voices.find((v) => v.lang.toLowerCase().replace('_', '-').startsWith(targetPrefix))
        || voices.find((v) => v.lang.toLowerCase().startsWith('en'));
      if (match) utterance.voice = match;
    }

    let hasEnded = false;
    const finish = () => {
      if (!hasEnded) {
        hasEnded = true;
        window.__currentSpeakingUtterance = null;
        if (onEnded) onEnded();
      }
    };

    utterance.onend = finish;
    utterance.onerror = finish;

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('fallbackSpeechSynthesisAdvanced error:', err);
    window.__currentSpeakingUtterance = null;
    if (onEnded) onEnded();
  }
}
