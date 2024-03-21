package com.bentley.sample.thirdpartyauth

import android.content.Context
import com.auth0.android.authentication.storage.CredentialsManager
import com.bentley.itwin.AuthorizationClient
import com.bentley.sample.shared.SampleITMApplication

class ThirdPartyAuthITMApplication(context: Context) : SampleITMApplication(
    context,
    BuildConfig.DEBUG,
    BuildConfig.DEBUG
) {
    companion object {
        fun newInstance(context: Context) = ThirdPartyAuthITMApplication(context)
    }

    var auth0CredentialsManager: CredentialsManager? = null

    init {
        finishInit()
    }

    override fun createAuthorizationClient(): AuthorizationClient? {
        return auth0CredentialsManager?.let {
            TokenServerAuthClient(appContext.getString(R.string.ITMSAMPLE_TOKEN_SERVER_URL), it)
        }
    }
}