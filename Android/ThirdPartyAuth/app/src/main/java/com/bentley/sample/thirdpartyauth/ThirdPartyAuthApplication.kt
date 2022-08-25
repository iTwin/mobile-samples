package com.bentley.sample.thirdpartyauth

import android.app.Application
import android.content.Context
import com.bentley.itwin.AuthorizationClient
import com.bentley.sample.shared.MainActivity

class ThirdPartyAuthApplication: Application() {

	lateinit var loginViewModel: LoginViewModel

	/**
	 * Sets [MainActivity.sampleITMApplication] to [ThirdPartyAuthITMApplication] so that our auth handler is setup.
	 */
	override fun onCreate() {
		super.onCreate()
		loginViewModel = LoginViewModel(ResourceHelper(this))
	}

	fun initITMApp(authClient: AuthorizationClient) {
		MainActivity.sampleITMApplication = ThirdPartyAuthITMApplication(this, authClient)
	}

}