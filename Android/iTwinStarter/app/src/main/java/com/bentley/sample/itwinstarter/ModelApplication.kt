package com.bentley.sample.itwinstarter
import android.net.Uri
import com.github.itwin.mobilesdk.ITMApplication
//import com.bentley.itwin.AuthorizationClient

object ModelApplication : ITMApplication(StarterApplication.getContext(), BuildConfig.DEBUG, BuildConfig.DEBUG) {
//    override fun getAuthorizationClient(): AuthorizationClient? {
//    }

    override fun openUri(uri: Uri) {
        MainActivity.openUri(uri)
    }
}