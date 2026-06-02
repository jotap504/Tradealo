package com.tradealo.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * Receives FCM tokens and incoming push notifications.
 *
 * Token registration is owned by [MainActivity] (it needs an authenticated JWT
 * to call `POST /me/push-tokens`). Here we only persist the latest token so
 * the activity can pick it up on next foreground.
 */
class TradealoMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_FCM_TOKEN, token)
            .putBoolean(KEY_FCM_TOKEN_DIRTY, true)
            .apply()
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        val title = message.notification?.title ?: message.data["title"] ?: "Tradealo"
        val body = message.notification?.body ?: message.data["body"] ?: return
        val targetUrl = message.data["url"]

        ensureChannel()

        val intent = Intent(this, SplashActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            if (!targetUrl.isNullOrBlank()) putExtra(EXTRA_PUSH_URL, targetUrl)
        }
        val pending = PendingIntent.getActivity(
            this,
            System.currentTimeMillis().toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(pending)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
            .notify(System.currentTimeMillis().toInt(), notification)
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val mgr = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (mgr.getNotificationChannel(CHANNEL_ID) != null) return
        mgr.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ID,
                "Notificaciones de Tradealo",
                NotificationManager.IMPORTANCE_HIGH,
            ).apply {
                description = "Mensajes, compras, ventas y respuestas a tus publicaciones."
            }
        )
    }

    companion object {
        const val CHANNEL_ID = "tradealo_default"
        const val EXTRA_PUSH_URL = "tradealo.push.url"
        const val PREFS = "tradealo_fcm"
        const val KEY_FCM_TOKEN = "fcm_token"
        const val KEY_FCM_TOKEN_DIRTY = "fcm_token_dirty"
    }
}
