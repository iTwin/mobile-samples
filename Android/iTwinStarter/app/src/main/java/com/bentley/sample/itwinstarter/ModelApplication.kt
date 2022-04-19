package com.bentley.sample.itwinstarter
import android.net.Uri
import android.os.Messenger
import com.eclipsesource.json.Json
import com.github.itwin.mobilesdk.ITMApplication
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
                Json.array()
            }
        }
    }
}