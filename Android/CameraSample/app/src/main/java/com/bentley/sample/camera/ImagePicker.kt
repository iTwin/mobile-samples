/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.camera

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContract
import com.eclipsesource.json.Json
import com.eclipsesource.json.JsonObject
import com.eclipsesource.json.JsonValue
import com.github.itwin.mobilesdk.ITMNativeUI
import com.github.itwin.mobilesdk.ITMNativeUIComponent
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch
import kotlin.coroutines.Continuation
import kotlin.coroutines.suspendCoroutine

class PickImageContract : ActivityResultContract<Void?, Uri?>() {
    override fun createIntent(context: Context, input: Void?): Intent {
        return Intent(Intent.ACTION_PICK).setType("image/*")
    }

    override fun parseResult(resultCode: Int, intent: Intent?): Uri? {
        return intent.takeIf { resultCode == Activity.RESULT_OK }?.data
    }
}

class PickIModelImageContract: ActivityResultContract<JsonObject, Uri?>() {
    override fun createIntent(context: Context, input: JsonObject): Intent {
        return Intent(Intent.ACTION_PICK).setType("image/*")
            .putExtra("sourceType", input.getString("sourceType", ""))
            .putExtra("iModelId", input.getString("iModelId", ""))
    }

    override fun parseResult(resultCode: Int, intent: Intent?): Uri? {
        return intent.takeIf { resultCode == Activity.RESULT_OK }?.data
    }
}

class ImagePicker(nativeUI: ITMNativeUI): ITMNativeUIComponent(nativeUI) {
    init {
        listener = coMessenger.addQueryListener("pickImage", ::handleQuery)
    }

    companion object {
        const val urlScheme = "com.bentley.itms-image-cache"
        private var startForResult: ActivityResultLauncher<JsonObject>? = null
        private var activeContinuation: Continuation<JsonValue?>? = null

        fun registerForActivityResult(mainActivity: MainActivity) {
            startForResult = mainActivity.registerForActivityResult(PickIModelImageContract()) { uri ->
                var result = ""
                if (uri != null) {
                    mainActivity.contentResolver.openInputStream(uri)?.let { inputStream ->
                        mainActivity.getExternalFilesDir("images")?.let { cacheDir ->
                            DocumentPicker.getFileDisplayName(uri)?.let { displayName ->
                                MainScope().launch {
                                    val dstPath = DocumentPicker.copyDocument(inputStream, cacheDir, displayName)
                                    result = "$urlScheme://$dstPath"
                                }
                            }
                        }
                    }
                }
                activeContinuation?.resumeWith(Result.success(Json.value(result)))
                activeContinuation = null
            }
        }
    }

    private suspend fun handleQuery(params: JsonValue?): JsonValue? {
        return suspendCoroutine { continuation ->
            activeContinuation = continuation
            startForResult?.launch(params?.asObject())
        }
    }
}