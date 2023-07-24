/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.camera

import android.os.Bundle
import com.bentley.sample.shared.MainActivity

class CameraMainActivity: MainActivity() {
    companion object {
        var current: CameraMainActivity? = null
            private set
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        current = this
        super.onCreate(savedInstanceState)
    }

    override fun onDestroy() {
        super.onDestroy()
        current = null
    }
}