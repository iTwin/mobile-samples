/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.shared

import android.content.Context
import android.net.Uri
import androidx.fragment.app.FragmentActivity
import com.eclipsesource.json.Json
import com.github.itwin.mobilesdk.ITMApplication
import com.github.itwin.mobilesdk.jsonvalue.isYes
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch

/**
 * The base [ITMApplication] implementation for the sample applications.
 * Applications should sub-class using a singleton object and call [finishInit] in the init block.
 */
open class SampleITMApplication(context: Context, attachWebViewLogger: Boolean, forceExtractBackendAssets: Boolean) : ITMApplication(context, attachWebViewLogger, forceExtractBackendAssets) {
    private val startupTimer = ActivityTimer()

    override fun finishInit() {
        super.finishInit()
        startupTimer.enabled = configData?.isYes("ITMSAMPLE_LOG_STARTUP_TIMES") ?: true
    }

    /**
     * Implements the abstract function by delegating to [MainActivity].
     */
    override fun openUri(uri: Uri) {
        MainActivity.openUri(uri)
    }

    /**
     * Adds handlers for the messages used in this application.
     */
    override fun setupWebView() {
        super.setupWebView()
        coMessenger.registerMessageHandler("loading") {
            startupTimer.addCheckpoint("Webview load")
        }
        coMessenger.registerMessageHandler("didFinishLaunching") {
            coMessenger.frontendLaunchSucceeded()
            startupTimer.addCheckpoint("Launch total")
            startupTimer.logTimes(logger,"STARTUP TIMES")
        }

        coMessenger.registerQueryHandler("getBimDocuments") {
            Json.array(*this.appContext.getExternalFiles("BimCache", ".bim").toTypedArray())
        }
    }

    /**
     * Registers activity result handlers for our native UI components.
     */
    open fun onCreateActivity(activity: MainActivity) {
        DocumentPicker.registerForActivityResult(activity)
    }

    /**
     * Registers our native UI components.
     */
    open fun onRegisterNativeUI() {
        nativeUI?.let {
            it.components.add(DocumentPicker(it))
        }
    }

    /**
     * Notifies the IModelJsHost that the app has paused.
     */
    fun onPause() {
        this.host?.onPause()
    }

    /**
     * Notifies the IModelJsHost that the app has resumed.
     */
    fun onResume() {
        this.host?.onResume()
    }

    override fun initializeBackend(
        fragmentActivity: FragmentActivity,
        allowInspectBackend: Boolean
    ) {
        startupTimer.addCheckpoint("Before backend load")
        super.initializeBackend(fragmentActivity, allowInspectBackend)
        MainScope().launch {
            waitForBackendInitialize()
            startupTimer.addCheckpoint("After backend load")
        }
    }

    override fun initializeFrontend(
        fragmentActivity: FragmentActivity,
        fragmentContainerId: Int,
        allowInspectBackend: Boolean
    ) {
        startupTimer.addCheckpoint("Before frontend load")
        super.initializeFrontend(fragmentActivity, fragmentContainerId, allowInspectBackend)
        MainScope().launch {
            waitForFrontendInitialize()
            startupTimer.addCheckpoint("After frontend load")
        }
    }
}
