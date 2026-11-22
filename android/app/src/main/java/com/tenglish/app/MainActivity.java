package com.tenglish.app;

import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;
import java.util.Locale;

public class MainActivity extends BridgeActivity {
    private TextToSpeech tts;
    private boolean ttsInitialized = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        initNativeTTS();
        setupWebViewBridge();
    }

    private void initNativeTTS() {
        try {
            tts = new TextToSpeech(this, status -> {
                if (status == TextToSpeech.SUCCESS) {
                    int result = tts.setLanguage(Locale.US);
                    if (result != TextToSpeech.LANG_MISSING_DATA && result != TextToSpeech.LANG_NOT_SUPPORTED) {
                        tts.setSpeechRate(0.92f);
                        tts.setPitch(1.0f);
                        ttsInitialized = true;
                    }
                }
            });
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void setupWebViewBridge() {
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
            bridge.getWebView().addJavascriptInterface(new NativeTTSInterface(), "AndroidTTS");
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        setupWebViewBridge();
    }

    public class NativeTTSInterface {
        @JavascriptInterface
        public void speak(String text) {
            if (tts != null && ttsInitialized && text != null && !text.trim().isEmpty()) {
                tts.stop();
                tts.speak(text.trim(), TextToSpeech.QUEUE_FLUSH, null, "tenglish_tts_id");
            }
        }

        @JavascriptInterface
        public void stop() {
            if (tts != null) {
                tts.stop();
            }
        }

        @JavascriptInterface
        public boolean isReady() {
            return ttsInitialized;
        }
    }

    @Override
    public void onDestroy() {
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        super.onDestroy();
    }
}
