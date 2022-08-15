/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.camera

import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import com.bentley.sample.shared.MainActivity
import com.bentley.sample.shared.SampleMobileApplication

object CameraMobileApplication : SampleMobileApplication(CameraApplication.getContext()) {
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

    override fun onCreateActivity(activity: MainActivity) {
        super.onCreateActivity(activity)
        ImagePicker.registerForActivityResult(activity)
    }

    override fun onRegisterNativeUI() {
        super.onRegisterNativeUI()
        nativeUI?.let {
            it.components.add(ImagePicker(it))
        }
    }
}