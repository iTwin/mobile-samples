package com.bentley.itwinrnstarter

import android.app.Application
import android.content.Context
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.soloader.SoLoader

class MainApplication : Application(), ReactApplication {
    private val mReactNativeHost: ReactNativeHost = object : DefaultReactNativeHost(this) {
        override fun getUseDeveloperSupport() = BuildConfig.DEBUG

        override fun getPackages(): List<ReactPackage> {
            // Packages that cannot be auto-linked yet can be added manually here
            return PackageList(this).packages
        }
        override fun getJSMainModuleName() = "index"
        override val isNewArchEnabled
            get() = super.isNewArchEnabled
        override val isHermesEnabled
            get() = BuildConfig.IS_HERMES_ENABLED
    }

    override fun getReactNativeHost() = mReactNativeHost

    override fun onCreate() {
        super.onCreate()
        SoLoader.init(this, false)
        if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
            // If you opted-in for the New Architecture, we load the native entry point for this app.
            load()
        }
        ReactNativeFlipper.initializeFlipper(this, reactNativeHost.reactInstanceManager)
        MainActivity.itmApplication = StarterITMApplication(applicationContext)
        //appContext = applicationContext
    }

    //companion object {
    //    lateinit var appContext: Context
    //        private set
    //}
}