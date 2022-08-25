package com.bentley.sample.thirdpartyauth

import android.content.Context
import com.bentley.itwin.AuthorizationClient
import com.bentley.sample.shared.SampleITMApplication

class ThirdPartyAuthITMApplication(context: Context, authClient: AuthorizationClient): SampleITMApplication(context, BuildConfig.DEBUG, BuildConfig.DEBUG) {
	val authClient = authClient

	init {
		finishInit()
	}

	override fun createAuthorizationClient(): AuthorizationClient? {
		return authClient
	}

}