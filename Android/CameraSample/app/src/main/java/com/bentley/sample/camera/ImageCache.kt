/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.camera

import android.net.Uri
import com.eclipsesource.json.Json
import com.eclipsesource.json.JsonArray
import com.eclipsesource.json.JsonValue
import java.io.File

object ImageCache {
    const val urlScheme = "com.bentley.itms-image-cache"

    fun getFilePath(cacheUri: Uri): File? {
        return cacheUri.path?.let { path ->
            // TODO: only call getExternalFilesDir once and save it as a variable?
            ModelApplication.appContext.getExternalFilesDir("images")?.let { baseDir ->
                File(baseDir, path)
            }
        }
    }

    fun handleDeleteImages(params: JsonValue?): JsonValue? {
        val urls = getObjectValue(params, "urls")
        if (urls != null) {
            if (urls.isArray) {
                urls.asArray().forEach {
                    if (it.isString) {
                        tryDeleteFile(it.asString())
                    }
                }
            } else if (urls.isString) {
                tryDeleteFile(urls.asString())
            }
        }
        return Json.NULL
    }

    private fun tryDeleteFile(fileName: String) {
        try {
            val filePath = getFilePath(Uri.parse(fileName))
            if (filePath != null && filePath.exists()) {
                filePath.delete()
            }
        } catch (e: Exception) {
            println(e.message)
        }
    }

    private fun getIModelId(params: JsonValue?): String? {
        val objVal = getObjectValue(params, "iModelId")
        return if (objVal != null && objVal.isString) objVal.asString() else null
    }

    private fun getObjectValue(params: JsonValue?, name: String): JsonValue? {
        return if (params != null && params.isObject) params.asObject().get(name) else null
    }

    private fun getExternalFiles(dirName: String): Array<String> {
        return ModelApplication.appContext.getExternalFilesDir(dirName)?.list() ?: emptyArray()
    }

    private fun getExternalFilesAsJsonArray(dirName: String, extension: String, prefix: String = ""): JsonArray {
        val result = Json.array()
        getExternalFiles(dirName).filter { name ->
            extension.isEmpty() || name.endsWith(extension, true)
        }.forEach {
            result.add("$prefix$it")
        }
        return result
    }
}