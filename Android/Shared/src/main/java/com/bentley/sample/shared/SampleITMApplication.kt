/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.shared

import android.content.Context
import android.webkit.WebView
import androidx.activity.ComponentActivity
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import com.github.itwin.mobilesdk.*
import com.github.itwin.mobilesdk.jsonvalue.JSONValue
import com.github.itwin.mobilesdk.jsonvalue.isYes
import com.github.itwin.mobilesdk.jsonvalue.toMap
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch
import org.json.JSONObject

/**
 * The base [ITMApplication] implementation for the sample applications.
 * Applications should sub-class using a singleton object and call [finishInit] in the init block.
 */
open class SampleITMApplication(context: Context, attachWebViewLogger: Boolean, forceExtractBackendAssets: Boolean) : ITMApplication(context, attachWebViewLogger, forceExtractBackendAssets) {
    companion object {
        /**
         * Convenience method for applications that don't need to sub-class [SampleITMApplication].
         *
         * @param context The application context.
         * @return A new [SampleITMApplication] instance that calls [finishInit] in its init block.
         */
        @Suppress("unused")
        fun newInstance(context: Context) = object: SampleITMApplication(context, BuildConfig.DEBUG, BuildConfig.DEBUG) {
            init {
                finishInit()
            }
        }
    }

    private val startupTimer = ActivityTimer()

    override fun finishInit() {
        super.finishInit()
        ITMMessenger.addUnloggedQueryType("loading")
        startupTimer.enabled = configData?.isYes("ITMSAMPLE_LOG_STARTUP_TIMES") ?: false
        startupTimer.useJSON = configData?.isYes("ITMSAMPLE_LOG_STARTUP_TIMES_JSON") ?: false
    }

    /**
     * Adds handlers for the messages used in this application.
     */
    override fun setupWebView() {
        super.setupWebView()
        coMessenger.registerMessageHandler("loading") {
            startupTimer.addCheckpoint("Webview load")
        }
        coMessenger.registerMessageHandler("didFinishLaunching") { params: JSONValue? ->
            params?.optString("iTwinVersion")?.let { iTwinVersion ->
                startupTimer.iTwinVersion = iTwinVersion
            }
            coMessenger.frontendLaunchSucceeded()
            startupTimer.usingRemoteServer = usingRemoteServer
            startupTimer.addCheckpoint("Launch total")
            startupTimer.logTimes(logger, appContext, "STARTUP TIMES")
            performSampleActions()
        }

        coMessenger.registerQueryHandler("getBimDocuments") {
            JSONValue(this.appContext.getExternalFiles("BimCache", ".bim").toTypedArray())
        }

        coMessenger.registerMessageHandler("signOut") {
            try {
                (authorizationClient as? ITMOIDCAuthorizationClient)?.signOut()
            } catch (ex: Exception) {
                logger.log(ITMLogger.Severity.Error, ex.message ?: "An unknown error occurred when signing out.")
                throw ex
            }
        }

        coMessenger.registerMessageHandler("firstRenderStarted") {
            logger.log(ITMLogger.Severity.Debug, "Received firstRenderStarted")
        }
        coMessenger.registerMessageHandler("firstRenderFinished") {
            logger.log(ITMLogger.Severity.Debug, "Received firstRenderFinished")
        }
    }

    /**
     * Checks for values in configData with a prefix of "ITMSAMPLE_ACTION_" and constructs a [JSONObject]
     * using everything after ITMSAMPLE_ACTION_ as the key and the values from configData.
     * @return A [JSONObject] containing all the ITMSAMPLE_ACTION_ prefixed values from configData.
     */
    protected open fun getActionsFromConfigData(): JSONObject {
        val actions = JSONObject()
        configData?.let { configData ->
            configData.toMap().forEach { entry ->
                (entry.value as? String)?.let { value ->
                    val shortKey = entry.key.removePrefix("ITMSAMPLE_ACTION_")
                    if (shortKey.length < entry.key.length) {
                        actions.put(shortKey, value)
                    }
                }
            }
        }
        return actions
    }

    /**
     * Checks for sample actions and uses them in a "performActions" message to TS if they exist.
     */
    protected open fun performSampleActions() {
        val actions = getActionsFromConfigData()
        if ((actions.names()?.length() ?: 0) != 0) {
            val data = JSONObject()
            data.put("documentsPath", appContext.getExternalFilesDir(null)?.path ?: "oops")
            data.put("actions", actions)
            coMessenger.send("performActions", JSONValue(data))
        }
    }

    /**
     * Registers activity result handlers for our native UI components.
     */
    protected open fun onCreateActivity(activity: ComponentActivity) {
        DocumentPicker.registerForActivityResult(activity)
    }

    /**
     * Registers our native UI components.
     */
    protected open fun onRegisterNativeUI(nativeUI: ITMNativeUI) {
        nativeUI.components.add(DocumentPicker(nativeUI))
    }

    /**
     * Override createNativeUI so we can also register our own native components.
     */
    override fun createNativeUI(context: Context): ITMNativeUI? {
        return super.createNativeUI(context)?.also {
            onRegisterNativeUI(it)
        }
    }

    override fun initializeBackend(allowInspectBackend: Boolean) {
        startupTimer.addCheckpoint("Before backend load")
        super.initializeBackend(allowInspectBackend)
        MainScope().launch {
            waitForBackendInitialize()
            startupTimer.addCheckpoint("After backend load")
        }
    }

    override fun initializeFrontend(context: Context, allowInspectBackend: Boolean, existingWebView: WebView?) {
        startupTimer.addCheckpoint("Before frontend load")
        super.initializeFrontend(context, allowInspectBackend, existingWebView)
        MainScope().launch {
            waitForFrontendInitialize()
            startupTimer.addCheckpoint("After frontend load")
        }
    }

    override fun associateWithActivity(activity: ComponentActivity) {
        super.associateWithActivity(activity)
        activity.lifecycle.addObserver(object: DefaultLifecycleObserver {
            override fun onCreate(owner: LifecycleOwner) {
                onCreateActivity(activity)
            }
        })
    }
}
