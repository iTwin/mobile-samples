/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.shared

import android.content.Context
import android.net.Uri
import com.eclipsesource.json.Json
import com.github.itwin.mobilesdk.ITMApplication

open class SampleITMApplication(context: Context, attachWebViewLogger: Boolean, forceExtractBackendAssets: Boolean) : ITMApplication(context, attachWebViewLogger, forceExtractBackendAssets) {
    override fun openUri(uri: Uri) {
        MainActivity.openUri(uri)
    }

    override fun setupWebView() {
        super.setupWebView()
        coMessenger?.let { coMessenger ->
            coMessenger.addMessageListener("loading") {}
            coMessenger.addMessageListener("didFinishLaunching") {
                coMessenger.frontendLaunchSucceeded()
            }

            coMessenger.addQueryListener("getBimDocuments") {
                Json.array(*FileHelper.getExternalFiles(this.appContext,"BimCache", ".bim").toTypedArray())
            }
        }
    }

    open fun onCreateActivity(activity: MainActivity) {
        DocumentPicker.registerForActivityResult(activity)
    }

    open fun onRegisterNativeUI() {
        nativeUI?.let {
            it.components.add(DocumentPicker(it))
        }
    }
}
