/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.camera

import android.net.Uri
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import com.bentley.sample.shared.FileHelper
import com.eclipsesource.json.Json
import com.github.itwin.mobilesdk.ITMApplication

// move to Shared
open class SampleMobileApplication : ITMApplication(StarterApplication.getContext(), BuildConfig.DEBUG, BuildConfig.DEBUG) {
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
}

object CameraMobileApplication : SampleMobileApplication() {
    init {
        finishInit()
    }

    override fun setupWebView() {
        super.setupWebView()
        coMessenger?.let { coMessenger ->
            coMessenger.addQueryListener("getImages", ImageCache::handleGetImages)
            coMessenger.addQueryListener("deleteImages", ImageCache::handleDeleteImages)
            coMessenger.addQueryListener("deleteAllImages", ImageCache::handleDeleteAllImages)
            coMessenger.addQueryListener("shareImages", ImageCache::handleShareImages)
        }
    }

    override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
        return ImageCache.shouldInterceptRequest(request.url) ?: super.shouldInterceptRequest(view, request)
    }
}