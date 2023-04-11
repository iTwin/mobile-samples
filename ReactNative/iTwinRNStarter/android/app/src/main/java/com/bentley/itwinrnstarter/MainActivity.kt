package com.bentley.itwinrnstarter

import android.view.View
import android.view.ViewGroup
import android.view.ViewGroup.OnHierarchyChangeListener
import android.webkit.WebView
import androidx.core.view.children
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.ReactRootView
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.github.itwin.mobilesdk.ITMApplication

class MainActivity: ReactActivity() {
    var application: ITMApplication? = null

    override fun getMainComponentName(): String {
        return "iTwinRNStarter"
    }

    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return object: DefaultReactActivityDelegate(this, mainComponentName,
            DefaultNewArchitectureEntryPoint.fabricEnabled,
            DefaultNewArchitectureEntryPoint.concurrentReactEnabled) {
        }
    }

    override fun setContentView(view: View?) {
        super.setContentView(view)
        (view as? ReactRootView)?.setOnHierarchyChangeListener(HierarchyTreeChangeListener(object: OnHierarchyChangeListener {
            override fun onChildViewAdded(parent: View?, child: View?) {
                if (child is WebView) { // && child.settings.userAgentString.contains("iTwin.js")) {
                    println("WebView added!")
                    child.overScrollMode = View.OVER_SCROLL_NEVER
                    child.isHorizontalScrollBarEnabled = false
                    child.isVerticalScrollBarEnabled = false

                    application?.initializeFrontend(this@MainActivity, false, child)
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

/**
 * A [hierarchy change listener][ViewGroup.OnHierarchyChangeListener] which recursively
 * monitors an entire tree of views.
 * Adapted from: https://gist.github.com/JakeWharton/7189309
 */
class HierarchyTreeChangeListener(private val delegate: OnHierarchyChangeListener) : OnHierarchyChangeListener {
    override fun onChildViewAdded(parent: View, child: View) {
        delegate.onChildViewAdded(parent, child)
        if (child is ViewGroup) {
            child.setOnHierarchyChangeListener(this)
            child.children.forEach { grandChild ->
                onChildViewAdded(child, grandChild)
            }
        }
    }

    override fun onChildViewRemoved(parent: View, child: View) {
        if (child is ViewGroup) {
            child.children.forEach { grandChild ->
                onChildViewRemoved(child, grandChild)
            }
            child.setOnHierarchyChangeListener(null)
        }
        delegate.onChildViewRemoved(parent, child)
    }
}