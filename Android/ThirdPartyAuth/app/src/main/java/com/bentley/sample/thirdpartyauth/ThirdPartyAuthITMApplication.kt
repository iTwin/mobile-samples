package com.bentley.sample.thirdpartyauth

import com.bentley.itwin.AuthorizationClient
import com.bentley.sample.shared.SampleITMApplication

object ThirdPartyAuthITMApplication : SampleITMApplication(
    ThirdPartyAuthApplication.getContext(),
    BuildConfig.DEBUG,
    BuildConfig.DEBUG
) {
    var auth0Token: String? = null
        set(token) {
            field = token
            createAuthorizationClient()
        }
    
    init {
        finishInit()
    }
    
    override fun createAuthorizationClient(): AuthorizationClient? {
        return if (auth0Token == null) null else TokenServerAuthClient(
            ThirdPartyAuthApplication.getContext().getString(R.string.ITMSAMPLE_TOKEN_SERVER_URL),
            auth0Token!!
        )
    }
    
}