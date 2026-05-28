package com.tradealo.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.view.View
import android.webkit.CookieManager
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : AppCompatActivity() {

    // ─── Production URL ────────────────────────────────────────────────────────
    private val webAppUrl = "https://tradealo-web.vercel.app"

    // ─── UI ───────────────────────────────────────────────────────────────────
    private lateinit var webView: WebView
    private lateinit var swipeRefresh: SwipeRefreshLayout
    private lateinit var pageProgressBar: ProgressBar
    private lateinit var offlineLayout: ConstraintLayout
    private lateinit var btnRetry: Button

    // ─── File chooser (gallery / camera) ──────────────────────────────────────
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var cameraImageUri: Uri? = null
    private val FILE_CHOOSER_RESULT_CODE = 1001

    // ─── Pending WebView PermissionRequest (camera / microphone) ──────────────
    private var pendingWebPermissionRequest: PermissionRequest? = null

    // ─── Runtime camera permission launcher ───────────────────────────────────
    private val requestCameraPermission =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { results ->
            val cameraGranted = results[Manifest.permission.CAMERA] == true
            if (cameraGranted) {
                // Grant the queued WebView permission request
                pendingWebPermissionRequest?.grant(pendingWebPermissionRequest!!.resources)
            } else {
                pendingWebPermissionRequest?.deny()
                Toast.makeText(
                    this,
                    "Permiso de cámara denegado. Es necesario para el KYC.",
                    Toast.LENGTH_LONG
                ).show()
            }
            pendingWebPermissionRequest = null
        }

    // ─── Network ──────────────────────────────────────────────────────────────
    private lateinit var connectivityManager: ConnectivityManager
    private val networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            super.onAvailable(network)
            runOnUiThread { hideOfflineLayout() }
        }
        override fun onLost(network: Network) {
            super.onLost(network)
            runOnUiThread { showOfflineLayout() }
        }
    }

    // ─── Lifecycle ────────────────────────────────────────────────────────────
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView         = findViewById(R.id.webview)
        swipeRefresh    = findViewById(R.id.swipe_refresh)
        pageProgressBar = findViewById(R.id.page_progress)
        offlineLayout   = findViewById(R.id.offline_layout)
        btnRetry        = findViewById(R.id.btn_retry)

        connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

        setupWebView()
        setupSwipeRefresh()
        setupOfflineAndRetry()
        setupBackNavigation()
        monitorNetworkState()
    }

    // ─── WebView Setup ────────────────────────────────────────────────────────
    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val settings = webView.settings

        settings.javaScriptEnabled               = true
        settings.domStorageEnabled               = true
        settings.databaseEnabled                 = true
        settings.cacheMode                       = WebSettings.LOAD_DEFAULT
        settings.mixedContentMode                = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
        settings.mediaPlaybackRequiresUserGesture = false
        settings.javaScriptCanOpenWindowsAutomatically = true
        settings.allowFileAccess                 = true
        settings.allowContentAccess              = true
        settings.builtInZoomControls             = false
        settings.setSupportZoom(false)
        settings.displayZoomControls             = false
        settings.useWideViewPort                 = true
        settings.loadWithOverviewMode            = true

        // Strip WebView tokens so Cloudflare/Vercel treat us as a real mobile browser
        val rawUA = settings.userAgentString
        settings.userAgentString = rawUA
            .replace("; wv", "")
            .replace("Version/4.0 ", "")

        // Enable chrome://inspect remote debugging
        WebView.setWebContentsDebuggingEnabled(true)

        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webView, true)
        }

        // ── WebViewClient ────────────────────────────────────────────────────
        webView.webViewClient = object : WebViewClient() {

            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                super.onPageStarted(view, url, favicon)
                pageProgressBar.visibility = View.VISIBLE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                pageProgressBar.visibility = View.GONE
                swipeRefresh.isRefreshing = false
                CookieManager.getInstance().flush()
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) showOfflineLayout()
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url?.toString() ?: return false

                // Handle deep-link protocols
                if (url.startsWith("tel:") || url.startsWith("mailto:") ||
                    url.startsWith("sms:")  || url.startsWith("whatsapp:")
                ) {
                    try {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                    } catch (_: Exception) {
                        Toast.makeText(this@MainActivity, "Aplicación no instalada.", Toast.LENGTH_SHORT).show()
                    }
                    return true
                }

                // Only redirect top-level external URLs to the system browser.
                // Sub-frame requests (YouTube embeds, Supabase, APIs…) load in-page.
                if (request?.isForMainFrame == true) {
                    val isOwnDomain = url.contains("tradealo-web.vercel.app") ||
                                      url.contains("localhost")
                    if (!isOwnDomain) {
                        try { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url))) }
                        catch (_: Exception) { }
                        return true
                    }
                }
                return false
            }
        }

        // ── WebChromeClient ──────────────────────────────────────────────────
        webView.webChromeClient = object : WebChromeClient() {

            // ── Progress bar ─────────────────────────────────────────────────
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                super.onProgressChanged(view, newProgress)
                pageProgressBar.progress = newProgress
                pageProgressBar.visibility = if (newProgress == 100) View.GONE else View.VISIBLE
            }

            /**
             * Called when a web page calls navigator.mediaDevices.getUserMedia().
             * We must grant or deny this request. If the user hasn't granted the CAMERA
             * permission yet, we request it at runtime first.
             */
            override fun onPermissionRequest(request: PermissionRequest?) {
                request ?: return
                val needsCamera = request.resources.any {
                    it == PermissionRequest.RESOURCE_VIDEO_CAPTURE
                }
                if (!needsCamera) {
                    // Grant non-camera resources immediately (e.g. audio)
                    request.grant(request.resources)
                    return
                }
                val alreadyGranted = ContextCompat.checkSelfPermission(
                    this@MainActivity, Manifest.permission.CAMERA
                ) == PackageManager.PERMISSION_GRANTED

                if (alreadyGranted) {
                    request.grant(request.resources)
                } else {
                    // Queue the request and trigger the runtime permission dialog
                    pendingWebPermissionRequest = request
                    requestCameraPermission.launch(arrayOf(Manifest.permission.CAMERA))
                }
            }

            override fun onPermissionRequestCanceled(request: PermissionRequest?) {
                super.onPermissionRequestCanceled(request)
                request?.deny()
            }

            /**
             * Called when the web page triggers an <input type="file"> or the
             * camera capture modal. We build an intent that opens:
             *   • The camera app (for selfie / DNI capture)
             *   • The gallery as a fallback
             */
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                // Cancel any pending callback to avoid leaks
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                val acceptTypes = fileChooserParams?.acceptTypes?.joinToString(",") ?: "*/*"
                val captureEnabled = fileChooserParams?.isCaptureEnabled == true
                val isImage = acceptTypes.contains("image")

                // ── Camera intent (direct capture) ───────────────────────────
                val cameraIntent: Intent? = if (isImage &&
                    ContextCompat.checkSelfPermission(
                        this@MainActivity, Manifest.permission.CAMERA
                    ) == PackageManager.PERMISSION_GRANTED
                ) {
                    val photoFile = createImageFile()
                    cameraImageUri = FileProvider.getUriForFile(
                        this@MainActivity,
                        "${packageName}.provider",
                        photoFile
                    )
                    Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
                        putExtra(MediaStore.EXTRA_OUTPUT, cameraImageUri)
                    }
                } else null

                // ── Gallery / files intent ────────────────────────────────────
                val galleryIntent = fileChooserParams?.createIntent()
                    ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                        type = if (isImage) "image/*" else "*/*"
                        addCategory(Intent.CATEGORY_OPENABLE)
                    }

                // Build a chooser: camera first (if available), then gallery
                val chooser = if (cameraIntent != null) {
                    Intent.createChooser(galleryIntent, "Seleccionar imagen").apply {
                        putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(cameraIntent))
                    }
                } else {
                    Intent.createChooser(galleryIntent, "Seleccionar imagen")
                }

                return try {
                    startActivityForResult(chooser, FILE_CHOOSER_RESULT_CODE)
                    true
                } catch (e: Exception) {
                    this@MainActivity.filePathCallback = null
                    Toast.makeText(
                        this@MainActivity,
                        "No se puede abrir el selector de archivos.",
                        Toast.LENGTH_LONG
                    ).show()
                    false
                }
            }
        }

        // ── Download listener ────────────────────────────────────────────────
        webView.setDownloadListener { url, userAgent, contentDisposition, mimeType, _ ->
            try {
                val fileName = URLUtil.guessFileName(url, contentDisposition, mimeType)
                val request = DownloadManager.Request(Uri.parse(url)).apply {
                    setMimeType(mimeType)
                    addRequestHeader("User-Agent", userAgent)
                    setDescription("Descargando archivo desde Tradealo...")
                    setTitle(fileName)
                    setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
                }
                (getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).enqueue(request)
                Toast.makeText(this, getString(R.string.download_started), Toast.LENGTH_SHORT).show()
            } catch (_: Exception) {
                Toast.makeText(this, getString(R.string.download_failed), Toast.LENGTH_SHORT).show()
            }
        }

        webView.loadUrl(webAppUrl)
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /** Creates a temporary JPEG file in the app's cache directory for camera output. */
    private fun createImageFile(): File {
        val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
        val storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES)
        return File.createTempFile("KYC_${timeStamp}_", ".jpg", storageDir)
    }

    // ─── Swipe-to-refresh ─────────────────────────────────────────────────────
    private fun setupSwipeRefresh() {
        swipeRefresh.setColorSchemeResources(R.color.primaryColor, R.color.primaryLightColor)
        swipeRefresh.setOnRefreshListener {
            if (isNetworkAvailable()) webView.reload()
            else {
                swipeRefresh.isRefreshing = false
                showOfflineLayout()
            }
        }
        webView.viewTreeObserver.addOnScrollChangedListener {
            swipeRefresh.isEnabled = webView.scrollY == 0
        }
    }

    // ─── Offline / retry ──────────────────────────────────────────────────────
    private fun setupOfflineAndRetry() {
        btnRetry.setOnClickListener {
            if (isNetworkAvailable()) {
                hideOfflineLayout()
                webView.loadUrl(webView.url ?: webAppUrl)
            } else {
                Toast.makeText(this, "Aún no tenés conexión a Internet.", Toast.LENGTH_SHORT).show()
            }
        }
    }

    // ─── Back navigation ──────────────────────────────────────────────────────
    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack() else finish()
            }
        })
    }

    // ─── Network monitoring ───────────────────────────────────────────────────
    private fun monitorNetworkState() {
        val req = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()
        connectivityManager.registerNetworkCallback(req, networkCallback)
        if (!isNetworkAvailable()) showOfflineLayout()
    }

    private fun isNetworkAvailable(): Boolean {
        val net  = connectivityManager.activeNetwork ?: return false
        val caps = connectivityManager.getNetworkCapabilities(net) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    private fun showOfflineLayout() {
        offlineLayout.visibility   = View.VISIBLE
        swipeRefresh.visibility    = View.GONE
        pageProgressBar.visibility = View.GONE
    }

    private fun hideOfflineLayout() {
        offlineLayout.visibility = View.GONE
        swipeRefresh.visibility  = View.VISIBLE
    }

    // ─── Activity result (file chooser response) ──────────────────────────────
    @Deprecated("Required for WebView file chooser on older APIs")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == FILE_CHOOSER_RESULT_CODE) {
            val callback = filePathCallback ?: return
            filePathCallback = null

            // If the user captured from camera, return cameraImageUri; else parse gallery result
            val results: Array<Uri>? = if (data == null || data.data == null) {
                cameraImageUri?.let { arrayOf(it) }
            } else {
                WebChromeClient.FileChooserParams.parseResult(resultCode, data)
            }
            callback.onReceiveValue(results)
            cameraImageUri = null
        }
    }

    // ─── Instance state ───────────────────────────────────────────────────────
    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        webView.saveState(outState)
    }

    override fun onRestoreInstanceState(savedInstanceState: Bundle) {
        super.onRestoreInstanceState(savedInstanceState)
        webView.restoreState(savedInstanceState)
    }

    override fun onDestroy() {
        super.onDestroy()
        try { connectivityManager.unregisterNetworkCallback(networkCallback) }
        catch (_: Exception) { }
    }
}

object URLUtil {
    fun guessFileName(url: String, contentDisposition: String?, mimeType: String?): String =
        android.webkit.URLUtil.guessFileName(url, contentDisposition, mimeType)
}
