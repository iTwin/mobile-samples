/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.camera

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.MediaStore
import androidx.activity.result.ActivityResultLauncher
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.FileProvider
import com.eclipsesource.json.Json
import com.eclipsesource.json.JsonValue
import com.github.itwin.mobilesdk.ITMNativeUI
import com.github.itwin.mobilesdk.ITMNativeUIComponent
import java.io.File
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import kotlin.coroutines.Continuation
import kotlin.coroutines.suspendCoroutine

private class PickIModelImageContract: PickUriContract() {
    private var cameraUri: Uri? = null

    override fun createIntent(context: Context, input: JsonValue?): Intent {
        val obj = input?.asObject()
        val camera = obj?.getString("sourceType", "") == "camera"
        val iModelId = obj?.getString("iModelId", "unknownModelId") ?: "unknownModelId"
        destDir = ImageCache.getDestinationDir(iModelId)
        cameraUri = if (camera) getCameraUri() else null

        return with(super.createIntent(context, input)) {
            if (!camera) {
                action = Intent.ACTION_PICK
                setType("image/*")
            } else {
                action = MediaStore.ACTION_IMAGE_CAPTURE
                putExtra(MediaStore.EXTRA_OUTPUT, getContentUri(cameraUri))
            }
        }
    }

    override fun shouldCopyUri(uri: Uri): Boolean {
        return (cameraUri == null) && super.shouldCopyUri(uri)
    }

    override fun parseResult(resultCode: Int, intent: Intent?): Uri? {
        return cameraUri ?: super.parseResult(resultCode, intent)?.let { uri -> ImageCache.getCacheUri(uri.toString()) }
    }

    private fun getFormattedDate(): String {
        return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH-mm-ss.SSS"))
    }

    override fun getDisplayName(uri: Uri): String {
        val strVal = super.getDisplayName(uri)
        val dotIndex = strVal.lastIndexOf(".")
        val extension = if (dotIndex > 0) strVal.substring(dotIndex) else ""
        return getFormattedDate() + extension
    }

    private fun getCameraUri(): Uri {
        destDir?.let { destDir ->
            context.getExternalFilesDir(null)?.let { dir ->
                val outDir = File(dir, destDir)
                outDir.mkdirs()
                val outputFile = File(outDir, "${getFormattedDate()}.jpg")
                return ImageCache.getCacheUri(outputFile.toString())
            }
        }
        return Uri.EMPTY
    }

    private fun getContentUri(uri: Uri?): Uri? {
        uri?.path?.let { path ->
            return FileProvider.getUriForFile(context, "${BuildConfig.APPLICATION_ID}.provider", File(path))
        }
        return null
    }
}

class ImagePicker(nativeUI: ITMNativeUI): ITMNativeUIComponent(nativeUI) {
    init {
        listener = coMessenger.addQueryListener("pickImage", ::handleQuery)
    }

    companion object {
        private var startForResult: ActivityResultLauncher<JsonValue?>? = null
        private var activeContinuation: Continuation<JsonValue?>? = null

        fun registerForActivityResult(activity: AppCompatActivity) {
            startForResult = activity.registerForActivityResult(PickIModelImageContract()) { uri ->
                activeContinuation?.resumeWith(Result.success(Json.value(uri?.toString() ?: "")))
                activeContinuation = null
            }
        }
    }

    private suspend fun handleQuery(params: JsonValue?): JsonValue? {
        return suspendCoroutine { continuation ->
            activeContinuation = continuation
            startForResult?.launch(params)
        }
    }
}