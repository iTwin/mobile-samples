package com.bentley.sample.itwinstarter

import android.content.Context
import android.webkit.WebView
import com.eclipsesource.json.Json
import com.github.itwin.mobilesdk.ITMCoMessenger
import com.github.itwin.mobilesdk.ITMComponent
import java.io.File

class DocumentPicker(context: Context, webView: WebView, coMessenger: ITMCoMessenger): ITMComponent(context, webView, coMessenger) {
    init { listener = coMessenger.addQueryListener("chooseDocument") {
            val bimFile = File(context.filesDir, "ITMApplication/backend/Building Blocks.bim")
            if (bimFile.exists()) {
                Json.value(bimFile.absolutePath)
            } else {
                Json.value("")
            }
        }
    }
}