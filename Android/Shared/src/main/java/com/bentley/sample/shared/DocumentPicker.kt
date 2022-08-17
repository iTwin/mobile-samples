/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.shared

import android.app.AlertDialog
import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import android.net.Uri
import androidx.activity.result.ActivityResultLauncher
import androidx.appcompat.app.AppCompatActivity
import com.eclipsesource.json.Json
import com.eclipsesource.json.JsonValue
import com.github.itwin.mobilesdk.ITMNativeUI
import com.github.itwin.mobilesdk.ITMNativeUIComponent
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch
import kotlin.coroutines.Continuation
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
        override fun createIntent(context: Context, input: JsonValue?): Intent {
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

    init {
        listener = coMessenger.addQueryListener("chooseDocument", ::handleQuery)
    }

    companion object {
        private var startForResult: ActivityResultLauncher<JsonValue?>? = null
        private var activeContinuation: Continuation<JsonValue?>? = null

        private suspend fun showErrorAlert(context: ContextWrapper?): Boolean {
            return suspendCoroutine { continuation ->
                with(AlertDialog.Builder(context)) {
                    setTitle(R.string.alert_title_error)
                    setMessage(R.string.alert_message_only_bim_files)
                    setCancelable(false)
                    setPositiveButton(R.string.ok) { _, _ ->
                        continuation.resume(true)
                    }
                    show()
                }
            }
        }

        /**
         * Registers a request to start an activity for result using the [PickDocumentContract].
         */
        fun registerForActivityResult(activity: AppCompatActivity) {
            startForResult = activity.registerForActivityResult(PickDocumentContract()) { uri ->
                if (uri != null && !PickDocumentContract.isAcceptableBimUri(uri)) {
                    MainScope().launch {
                        showErrorAlert(activity)
                        activeContinuation?.resumeWith(Result.success(Json.value("")))
                        activeContinuation = null
                    }
                } else {
                    activeContinuation?.resumeWith(Result.success(Json.value(uri?.toString() ?: "")))
                    activeContinuation = null
                }
            }
        }
    }

    /**
     * Starts the registered activity result request.
     */
    private suspend fun handleQuery(unused: JsonValue?): JsonValue? {
        return suspendCoroutine { continuation ->
            activeContinuation = continuation
            startForResult?.launch(unused)
        }
    }
}