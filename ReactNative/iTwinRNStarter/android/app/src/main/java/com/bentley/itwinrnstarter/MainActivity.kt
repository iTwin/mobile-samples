/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.itwinrnstarter

import android.view.View
import android.view.ViewGroup
import android.view.ViewGroup.OnHierarchyChangeListener
import android.webkit.WebView
import com.bentley.sample.shared.SampleApplicationBase
import com.bentley.sample.shared.SampleITMApplication
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactActivityDelegate
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch

class MainActivity: ReactActivity() {
    private var resumed = false
    private val itmApplication: SampleITMApplication
        get() {
            @Suppress("UNCHECKED_CAST")
            return (this.application as SampleApplicationBase<SampleITMApplication>).itmApplication
        }
    override fun getMainComponentName() = "iTwinRNStarter"

    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return object: DefaultReactActivityDelegate(this, mainComponentName,
            DefaultNewArchitectureEntryPoint.fabricEnabled,
            DefaultNewArchitectureEntryPoint.concurrentReactEnabled) {
        }
    }

    override fun setContentView(view: View?) {
        itmApplication.associateWithActivity(this)
        super.setContentView(view)
        (view as? ViewGroup)?.setOnHierarchyChangeListener(HierarchyTreeChangeListener(object: OnHierarchyChangeListener {
            override fun onChildViewAdded(parent: View?, child: View?) {
                if (child is WebView) { // && child.settings.userAgentString.contains("iTwin.js")) {
                    child.overScrollMode = View.OVER_SCROLL_NEVER

                    itmApplication.initializeFrontend(this@MainActivity, false, child)
                    MainScope().launch {
                        // Typically this is done in the activity's onResume the first time it is run,
                        // but we need to call it *once* here since we can't initialize from onCreate
                        if (!resumed) {
                            itmApplication.onActivityResume()
                            resumed = true
                        }
                        itmApplication.waitForFrontendInitialize()
                    }
                }
            }
            override fun onChildViewRemoved(parent: View?, child: View?) {
                if (child is WebView) {
                    itmApplication.webView = null
                }
            }
        }))
    }
}

