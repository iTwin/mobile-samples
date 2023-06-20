/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.shared

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.activity.result.contract.ActivityResultContract
import com.github.itwin.mobilesdk.jsonvalue.JSONValue

typealias PickUriContractType = ActivityResultContract<JSONValue?, Uri?>

/**
 * An [ActivityResultContract] that takes a JsonValue and returns a Uri.
 * @property destDir The optional external files directory to copy the Uri to.
 *                   Must be non-null and [shouldCopyUri] must return true for the copying to occur.
 */
open class PickUriContract(@Suppress("MemberVisibilityCanBePrivate") var destDir: String? = null) : PickUriContractType() {
    protected lateinit var context: Context

    /**
     * Gets an empty Intent by default. Sub-classes can override this function to add specifics
     * for the intent they are using.
     * @param context The context.
     * @param input The optional JsonValue, usually sent from typescript.
     * @return The intent to be used for the activity.
     */
    override fun createIntent(context: Context, input: JSONValue?): Intent {
        this.context = context
        return Intent()
    }

    /**
     * @param uri The candidate Uri to possibly copy.
     * @return true if the chosen Uri should be copied to the external files.
     */
    open fun shouldCopyUri(uri: Uri): Boolean {
        return true
    }

    /**
     * Gets the display name (base name with extension) for the input Uri.
     * By default the context's content resolver is used to get the display name.
     * @param uri The Uri to get the display name for.
     * @return The display name.
     */
    open fun getDisplayName(uri: Uri): String {
        return context.contentResolver.getDisplayName(uri) ?: "unknownDisplayName"
    }

    /**
     * If the resultCode equals RESULT_OK, the chosen Uri is either returned or copied. When
     * copied, a content Uri is returned.
     * @param resultCode The result code.
     * @param intent The intent.
     */
    override fun parseResult(resultCode: Int, intent: Intent?): Uri? {
        val uri = intent?.takeIf { resultCode == Activity.RESULT_OK }?.data
        if (uri != null && shouldCopyUri(uri)) {
            destDir?.let { destDir ->
                context.copyToExternalFiles(uri, destDir, getDisplayName(uri))?.let { result ->
                    return Uri.parse(result)
                }
            }
        }
        return uri
    }
}