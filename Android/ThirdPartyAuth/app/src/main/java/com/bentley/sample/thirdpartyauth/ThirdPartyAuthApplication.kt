package com.bentley.sample.thirdpartyauth

import android.app.Application
import android.content.Context
import com.bentley.sample.shared.MainActivity

class ThirdPartyAuthApplication : Application() {

    lateinit var loginViewModel: LoginViewModel
        private set

    /**
     * Sets [MainActivity.sampleITMApplication] to [ThirdPartyAuthITMApplication] so that our auth handler is setup.
     */
    override fun onCreate() {
        super.onCreate()
        appContext = applicationContext
        MainActivity.sampleITMApplication = ThirdPartyAuthITMApplication
        loginViewModel = LoginViewModel(ResourceHelper(this)) { credentialsManager ->
            ThirdPartyAuthITMApplication.auth0CredentialsManager = credentialsManager
        }
    }

    companion object {
        private lateinit var appContext: Context

        fun getContext(): Context {
            return appContext
        }
    }
}