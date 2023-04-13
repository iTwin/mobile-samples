/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.shared

import android.annotation.SuppressLint
import android.app.Application
import android.content.Context
import com.github.itwin.mobilesdk.ITMApplication

open class SampleApplicationBase<T: ITMApplication>(private val factory: (context: Context) -> T): Application() {
    lateinit var itmApplication: T

    override fun onCreate() {
        super.onCreate()
        itmApplication = factory(applicationContext)
    }
}
