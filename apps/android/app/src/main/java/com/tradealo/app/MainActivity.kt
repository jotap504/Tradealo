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
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Log
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
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.tasks.Task
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

class MainActivity : AppCompatActivity() {

    // ─── Production URL ────────────────────────────────────────────────────────
    private val webAppUrl = "https://tradealo-web.vercel.app"
    private val apiBaseUrl: String by lazy { getString(R.string.api_base_url) }
    private val googleWebClientId: String by lazy { getString(R.string.google_web_client_id) }

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
    private val GOOGLE_SIGN_IN_RESULT_CODE = 1002

    // ─── Pending WebView PermissionRequest (camera / microphone) ──────────────
    private var pendingWebPermissionRequest: PermissionRequest? = null

    // ─── Auth + push ──────────────────────────────────────────────────────────
    private val httpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(15, TimeUnit.SECONDS)
            .build()
    }
    private val ioScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var googleSignInClient: GoogleSignInClient? = null

    @Volatile private var webJwtAccessToken: String? = null

    // ─── Runtime permission launchers ─────────────────────────────────────────
    private val requestCameraPermission =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { results ->
            val cameraGranted = results[Manifest.permission.CAMERA] == true
            if (cameraGranted) {
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

    private val requestNotificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { /* no-op */ }

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

        requestNotificationPermissionIfNeeded()
        setupGoogleSignIn()
        setupWebView()
        setupSwipeRefresh()
        setupOfflineAndRetry()
        setupBackNavigation()
        monitorNetworkState()
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted = ContextCompat.checkSelfPermission(
                this, Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
            if (!granted) {
                requestNotificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }

    private fun setupGoogleSignIn() {
        if (googleWebClientId.startsWith("PASTE_")) {
            Log.w(TAG, "google_web_client_id not configured — native Sign-In disabled")
            return
        }
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(googleWebClientId)
            .requestEmail()
            .build()
        googleSignInClient = GoogleSignIn.getClient(this, gso)
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

        val rawUA = settings.userAgentString
        settings.userAgentString = rawUA
            .replace("; wv", "")
            .replace("Version/4.0 ", "") + " TradealoApp/${BuildConfig.VERSION_NAME}"

        WebView.setWebContentsDebuggingEnabled(true)

        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(webView, true)
        }

        webView.addJavascriptInterface(AndroidBridge(this), "AndroidBridge")

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
                val isMainFrame = request?.isForMainFrame == true
                Log.d(TAG, "shouldOverrideUrlLoading: url=$url, isMainFrame=$isMainFrame")
                Log.d(TAG, "isGoogleAuthStart check: ${isGoogleAuthStart(url)}")

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

                // Intercept the web Google-OAuth bounce; run native flow instead.
                if (isGoogleAuthStart(url)) {
                    Log.d(TAG, "Intercepted Google auth URL, starting native flow")
                    startGoogleSignIn()
                    return true
                }

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

        webView.webChromeClient = object : WebChromeClient() {

            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                super.onProgressChanged(view, newProgress)
                pageProgressBar.progress = newProgress
                pageProgressBar.visibility = if (newProgress == 100) View.GONE else View.VISIBLE
            }

            override fun onPermissionRequest(request: PermissionRequest?) {
                request ?: return
                val needsCamera = request.resources.any {
                    it == PermissionRequest.RESOURCE_VIDEO_CAPTURE
                }
                if (!needsCamera) {
                    request.grant(request.resources)
                    return
                }
                val alreadyGranted = ContextCompat.checkSelfPermission(
                    this@MainActivity, Manifest.permission.CAMERA
                ) == PackageManager.PERMISSION_GRANTED

                if (alreadyGranted) {
                    request.grant(request.resources)
                } else {
                    pendingWebPermissionRequest = request
                    requestCameraPermission.launch(arrayOf(Manifest.permission.CAMERA))
                }
            }

            override fun onPermissionRequestCanceled(request: PermissionRequest?) {
                super.onPermissionRequestCanceled(request)
                request?.deny()
            }

            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                val acceptTypes = fileChooserParams?.acceptTypes?.joinToString(",") ?: "*/*"
                val isImage = acceptTypes.contains("image")

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

                val galleryIntent = fileChooserParams?.createIntent()
                    ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                        type = if (isImage) "image/*" else "*/*"
                        addCategory(Intent.CATEGORY_OPENABLE)
                    }

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

    // ─── Google Sign-In native flow ───────────────────────────────────────────
    fun startGoogleSignIn() {
        val client = googleSignInClient
        if (client == null) {
            Toast.makeText(
                this,
                "Inicio de sesión con Google no configurado.",
                Toast.LENGTH_LONG
            ).show()
            return
        }
        client.signOut().addOnCompleteListener {
            startActivityForResult(client.signInIntent, GOOGLE_SIGN_IN_RESULT_CODE)
        }
    }

    private fun handleGoogleSignInResult(data: Intent?) {
        val task: Task<com.google.android.gms.auth.api.signin.GoogleSignInAccount> =
            GoogleSignIn.getSignedInAccountFromIntent(data)
        try {
            val account = task.getResult(ApiException::class.java)
            val idToken = account?.idToken
            if (idToken.isNullOrBlank()) {
                Toast.makeText(this, "Google no devolvió un ID token.", Toast.LENGTH_LONG).show()
                return
            }
            ioScope.launch {
                try {
                    val tokens = exchangeGoogleIdTokenForJwt(idToken)
                    withContext(Dispatchers.Main) { injectTokensAndReload(tokens) }
                } catch (e: Exception) {
                    Log.e(TAG, "google id-token exchange failed", e)
                    withContext(Dispatchers.Main) {
                        Toast.makeText(
                            this@MainActivity,
                            "No se pudo iniciar sesión con Google.",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                }
            }
        } catch (e: ApiException) {
            Log.w(TAG, "google sign-in failed code=${e.statusCode}", e)
            Toast.makeText(this, "Inicio de sesión cancelado.", Toast.LENGTH_SHORT).show()
        }
    }

    private fun exchangeGoogleIdTokenForJwt(idToken: String): JSONObject {
        val body = JSONObject().put("idToken", idToken).toString()
            .toRequestBody("application/json".toMediaType())
        val req = Request.Builder()
            .url("$apiBaseUrl/auth/google/id-token")
            .post(body)
            .build()
        httpClient.newCall(req).execute().use { res ->
            val raw = res.body?.string().orEmpty()
            if (!res.isSuccessful) throw IllegalStateException("HTTP ${res.code}: $raw")
            return JSONObject(raw)
        }
    }

    private fun injectTokensAndReload(payload: JSONObject) {
        val accessToken = payload.optString("accessToken")
        val refreshToken = payload.optString("refreshToken")
        val user = payload.optJSONObject("user")?.toString() ?: "null"
        if (accessToken.isNullOrBlank() || refreshToken.isNullOrBlank()) {
            Toast.makeText(this, "Respuesta inválida del servidor.", Toast.LENGTH_LONG).show()
            return
        }
        val js = """
            (function(){
              try {
                localStorage.setItem('accessToken', ${jsString(accessToken)});
                localStorage.setItem('refreshToken', ${jsString(refreshToken)});
                localStorage.setItem('user', ${jsString(user)});
              } catch (e) {}
              window.location.href = '/dashboard';
            })();
        """.trimIndent()
        webView.evaluateJavascript(js, null)
        webJwtAccessToken = accessToken
        registerPushTokenWithBackend(accessToken)
    }

    private fun jsString(value: String): String =
        "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\""

    // ─── Called by AndroidBridge ──────────────────────────────────────────────
    fun onWebReportedReady(accessToken: String) {
        webJwtAccessToken = accessToken
        registerPushTokenWithBackend(accessToken)
    }

    fun handleLogout() {
        webJwtAccessToken = null
        googleSignInClient?.signOut()
    }

    // ─── FCM token → backend ──────────────────────────────────────────────────
    private fun registerPushTokenWithBackend(accessToken: String) {
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (!task.isSuccessful) {
                Log.w(TAG, "FCM getToken failed", task.exception)
                return@addOnCompleteListener
            }
            val fcmToken = task.result ?: return@addOnCompleteListener
            ioScope.launch {
                try {
                    val body = JSONObject()
                        .put("token", fcmToken)
                        .put("platform", "android")
                        .put("appVersion", BuildConfig.VERSION_NAME)
                        .toString()
                        .toRequestBody("application/json".toMediaType())
                    val req = Request.Builder()
                        .url("$apiBaseUrl/me/push-tokens")
                        .addHeader("Authorization", "Bearer $accessToken")
                        .post(body)
                        .build()
                    httpClient.newCall(req).execute().use { res ->
                        if (!res.isSuccessful) {
                            Log.w(TAG, "register push token: HTTP ${res.code}")
                        }
                    }
                    getSharedPreferences(TradealoMessagingService.PREFS, Context.MODE_PRIVATE)
                        .edit()
                        .putBoolean(TradealoMessagingService.KEY_FCM_TOKEN_DIRTY, false)
                        .apply()
                } catch (e: Exception) {
                    Log.w(TAG, "register push token failed", e)
                }
            }
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private fun isGoogleAuthStart(url: String): Boolean {
        val target = Uri.parse(url)
        val host = target.host ?: return false
        val path = target.path ?: return false

        val webUri = Uri.parse(webAppUrl)
        val apiUri = Uri.parse(apiBaseUrl)

        val isTargetHost = host == webUri.host || host == apiUri.host || host == "localhost"
        return isTargetHost && path.endsWith("/auth/google")
    }

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

    // ─── Activity result ──────────────────────────────────────────────────────
    @Deprecated("Required for WebView file chooser on older APIs")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        when (requestCode) {
            FILE_CHOOSER_RESULT_CODE -> {
                val callback = filePathCallback ?: return
                filePathCallback = null
                val results: Array<Uri>? = if (data == null || data.data == null) {
                    cameraImageUri?.let { arrayOf(it) }
                } else {
                    WebChromeClient.FileChooserParams.parseResult(resultCode, data)
                }
                callback.onReceiveValue(results)
                cameraImageUri = null
            }
            GOOGLE_SIGN_IN_RESULT_CODE -> handleGoogleSignInResult(data)
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
        ioScope.cancel()
    }

    companion object {
        private const val TAG = "MainActivity"
    }
}

object URLUtil {
    fun guessFileName(url: String, contentDisposition: String?, mimeType: String?): String =
        android.webkit.URLUtil.guessFileName(url, contentDisposition, mimeType)
}
