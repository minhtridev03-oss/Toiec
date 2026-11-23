/**
 * Shared Audio Service:
 * Phát âm thanh tiếng Anh chuẩn bản ngữ đa nền tảng (Android Native APK & Web/Desktop)
 * 
 * Kiến trúc 4 tầng bảo vệ (Quad-Shield Audio Architecture):
 * 1. Mở âm lượng tự động: Kiểm tra và tăng âm lượng Media nếu điện thoại Android đang tắt tiếng
 * 2. Tầng 1 (Primary CDN): Phát âm thanh chuẩn phòng thu chất lượng cao:
 *    - Từ vựng & cụm từ: Youdao CDN (Type 2: US / Type 1: UK)
 *    - Câu đàm thoại & Luyện nói: Google TTS CDN (Hỗ trợ chuẩn accent en-US, en-GB và playbackRate)
 * 3. Tầng 2 (Secondary CDN Fallback): Tự động chuyển đổi mượt mà giữa Google TTS & Youdao nếu 1 trong 2 nguồn gặp sự cố mạng
 * 4. Tầng 3 (Native Android TTS Bridge): Nếu thiết bị offline/mất mạng trên Android APK, tự động phát qua Android TextToSpeech phần cứng
 * 5. Tầng 4 (Web SpeechSynthesis): Dự phòng trên trình duyệt web nếu không có mạng
 */

let currentAudio = null;
let audioCleanupTimer = null;

export function stopWordAudio() {
  if (audioCleanupTimer) {
    clearTimeout(audioCleanupTimer);
    audioCleanupTimer = null;
  }

  // 1. Dừng Native Android Audio (MediaPlayer + TTS) nếu đang chạy trên APK
  if (typeof window !== 'undefined' && window.AndroidTTS && typeof window.AndroidTTS.stop === 'function') {
    try {
      window.AndroidTTS.stop();
    } catch {}
  }

  // 2. Dừng HTML5 Audio
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

/**
 * Phát âm từ vựng (Vocabulary, Flashcards, WordList, Personal Vocab, TFlat)
 */
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

  // Đảm bảo âm lượng Android Media được bật (tránh trường hợp người dùng vô tình gạt âm lượng media về 0)
  if (window.AndroidTTS && typeof window.AndroidTTS.unmuteMedia === 'function') {
    try {
      window.AndroidTTS.unmuteMedia();
    } catch {}
  }

  const words = clean.split(/\s+/).filter(Boolean);
  const ttsLang = lang.startsWith('en') ? 'en' : lang;

  // Xây dựng URL audio chất lượng cao:
  // - Từ vựng hoặc cụm từ ngắn (<= 6 từ): Youdao CDN (phát âm bản ngữ phòng thu MP3)
  // - Cụm từ dài hơn: Google TTS CDN
  const youdaoUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(clean)}&type=2`;
  const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${ttsLang}&client=tw-ob&q=${encodeURIComponent(clean)}`;

  const isShort = words.length <= 6 && ttsLang === 'en';
  const primaryUrl = isShort ? youdaoUrl : googleUrl;
  const secondaryUrl = isShort ? googleUrl : youdaoUrl;

  playAudioWithCascade(primaryUrl, secondaryUrl, clean, ttsLang, 1.0, onEnded);
}

/**
 * Phát âm câu hội thoại trong phòng luyện nói Speaking Studio với chất lượng cao:
 * - Hỗ trợ accent giọng Anh - Mỹ (US) hoặc Anh - Anh (GB)
 * - Tự động kích hoạt callback onStart và onEnded chuẩn xác theo độ dài âm thanh
 * - Hỗ trợ điều chỉnh tốc độ đọc (playbackRate / speechRate)
 * - Tự động un-mute media volume trên Android
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

  // Đảm bảo âm lượng Android Media được bật
  if (window.AndroidTTS && typeof window.AndroidTTS.unmuteMedia === 'function') {
    try {
      window.AndroidTTS.unmuteMedia();
    } catch {}
  }

  const isGB = accent === 'GB' || lang.toLowerCase().includes('gb') || lang.toLowerCase().includes('uk');
  const targetLang = isGB ? 'en-GB' : 'en-US';
  const speechRate = Number(rate) || 1.0;

  // Với câu hội thoại (<= 220 ký tự):
  // Ưu tiên Google TTS chuẩn giọng (US/GB), dự phòng Youdao (Type 1=UK, Type 2=US)
  if (clean.length <= 220) {
    const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${targetLang}&client=tw-ob&q=${encodeURIComponent(clean)}`;
    const youdaoType = isGB ? '1' : '2';
    const youdaoUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(clean)}&type=${youdaoType}`;

    playAudioWithCascade(googleUrl, youdaoUrl, clean, targetLang, speechRate, onEnded);
  } else {
    // Với đoạn văn dài hơn (> 220 ký tự): phát qua Native TTS hoặc SpeechSynthesis nâng cao
    playTtsDirect(clean, targetLang, speechRate, onEnded);
  }
}

/**
 * Điều phối phát âm thanh với cơ chế chuyển tiếp đa tầng:
 * Primary CDN -> Secondary CDN -> Native Android TTS -> Web SpeechSynthesis
 */
