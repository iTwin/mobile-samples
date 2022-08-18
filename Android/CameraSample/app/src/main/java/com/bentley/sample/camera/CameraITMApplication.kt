/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.camera

import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import com.bentley.sample.shared.MainActivity
import com.bentley.sample.shared.SampleITMApplication

/**
 * [SampleITMApplication] sub-class that sets up all of the camera-specific functionality.
 */
object CameraITMApplication : SampleITMApplication(CameraApplication.getContext(), BuildConfig.DEBUG, BuildConfig.DEBUG) {
    init {
        finishInit()
    }

    /**
     * Registers handlers for the camera-specific messages.
     */
    override fun setupWebView() {
        super.setupWebView()
        coMessenger?.let { coMessenger ->
            coMessenger.registerQueryHandler("getImages", ImageCache::handleGetImages)
            coMessenger.registerQueryHandler("deleteImages", ImageCache::handleDeleteImages)
            coMessenger.registerQueryHandler("deleteAllImages", ImageCache::handleDeleteAllImages)
            coMessenger.registerQueryHandler("shareImages", ImageCache::handleShareImages)
        }
    }

    /**
     * Intercepts any [ImageCache] specific Urls by delegating to [ImageCache.shouldInterceptRequest]
     */
    override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
        return ImageCache.shouldInterceptRequest(request.url) ?: super.shouldInterceptRequest(view, request)
    }

    /**
     * Registers activity result handlers for our native UI components including [ImagePicker].
     */
    override fun onCreateActivity(activity: MainActivity) {
        super.onCreateActivity(activity)
        ImagePicker.registerForActivityResult(activity)
    }

    /**
     * Registers our native UI components including [ImagePicker].
     */
    override fun onRegisterNativeUI() {
        super.onRegisterNativeUI()
        nativeUI?.let {
            it.components.add(ImagePicker(it))
        }
    }
}