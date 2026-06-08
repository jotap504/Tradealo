package com.tradealo.app

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.animation.AlphaAnimation
import android.widget.ImageView
import androidx.appcompat.app.AppCompatActivity

class SplashActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_splash)

        val splashImage = findViewById<ImageView>(R.id.splash_image)
        val fadeIn = AlphaAnimation(0.0f, 1.0f).apply {
            duration = 1200
            fillAfter = true
        }
        splashImage.startAnimation(fadeIn)

        // Wait for 2.5 seconds, then launch MainActivity
        Handler(Looper.getMainLooper()).postDelayed({
            val intent = Intent(this, MainActivity::class.java)
            startActivity(intent)
            overridePendingTransition(android.R.anim.fade_in, android.R.anim.fade_out)
            finish() // Destroys SplashActivity so back-navigation doesn't return here
        }, 2500)
    }
}
