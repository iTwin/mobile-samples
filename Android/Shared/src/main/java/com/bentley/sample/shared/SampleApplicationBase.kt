/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.shared

import android.app.Application
import android.content.Context
import com.github.itwin.mobilesdk.ITMApplication

/**
 * Base class that can be used by applications that sub-class [SampleITMApplication].
 */
open class SampleApplicationBase<T: ITMApplication>(private val factory: (context: Context) -> T): Application() {
    lateinit var itmApplication: T

    override fun onCreate() {
        super.onCreate()
        itmApplication = factory(applicationContext)
    }
}

/**
 * Convenience class for applications that don't sub-class [SampleITMApplication].
 */
open class SampleApplication: SampleApplicationBase<SampleITMApplication>(SampleITMApplication::newInstance)