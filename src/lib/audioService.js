/**
 * Shared Audio Service:
 * Phát âm thanh từ vựng tiếng Anh chuẩn bản ngữ:
 * 1. Ưu tiên phát qua HTML5 Audio stream từ Google Translate TTS (hoạt động 100% mượt trên Capacitor Android APK & mọi trình duyệt)
 * 2. Tự động dự phòng (fallback) sang SpeechSynthesis nếu thiết bị offline
 * 3. Tự động dừng âm thanh cũ khi người dùng nhấn từ mới hoặc bấm liên tục
 */

let currentAudio = null;

export function playWordAudio(wordText, lang = 'en') {
  if (!wordText || typeof window === 'undefined') return;

  const clean = String(wordText).replace(/[^a-zA-Z0-9\s'-]/g, '').trim();
  if (!clean) return;

  // Dừng âm thanh đang phát trước đó
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    } catch {}
  }

  // 1. Phát qua Google Translate TTS audio stream bằng HTML5 Audio (native media)
  try {
    const ttsLang = lang.startsWith('en') ? 'en' : lang;
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${ttsLang}&client=tw-ob&q=${encodeURIComponent(clean)}`;
    const audio = new Audio(url);
    currentAudio = audio;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('HTML5 Audio error, falling back to SpeechSynthesis:', err);
        fallbackSpeechSynthesis(clean, lang);
      });
    }
  } catch (err) {
    console.warn('Cannot initialize Audio, falling back to SpeechSynthesis:', err);
    fallbackSpeechSynthesis(clean, lang);
  }
}

function fallbackSpeechSynthesis(cleanText, lang = 'en-US') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang.startsWith('en') ? 'en-US' : lang;
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.error('SpeechSynthesis fallback error:', e);
  }
}
