/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.itwinrnstarter

import android.annotation.SuppressLint
import android.content.Context
import com.bentley.itwinrnstarter.BuildConfig
import com.bentley.itwinrnstarter.MainApplication
import com.bentley.sample.shared.SampleITMApplication

@SuppressLint("StaticFieldLeak")
class StarterITMApplication(context: Context) : SampleITMApplication(context, BuildConfig.DEBUG, BuildConfig.DEBUG) {
    init {
        finishInit()
    }
}