/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.camera

import android.app.Application
import android.content.Context
import com.bentley.sample.shared.MainActivity

class CameraApplication: Application() {
    override fun onCreate() {
        super.onCreate()
        appContext = applicationContext
        application = this
        MainActivity.sampleMobileApplication = CameraMobileApplication
    }

    companion object {
        private lateinit var appContext: Context
        private lateinit var application: Application

        fun getContext() : Context {
            return appContext
        }
    }
}