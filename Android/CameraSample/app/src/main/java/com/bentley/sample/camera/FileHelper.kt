/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.camera

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream

object FileHelper {
    fun getFileDisplayName(uri: Uri, contentResolver: ContentResolver): String? {
        contentResolver.query(uri, null, null, null, null, null)?.let { cursor ->
            if (cursor.moveToFirst()) {
                val columnIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (columnIndex >= 0) {
                    return cursor.getString(columnIndex)
                }
            }
            cursor.close()
        }
        return null
    }

    private fun copyFile(inputStream: InputStream, dir: File, displayName: String): String {
        if (!dir.exists()) {
            dir.mkdirs()
        }
        val dstPath = dir.absolutePath + "/" + displayName
        val outputStream = FileOutputStream(dstPath)
        val buffer = ByteArray(1024)
        var length: Int
        while (inputStream.read(buffer).also { length = it } > 0) {
            outputStream.write(buffer, 0, length)
        }
        outputStream.flush()
        outputStream.close()
        return dstPath
    }

    fun copyToExternalFiles(context: Context, uri: Uri, destDir: String, displayName: String): String? {
        var result: String? = null
        context.getExternalFilesDir(null)?.let { filesDir ->
            context.contentResolver.openInputStream(uri)?.let { inputStream ->
                result = copyFile(inputStream, File(filesDir, destDir), displayName)
                inputStream.close()
            }
        }
        return result
    }

    fun getExternalFiles(context: Context, dirName: String): List<String> {
        return context.getExternalFilesDir(dirName)?.listFiles()?.map { it.toString() } ?: emptyList()
    }

    fun getExternalFiles(context: Context, dirName: String, extension: String): List<String> {
        return getExternalFiles(context, dirName).filter { name ->
            extension.isEmpty() || name.endsWith(extension, true)
        }
    }
}