function playAudioWithCascade(primaryUrl, secondaryUrl, cleanText, lang, rate, onEnded) {
  let hasHandledEnd = false;

  const handleFinish = () => {
    if (!hasHandledEnd) {
      hasHandledEnd = true;
      currentAudio = null;
      if (typeof window !== 'undefined') {
        window.__currentAudioElement = null;
      }
      if (onEnded) onEnded();
    }
  };

  const trySpeechFallback = () => {
    playTtsDirect(cleanText, lang, rate, handleFinish);
  };

  const tryPlayUrl = (url, onFail) => {
    try {
      const audio = new Audio();
      audio.preload = 'auto';
      if (rate && rate !== 1.0) {
        audio.playbackRate = rate;
      }
      audio.src = url;
      currentAudio = audio;
      if (typeof window !== 'undefined') {
        window.__currentAudioElement = audio; // Giữ tham chiếu tránh V8 garbage collection
      }

      audio.onended = handleFinish;

      audio.onerror = (e) => {
        console.warn(`[AudioService] Error loading ${url}, triggering fallback`, e);
        if (currentAudio === audio) {
          currentAudio = null;
        }
        onFail();
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn(`[AudioService] audio.play() rejected for ${url}:`, err);
          if (currentAudio === audio) {
            currentAudio = null;
          }
          onFail();
        });
      }
    } catch (err) {
      console.warn(`[AudioService] Audio construction exception for ${url}:`, err);
      onFail();
    }
  };

  // Bắt đầu với Primary URL -> Nếu lỗi thì thử Secondary URL -> Nếu lỗi thì phát TTS
  tryPlayUrl(primaryUrl, () => {
    if (secondaryUrl && secondaryUrl !== primaryUrl) {
      tryPlayUrl(secondaryUrl, trySpeechFallback);
    } else {
      trySpeechFallback();
    }
  });
}

/**
 * Phát âm thanh trực tiếp bằng bộ đọc giọng nói (Native Android TTS hoặc Web SpeechSynthesis)
 */
function playTtsDirect(cleanText, lang = 'en-US', rate = 1.0, onEnded) {
  // 1. Ưu tiên trên Native Android APK: sử dụng AndroidTTS bridge trực tiếp
  if (typeof window !== 'undefined' && window.AndroidTTS && typeof window.AndroidTTS.speak === 'function') {
    try {
      window.AndroidTTS.speak(cleanText);
      const words = cleanText.split(/\s+/).filter(Boolean);
      const estDuration = Math.max(900, (words.length * 360) / (rate || 1.0));
      audioCleanupTimer = setTimeout(() => {
        if (onEnded) onEnded();
      }, estDuration);
      return;
    } catch (err) {
      console.warn('[AudioService] Native AndroidTTS.speak failed, falling back to Web SpeechSynthesis:', err);
    }
  }

  // 2. Trên Web/Desktop: sử dụng Web SpeechSynthesis API
  fallbackSpeechSynthesisAdvanced(cleanText, lang, rate, onEnded);
}

/**
 * Web SpeechSynthesis API nâng cao
 */
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
    console.warn('[AudioService] fallbackSpeechSynthesisAdvanced error:', err);
    window.__currentSpeakingUtterance = null;
    if (onEnded) onEnded();
  }
}
