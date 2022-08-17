/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.shared

import android.content.Intent
import android.content.res.Configuration
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.ViewGroup
import android.view.Window
import android.view.WindowManager
import android.webkit.WebView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat.Type.systemBars
import androidx.core.view.WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch
import kotlin.system.exitProcess

/**
 * The main activity for the application.
 */
class MainActivity : AppCompatActivity() {
    companion object {
        var current: MainActivity? = null
            private set

        fun openUri(uri: Uri) {
            val browserIntent = Intent(Intent.ACTION_VIEW, uri)
            current?.startActivity(browserIntent)
        }

        lateinit var sampleITMApplication: SampleITMApplication
    }

    private val modelWebViewContainer: ViewGroup
        get() = findViewById(R.id.model_web_view_container)

    override fun onCreate(savedInstanceState: Bundle?) {
        sampleITMApplication.onCreateActivity(this)
        requestWindowFeature(Window.FEATURE_NO_TITLE)
        super.onCreate(savedInstanceState)
        setupWebView()
        setupFullScreen()
        hideSystemBars()
        setContentView(R.layout.activity_main)
        sampleITMApplication.initializeFrontend(this, R.id.model_host_fragment)
        MainScope().launch {
            sampleITMApplication.waitForFrontendInitialize()
            sampleITMApplication.attachWebView(modelWebViewContainer)
            current = this@MainActivity
            sampleITMApplication.onRegisterNativeUI()
        }
    }

    override fun onDestroy() {
        current = null
        modelWebViewContainer.removeAllViews()
        sampleITMApplication.onActivityDestroy(this)
        super.onDestroy()
    }

    private fun setupWebView() {
        runOnUiThread {
            try {
                WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
            } catch (e: Exception) {
                if (e.message?.contains("webview", true) == true) {
                    MainScope().launch {
                        AlertDialog.Builder(applicationContext)
                            .setMessage(R.string.alert_message_webview_not_found)
                            .setTitle(R.string.alert_title_error)
                            .setPositiveButton(getString(R.string.ok)) { _, _ -> exitProcess(1) }
                            .show()
                        exitProcess(1)
                    }
                }
            }
        }
    }

    private fun setupFullScreen() {
        // Truly full screen (including camera cutouts)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.attributes.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        }

        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = Color.TRANSPARENT
    }

    private fun hideSystemBars() {
        val windowInsetsController = WindowCompat.getInsetsController(window, window.decorView)
        // Configure the behavior of the hidden system bars
        windowInsetsController.systemBarsBehavior = BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        // Hide both the status bar and the navigation bar
        windowInsetsController.hide(systemBars())
    }

    override fun onResume() {
        setupFullScreen()
        super.onResume()
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        sampleITMApplication.applyPreferredColorScheme() // update dark mode
    }
}
