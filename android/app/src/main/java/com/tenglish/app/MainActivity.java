package com.tenglish.app;

import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.PlaybackParams;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "TEnglishAudio";
    private TextToSpeech tts;
    private boolean ttsInitialized = false;
    private MediaPlayer mediaPlayer;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        initNativeTTS();
        initMediaPlayer();
        setupWebViewBridge();
    }

    private void initNativeTTS() {
        TextToSpeech.OnInitListener listener = status -> {
            if (status == TextToSpeech.SUCCESS) {
                configureTTS();
            } else {
                Log.w(TAG, "TTS init status: " + status + ", trying default engine");
                try {
                    tts = new TextToSpeech(MainActivity.this, s -> {
                        if (s == TextToSpeech.SUCCESS) configureTTS();
                    });
                } catch (Exception ex) {
                    Log.e(TAG, "Default TTS init error", ex);
                }
            }
        };

        try {
            boolean hasGoogleTts = false;
            try {
                Intent checkGoogle = new Intent("android.intent.action.TTS_SERVICE");
                checkGoogle.setPackage("com.google.android.tts");
                hasGoogleTts = getPackageManager().resolveService(checkGoogle, 0) != null;
            } catch (Exception ignored) {}

            if (hasGoogleTts) {
                tts = new TextToSpeech(this, listener, "com.google.android.tts");
            } else {
                tts = new TextToSpeech(this, listener);
            }
        } catch (Exception e) {
            try {
                tts = new TextToSpeech(this, listener);
            } catch (Exception ignored) {}
        }
    }

    private void configureTTS() {
        if (tts == null) return;
        try {
            Locale[] candidates = new Locale[]{
                Locale.US,
                Locale.ENGLISH,
                Locale.UK,
                Locale.CANADA,
                Locale.getDefault()
            };

            for (Locale loc : candidates) {
                try {
                    int result = tts.setLanguage(loc);
                    if (result != TextToSpeech.LANG_MISSING_DATA && result != TextToSpeech.LANG_NOT_SUPPORTED) {
                        tts.setSpeechRate(0.95f);
                        tts.setPitch(1.0f);
                        ttsInitialized = true;
                        Log.i(TAG, "Native TTS configured successfully with locale: " + loc.toString());
                        break;
                    }
                } catch (Exception ex) {
                    Log.w(TAG, "TTS setLanguage exception: " + ex.getMessage());
                }
            }

            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override
                public void onStart(String utteranceId) {
                    notifyJsAudioStarted();
                }

                @Override
                public void onDone(String utteranceId) {
                    notifyJsAudioEnded();
                }

                @Override
                public void onError(String utteranceId) {
                    notifyJsAudioEnded();
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "configureTTS error", e);
        }
    }

    private synchronized void initMediaPlayer() {
        try {
            if (mediaPlayer != null) {
                try {
                    if (mediaPlayer.isPlaying()) mediaPlayer.stop();
                    mediaPlayer.reset();
                    mediaPlayer.release();
                } catch (Exception ignored) {}
                mediaPlayer = null;
            }
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setAudioAttributes(
                new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .build()
            );
        } catch (Exception e) {
            Log.e(TAG, "initMediaPlayer error", e);
        }
    }

    private void ensureVolumeAudible() {
        try {
            AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (am != null) {
                int currentVol = am.getStreamVolume(AudioManager.STREAM_MUSIC);
                int maxVol = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
                if (currentVol <= 0 && maxVol > 0) {
                    int targetVol = Math.max(1, maxVol / 2);
                    am.setStreamVolume(AudioManager.STREAM_MUSIC, targetVol, AudioManager.FLAG_SHOW_UI);
                    Log.i(TAG, "Auto-unmuted Media volume from 0 to " + targetVol);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "ensureVolumeAudible error: " + e.getMessage());
        }
    }

    private void notifyJsAudioStarted() {
        mainHandler.post(() -> {
            try {
                if (bridge != null && bridge.getWebView() != null) {
                    bridge.getWebView().evaluateJavascript("if (typeof window !== 'undefined' && typeof window.__onNativeAudioStarted === 'function') window.__onNativeAudioStarted();", null);
                }
            } catch (Exception ignored) {}
        });
    }

    private void notifyJsAudioEnded() {
        mainHandler.post(() -> {
            try {
                if (bridge != null && bridge.getWebView() != null) {
                    bridge.getWebView().evaluateJavascript("if (typeof window !== 'undefined' && typeof window.__onNativeAudioEnded === 'function') window.__onNativeAudioEnded();", null);
                }
            } catch (Exception ignored) {}
        });
    }

    private void setupWebViewBridge() {
        if (bridge != null && bridge.getWebView() != null) {
            WebSettings settings = bridge.getWebView().getSettings();
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            bridge.getWebView().addJavascriptInterface(new NativeAudioInterface(), "AndroidTTS");
            Log.i(TAG, "AndroidTTS bridge registered with full audio permissions");
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        setupWebViewBridge();
    }

    public class NativeAudioInterface {
        @JavascriptInterface
        public void unmuteMedia() {
            mainHandler.post(() -> ensureVolumeAudible());
        }

        @JavascriptInterface
        public void speak(final String text) {
            speakWithRate(text, 1.0f, "en-US");
        }

        @JavascriptInterface
        public void speakWithRate(final String text, final float speed, final String lang) {
            mainHandler.post(() -> {
                ensureVolumeAudible();
                speakViaTTS(text, speed, lang);
            });
        }

        @JavascriptInterface
        public void playAudio(final String text, final String audioUrl) {
            playSpeaking(text, audioUrl, 1.0f, "en-US");
        }

        @JavascriptInterface
        public void playAudio(final String text, final String audioUrl, final float speed) {
            playSpeaking(text, audioUrl, speed, "en-US");
        }

        @JavascriptInterface
        public void playSpeaking(final String text, final String audioUrl, final float speed, final String lang) {
            mainHandler.post(() -> {
                ensureVolumeAudible();

                if (audioUrl != null && !audioUrl.trim().isEmpty()) {
                    try {
                        if (mediaPlayer == null) {
                            initMediaPlayer();
                        } else {
                            try {
                                if (mediaPlayer.isPlaying()) mediaPlayer.stop();
                                mediaPlayer.reset();
                            } catch (Exception ignored) {
                                initMediaPlayer();
                            }
                        }

                        mediaPlayer.setAudioAttributes(
                            new AudioAttributes.Builder()
                                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                                .setUsage(AudioAttributes.USAGE_MEDIA)
                                .build()
                        );

                        Map<String, String> headers = new HashMap<>();
                        headers.put("User-Agent", "Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36");
                        headers.put("Accept", "*/*");

                        // Đặt đúng Referer tương ứng với từng dịch vụ (Google TTS yêu cầu Referer google hoặc không gửi)
                        if (audioUrl.contains("google.com")) {
                            headers.put("Referer", "https://translate.google.com/");
                        } else if (audioUrl.contains("youdao.com")) {
                            headers.put("Referer", "https://dict.youdao.com/");
                        }

                        mediaPlayer.setDataSource(getApplicationContext(), Uri.parse(audioUrl.trim()), headers);
                        mediaPlayer.setOnPreparedListener(mp -> {
                            try {
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && speed > 0.1f && speed < 3.0f) {
                                    try {
                                        PlaybackParams params = mp.getPlaybackParams();
                                        params.setSpeed(speed);
                                        mp.setPlaybackParams(params);
                                    } catch (Exception ex) {
                                        Log.w(TAG, "Failed to set playback speed: " + ex.getMessage());
                                    }
                                }
                                mp.start();
                                notifyJsAudioStarted();
                                Log.i(TAG, "Native MediaPlayer playing URL: " + audioUrl);
                            } catch (Exception ex) {
                                Log.e(TAG, "MediaPlayer start error, falling back to TTS", ex);
                                speakViaTTS(text, speed, lang);
                            }
                        });

                        mediaPlayer.setOnCompletionListener(mp -> {
                            Log.i(TAG, "Native MediaPlayer finished playing");
                            notifyJsAudioEnded();
                        });

                        mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                            Log.w(TAG, "MediaPlayer error (" + what + ", " + extra + "), falling back to TTS");
                            try { mp.reset(); } catch (Exception ignored) {}
                            speakViaTTS(text, speed, lang);
                            return true;
                        });

                        mediaPlayer.prepareAsync();
                        return;
                    } catch (Exception ex) {
                        Log.w(TAG, "MediaPlayer prepare error: " + ex.getMessage() + ", falling back to TTS");
                    }
                }

                // Dự phòng: Phát qua TextToSpeech phần cứng
                speakViaTTS(text, speed, lang);
            });
        }

        private void speakViaTTS(String text, float speed, String lang) {
            if (text == null || text.trim().isEmpty()) {
                notifyJsAudioEnded();
                return;
            }
            String cleanText = text.trim();
            if (tts != null && ttsInitialized) {
                try {
                    if (lang != null && (lang.contains("GB") || lang.contains("UK") || lang.contains("gb") || lang.contains("uk"))) {
                        tts.setLanguage(Locale.UK);
                    } else {
                        tts.setLanguage(Locale.US);
                    }
                    if (speed > 0.2f && speed < 3.0f) {
                        tts.setSpeechRate(speed);
                    }
                    tts.stop();
                    tts.speak(cleanText, TextToSpeech.QUEUE_FLUSH, null, "tenglish_tts_" + System.currentTimeMillis());
                    Log.i(TAG, "TTS spoken successfully: " + cleanText);
                } catch (Exception e) {
                    Log.e(TAG, "tts.speak exception: " + e.getMessage());
                    notifyJsAudioEnded();
                }
            } else {
                Log.w(TAG, "TTS not ready for text: " + cleanText);
                notifyJsAudioEnded();
            }
        }

        @JavascriptInterface
        public void stop() {
            mainHandler.post(() -> {
                try {
                    if (mediaPlayer != null && mediaPlayer.isPlaying()) {
                        mediaPlayer.stop();
                    }
                } catch (Exception ignored) {}
                try {
                    if (tts != null) {
                        tts.stop();
                    }
                } catch (Exception ignored) {}
                notifyJsAudioEnded();
            });
        }

        @JavascriptInterface
        public boolean isReady() {
            return true;
        }

        @JavascriptInterface
        public int getMediaVolume() {
            try {
                AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
                if (am != null) {
                    return am.getStreamVolume(AudioManager.STREAM_MUSIC);
                }
            } catch (Exception ignored) {}
            return -1;
        }
    }

    @Override
    public void onDestroy() {
        if (tts != null) {
            try {
                tts.stop();
                tts.shutdown();
            } catch (Exception ignored) {}
        }
        if (mediaPlayer != null) {
            try {
                mediaPlayer.release();
            } catch (Exception ignored) {}
            mediaPlayer = null;
        }
        super.onDestroy();
    }
}
