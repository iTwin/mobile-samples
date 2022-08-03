/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.camera

import android.net.Uri
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import com.eclipsesource.json.Json
import com.eclipsesource.json.JsonArray
import com.eclipsesource.json.JsonValue
import com.github.itwin.mobilesdk.ITMApplication
import java.io.File
import java.io.FileInputStream

object ModelApplication : ITMApplication(StarterApplication.getContext(), BuildConfig.DEBUG, BuildConfig.DEBUG) {
    init {
        finishInit()
    }

    override fun openUri(uri: Uri) {
        MainActivity.openUri(uri)
    }

    override fun setupWebView() {
        super.setupWebView()
        coMessenger?.let { coMessenger ->
            coMessenger.addMessageListener("loading") {}
            coMessenger.addMessageListener("didFinishLaunching") {
                coMessenger.frontendLaunchSucceeded()
            }

            coMessenger.addQueryListener("getBimDocuments") {
                getExternalFiles("BimCache", ".bim")
            }

            coMessenger.addQueryListener("getImages") { params: JsonValue? ->
                getIModelId(params)?.let { iModelId ->
                    getExternalFiles("images/$iModelId", "", "${ImagePickerConstants.urlScheme}://")
                } ?: Json.array()
            }

            coMessenger.addQueryListener("deleteImages") { params: JsonValue? ->
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
                Json.NULL
            }

            coMessenger.addQueryListener("deleteAllImages") { params: JsonValue? ->
                getIModelId(params)?.let { iModelId ->
                    appContext.getExternalFilesDir("images/$iModelId")?.deleteRecursively()
                }
                Json.NULL
            }
        }
    }

    private fun tryDeleteFile(fileName: String) {
        try {
            File(fileName.removePrefix("${ImagePickerConstants.urlScheme}://")).delete()
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

    private fun getExternalFiles(dirName: String, extension: String, prefix: String = ""): JsonArray {
        val result = Json.array()
        appContext.getExternalFilesDir(dirName)?.let { dir ->
            dir.listFiles { _, filename ->
                extension.isEmpty() || filename.lowercase().endsWith(extension)
            }?.let { files ->
                files.forEach { result.add("$prefix${it.path}") }
            }
        }
        return result
    }

    override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
        val url = request.url
        if (url.toString().startsWith("${ImagePickerConstants.urlScheme}://", true)) {
            val path = url.path
            return WebResourceResponse("image/jpeg", "UTF-8", FileInputStream(path))
        }
        return super.shouldInterceptRequest(view, request)
    }
}