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
    fun getFileDisplayName(uri: Uri): String? {
        MainActivity.current!!.contentResolver.query(uri, null, null, null, null, null)?.let { cursor ->
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

    fun copyDocument(inputStream: InputStream, dir: File, displayName: String): String {
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

    fun copyDocument(contentResolver: ContentResolver, uri: Uri, cacheDir: File, displayName: String): String? {
        var result: String? = null
        contentResolver.openInputStream(uri)?.let { inputStream ->
            result = FileHelper.copyDocument(inputStream, cacheDir, displayName)
            inputStream.close()
        }
        return result
    }

    fun copyDocument(uri: Uri, destDir: String, context: ContextWrapper): String? {
        context.getExternalFilesDir(null)?.let { filesDir ->
            val cacheDir = File(filesDir, destDir)
            FileHelper.getFileDisplayName(uri)?.let { displayName ->
                return FileHelper.copyDocument(context.contentResolver, uri, cacheDir, displayName)
            }
        }
        return null
    }
}

open class PickUriContract(var destDir: String? = null, private val context: ContextWrapper? = null, private val urlScheme: String? = null) : ActivityResultContract<JsonValue?, Uri?>() {
    override fun createIntent(context: Context, input: JsonValue?): Intent {
        return Intent()
    }

    override fun parseResult(resultCode: Int, intent: Intent?): Uri? {
        val uri = intent.takeIf { resultCode == Activity.RESULT_OK }?.data
        if (uri != null && context != null && urlScheme != null) {
            destDir?.let { destDir ->
                FileHelper.copyDocument(uri, destDir, context)?.let { result ->
                    return Uri.parse("$urlScheme://$result")
                }
            }
        }
        return uri
    }
}

open class PickDocumentContract : PickUriContract() {
    override fun createIntent(context: Context, input: JsonValue?): Intent {
        return super.createIntent(context, input)
            .setAction(Intent.ACTION_OPEN_DOCUMENT)
            .setType("*/*")
            .addCategory(Intent.CATEGORY_OPENABLE)
    }
}

class DocumentPicker(nativeUI: ITMNativeUI): ITMNativeUIComponent(nativeUI) {
    init {
        listener = coMessenger.addQueryListener("chooseDocument", ::handleQuery)
    }

    companion object {
        private var startForResult: ActivityResultLauncher<JsonValue?>? = null
        private var activeContinuation: Continuation<JsonValue?>? = null

        private suspend fun confirm(): Boolean {
            return suspendCoroutine { continuation ->
                with(AlertDialog.Builder(MainActivity.current)) {
                    setTitle("Warning")
                    setMessage("The file does not appear to be a BIM iModel. Are you sure you want to open it?")
                    setCancelable(false)
                    setNegativeButton("No") { _, _ ->
                        continuation.resume(false)
                    }
                    setPositiveButton("Yes") { _, _ ->
                        continuation.resume(true)
                    }
                    show()
                }
            }
        }

        fun registerForActivityResult(mainActivity: MainActivity) {
            startForResult = mainActivity.registerForActivityResult(PickDocumentContract()) { uri ->
                if (uri != null) {
                    var skip = false
                    mainActivity.contentResolver.openInputStream(uri)?.let { inputStream ->
                        mainActivity.getExternalFilesDir("BimCache")?.let { cacheDir ->
                            FileHelper.getFileDisplayName(uri)?.let { displayName ->
                                skip = true
                                MainScope().launch {
                                    if (displayName.lowercase().endsWith(".bim") || confirm()) {
                                        val dstPath = FileHelper.copyDocument(inputStream, cacheDir, displayName)
                                        activeContinuation?.resumeWith(Result.success(Json.value(dstPath)))
                                        activeContinuation = null
                                    }
                                }
                            }
                        }
                    }
                    if (!skip) {
                        activeContinuation?.resumeWith(Result.success(Json.value("")))
                        activeContinuation = null
                    }
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