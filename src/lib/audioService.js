/**
 * Shared Audio Service:
 * Phát âm thanh từ vựng và câu tiếng Anh chuẩn bản ngữ đa nền tảng (Web + Capacitor Android APK):
 * 1. Với từ đơn và cụm từ ngắn (<= 5 từ): Ưu tiên phát qua Youdao Audio Stream CDN (chuẩn giọng Mỹ, hoạt động 100% trên Android APK không bị chặn localhost).
 * 2. Với câu văn dài: Phát qua Google Translate TTS với header no-referrer.
 * 3. Tự động dự phòng sang Web SpeechSynthesis chuẩn hóa voice.
 * 4. Tự động dừng âm thanh cũ khi người dùng nhấn từ mới hoặc bấm liên tục.
 */

let currentAudio = null;

export function stopWordAudio() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    } catch {}
  }
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

  // Dừng âm thanh đang phát trước đó
  stopWordAudio();

  const words = clean.split(/\s+/).filter(Boolean);
  const ttsLang = lang.startsWith('en') ? 'en' : lang;

  // 1. Nếu là từ đơn hoặc cụm từ ngắn (<= 5 từ): ưu tiên Youdao Voice CDN
  // Youdao hoạt động 100% trên Capacitor Android (không bị chặn bởi Referer: localhost)
  if (words.length <= 5 && ttsLang === 'en') {
    try {
      const youdaoUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(clean)}&type=2`;
      const audio = document.createElement('audio');
      audio.preload = 'auto';
      audio.referrerPolicy = 'no-referrer';
      audio.src = youdaoUrl;
      currentAudio = audio;

      if (onEnded) {
        audio.onended = () => {
          currentAudio = null;
          onEnded();
        };
      }

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Youdao audio failed, trying Google TTS fallback:', err);
          playViaGoogleTTS(clean, ttsLang, onEnded);
        });
      }
      return;
    } catch (err) {
      console.warn('Youdao audio init error, trying Google TTS:', err);
    }
  }

  // 2. Với câu dài hoặc ngoại ngữ khác: Dùng Google TTS với no-referrer
  playViaGoogleTTS(clean, ttsLang, onEnded);
}

function playViaGoogleTTS(cleanText, ttsLang, onEnded) {
  try {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${ttsLang}&client=tw-ob&q=${encodeURIComponent(cleanText)}`;
    const audio = document.createElement('audio');
    audio.preload = 'auto';
    audio.referrerPolicy = 'no-referrer';
    audio.src = url;
    currentAudio = audio;

    if (onEnded) {
      audio.onended = () => {
        currentAudio = null;
        onEnded();
      };
    }

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Google TTS failed, falling back to SpeechSynthesis:', err);
        fallbackSpeechSynthesis(cleanText, ttsLang, onEnded);
      });
    }
  } catch (err) {
    console.warn('Google TTS init error, falling back to SpeechSynthesis:', err);
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

    // Chọn voice tiếng Anh tốt nhất nếu có
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
    console.error('SpeechSynthesis fallback error:', e);
    if (onEnded) onEnded();
  }
}
