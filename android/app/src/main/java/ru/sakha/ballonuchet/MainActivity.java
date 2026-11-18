package ru.sakha.ballonuchet;

import android.app.Activity;
import android.app.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.util.Base64;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public final class MainActivity extends Activity {
    private static final String APP_URL = "https://nurgunmatveev11-dev.github.io/ballon-uchet-akds/";
    private static final String APP_HOST = "nurgunmatveev11-dev.github.io";
    private static final String APP_PATH = "/ballon-uchet-akds/";
    private static final int PICK_FILE = 1001;
    private static final int SAVE_FILE = 1002;
    private static final int MAX_BLOB_BASE64_LENGTH = 20 * 1024 * 1024;

    private static final String BRIDGE_SCRIPT = """
        (function () {
          if (window.__balloonAndroidInstalled) return;
          window.__balloonAndroidInstalled = true;
          const originalClick = HTMLAnchorElement.prototype.click;
          HTMLAnchorElement.prototype.click = function () {
            const name = this.getAttribute('download');
            const url = this.href;
            if (name !== null && url.startsWith('blob:')) {
              fetch(url).then(response => response.blob()).then(blob => {
                const reader = new FileReader();
                reader.onload = () => {
                  const data = String(reader.result);
                  BalloonAndroid.saveBlob(name || 'document', blob.type || 'application/octet-stream', data.substring(data.indexOf(',') + 1));
                };
                reader.readAsDataURL(blob);
              }).catch(() => alert('Не удалось сохранить документ'));
              return;
            }
            return originalClick.call(this);
          };
          window.downloadWord = function (number) {
            const documentNode = document.getElementById('protocolDocument');
            if (!documentNode) return;
            const html = '<html><meta charset="utf-8"><body>' + documentNode.innerHTML + '</body></html>';
            BalloonAndroid.saveWord('Протокол_' + String(number) + '.doc', html);
          };
          window.print = function () { BalloonAndroid.printPage(); };
        })();
        """;

    private WebView webView;
    private View offlineView;
    private boolean mainFrameFailed;
    private ValueCallback<Uri[]> fileCallback;
    private byte[] pendingSave;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(13, 93, 81));
        getWindow().setNavigationBarColor(Color.BLACK);

        FrameLayout root = new FrameLayout(this);
        webView = new WebView(this);
        root.addView(webView, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        offlineView = makeOfflineView();
        root.addView(offlineView, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        offlineView.setVisibility(View.GONE);
        setContentView(root);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        WebView.setWebContentsDebuggingEnabled(false);
        webView.addJavascriptInterface(new DocumentBridge(), "BalloonAndroid");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (isAppUri(uri)) return false;
                openExternally(uri);
                return true;
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                mainFrameFailed = false;
                Uri uri = Uri.parse(url);
                if (!"about".equals(uri.getScheme()) && !isAppUri(uri)) {
                    view.stopLoading();
                    openExternally(uri);
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (mainFrameFailed) return;
                offlineView.setVisibility(View.GONE);
                if (isAppUri(Uri.parse(url))) view.evaluateJavascript(BRIDGE_SCRIPT, null);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showOffline();
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 400) showOffline();
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    startActivityForResult(params.createIntent(), PICK_FILE);
                    return true;
                } catch (ActivityNotFoundException e) {
                    fileCallback = null;
                    callback.onReceiveValue(null);
                    Toast.makeText(MainActivity.this, "Нет приложения для выбора файла", Toast.LENGTH_LONG).show();
                    return false;
                }
            }
        });

        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, length) -> {
            if (url.startsWith("https://")) openExternally(Uri.parse(url));
        });
        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            webView.loadUrl(APP_URL);
        }
    }

    private boolean isAppUri(Uri uri) {
        return "https".equalsIgnoreCase(uri.getScheme())
            && APP_HOST.equalsIgnoreCase(uri.getHost())
            && uri.getPath() != null
            && uri.getPath().startsWith(APP_PATH);
    }

    private void openExternally(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException e) {
            Toast.makeText(this, "Не удалось открыть ссылку", Toast.LENGTH_SHORT).show();
        }
    }

    private View makeOfflineView() {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        panel.setPadding(dp(24), dp(24), dp(24), dp(24));
        panel.setBackgroundColor(Color.rgb(245, 247, 245));

        TextView title = new TextView(this);
        title.setText(R.string.offline_title);
        title.setTextColor(Color.rgb(13, 93, 81));
        title.setTextSize(24);
        title.setGravity(Gravity.CENTER);
        panel.addView(title);

        TextView message = new TextView(this);
        message.setText(R.string.offline_message);
        message.setTextSize(16);
        message.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams messageParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        messageParams.topMargin = dp(12);
        panel.addView(message, messageParams);

        Button retry = new Button(this);
        retry.setText(R.string.retry);
        retry.setOnClickListener(v -> {
            offlineView.setVisibility(View.GONE);
            webView.loadUrl(APP_URL);
        });
        LinearLayout.LayoutParams retryParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        retryParams.topMargin = dp(24);
        panel.addView(retry, retryParams);
        return panel;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void showOffline() {
        mainFrameFailed = true;
        offlineView.setVisibility(View.VISIBLE);
    }

    private void startSave(String requestedName, String mime, byte[] data) {
        runOnUiThread(() -> {
            if (pendingSave != null) {
                Toast.makeText(this, "Сначала завершите сохранение файла", Toast.LENGTH_SHORT).show();
                return;
            }
            String safeName = requestedName == null ? "document" :
                requestedName.replaceAll("[\\\\/:*?\"<>|\\r\\n]", "_");
            if (safeName.isBlank()) safeName = "document";
            pendingSave = data;
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType(mime == null || mime.isBlank() ? "application/octet-stream" : mime);
            intent.putExtra(Intent.EXTRA_TITLE, safeName);
            try {
                startActivityForResult(intent, SAVE_FILE);
            } catch (ActivityNotFoundException e) {
                pendingSave = null;
                Toast.makeText(this, "Нет приложения для сохранения файла", Toast.LENGTH_LONG).show();
            }
        });
    }

    private final class DocumentBridge {
        @JavascriptInterface
        public void saveWord(String name, String html) {
            if (html == null || html.length() > 1_000_000) return;
            byte[] content = html.getBytes(StandardCharsets.UTF_8);
            byte[] withBom = new byte[content.length + 3];
            withBom[0] = (byte) 0xEF;
            withBom[1] = (byte) 0xBB;
            withBom[2] = (byte) 0xBF;
            System.arraycopy(content, 0, withBom, 3, content.length);
            startSave(name, "application/msword", withBom);
        }

        @JavascriptInterface
        public void saveBlob(String name, String mime, String base64) {
            if (base64 == null || base64.length() > MAX_BLOB_BASE64_LENGTH) return;
            try {
                startSave(name, mime, Base64.decode(base64, Base64.DEFAULT));
            } catch (IllegalArgumentException ignored) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this,
                    "Не удалось сохранить документ", Toast.LENGTH_SHORT).show());
            }
        }

        @JavascriptInterface
        public void printPage() {
            runOnUiThread(() -> {
                PrintManager manager = (PrintManager) getSystemService(PRINT_SERVICE);
                manager.print("Протокол поставки", webView.createPrintDocumentAdapter("Протокол"),
                    new PrintAttributes.Builder().build());
            });
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == PICK_FILE) {
            if (fileCallback != null) {
                fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
                fileCallback = null;
            }
        } else if (requestCode == SAVE_FILE) {
            if (resultCode == RESULT_OK && data != null && data.getData() != null && pendingSave != null) {
                try (OutputStream output = getContentResolver().openOutputStream(data.getData())) {
                    if (output == null) throw new IOException("No output stream");
                    output.write(pendingSave);
                    Toast.makeText(this, "Документ сохранён", Toast.LENGTH_SHORT).show();
                } catch (IOException e) {
                    Toast.makeText(this, "Не удалось сохранить документ", Toast.LENGTH_LONG).show();
                }
            }
            pendingSave = null;
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) webView.destroy();
        super.onDestroy();
    }
}

