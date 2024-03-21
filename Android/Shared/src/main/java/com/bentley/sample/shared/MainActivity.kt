/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.shared

import android.graphics.Color
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
open class MainActivity : AppCompatActivity() {
    private val sampleITMApplication: SampleITMApplication
        get() {
            @Suppress("UNCHECKED_CAST")
            return (this.application as SampleApplicationBase<SampleITMApplication>).itmApplication
        }
    private val modelWebViewContainer: ViewGroup
        get() = findViewById(R.id.model_web_view_container)

    override fun onCreate(savedInstanceState: Bundle?) {
        val itmApp = sampleITMApplication
        // NOTE: The backend can be inspected (using, for example, Google Chrome) as long as the
        // build is a debug build.
        itmApp.initializeFrontend(this)
        supportRequestWindowFeature(Window.FEATURE_NO_TITLE)
        super.onCreate(savedInstanceState)
        setupWebView()
        setupFullScreen()
        hideSystemBars()
        setContentView(R.layout.activity_main)
        MainScope().launch {
            itmApp.waitForFrontendInitialize()
            itmApp.attachWebView(modelWebViewContainer)
        }
    }

    override fun onDestroy() {
        modelWebViewContainer.removeAllViews()
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
        window.attributes.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
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
}
