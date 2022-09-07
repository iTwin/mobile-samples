package com.bentley.sample.thirdpartyauth

import com.auth0.android.authentication.storage.CredentialsManager
import com.bentley.itwin.AuthorizationClient
import com.bentley.sample.shared.SampleITMApplication

object ThirdPartyAuthITMApplication : SampleITMApplication(
    ThirdPartyAuthApplication.getContext(),
    BuildConfig.DEBUG,
    BuildConfig.DEBUG
) {
    var auth0CredentialsManager: CredentialsManager? = null
        set(token) {
            field = token
            createAuthorizationClient()
        }

    init {
        finishInit()
    }

    override fun createAuthorizationClient(): AuthorizationClient? {
        return if (auth0CredentialsManager == null) null else TokenServerAuthClient(
            ThirdPartyAuthApplication.getContext().getString(R.string.ITMSAMPLE_TOKEN_SERVER_URL),
            auth0CredentialsManager!!
        )
    }

}