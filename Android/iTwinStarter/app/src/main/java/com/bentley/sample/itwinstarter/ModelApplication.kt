/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.itwinstarter

import android.net.Uri
import com.eclipsesource.json.Json
import com.github.itwin.mobilesdk.ITMApplication

object ModelApplication : ITMApplication(StarterApplication.getContext(), BuildConfig.DEBUG, BuildConfig.DEBUG) {
    init {
        finishInit()
    }

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
                val result = Json.array()
                appContext.getExternalFilesDir("BimCache")?.let { cacheDir ->
                    cacheDir.listFiles { _, filename ->
                        filename.lowercase().endsWith(".bim")
                    }?.let { bimFiles ->
                        for (bimFile in bimFiles) {
                            result.add(bimFile.path)
                        }
                    }
                }
                result
            }
        }
    }
}