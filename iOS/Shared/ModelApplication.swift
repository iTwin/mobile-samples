/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import UIKit
import WebKit
import ITwinMobile
import UniformTypeIdentifiers
import ShowTime

/// This app's `ITMApplication` sub-class that handles the messages coming from the web view.
class ModelApplication: ITMApplication {
    private let startupTimer = ActivityTimer()
    private var startupTimesRecorded = false
    
    /// Creates a ``ModelApplication``.
    required init() {
        super.init()
        
        setupStartupTimer()

        ITMMessenger.addUnloggedQueryType("loading")
        ITMApplication.logger = PrintLogger()

        registerQueryHandlers()
        setupShowtime()
        performExampleQueries()
    }
    
    /// Set up startupTimer.
    private func setupStartupTimer() {
        startupTimer.enabled = self.configData?.isYes("ITMSAMPLE_LOG_STARTUP_TIMES") ?? false
        startupTimer.useJSON = self.configData?.isYes("ITMSAMPLE_LOG_STARTUP_TIMES_JSON") ?? false
        startupTimer.logToFile = self.configData?.isYes("ITMSAMPLE_LOG_STARTUP_TIMES_LOG_TO_FILE") ?? false
    }

    /// Registers query handlers.
    open func registerQueryHandlers() {
        registerQueryHandler("didFinishLaunching") { (params: [String: Any]) -> Void in
            self.itmMessenger.frontendLaunchSucceeded()
            self.finishRecordingStartupTimes(params["iTwinVersion"] as? String)
        }
        registerQueryHandler("loading") {
            self.webView.isHidden = false
            self.startupTimer.addCheckpoint(name: "Webview load")
        }
        registerQueryHandler("reload") {
            self.webView.reload()
        }
        registerQueryHandler("signOut") {
            if let oac = self.authorizationClient as? ITMOIDCAuthorizationClient {
                do {
                    try await oac.signOut()
                } catch {
                    Self.logger.log(.error, "Error signing out: \(error)")
                    throw error
                }
            }
        }
        registerQueryHandler("getBimDocuments") { () -> [String] in
            return DocumentHelper.getBimDocuments()
        }
    }
    
    /// Finish recording startup times
    /// - Parameter iTwinVersion: The iTwin SDK version, if reported by the TS code, otherwise nil.
    private func finishRecordingStartupTimes(_ iTwinVersion: String?) {
        // If the debugger reloads the web view, we'll get here a second time with invalid times.
        if startupTimesRecorded { return }
        startupTimesRecorded = true
        if let iTwinVersion = iTwinVersion {
            self.startupTimer.iTwinVersion = iTwinVersion
        }
        self.startupTimer.usingRemoteServer = self.usingRemoteServer
        self.startupTimer.addCheckpoint(name: "Launch total")
        self.startupTimer.logTimes(title: "STARTUP TIMES")
    }

    /// Set up Showtime
    private func setupShowtime() {
        var showtimeEnabled = false
        if let configData = configData {
            extractConfigDataToEnv(configData: configData, prefix: "ITMSAMPLE_");
            showtimeEnabled = configData.isYes("ITMSAMPLE_SHOWTIME_ENABLED")
        }
        if !showtimeEnabled {
            ShowTime.enabled = ShowTime.Enabled.never
        }
    }
    
    /// Examples of performing both one-way and two-way queries.
    private func performExampleQueries() {
        oneWayExample("one way")
        // Note that since these all run concurrently, there is no guarantee that the responses
        // will come back in the same order that they are sent below.
        queryExample("string query")
        queryExample(42)
        queryExample(1.234)
        queryExample(true)
    }

    /// Example showing how to send a message with a value to the web app with no response expected.
    /// - Parameter value: A value to be sent to the web app and returned back. It must be of a type supported by
    ///                    the native <-> JavaScript interop layer.
    private func oneWayExample<T>(_ value: T) {
        // Note: because we don't wait for any response, if there is a failure (like the web app
        // does not have a handler for the message), the app won't know (although ITMMessenger will
        // log an error).
        itmMessenger.query("oneWayExample", ["value": value])
        Self.logger.log(.debug, "oneWayExample message sent.")
    }

    /// Example showing how to send a message with a value to the web app, and receive a response.
    /// - Parameter value: A value to be sent to the web app and returned back. It must be of a type supported by
    ///                    the native <-> JavaScript interop layer.
    private func queryExample<T>(_ value: T) {
        Task {
            do {
                let result: T = try await itmMessenger.query("queryExample", ["value": value])
                Self.logger.log(.debug, "queryExample result \(result)")
            } catch {
                Self.logger.log(.error, "Error with queryExample: \(error)")
            }
        }
    }

    /// `loadBackend` override that wraps the call to super in `startupTimer` checkpoints.
    override func loadBackend(_ allowInspectBackend: Bool) {
        startupTimer.addCheckpoint(name: "Before backend load")
        super.loadBackend(allowInspectBackend)
        Task {
            await backendLoaded
            startupTimer.addCheckpoint(name: "After backend load")
        }
    }

    /// `loadFrontend` override that wraps the call to super in `startupTimer` checkpoints.
    override func loadFrontend() {
        startupTimer.addCheckpoint(name: "Before frontend load")
        super.loadFrontend()
        Task {
            await frontendLoaded
            startupTimer.addCheckpoint(name: "After frontend load")
        }
    }

    /// Called when the `ITMViewController` will appear.
    ///
    /// Adds our DocumentPicker component to the native UI collection.
    /// - Parameter viewController: The view controller.
    override func viewWillAppear(viewController: ITMViewController) {
        super.viewWillAppear(viewController: viewController)
        if let itmNativeUI = viewController.itmNativeUI {
            viewController.itmNativeUI?.addComponent(DocumentPicker(itmNativeUI: itmNativeUI))
        }
    }
    
    /// Adds app-specific hash parameters to the default ones.
    /// - Returns: The default `HashParams` returned by super, with app-specific ones optionally appended depending on data in `configData`.
    override func getUrlHashParams() -> HashParams {
        var hashParams = super.getUrlHashParams()
        if let configData = configData {
            if configData.isYes("ITMSAMPLE_DEBUG_I18N") {
                hashParams.append(HashParam(name: "debugI18n", value: "YES"))
            }
            if configData.isYes("ITMSAMPLE_LOW_RESOLUTION") {
                hashParams.append(HashParam(name: "lowResolution", value: "YES"))
            }
        }
        return hashParams
    }
}
