/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.shared

import android.content.Context
import android.net.Uri
import com.eclipsesource.json.Json
import com.github.itwin.mobilesdk.ITMApplication

/**
 * The base [ITMApplication] implementation for the sample applications.
 * Applications should sub-class using a singleton object and call [finishInit] in the init block.
 */
open class SampleITMApplication(context: Context, attachWebViewLogger: Boolean, forceExtractBackendAssets: Boolean) : ITMApplication(context, attachWebViewLogger, forceExtractBackendAssets) {
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
        coMessenger.registerMessageHandler("loading") {}
        coMessenger.registerMessageHandler("didFinishLaunching") {
            coMessenger.frontendLaunchSucceeded()
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
}
