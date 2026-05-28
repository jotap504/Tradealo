package com.tradealo.app

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.animation.AlphaAnimation
import android.widget.LinearLayout
import androidx.appcompat.app.AppCompatActivity

class SplashActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)

        // Find the logo container and apply a smooth native fade-in animation
        val logoLayout = findViewById<LinearLayout>(R.id.logo_layout)
        val fadeIn = AlphaAnimation(0.0f, 1.0f).apply {
            duration = 1200
            fillAfter = true
        }
        logoLayout.startAnimation(fadeIn)

        // Wait for 2.5 seconds, then launch MainActivity
        Handler(Looper.getMainLooper()).postDelayed({
            val intent = Intent(this, MainActivity::class.java)
            startActivity(intent)
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
            finish() // Destroys SplashActivity so back-navigation doesn't return here
        }, 2500)
    }
}
