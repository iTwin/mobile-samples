/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.camera

import com.bentley.sample.shared.SampleApplicationBase

class CameraApplication: SampleApplicationBase<CameraITMApplication>(CameraITMApplication::newInstance) {
    companion object {
        lateinit var instance: CameraApplication
            private set
    }
    init {
        instance = this
    }
}
