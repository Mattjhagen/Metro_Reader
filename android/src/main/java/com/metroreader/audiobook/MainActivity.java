package com.metroreader.audiobook;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Base64;
import android.view.Window;
import android.webkit.WebChromeClient;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.ValueCallback;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Locale;

public final class MainActivity extends Activity {
    private static final int FILE_CHOOSER_REQUEST = 1001;
    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private TextToSpeech textToSpeech;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window window = getWindow();
        window.setStatusBarColor(Color.BLACK);
        window.setNavigationBarColor(Color.BLACK);

        webView = new WebView(this);
        webView.addJavascriptInterface(new BuiltInTtsBridge(), "AndroidTts");
        webView.setBackgroundColor(Color.BLACK);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                    WebView view,
                    ValueCallback<Uri[]> callback,
                    FileChooserParams fileChooserParams
            ) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = callback;

                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                intent.setType("*/*");
                intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[] {
                        "application/epub+zip",
                        "application/pdf",
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        "text/plain",
                        "text/markdown"
                });

                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                    return true;
                } catch (Exception error) {
                    filePathCallback = null;
                    callback.onReceiveValue(null);
                    return false;
                }
            }
        });
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.startsWith("https://metro-reader.local/")) {
                    String path = url.substring("https://metro-reader.local/".length());
                    if (path.isEmpty()) path = "index.html";
                    try {
                        InputStream stream = getAssets().open(path);
                        String mime = mimeType(path);
                        return new WebResourceResponse(mime, "UTF-8", stream);
                    } catch (IOException ignored) {
                        return null;
                    }
                }
                return super.shouldInterceptRequest(view, request);
            }
        });
        setContentView(webView);
        webView.loadUrl("https://metro-reader.local/index.html");

        textToSpeech = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS) {
                webView.post(() -> {
                    if (textToSpeech != null) textToSpeech.setLanguage(Locale.US);
                });
            }
        });
        textToSpeech.setOnUtteranceProgressListener(new UtteranceProgressListener() {
            @Override public void onStart(String utteranceId) { }
            @Override public void onError(String utteranceId) {
                notifyTtsError(utteranceId, "The built-in voice could not synthesize this text.");
            }
            @Override public void onDone(String utteranceId) { sendTtsFile(utteranceId); }
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST || filePathCallback == null) return;

        Uri[] results = null;
        if (resultCode == RESULT_OK && data != null && data.getData() != null) {
            results = new Uri[] { data.getData() };
        }
        filePathCallback.onReceiveValue(results);
        filePathCallback = null;
    }

    private final class BuiltInTtsBridge {
        @JavascriptInterface
        public void synthesize(String text, String requestId) {
            if (textToSpeech == null) {
                notifyTtsError(requestId, "The Android text-to-speech engine is unavailable.");
                return;
            }
            File output = new File(getCacheDir(), requestId + ".wav");
            Bundle params = new Bundle();
            params.putString(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, requestId);
            int status = textToSpeech.synthesizeToFile(text, params, output, requestId);
            if (status == TextToSpeech.ERROR) {
                notifyTtsError(requestId, "The Android text-to-speech engine rejected this text.");
            }
        }
    }

    private void sendTtsFile(String requestId) {
        File output = new File(getCacheDir(), requestId + ".wav");
        try (FileInputStream input = new FileInputStream(output)) {
            byte[] bytes = new byte[(int) output.length()];
            int offset = 0;
            while (offset < bytes.length) {
                int read = input.read(bytes, offset, bytes.length - offset);
                if (read < 0) break;
                offset += read;
            }
            String encoded = Base64.encodeToString(bytes, Base64.NO_WRAP);
            webView.post(() -> webView.evaluateJavascript(
                    "window.__metroTtsDone(" + quote(requestId) + "," + quote(encoded) + ",null)", null));
        } catch (IOException error) {
            notifyTtsError(requestId, "The generated voice file could not be read.");
        } finally {
            output.delete();
        }
    }

    private void notifyTtsError(String requestId, String message) {
        webView.post(() -> webView.evaluateJavascript(
                "window.__metroTtsDone(" + quote(requestId) + ",\"\"," + quote(message) + ")", null));
    }

    private static String quote(String value) {
        return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\"";
    }

    @Override
    protected void onDestroy() {
        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
        }
        super.onDestroy();
    }

    private static String mimeType(String path) {
        if (path.endsWith(".js")) return "application/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".json") || path.endsWith(".webmanifest")) return "application/json";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
        if (path.endsWith(".woff2")) return "font/woff2";
        return "text/html";
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
