package com.bentley.sample.itwinstarter
import android.net.Uri
import com.eclipsesource.json.Json
import com.github.itwin.mobilesdk.ITMApplication
import java.io.File

//import com.bentley.itwin.AuthorizationClient

object ModelApplication : ITMApplication(StarterApplication.getContext(), BuildConfig.DEBUG, BuildConfig.DEBUG) {
//    override fun getAuthorizationClient(): AuthorizationClient? {
//    }

    override fun openUri(uri: Uri) {
        MainActivity.openUri(uri)
    }

    override fun setupWebView() {
        super.setupWebView()
        coMessenger?.let { coMessenger ->
            coMessenger.addMessageListener("loading") {}
            coMessenger.addQueryListener("getBimDocuments") {
                val bimFile = File(appContext.filesDir, "ITMApplication/backend/Building Blocks.bim")
                if (bimFile.exists()) {
                    Json.array(bimFile.absolutePath)
                } else {
                    Json.array()
                }
            }
        }
    }
}