package com.bentley.itwinrnstarter

import android.view.View
import android.view.ViewGroup
import androidx.core.view.children

/*---------------------------------------------------------------------------------------------
* This code is adapted from: https://gist.github.com/JakeWharton/7189309.
*
* Modifications made:
* - Converted to Kotlin from Java
* - Removed the static wrap function as it isn't needed
* - Used forEach instead of for loops
*
* That original code is licensed under the Apache 2.0 license:
* http://www.apache.org/licenses/LICENSE-2.0
*----------------------------------------------------------------------------------------------
* Modifications Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/**
 * A [hierarchy change listener][ViewGroup.OnHierarchyChangeListener] which recursively
 * monitors an entire tree of views.
 */
class HierarchyTreeChangeListener(private val delegate: ViewGroup.OnHierarchyChangeListener) : ViewGroup.OnHierarchyChangeListener {
    override fun onChildViewAdded(parent: View, child: View) {
        delegate.onChildViewAdded(parent, child)
        if (child is ViewGroup) {
            child.setOnHierarchyChangeListener(this)
            child.children.forEach {
                onChildViewAdded(child, it)
            }
        }
    }

    override fun onChildViewRemoved(parent: View, child: View) {
        if (child is ViewGroup) {
            child.children.forEach {
                onChildViewRemoved(child, it)
            }
            child.setOnHierarchyChangeListener(null)
        }
        delegate.onChildViewRemoved(parent, child)
    }
}