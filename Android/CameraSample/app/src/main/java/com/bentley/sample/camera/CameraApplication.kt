/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.camera

import android.app.Application
import android.content.Context
import com.bentley.sample.shared.MainActivity

/**
 * [Application] sub-class for this sample.
 */
class CameraApplication: Application() {
    /**
     * Sets [MainActivity.sampleITMApplication] to [CameraITMApplication] so that our camera-specific message handlers are setup.
     */
    override fun onCreate() {
        super.onCreate()
        appContext = applicationContext
        application = this
        MainActivity.sampleITMApplication = CameraITMApplication
    }

    companion object {
        private lateinit var appContext: Context
        private lateinit var application: Application

        fun getContext() : Context {
            return appContext
        }
    }
}