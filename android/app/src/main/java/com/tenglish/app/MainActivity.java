package com.tenglish.app;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.util.Log;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;
import java.util.Locale;

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
        try {
            tts = new TextToSpeech(this, status -> {
                if (status == TextToSpeech.SUCCESS) {
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
                                Log.i(TAG, "TTS initialized successfully with locale: " + loc.toString());
                                break;
                            }
                        } catch (Exception ex) {
                            Log.w(TAG, "Failed to set locale " + loc + ": " + ex.getMessage());
                        }
                    }
                    if (!ttsInitialized) {
                        Log.w(TAG, "TTS could not find a supported English locale on this engine.");
                    }
                } else {
                    Log.e(TAG, "TextToSpeech init failed with status: " + status);
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "TextToSpeech creation error", e);
        }
    }

    private void initMediaPlayer() {
        try {
            if (mediaPlayer != null) {
                try { mediaPlayer.release(); } catch (Exception ignored) {}
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

    private void setupWebViewBridge() {
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
            bridge.getWebView().addJavascriptInterface(new NativeAudioInterface(), "AndroidTTS");
            Log.i(TAG, "AndroidTTS bridge registered");
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        setupWebViewBridge();
    }

    public class NativeAudioInterface {
        @JavascriptInterface
        public void playAudio(final String text, final String audioUrl) {
            mainHandler.post(() -> {
                ensureVolumeAudible();

                // 1. Thử phát trước qua Native MediaPlayer nếu có URL (chất lượng âm thanh chuẩn bản ngữ)
                if (audioUrl != null && !audioUrl.trim().isEmpty()) {
                    try {
                        if (mediaPlayer == null) {
                            initMediaPlayer();
                        } else {
                            mediaPlayer.reset();
                        }

                        mediaPlayer.setAudioAttributes(
                            new AudioAttributes.Builder()
                                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                                .setUsage(AudioAttributes.USAGE_MEDIA)
                                .build()
                        );
                        mediaPlayer.setDataSource(audioUrl.trim());
                        mediaPlayer.setOnPreparedListener(mp -> {
                            try {
                                mp.start();
                                Log.i(TAG, "Native MediaPlayer playing URL: " + audioUrl);
                            } catch (Exception ex) {
                                Log.e(TAG, "MediaPlayer start error, falling back to TTS", ex);
                                speakViaTTS(text);
                            }
                        });
                        mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                            Log.w(TAG, "MediaPlayer error (" + what + ", " + extra + "), falling back to TTS");
                            mp.reset();
                            speakViaTTS(text);
                            return true;
                        });
                        mediaPlayer.prepareAsync();
                        return;
                    } catch (Exception ex) {
                        Log.w(TAG, "MediaPlayer prepare error: " + ex.getMessage() + ", falling back to TTS");
                    }
                }

                // 2. Dự phòng: Phát qua TextToSpeech
                speakViaTTS(text);
            });
        }

        @JavascriptInterface
        public void speak(final String text) {
            mainHandler.post(() -> {
                ensureVolumeAudible();
                speakViaTTS(text);
            });
        }

        private void speakViaTTS(String text) {
            if (text == null || text.trim().isEmpty()) return;
            String cleanText = text.trim();
            if (tts != null && ttsInitialized) {
                try {
                    tts.stop();
                    tts.speak(cleanText, TextToSpeech.QUEUE_FLUSH, null, "tenglish_tts_" + System.currentTimeMillis());
                    Log.i(TAG, "TTS spoken successfully: " + cleanText);
                } catch (Exception e) {
                    Log.e(TAG, "tts.speak exception: " + e.getMessage());
                }
            } else {
                Log.w(TAG, "TTS not ready for text: " + cleanText);
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

        @JavascriptInterface
        public void unmuteMedia() {
            ensureVolumeAudible();
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
