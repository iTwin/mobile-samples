/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.camera

import android.net.Uri
import android.webkit.WebResourceResponse
import com.eclipsesource.json.Json
import com.eclipsesource.json.JsonValue
import java.io.File
import java.io.FileInputStream

object ImageCache {
    private const val urlScheme = "com.bentley.itms-image-cache"

    private val baseDir: String by lazy {
        ModelApplication.appContext.getExternalFilesDir("images").toString()
    }

    fun getDestinationDir(iModelId: String): String {
        return File("images", iModelId).toString()
    }

    private fun getFilePath(cacheUri: Uri): File? {
        return cacheUri.path?.let { path ->
            File(baseDir, path)
        }
    }

    fun getCacheUri(filePath: String): Uri {
        return Uri.parse(filePath.replace(baseDir, "$urlScheme://"))
    }

    fun handleGetImages(params: JsonValue?): JsonValue? {
        return getIModelId(params)?.let { iModelId ->
            val files = FileHelper.getExternalFiles("images/$iModelId")
            Json.array(*files.map { filePath ->
                getCacheUri(filePath).toString()
            }.toTypedArray())
        } ?: Json.array()
    }

    fun handleDeleteImages(params: JsonValue?): JsonValue? {
        getObjectValue(params, "urls")?.let { urls ->
            when {
                urls.isArray -> { urls.asArray().forEach { url ->
                    url.takeIf { it.isString }?.let { tryDeleteFile(it.asString()) } }
                }
                urls.isString -> { tryDeleteFile(urls.asString()) }
            }
        }
        return Json.NULL
    }

    fun handleDeleteAllImages(params: JsonValue?): JsonValue? {
        getIModelId(params)?.let { iModelId ->
            File(baseDir, iModelId).deleteRecursively()
        }
        return null
    }

    fun shouldInterceptRequest(url: Uri): WebResourceResponse? {
        return url.takeIf { url.scheme == urlScheme }?.let {
            WebResourceResponse("image/jpeg", "UTF-8", FileInputStream(getFilePath(it)))
        }
    }

    private fun tryDeleteFile(fileName: String) {
        try {
            getFilePath(Uri.parse(fileName))?.takeIf { it.exists() }?.delete()
        } catch (e: Exception) {
            println(e.message)
        }
    }

    private fun getObjectValue(params: JsonValue?, name: String): JsonValue? {
        return params?.takeIf { it.isObject }?.asObject()?.get(name)
    }

    private fun getIModelId(params: JsonValue?): String? {
        return getObjectValue(params, "iModelId")?.takeIf { it.isString }?.asString()
    }
}