/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.camera

import android.content.Intent
import android.net.Uri
import android.webkit.WebResourceResponse
import androidx.core.content.FileProvider
import com.eclipsesource.json.Json
import com.eclipsesource.json.JsonValue
import java.io.File
import java.io.FileInputStream
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

object ImageCache {
    private const val urlScheme = "com.bentley.itms-image-cache"

    private val baseDir: String by lazy {
        ModelApplication.appContext.getExternalFilesDir("images").toString()
    }

    fun getDestinationDir(input: JsonValue?): String {
        val iModelId = input?.asObject()?.get("iModelId")?.asString() ?: "unknownModelId"
        return File("images", iModelId).toString()
    }

    fun getDestinationFileName(): String {
        return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH-mm-ss.SSS"))
    }

    private fun getFilePath(cacheUri: Uri): File {
        val uriString = cacheUri.toString().replace("$urlScheme://", "")
        return File(baseDir, uriString)
    }

    fun getCacheUri(filePath: String): Uri {
        // baseDir doesn't end in a slash, so only replace it with a single slash instead of urlScheme://
        return Uri.parse(filePath.replace(baseDir, "$urlScheme:/"))
    }

    fun shouldInterceptRequest(url: Uri): WebResourceResponse? {
        return url.takeIf { url.scheme == urlScheme }?.let {
            WebResourceResponse("image/jpeg", "UTF-8", FileInputStream(getFilePath(it)))
        }
    }

    fun handleGetImages(params: JsonValue?): JsonValue? {
        return getIModelId(params)?.let { iModelId ->
            val files = FileHelper.getExternalFiles("images/$iModelId")
            Json.array(*files.map { file ->
                getCacheUri(file).toString()
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

    private fun tryDeleteFile(fileName: String) {
        try {
            getFilePath(Uri.parse(fileName)).takeIf { it.exists() }?.delete()
        } catch (e: Exception) {
            println(e.message)
        }
    }

    fun handleDeleteAllImages(params: JsonValue?): JsonValue? {
        getIModelId(params)?.let { iModelId ->
            File(baseDir, iModelId).deleteRecursively()
        }
        return Json.NULL
    }

    fun handleShareImages(params: JsonValue?): JsonValue? {
        val urls = getObjectValue(params, "urls")?.asArray()?.map {
            val file = getFilePath(Uri.parse(it.asString()))
            FileProvider.getUriForFile(ModelApplication.appContext, "${BuildConfig.APPLICATION_ID}.provider", file)
        }

        if (urls != null && urls.isNotEmpty()) {
            MainActivity.current?.let {
                val shareIntent = Intent().apply {
                    type = "image/*"
                    action = Intent.ACTION_SEND_MULTIPLE
                    putParcelableArrayListExtra(Intent.EXTRA_STREAM, ArrayList(urls))
                }
                it.startActivity(Intent.createChooser(shareIntent, null))
            }
        }
        return Json.NULL
    }

    private fun getObjectValue(params: JsonValue?, name: String): JsonValue? {
        return params?.takeIf { it.isObject }?.asObject()?.get(name)
    }

    private fun getIModelId(params: JsonValue?): String? {
        return getObjectValue(params, "iModelId")?.takeIf { it.isString }?.asString()
    }
}