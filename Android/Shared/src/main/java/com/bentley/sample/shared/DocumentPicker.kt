/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.shared

import android.app.Activity
import android.app.AlertDialog
import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import android.net.Uri
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContract
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

open class PickUriContract(var destDir: String? = null) : ActivityResultContract<JsonValue?, Uri?>() {
    protected lateinit var context: Context

    override fun createIntent(context: Context, input: JsonValue?): Intent {
        this.context = context
        return Intent()
    }

    open fun shouldCopyUri(uri: Uri): Boolean {
        return true
    }

    open fun getDisplayName(uri: Uri): String {
        return FileHelper.getFileDisplayName(uri, context.contentResolver) ?: "unknownDisplayName"
    }

    override fun parseResult(resultCode: Int, intent: Intent?): Uri? {
        val uri = intent?.takeIf { resultCode == Activity.RESULT_OK }?.data
        if (uri != null && shouldCopyUri(uri)) {
            destDir?.let { destDir ->
                FileHelper.copyToExternalFiles(context, uri, destDir, getDisplayName(uri))?.let { result ->
                    return Uri.parse(result)
                }
            }
        }
        return uri
    }
}

open class PickDocumentContract : PickUriContract("BimCache") {
    override fun createIntent(context: Context, input: JsonValue?): Intent {
        return super.createIntent(context, input)
            .setAction(Intent.ACTION_OPEN_DOCUMENT)
            .setType("*/*")
            .addCategory(Intent.CATEGORY_OPENABLE)
    }

    override fun shouldCopyUri(uri: Uri): Boolean {
        return isAcceptableBimUri(uri)
    }

    companion object {
        fun isAcceptableBimUri(uri: Uri): Boolean {
            return uri.toString().endsWith(".bim", true)
        }
    }
}

class DocumentPicker(nativeUI: ITMNativeUI): ITMNativeUIComponent(nativeUI) {
    init {
        listener = coMessenger.addQueryListener("chooseDocument", ::handleQuery)
    }

    companion object {
        private var startForResult: ActivityResultLauncher<JsonValue?>? = null
        private var activeContinuation: Continuation<JsonValue?>? = null

        private suspend fun showErrorAlert(context: ContextWrapper?): Boolean {
            return suspendCoroutine { continuation ->
                with(AlertDialog.Builder(context)) {
                    setTitle("Error")
                    setMessage("Only .bim files can be opened.")
                    setCancelable(false)
                    setPositiveButton("OK") { _, _ ->
                        continuation.resume(true)
                    }
                    show()
                }
            }
        }

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

    private suspend fun handleQuery(unused: JsonValue?): JsonValue? {
        return suspendCoroutine { continuation ->
            activeContinuation = continuation
            startForResult?.launch(unused)
        }
    }
}