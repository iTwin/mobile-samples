package com.bentley.sample.thirdpartyauth

import android.app.Application
import android.content.Context
import com.bentley.sample.shared.MainActivity
import com.bentley.sample.shared.SampleApplicationBase

class ThirdPartyAuthApplication : SampleApplicationBase<ThirdPartyAuthITMApplication>(ThirdPartyAuthITMApplication::newInstance) {

    lateinit var loginViewModel: LoginViewModel
        private set

    /**
     * Sets [MainActivity.sampleITMApplication] to [ThirdPartyAuthITMApplication] so that our auth
     * handler is set up.
     */
    override fun onCreate() {
        super.onCreate()
        appContext = applicationContext
        loginViewModel = LoginViewModel(ResourceHelper(this)) { credentialsManager ->
            itmApplication.auth0CredentialsManager = credentialsManager
        }
    }

    companion object {
        private lateinit var appContext: Context

        fun getContext(): Context {
            return appContext
        }
    }
}