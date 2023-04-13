package com.bentley.itwinrnstarter

import android.annotation.SuppressLint
import android.view.View
import android.view.ViewGroup
import android.view.ViewGroup.OnHierarchyChangeListener
import android.webkit.WebView
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactActivityDelegate
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch

class MainActivity: ReactActivity() {
    companion object {
        @SuppressLint("StaticFieldLeak")
        lateinit var itmApplication: StarterITMApplication
    }

    override fun getMainComponentName() = "iTwinRNStarter"

    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return object: DefaultReactActivityDelegate(this, mainComponentName,
            DefaultNewArchitectureEntryPoint.fabricEnabled,
            DefaultNewArchitectureEntryPoint.concurrentReactEnabled) {
        }
    }

    init {
        itmApplication.associateWithActivity(this)
    }

    override fun setContentView(view: View?) {
        super.setContentView(view)
        (view as? ViewGroup)?.setOnHierarchyChangeListener(HierarchyTreeChangeListener(object: OnHierarchyChangeListener {
            override fun onChildViewAdded(parent: View?, child: View?) {
                if (child is WebView) { // && child.settings.userAgentString.contains("iTwin.js")) {
                    println("WebView added!")
                    child.overScrollMode = View.OVER_SCROLL_NEVER
                    //child.isHorizontalScrollBarEnabled = false
                    //child.isVerticalScrollBarEnabled = false

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

