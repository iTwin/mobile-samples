package com.bentley.sample.thirdpartyauth

import androidx.fragment.app.FragmentActivity
import com.auth0.android.authentication.storage.CredentialsManager
import com.bentley.itwin.AuthorizationClient
import com.bentley.sample.shared.SampleITMApplication

object ThirdPartyAuthITMApplication : SampleITMApplication(
    ThirdPartyAuthApplication.getContext(),
    BuildConfig.DEBUG,
    BuildConfig.DEBUG
) {
    var auth0CredentialsManager: CredentialsManager? = null

    init {
        finishInit()
    }

    override fun createAuthorizationClient(fragmentActivity: FragmentActivity): AuthorizationClient? {
        return auth0CredentialsManager?.let {
            TokenServerAuthClient(fragmentActivity.getString(R.string.ITMSAMPLE_TOKEN_SERVER_URL), it)
        }
    }
}