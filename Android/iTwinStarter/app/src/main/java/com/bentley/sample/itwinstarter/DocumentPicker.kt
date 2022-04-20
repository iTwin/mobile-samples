package com.bentley.sample.itwinstarter

import android.app.Activity
import android.app.AlertDialog
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import android.webkit.WebView
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import com.eclipsesource.json.Json
import com.eclipsesource.json.JsonValue
import com.github.itwin.mobilesdk.ITMCoMessenger
import com.github.itwin.mobilesdk.ITMComponent
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import kotlin.coroutines.Continuation
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine

class DocumentPicker(context: Context, webView: WebView, coMessenger: ITMCoMessenger): ITMComponent(context, webView, coMessenger) {
    init {
        listener = coMessenger.addQueryListener("chooseDocument", ::handleQuery)
    }

    companion object {
        private var startForResult: ActivityResultLauncher<Intent>? = null
        private var activeContinuation: Continuation<JsonValue?>? = null
        private val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "*/*"
        }

        private fun getFileDisplayName(uri: Uri): String? {
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

        private fun copyDocument(inputStream: InputStream, cacheDir: File, displayName: String): String {
            if (!cacheDir.exists()) {
                cacheDir.mkdirs()
            }
            val dstPath = cacheDir.absolutePath + "/" + displayName
            val outputStream = FileOutputStream(dstPath)
            val buffer = ByteArray(1024)
            var length: Int
            while (inputStream.read(buffer)
                    .also { length = it } > 0
            ) {
                outputStream.write(buffer, 0, length)
            }
            outputStream.flush()
            outputStream.close()
            return dstPath
        }

        fun registerForActivityResult(mainActivity: MainActivity) {
            startForResult = mainActivity.registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
                if (result.resultCode == Activity.RESULT_OK) {
                    var skip = false
                    result.data?.data?.let { uri ->
                        mainActivity.contentResolver.openInputStream(uri)?.let { inputStream ->
                            mainActivity.getExternalFilesDir("BimCache")?.let { cacheDir ->
                                getFileDisplayName(uri)?.let { displayName ->
                                    skip = true
                                    MainScope().launch {
                                        if (displayName.lowercase().endsWith(".bim") || confirm()) {
                                            val dstPath = copyDocument(inputStream, cacheDir, displayName)
                                            activeContinuation?.resumeWith(Result.success(Json.value(dstPath)))
                                            activeContinuation = null
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (!skip) {
                        activeContinuation?.resumeWith(Result.success(Json.value("")))
                        activeContinuation = null
                    }
                } else if (result.resultCode == Activity.RESULT_CANCELED) {
                    activeContinuation?.resumeWith(Result.success(Json.value("")))
                    activeContinuation = null
                }
            }
        }
    }

    private suspend fun handleQuery(@Suppress("UNUSED_PARAMETER") unused: JsonValue?): JsonValue? {
        return suspendCoroutine { continuation ->
            activeContinuation = continuation
            startForResult?.launch(intent)
        }
    }
}