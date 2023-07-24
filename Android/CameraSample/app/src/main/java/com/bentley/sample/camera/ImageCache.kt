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
import java.io.File
import java.io.FileInputStream
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

/**
 * Functions specific to caching images by iModelId.
 */
object ImageCache {
    @Suppress("SpellCheckingInspection")
    private const val URL_SCHEME = "com.bentley.itms-image-cache"

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
    fun getDestinationDir(input: Map<String, String>?): String {
        val iModelId = input?.get("iModelId") ?: "unknownModelId"
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
        val uriString = cacheUri.toString().replace("$URL_SCHEME://", "")
        return File(baseDir, uriString)
    }

    /**
     * Gets a cache Uri for a file path.
     * @param filePath The file path.
     * @return The cache Uri.
     */
    fun getCacheUri(filePath: String): Uri {
        // baseDir doesn't end in a slash, so only replace it with a single slash instead of urlScheme://
        return Uri.parse(filePath.replace(baseDir, "$URL_SCHEME:/"))
    }

    /**
     * Intercepts image cache uri's.
     * @param uri The uri to possibly intercept.
     * @return The image contents if the uri is an image cache uri, null otherwise.
     */
    fun shouldInterceptRequest(uri: Uri): WebResourceResponse? {
        return uri.takeIf { uri.scheme == URL_SCHEME }?.let {
            WebResourceResponse("image/jpeg", "UTF-8", FileInputStream(getFilePath(it)))
        }
    }

    /**
     * Gets all the image files cached for a given iModelId.
     * @param params The input parameters, expects an object with an iModelId member.
     * @return A [List] of cached images uri's, may be empty.
     */
    fun handleGetImages(params: Map<String, String>): List<String> {
        val files = CameraApplication.instance.applicationContext.getExternalFiles(getDestinationDir(params))
        return files.map { file ->
            getCacheUri(file).toString()
        }
    }

    /**
     * Deletes cached images for a given iModelId.
     * @param params The input parameters, expects an object with a url member.
     */
    fun handleDeleteImages(params: Map<String, Any>) {
        when (val urls = params["urls"]) {
            is List<*> -> { urls.forEach { url ->
                url.takeIf { it is String }?.let { tryDeleteFile(it as String) } }
            }
            is String -> { tryDeleteFile(urls) }
        }
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
     */
    fun handleDeleteAllImages(params: Map<String, String>) {
        params["iModelId"]?.let { iModelId ->
            File(baseDir, iModelId).deleteRecursively()
        }
    }

    /**
     * Shares one or more cached images using the standard Android share sheet.
     * @param params The input parameters, expects an object with a url member.
     */
    fun handleShareImages(params: Map<String, Any>) {
        val urls = (params["urls"] as? List<*>)?.map {
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
    }
}
