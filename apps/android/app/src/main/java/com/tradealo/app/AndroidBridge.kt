package com.tradealo.app

import android.webkit.JavascriptInterface

/**
 * JavaScript bridge exposed to the web app as `window.AndroidBridge`.
 *
 * The web frontend uses this to:
 *   - detect it is running inside the native shell (`isNativeApp()`).
 *   - request a native Google Sign-In, avoiding the system browser bounce
 *     that never returns the session to the WebView (`signInWithGoogle()`).
 *   - report readiness with the user's JWT so the activity can register
 *     the FCM push token server-side (`reportReady()`).
 *
 * JS bridge methods run on a binder thread — hop to the main thread for UI.
 */
class AndroidBridge(private val activity: MainActivity) {

    @JavascriptInterface
    fun isNativeApp(): Boolean = true

    @JavascriptInterface
    fun appVersion(): String = BuildConfig.VERSION_NAME

    @JavascriptInterface
    fun signInWithGoogle() {
        activity.runOnUiThread { activity.startGoogleSignIn() }
    }

    @JavascriptInterface
    fun reportReady(accessToken: String?) {
        if (accessToken.isNullOrBlank()) return
        activity.onWebReportedReady(accessToken)
    }

    @JavascriptInterface
    fun logout() {
        activity.runOnUiThread { activity.handleLogout() }
    }
}
