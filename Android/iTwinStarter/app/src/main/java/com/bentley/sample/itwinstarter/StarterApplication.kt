/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.itwinstarter

import com.bentley.sample.shared.BuildConfig
import com.bentley.sample.shared.SampleApplicationBase
import com.bentley.sample.shared.SampleITMApplication

class StarterApplication: SampleApplicationBase<SampleITMApplication>({
    object: SampleITMApplication(it, BuildConfig.DEBUG, BuildConfig.DEBUG) {
        init {
            finishInit()
        }
    }
})
