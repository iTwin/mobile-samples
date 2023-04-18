/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.camera

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.activity.ComponentActivity
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContract
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.FileProvider
import com.bentley.sample.shared.PickUriContract
import com.bentley.sample.shared.PickUriContractType
import com.eclipsesource.json.Json
import com.eclipsesource.json.JsonValue
import com.github.itwin.mobilesdk.ITMNativeUI
import com.github.itwin.mobilesdk.ITMNativeUIComponent
import java.io.File
import kotlin.coroutines.Continuation
import kotlin.coroutines.suspendCoroutine

/**
 * Presents a UI for selecting an image or taking a photo when the pickImage message is sent.
 * @property nativeUI The native UI.
 */
class ImagePicker(nativeUI: ITMNativeUI): ITMNativeUIComponent(nativeUI) {
    /**
     * Lets the user pick an image and copies it to the images external files directory.
     */
    private class PickIModelImageContract: PickUriContract() {
        /**
         * Sets up the [Intent] to let the user pick an image.
         * @param context The context.
         * @param input The input parameters.
         * @return An image picking intent.
         */
        override fun createIntent(context: Context, input: JsonValue?): Intent {
            destDir = ImageCache.getDestinationDir(input)

            return super.createIntent(context, input)
                .setAction(Intent.ACTION_PICK)
                .setType("image/*")
        }

        /**
         * Converts the chosen image [Uri] to an [ImagePicker] Uri.
         * @param resultCode The result code returned by the intent.
         * @param intent The intent.
         * @return The chosen image Uri converted to an ImageCache Uri.
         */
        override fun parseResult(resultCode: Int, intent: Intent?): Uri? {
            return super.parseResult(resultCode, intent)?.let { ImageCache.getCacheUri(it.toString()) }
        }

        /**
         * Formulates a unique name for the file using [ImageCache.getDestinationFileName]
         * @param uri The chosen image Uri.
         * @return A unique file name with the same extension as the chosen image.
         */
        override fun getDisplayName(uri: Uri): String {
            val strVal = super.getDisplayName(uri)
            val dotIndex = strVal.lastIndexOf(".")
            val extension = if (dotIndex > 0) strVal.substring(dotIndex) else ""
            return ImageCache.getDestinationFileName() + extension
        }
    }

    /**
     * Lets the user take a picture storing it to the appropriate images external files directory.
     */
    private class CaptureIModelImageContract: PickUriContractType() {
        /** The [ImageCache] Uri where the picture will be stored */
        private var cameraUri: Uri? = null
        /**
         * Android has an existing contract for taking a picture. In our case, we want our contract to conform to [PickUriContractType]
         * so we need to use this as a delegate for the [ActivityResultContract] functions.
         */
        private var takePicture = ActivityResultContracts.TakePicture()

        /**
         * Sets up the [Intent] to let the user take a picture.
         * @param context The context.
         * @param input The input parameters.
         * @return A picture taking intent.
         */
        override fun createIntent(context: Context, input: JsonValue?): Intent {
            getOutputFile(ImageCache.getDestinationDir(input), context)?.let { outputFile ->
                val newUri = ImageCache.getCacheUri(outputFile.toString())
                cameraUri = newUri
                //TakePicture needs a content Uri but we'll be returning an ImageCache Uri
                return takePicture.createIntent(context, getContentUri(outputFile, context))
            }
            // if we don't have anywhere to store the photo, just return an empty Intent
            return Intent()
        }

        /**
         * Returns the [cameraUri] if [takePicture] succeeded.
         * @param resultCode The result code returned by the intent.
         * @param intent The intent.
         * @return The [cameraUri] or null.
         */
        override fun parseResult(resultCode: Int, intent: Intent?): Uri? {
            return cameraUri.takeIf { takePicture.parseResult(resultCode, intent) }
        }

        /**
         * Gets the output file for taking the picture, ensuring any new sub-dirs are created.
         * @param destDir The destination directory (e.g. images/iModelId).
         * @param context The context.
         * @return The fully formulated [File] with a unique name.
         */
        private fun getOutputFile(destDir: String, context: Context): File? {
            return context.getExternalFilesDir(null)?.let { dir ->
                val outDir = File(dir, destDir)
                outDir.mkdirs()
                return File(outDir, "${ImageCache.getDestinationFileName()}.jpg")
            }
        }

        /**
         * Gets a content Uri for a File.
         * @param file File path to convert to a content Uri.
         * @param context The context.
         * @return A content Uri.
         */
        private fun getContentUri(file: File, context: Context): Uri {
            return FileProvider.getUriForFile(context, "${BuildConfig.APPLICATION_ID}.provider", file)
        }
    }

    /**
     * Lets the user pick an image or take a picture depending on the input params.
     */
    private class PickOrCaptureIModelImageContract: PickUriContractType() {
        /** The delegate we'll use depending on the input params */
        lateinit var delegateContract: PickUriContractType

        /**
         * Delegates to either [CaptureIModelImageContract] or [PickIModelImageContract] depending on the sourceType input parameter.
         * @param context The context.
         * @param input The input parameters.
         * @return The intent to pick an image or take a picture.
         */
        override fun createIntent(context: Context, input: JsonValue?): Intent {
            val camera = ImageCache.getObjectValue(input, "sourceType")?.asString() == "camera"
            delegateContract = if (camera) CaptureIModelImageContract() else PickIModelImageContract()
            return delegateContract.createIntent(context, input)
        }

        /**
         * Calls parseResult for the delegate established in [createIntent].
         * @param resultCode The result code.
         * @param intent The intent.
         * @return The uri returned by the delegate.
         */
        override fun parseResult(resultCode: Int, intent: Intent?): Uri? {
            return delegateContract.parseResult(resultCode, intent)
        }
    }

    init {
        handler = coMessenger.registerQueryHandler("pickImage", ::handleQuery)
    }

    companion object {
        private var startForResult: ActivityResultLauncher<JsonValue?>? = null
        private var activeContinuation: Continuation<JsonValue?>? = null

        /**
         * Registers a request to start an activity for result using the [PickOrCaptureIModelImageContract].
         */
        fun registerForActivityResult(activity: ComponentActivity) {
            startForResult = activity.registerForActivityResult(PickOrCaptureIModelImageContract()) { uri ->
                activeContinuation?.resumeWith(Result.success(Json.value(uri?.toString() ?: "")))
                activeContinuation = null
            }
        }
    }

    /**
     * Starts the registered activity result request.
     */
    private suspend fun handleQuery(params: JsonValue?): JsonValue? {
        return suspendCoroutine { continuation ->
            activeContinuation = continuation
            startForResult?.launch(params)
        }
    }
}