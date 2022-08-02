/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.camera

import android.app.Activity
import android.app.AlertDialog
import android.content.ContentResolver
import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContract
import androidx.appcompat.app.AppCompatActivity
import com.eclipsesource.json.Json
import com.eclipsesource.json.JsonValue
import com.github.itwin.mobilesdk.ITMNativeUI
import com.github.itwin.mobilesdk.ITMNativeUIComponent
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import kotlin.coroutines.Continuation
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine

object FileHelper {
    fun getFileDisplayName(uri: Uri, contentResolver: ContentResolver): String? {
        contentResolver.query(uri, null, null, null, null, null)?.let { cursor ->
            if (cursor.moveToFirst()) {
                val columnIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (columnIndex >= 0) {
                    return cursor.getString(columnIndex)
                }
            }
            cursor.close()
        }
        return null
    }

    private fun copyFile(inputStream: InputStream, dir: File, displayName: String): String {
        if (!dir.exists()) {
            dir.mkdirs()
        }
        val dstPath = dir.absolutePath + "/" + displayName
        val outputStream = FileOutputStream(dstPath)
        val buffer = ByteArray(1024)
        var length: Int
        while (inputStream.read(buffer).also { length = it } > 0) {
            outputStream.write(buffer, 0, length)
        }
        outputStream.flush()
        outputStream.close()
        return dstPath
    }

    fun copyToExternalFiles(uri: Uri, destDir: String, context: ContextWrapper): String? {
        var result: String? = null
        context.getExternalFilesDir(null)?.let { filesDir ->
            getFileDisplayName(uri, context.contentResolver)?.let { displayName ->
                context.contentResolver.openInputStream(uri)?.let { inputStream ->
                    result = copyFile(inputStream, File(filesDir, destDir), displayName)
                    inputStream.close()
                }
            }
        }
        return result
    }
}

open class PickUriContract(var destDir: String? = null, private val context: ContextWrapper? = null, private val urlScheme: String? = null) : ActivityResultContract<JsonValue?, Uri?>() {
    override fun createIntent(context: Context, input: JsonValue?): Intent {
        return Intent()
    }

    open fun isAcceptableUri(uri: Uri): Boolean {
        return true
    }

    override fun parseResult(resultCode: Int, intent: Intent?): Uri? {
        val uri = intent.takeIf { resultCode == Activity.RESULT_OK }?.data
        if (uri != null && isAcceptableUri(uri) && context != null) {
            destDir?.let { destDir ->
                FileHelper.copyToExternalFiles(uri, destDir, context)?.let { result ->
                    return Uri.parse(if (urlScheme == null) result else "$urlScheme://$result")
                }
            }
        }
        return uri
    }
}

open class PickDocumentContract(private val context: ContextWrapper?) : PickUriContract("BimCache", context) {
    override fun createIntent(context: Context, input: JsonValue?): Intent {
        return super.createIntent(context, input)
            .setAction(Intent.ACTION_OPEN_DOCUMENT)
            .setType("*/*")
            .addCategory(Intent.CATEGORY_OPENABLE)
    }

    override fun isAcceptableUri(uri: Uri): Boolean {
        return isAcceptableBimUri(uri)
    }

    companion object {
        fun isAcceptableBimUri(uri: Uri): Boolean {
            return uri.toString().lowercase().endsWith(".bim")
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
            startForResult = activity.registerForActivityResult(PickDocumentContract(activity)) { uri ->
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