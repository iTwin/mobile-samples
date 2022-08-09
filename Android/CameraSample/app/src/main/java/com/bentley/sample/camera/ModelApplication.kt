/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.camera

import android.net.Uri
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
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
                Json.array(*FileHelper.getExternalFiles("BimCache", ".bim").toTypedArray())
            }

            coMessenger.addQueryListener("getImages") { ImageCache.handleGetImages(it) }
            coMessenger.addQueryListener("deleteImages") { ImageCache.handleDeleteImages(it) }
            coMessenger.addQueryListener("deleteAllImages") { ImageCache.handleDeleteAllImages(it) }
        }
    }

    override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
        return ImageCache.shouldInterceptRequest(request.url) ?: super.shouldInterceptRequest(view, request)
    }
}