/**
 * useSpeechRecognition
 * Cross-platform compatible speech recognition hook.
 *
 * Problems solved:
 * - iOS Safari: does not support continuous=true, restarts automatically
 * - Android Chrome: "not-allowed" error if called too fast after permission
 * - Both: recognition.start() can throw InvalidStateError if already started
 */

import { useCallback, useEffect, useRef, useState } from "react";

const isIOS = () =>
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

const isAndroid = () =>
  typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);

const isMobile = () => isIOS() || isAndroid();

const getSpeechRecognitionClass = () =>
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition || null
    : null;

export function useSpeechRecognition({ lang = "en-US", onResult, onFinal, onEnd, onError } = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const recognitionRef = useRef(null);
  const isActiveRef = useRef(false);
  const restartTimerRef = useRef(null);
  const onResultRef = useRef(onResult);
  const onFinalRef = useRef(onFinal);
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);
  const transcriptAccumRef = useRef("");

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onFinalRef.current = onFinal; }, [onFinal]);
  useEffect(() => { onEndRef.current = onEnd; }, [onEnd]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  useEffect(() => {
    setIsSupported(Boolean(getSpeechRecognitionClass()));
  }, []);

  const destroyRecognition = useCallback(() => {
    clearTimeout(restartTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch { }
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      recognitionRef.current = null;
    }
  }, []);

  const buildAndStart = useCallback(() => {
    const SpeechRecognition = getSpeechRecognitionClass();
    if (!SpeechRecognition) return;

    const mobile = isMobile();
    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.interimResults = true;
    // iOS/Android: continuous=true causes crashes. Use false + auto-restart.
    recognition.continuous = !mobile;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (mobile) {
        if (finalTranscript) {
          transcriptAccumRef.current = (transcriptAccumRef.current + " " + finalTranscript).trim();
        }
        const combined = (transcriptAccumRef.current + " " + interimTranscript).trim();
        onResultRef.current?.(combined);
        if (finalTranscript) onFinalRef.current?.(combined);
      } else {
        const all = (transcriptAccumRef.current + " " + finalTranscript + interimTranscript).trim();
        onResultRef.current?.(all);
        if (finalTranscript) onFinalRef.current?.(all);
      }
    };

    recognition.onerror = (event) => {
      const { error } = event;
      if (error === "not-allowed" || error === "service-not-allowed") {
        setPermissionDenied(true);
        isActiveRef.current = false;
        setIsRecording(false);
        onErrorRef.current?.("permission-denied");
        return;
      }
      if (error === "no-speech" || error === "audio-capture" || error === "aborted") {
        return; // non-fatal – onend will handle restart
      }
      console.warn("[SpeechRecognition] error:", error);
      onErrorRef.current?.(error);
    };

    recognition.onend = () => {
      if (isActiveRef.current) {
        // Auto-restart on mobile (iOS stops after each utterance)
        restartTimerRef.current = setTimeout(() => {
          if (!isActiveRef.current || !recognitionRef.current) return;
          try { recognitionRef.current.start(); } catch { }
        }, 200);
      } else {
        setIsRecording(false);
        onEndRef.current?.();
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (err) {
      console.error("[SpeechRecognition] start error:", err);
      isActiveRef.current = false;
      setIsRecording(false);
    }
  }, [lang]);

  const start = useCallback(() => {
    if (isActiveRef.current) return;
    destroyRecognition();
    transcriptAccumRef.current = "";
    isActiveRef.current = true;
    setIsRecording(true);
    setPermissionDenied(false);
    buildAndStart();
  }, [buildAndStart, destroyRecognition]);

  const stop = useCallback(() => {
    isActiveRef.current = false;
    clearTimeout(restartTimerRef.current);
    try { recognitionRef.current?.stop(); } catch { }
    setIsRecording(false);
    onEndRef.current?.();
  }, []);

  const reset = useCallback(() => {
    transcriptAccumRef.current = "";
  }, []);

  useEffect(() => () => {
    isActiveRef.current = false;
    destroyRecognition();
    clearTimeout(restartTimerRef.current);
  }, [destroyRecognition]);

  return { isRecording, isSupported, permissionDenied, start, stop, reset };
}
