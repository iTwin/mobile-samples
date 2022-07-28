/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.itwinstarter

import android.content.Intent
import android.content.res.Configuration
import android.graphics.Color
import android.net.Uri
import android.os.Build
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import android.os.Bundle
import android.view.*
import android.webkit.WebView
import androidx.appcompat.app.AlertDialog
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.github.itwin.mobilesdk.ITMNativeUI
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.system.exitProcess

class MainActivity : AppCompatActivity() {
    private var nativeUI: ITMNativeUI? = null

    companion object {
        var current: MainActivity? = null
            private set

        fun openUri(uri: Uri) {
            val browserIntent = Intent(Intent.ACTION_VIEW, uri)
            current?.startActivity(browserIntent)
        }
    }

    private val modelWebViewContainer: ViewGroup
        get() = findViewById(R.id.model_web_view_container)

    @Suppress("DEPRECATION")
    private fun autoHideStatusBarOld() {
        // Runs on Android versions less than R
        window.decorView.setOnSystemUiVisibilityChangeListener { visibility ->
            if (visibility and View.SYSTEM_UI_FLAG_FULLSCREEN == 0) {
                lifecycleScope.launch {
                    delay(2500)
                    setFullScreenFlags()
                }
            }
        }
    }

    private fun autoHideStatusBarNew() {
        // Runs on Android versions R and later
        val windowInsetsController =
            ViewCompat.getWindowInsetsController(window.decorView) ?: return
        // Configure the behavior of the hidden system bars
        windowInsetsController.systemBarsBehavior =
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        // Hide both the status bar and the navigation bar
        windowInsetsController.hide(WindowInsetsCompat.Type.systemBars())
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        DocumentPicker.registerForActivityResult(this)
        ImagePicker.registerForActivityResult(this)
        requestWindowFeature(Window.FEATURE_NO_TITLE)
        super.onCreate(savedInstanceState)
        setupWebView()
        setupFullScreen()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            autoHideStatusBarNew()
        } else {
            autoHideStatusBarOld()
        }

        setContentView(R.layout.activity_main)
        ModelApplication.initializeFrontend(this, R.id.model_host_fragment)
        MainScope().launch {
            ModelApplication.waitForFrontendInitialize()
            ModelApplication.attachWebView(modelWebViewContainer)
            current = this@MainActivity
            nativeUI = ModelApplication.nativeUI
            nativeUI?.components?.add(DocumentPicker(nativeUI!!))
            nativeUI?.components?.add(ImagePicker(nativeUI!!))
        }
    }

    override fun onDestroy() {
        current = null
        nativeUI = null
        modelWebViewContainer.removeAllViews()
        ModelApplication.onActivityDestroy(this)
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
        // TODO: Hide again after suitable delay after it has been shown.
        // Truly full screen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.attributes.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        }

        setFullScreenFlags()
        window.statusBarColor = Color.TRANSPARENT
    }

    @Suppress("DEPRECATION")
    private fun setFullScreenFlagsOld() {
        // Runs on Android versions less than R
        window.decorView.systemUiVisibility = (View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_IMMERSIVE
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION)

    }

    private fun setFullScreenFlags() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false)
        } else {
            setFullScreenFlagsOld()
        }
    }

    override fun onResume() {
        setupFullScreen()
//        Messenger.backend.setContextProvider(this)
        super.onResume()
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        ModelApplication.applyPreferredColorScheme() // update dark mode
    }
}
