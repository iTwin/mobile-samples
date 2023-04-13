/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.itwinrnstarter

import android.annotation.SuppressLint
import android.os.Bundle
import android.os.PersistableBundle
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
    private val itmApplication: SampleITMApplication
        get() {
            @Suppress("UNCHECKED_CAST")
            return (this.application as SampleApplicationBase<SampleITMApplication>).getITMApplication()
        }
    override fun getMainComponentName() = "iTwinRNStarter"

    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return object: DefaultReactActivityDelegate(this, mainComponentName,
            DefaultNewArchitectureEntryPoint.fabricEnabled,
            DefaultNewArchitectureEntryPoint.concurrentReactEnabled) {
        }
    }

    override fun onCreate(savedInstanceState: Bundle?, persistentState: PersistableBundle?) {
        super.onCreate(savedInstanceState, persistentState)
    }

    override fun setContentView(view: View?) {
        itmApplication.associateWithActivity(this)
        super.setContentView(view)
        (view as? ViewGroup)?.setOnHierarchyChangeListener(HierarchyTreeChangeListener(object: OnHierarchyChangeListener {
            override fun onChildViewAdded(parent: View?, child: View?) {
                if (child is WebView) { // && child.settings.userAgentString.contains("iTwin.js")) {
                    println("WebView added!")
                    child.overScrollMode = View.OVER_SCROLL_NEVER

                    itmApplication.initializeFrontend(this@MainActivity, false, child)
                    MainScope().launch {
                        itmApplication.waitForFrontendInitialize()
                        itmApplication.onRegisterNativeUI()
                    }
                }
            }
            override fun onChildViewRemoved(parent: View?, child: View?) {
                if (child is WebView) {
                    println("WebView removed!")
                }
            }
        }))
    }
}

