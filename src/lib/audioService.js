let currentAudio = null;
let audioCleanupTimer = null;

export function stopWordAudio() {
  if (audioCleanupTimer) {
    clearTimeout(audioCleanupTimer);
    audioCleanupTimer = null;
  }

  if (typeof window !== 'undefined') {
    window.__onNativeAudioStarted = null;
    window.__onNativeAudioEnded = null;
    window.__currentAudioElement = null;
    window.__currentSpeakingUtterance = null;
  }

  if (typeof window !== 'undefined' && window.AndroidTTS && typeof window.AndroidTTS.stop === 'function') {
    try {
      window.AndroidTTS.stop();
    } catch {}
  }

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
  if (!wordText || typeof window === 'undefined') {
    if (onEnded) onEnded();
    return;
  }

  const clean = String(wordText).replace(/[^a-zA-Z0-9\s'-]/g, ' ').trim();
  if (!clean) {
    if (onEnded) onEnded();
    return;
  }

  stopWordAudio();

  const words = clean.split(/\s+/).filter(Boolean);
  const ttsLang = lang.startsWith('en') ? 'en' : lang;

  const youdaoUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(clean)}&type=2`;
  const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${ttsLang}&client=tw-ob&q=${encodeURIComponent(clean)}`;
  const primaryUrl = (words.length <= 5 && ttsLang === 'en') ? youdaoUrl : googleUrl;

  if (window.AndroidTTS) {
    try {
      if (typeof window.AndroidTTS.unmuteMedia === 'function') {
        window.AndroidTTS.unmuteMedia();
      }

      window.__onNativeAudioEnded = () => {
        window.__onNativeAudioEnded = null;
        if (audioCleanupTimer) {
          clearTimeout(audioCleanupTimer);
          audioCleanupTimer = null;
        }
        if (onEnded) onEnded();
      };

      const estDuration = Math.max(1600, words.length * 450 + 1200);
      audioCleanupTimer = setTimeout(() => {
        if (window.__onNativeAudioEnded) {
          window.__onNativeAudioEnded = null;
          if (onEnded) onEnded();
        }
      }, estDuration);

      if (typeof window.AndroidTTS.playSpeaking === 'function') {
        window.AndroidTTS.playSpeaking(clean, primaryUrl, 1.0, ttsLang);
      } else if (typeof window.AndroidTTS.playAudio === 'function') {
        window.AndroidTTS.playAudio(clean, primaryUrl, 1.0);
      } else if (typeof window.AndroidTTS.speak === 'function') {
        window.AndroidTTS.speak(clean);
      }
      return;
    } catch (err) {
      console.warn(err);
    }
  }

  playViaWebAudio(primaryUrl, clean, ttsLang, onEnded);
}

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

  const isGB = accent === 'GB' || lang.toLowerCase().includes('gb') || lang.toLowerCase().includes('uk');
  const targetLang = isGB ? 'en-GB' : 'en-US';
  const speechRate = Number(rate) || 1.0;
  const words = clean.split(/\s+/).filter(Boolean);

  if (typeof window !== 'undefined' && window.AndroidTTS) {
    try {
      if (typeof window.AndroidTTS.unmuteMedia === 'function') {
        window.AndroidTTS.unmuteMedia();
      }

      window.__onNativeAudioStarted = () => {
        if (onStart) onStart();
      };

      window.__onNativeAudioEnded = () => {
        window.__onNativeAudioEnded = null;
        window.__onNativeAudioStarted = null;
        if (audioCleanupTimer) {
          clearTimeout(audioCleanupTimer);
          audioCleanupTimer = null;
        }
        if (onEnded) onEnded();
      };

      const estDuration = Math.max(3000, Math.round((words.length * 520) / speechRate) + 2500);
      audioCleanupTimer = setTimeout(() => {
        if (window.__onNativeAudioEnded) {
          window.__onNativeAudioEnded = null;
          window.__onNativeAudioStarted = null;
          if (onEnded) onEnded();
        }
      }, estDuration);

      const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${targetLang}&client=tw-ob&q=${encodeURIComponent(clean)}`;

      if (clean.length <= 180 && typeof window.AndroidTTS.playSpeaking === 'function') {
        window.AndroidTTS.playSpeaking(clean, googleUrl, speechRate, targetLang);
      } else if (clean.length <= 180 && typeof window.AndroidTTS.playAudio === 'function') {
        window.AndroidTTS.playAudio(clean, googleUrl, speechRate);
      } else if (typeof window.AndroidTTS.speakWithRate === 'function') {
        window.AndroidTTS.speakWithRate(clean, speechRate, targetLang);
      } else if (typeof window.AndroidTTS.speak === 'function') {
        window.AndroidTTS.speak(clean);
      }
      return;
    } catch (err) {
      console.warn(err);
    }
  }

  if (onStart) onStart();
  fallbackSpeechSynthesisAdvanced(clean, targetLang, speechRate, onEnded);
}

function playViaWebAudio(preferredUrl, cleanText, ttsLang, onEnded) {
  try {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = preferredUrl;
    currentAudio = audio;
    if (typeof window !== 'undefined') {
      window.__currentAudioElement = audio;
    }

    let hasEnded = false;
    const handleFinish = () => {
      if (!hasEnded) {
        hasEnded = true;
        currentAudio = null;
        if (typeof window !== 'undefined') {
          window.__currentAudioElement = null;
        }
        if (onEnded) onEnded();
      }
    };

    audio.onended = handleFinish;
    audio.onerror = () => {
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
  } catch {
    fallbackSpeechSynthesis(cleanText, ttsLang, onEnded);
  }
}

function playViaGoogleAudio(googleUrl, cleanText, ttsLang, onEnded) {
  try {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = googleUrl;
    currentAudio = audio;
    if (typeof window !== 'undefined') {
      window.__currentAudioElement = audio;
    }

    let hasEnded = false;
    const handleFinish = () => {
      if (!hasEnded) {
        hasEnded = true;
        currentAudio = null;
        if (typeof window !== 'undefined') {
          window.__currentAudioElement = null;
        }
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
  } catch {
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
  } catch {
    if (onEnded) onEnded();
  }
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
  } catch {
    window.__currentSpeakingUtterance = null;
    if (onEnded) onEnded();
  }
}
