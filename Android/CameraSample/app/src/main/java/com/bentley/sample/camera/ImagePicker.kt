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

open class PickImageContract : ActivityResultContract<JsonObject?, Uri?>() {
    override fun createIntent(context: Context, input: JsonObject?): Intent {
        return Intent(Intent.ACTION_PICK).setType("image/*")
    }

    override fun parseResult(resultCode: Int, intent: Intent?): Uri? {
        return intent.takeIf { resultCode == Activity.RESULT_OK }?.data
    }
}

class PickIModelImageContract: PickImageContract() {
    override fun createIntent(context: Context, input: JsonObject?): Intent {
        return super.createIntent(context, input)
            .putExtra("sourceType", input?.getString("sourceType", ""))
            .putExtra("iModelId", input?.getString("iModelId", ""))
    }
}

class ImagePicker(nativeUI: ITMNativeUI): ITMNativeUIComponent(nativeUI) {
    init {
        listener = coMessenger.addQueryListener("pickImage", ::handleQuery)
    }

    companion object {
        const val urlScheme = "com.bentley.itms-image-cache"
        private var startForResult: ActivityResultLauncher<JsonObject?>? = null
        private var activeContinuation: Continuation<JsonValue?>? = null

        fun registerForActivityResult(mainActivity: MainActivity) {
            startForResult = mainActivity.registerForActivityResult(PickIModelImageContract()) { uri ->
                var skip = false
                if (uri != null) {
                    mainActivity.contentResolver.openInputStream(uri)?.let { inputStream ->
                        mainActivity.getExternalFilesDir("images")?.let { cacheDir ->
                            DocumentPicker.getFileDisplayName(uri)?.let { displayName ->
                                skip = true
                                MainScope().launch {
                                    val dstPath = DocumentPicker.copyDocument(inputStream, cacheDir, displayName)
                                    val result = "$urlScheme://$dstPath"
                                    activeContinuation?.resumeWith(Result.success(Json.value(result)))
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

    private suspend fun handleQuery(params: JsonValue?): JsonValue? {
        return suspendCoroutine { continuation ->
            activeContinuation = continuation
            startForResult?.launch(params?.asObject())
        }
    }
}