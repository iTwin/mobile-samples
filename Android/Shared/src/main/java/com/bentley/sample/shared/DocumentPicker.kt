/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.shared

import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.activity.ComponentActivity
import com.github.itwin.mobilesdk.ITMCoActivityResult
import com.github.itwin.mobilesdk.ITMNativeUI
import com.github.itwin.mobilesdk.ITMNativeUIComponent
import com.github.itwin.mobilesdk.jsonvalue.JSONValue
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine

/**
 * Presents a UI for selecting bim documents when the chooseDocument message is sent.
 */
class DocumentPicker(nativeUI: ITMNativeUI): ITMNativeUIComponent(nativeUI) {
    /**
     * Lets the user pick .bim documents and copies them to the BimCache external files directory.
     */
    private class PickDocumentContract : PickUriContract("BimCache") {
        override fun createIntent(context: Context, input: JSONValue?): Intent {
            return super.createIntent(context, input)
                .setAction(Intent.ACTION_OPEN_DOCUMENT)
                .setType("*/*")
                .addCategory(Intent.CATEGORY_OPENABLE)
        }

        /**
         * Only allow copying files that have a .bim extension.
         */
        override fun shouldCopyUri(uri: Uri): Boolean {
            return isAcceptableBimUri(uri)
        }

        companion object {
            /**
             * @param uri Input Uri.
             * @return true if the uri ends with .bim
             */
            fun isAcceptableBimUri(uri: Uri): Boolean {
                return uri.toString().endsWith(".bim", true)
            }
        }
    }

    private class PickDocument(activity: ComponentActivity):
        ITMCoActivityResult<JSONValue?, Uri?>(activity, PickDocumentContract())

    init {
        handler = coMessenger.registerQueryHandler("chooseDocument", ::handleQuery)
    }

    companion object {
        private var pickDocument: PickDocument? = null
        private var alertDialog: AlertDialog.Builder? = null

        private suspend fun showErrorAlert() = suspendCoroutine { continuation ->
            alertDialog?.apply {
                setTitle(R.string.alert_title_error)
                setMessage(R.string.alert_message_only_bim_files)
                setCancelable(false)
                setPositiveButton(R.string.ok) { _, _ ->
                    continuation.resume(true)
                }
                show()
            }
        }

        /**
         * Registers a request to start an activity for result using the [PickDocumentContract].
         */
        fun registerForActivityResult(activity: ComponentActivity) {
            pickDocument = PickDocument(activity)
            alertDialog = AlertDialog.Builder(activity)
        }
    }

    /**
     * Starts the registered activity result request.
     */
    private suspend fun handleQuery(unused: JSONValue?): JSONValue {
        return pickDocument?.invoke(unused)?.let { uri ->
            if (PickDocumentContract.isAcceptableBimUri(uri)) {
                JSONValue(uri.toString())
            } else {
                MainScope().launch { showErrorAlert() }
                null
            }
        } ?: JSONValue("")
    }
}