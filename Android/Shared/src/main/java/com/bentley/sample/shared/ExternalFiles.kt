/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.shared

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import java.io.File

/**
 * Determines the display name for the uri.
 * @param uri The input content Uri.
 * @return The display name or null if it wasn't found.
 */
fun ContentResolver.getFileDisplayName(uri: Uri): String? {
    // Query the content resolver only if we have a content Uri
    return uri.takeIf { uri.scheme == ContentResolver.SCHEME_CONTENT }?.let {
        query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null, null)?.use { cursor ->
            cursor.takeIf { cursor.moveToFirst() }?.getString(0)
        }
    }
}

/**
 * Copies the input uri to the destination directory.
 * @param uri The input content Uri to copy.
 * @param destDir The destination directory.
 * @return The full path of the copied file, null if it failed.
 */
fun Context.copyToExternalFiles(uri: Uri, destDir: String): String? {
    return contentResolver.getFileDisplayName(uri)?.let { displayName ->
        getExternalFilesDir(null)?.let { filesDir ->
            contentResolver.openInputStream(uri)?.use { input ->
                val outDir = File(filesDir.path, destDir)
                outDir.mkdirs()
                val outputFile = File(outDir, displayName)
                outputFile.outputStream().use {
                    input.copyTo(it)
                }
                outputFile.path
            }
        }
    }
}

/**
 * Gets the external files in the input directory name.
 * @param dirName The directory name.
 * @return A list of external files, possibly empty.
 */
fun Context.getExternalFiles(dirName: String): List<String> {
    return getExternalFilesDir(dirName)?.listFiles()?.map { it.toString() } ?: emptyList()
}

/**
 * Gets the external files in the input directory name that end with the input extension.
 * @param dirName The directory name.
 * @param extension The file extension to filter with.
 * @return A list of external files, possibly empty.
 */
fun Context.getExternalFiles(dirName: String, extension: String): List<String> {
    return getExternalFiles(dirName).filter { name ->
        extension.isEmpty() || name.endsWith(extension, true)
    }
}
