/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.camera

import android.content.Intent
import android.net.Uri
import android.webkit.WebResourceResponse
import androidx.core.content.FileProvider
import com.bentley.sample.shared.getExternalFiles
import com.github.itwin.mobilesdk.ITMLogger
import com.github.itwin.mobilesdk.jsonvalue.JSONValue
import com.github.itwin.mobilesdk.jsonvalue.toList
import org.json.JSONArray
import java.io.File
import java.io.FileInputStream
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

/**
 * Functions specific to caching images by iModelId.
 */
object ImageCache {
    private const val urlScheme = "com.bentley.itms-image-cache"

    /**
     * The base directory for cached images.
     */
    private val baseDir: String by lazy {
        CameraApplication.instance.applicationContext.getExternalFilesDir("images").toString()
    }

    /**
     * Gets the destination directory for the input parameters.
     * @param input The input parameters, expects an object with iModelId string member.
     * @return The file path of the destination directory.
     */
    fun getDestinationDir(input: JSONValue?): String {
        val iModelId = getIModelId(input) ?: "unknownModelId"
        return File("images", iModelId).toString()
    }

    /**
     * Gets a unique file name root based on the current date and time.
     * @return The generated file name.
     */
    fun getDestinationFileName(): String {
        return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH-mm-ss.SSS"))
    }

    /**
     * Gets the file path for a cache Uri.
     * @param cacheUri The cache Uri.
     * @return The full path to the image file.
     */
    private fun getFilePath(cacheUri: Uri): File {
        val uriString = cacheUri.toString().replace("$urlScheme://", "")
        return File(baseDir, uriString)
    }

    /**
     * Gets a cache Uri for a file path.
     * @param filePath The file path.
     * @return The cache Uri.
     */
    fun getCacheUri(filePath: String): Uri {
        // baseDir doesn't end in a slash, so only replace it with a single slash instead of urlScheme://
        return Uri.parse(filePath.replace(baseDir, "$urlScheme:/"))
    }

    /**
     * Intercepts image cache uri's.
     * @param uri The uri to possibly intercept.
     * @return The image contents if the uri is an image cache uri, null otherwise.
     */
    fun shouldInterceptRequest(uri: Uri): WebResourceResponse? {
        return uri.takeIf { uri.scheme == urlScheme }?.let {
            WebResourceResponse("image/jpeg", "UTF-8", FileInputStream(getFilePath(it)))
        }
    }

    /**
     * Gets all the image files cached for a given iModelId.
     * @param params The input parameters, expects an object with an iModelId member.
     * @return A JSON array of cached images uri's, may be empty.
     */
    fun handleGetImages(params: JSONValue?): JSONValue {
        val files = CameraApplication.instance.applicationContext.getExternalFiles(getDestinationDir(params))
        return JSONValue(JSONArray(files.map { file ->
            getCacheUri(file).toString()
        }.toTypedArray()))
    }

    /**
     * Deletes cached images for a given iModelId.
     * @param params The input parameters, expects an object with a url member.
     * @return null always.
     */
    fun handleDeleteImages(params: JSONValue?): JSONValue? {
        val urls = JSONValue(params?.opt("urls"))
        when {
            urls.isArray -> { urls.asArray()!!.toList().forEach { url ->
                url.takeIf { it is String }?.let { tryDeleteFile(it as String) } }
            }
            urls.isString -> { tryDeleteFile(urls.asString()!!) }
        }
        return null
    }

    /**
     * Attempts to delete a cached file, catching an exceptions.
     * @param fileName An image cache Uri as a string.
     */
    private fun tryDeleteFile(fileName: String) {
        try {
            getFilePath(Uri.parse(fileName)).takeIf { it.exists() }?.delete()
        } catch (e: Exception) {
            e.message?.let {
                CameraApplication.instance.itmApplication.logger.log(ITMLogger.Severity.Error, it)
            }
        }
    }

    /**
     * Deletes all cached images for a given iModelId.
     * @param params The input parameters, expects an object with an iModelId member.
     * @return null always.
     */
    fun handleDeleteAllImages(params: JSONValue?): JSONValue? {
        getIModelId(params)?.let { iModelId ->
            File(baseDir, iModelId).deleteRecursively()
        }
        return null
    }

    /**
     * Shares one or more cached images using the standard Android share sheet.
     * @param params The input parameters, expects an object with a url member.
     * @return null always.
     */
    fun handleShareImages(params: JSONValue?): JSONValue? {
        val urls = JSONValue(params?.opt("urls")).asArray()?.toList()?.map {
            val file = getFilePath(Uri.parse(it as String))
            FileProvider.getUriForFile(CameraApplication.instance.applicationContext, "${BuildConfig.APPLICATION_ID}.provider", file)
        }

        if (urls != null && urls.isNotEmpty()) {
            CameraMainActivity.current?.let {
                val shareIntent = Intent().apply {
                    if (urls.size == 1) {
                        data = urls[0] //shows a preview of the image if we're sharing only one
                        flags = Intent.FLAG_GRANT_READ_URI_PERMISSION //weird but required so the share sheet preview can read the content URI
                    } else {
                        type = "image/*"
                    }
                    action = Intent.ACTION_SEND_MULTIPLE
                    putParcelableArrayListExtra(Intent.EXTRA_STREAM, ArrayList(urls))
                }
                it.startActivity(Intent.createChooser(shareIntent, null))
            }
        }
        return null
    }

    /**
     * Gets the iModelId value.
     * @param params The input parameters, expects it to be a JSON object with an iModelId string property.
     * @return The iModelId or null.
     */
    private fun getIModelId(params: JSONValue?): String? {
        return params?.optString("iModelId")
    }
}
