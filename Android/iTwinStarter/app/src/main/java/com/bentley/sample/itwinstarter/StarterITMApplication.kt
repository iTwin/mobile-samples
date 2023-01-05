/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.itwinstarter

import android.annotation.SuppressLint
import com.bentley.sample.shared.SampleITMApplication

@SuppressLint("StaticFieldLeak")
object StarterITMApplication : SampleITMApplication(StarterApplication.getContext(), BuildConfig.DEBUG, BuildConfig.DEBUG) {
    init {
        finishInit()
    }
}