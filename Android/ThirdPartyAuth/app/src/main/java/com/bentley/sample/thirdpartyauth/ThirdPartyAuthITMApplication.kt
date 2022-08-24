package com.bentley.sample.thirdpartyauth

import com.bentley.itwin.AuthorizationClient
import com.bentley.sample.shared.SampleITMApplication

class ThirdPartyAuthITMApplication(authorizationClient: AuthorizationClient) : SampleITMApplication(ThirdPartyAuthApplication.getContext(), BuildConfig.DEBUG, BuildConfig.DEBUG) {

	init {
		finishInit()
		super.authorizationClient = authorizationClient
	}

	override fun setupWebView() {
		super.setupWebView()
	}

}