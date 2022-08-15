/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.camera

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContract
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.FileProvider
import com.bentley.sample.shared.PickUriContract
import com.eclipsesource.json.Json
import com.eclipsesource.json.JsonValue
import com.github.itwin.mobilesdk.ITMNativeUI
import com.github.itwin.mobilesdk.ITMNativeUIComponent
import java.io.File
import kotlin.coroutines.Continuation
import kotlin.coroutines.suspendCoroutine

class ImagePicker(nativeUI: ITMNativeUI): ITMNativeUIComponent(nativeUI) {
    private class PickIModelImageContract: PickUriContract() {
        override fun createIntent(context: Context, input: JsonValue?): Intent {
            destDir = ImageCache.getDestinationDir(input)

            return super.createIntent(context, input)
                .setAction(Intent.ACTION_PICK)
                .setType("image/*")
        }

        override fun parseResult(resultCode: Int, intent: Intent?): Uri? {
            return super.parseResult(resultCode, intent)?.let { ImageCache.getCacheUri(it.toString()) }
        }

        override fun getDisplayName(uri: Uri): String {
            val strVal = super.getDisplayName(uri)
            val dotIndex = strVal.lastIndexOf(".")
            val extension = if (dotIndex > 0) strVal.substring(dotIndex) else ""
            return ImageCache.getDestinationFileName() + extension
        }
    }

    private class CaptureIModelImageContract: ActivityResultContract<JsonValue?, Uri?>() {
        private var cameraUri: Uri? = null
        private var takePicture = ActivityResultContracts.TakePicture()

        override fun createIntent(context: Context, input: JsonValue?): Intent {
            getOutputFile(ImageCache.getDestinationDir(input), context)?.let { outputFile ->
                val newUri = ImageCache.getCacheUri(outputFile.toString())
                cameraUri = newUri
                return takePicture.createIntent(context, getContentUri(outputFile, context))
            }
            // if we don't have anywhere to store the photo, just return an empty Intent
            return Intent()
        }

        override fun parseResult(resultCode: Int, intent: Intent?): Uri? {
            return cameraUri.takeIf { takePicture.parseResult(resultCode, intent) }
        }

        private fun getOutputFile(destDir: String, context: Context): File? {
            return context.getExternalFilesDir(null)?.let { dir ->
                val outDir = File(dir, destDir)
                outDir.mkdirs()
                return File(outDir, "${ImageCache.getDestinationFileName()}.jpg")
            }
        }

        private fun getContentUri(file: File, context: Context): Uri {
            return FileProvider.getUriForFile(context, "${BuildConfig.APPLICATION_ID}.provider", file)
        }
    }

    private class PickOrCaptureIModelImageContract: ActivityResultContract<JsonValue?, Uri?>() {
        var delegateContract: ActivityResultContract<JsonValue?, Uri?>? = null

        override fun createIntent(context: Context, input: JsonValue?): Intent {
            val camera = input?.asObject()?.getString("sourceType", "") == "camera"
            val newDelegate = if (camera) CaptureIModelImageContract() else PickIModelImageContract()
            delegateContract = newDelegate
            return newDelegate.createIntent(context, input)
        }

        override fun parseResult(resultCode: Int, intent: Intent?): Uri? {
            return delegateContract?.parseResult(resultCode, intent)
        }
    }

    init {
        listener = coMessenger.addQueryListener("pickImage", ::handleQuery)
    }

    companion object {
        private var startForResult: ActivityResultLauncher<JsonValue?>? = null
        private var activeContinuation: Continuation<JsonValue?>? = null

        fun registerForActivityResult(activity: AppCompatActivity) {
            startForResult = activity.registerForActivityResult(PickOrCaptureIModelImageContract()) { uri ->
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