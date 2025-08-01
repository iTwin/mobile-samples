/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import UIKit
import WebKit
import ITwinMobile
import UniformTypeIdentifiers
import ShowTime

/// This app's `ITMApplication` subclass that handles the messages coming from the web view.
class ModelApplication: ITMApplication {
    private let startupTimer = ActivityTimer()
    private var startupTimesRecorded = false

    /// Creates a ``ModelApplication``.
    required init() {
        super.init()

        if let configData = configData {
            extractConfigDataToEnv(configData: configData, prefix: "ITMSAMPLE_");
        }

        geolocationManager.setLastLocationTimeThreshold(3.0)
        setupStartupTimer()

        ITMMessenger.addUnloggedQueryType("loading")
        ITMApplication.logger = PrintLogger()

        registerQueryHandlers()
        setupShowTime()
        performExampleQueries()
    }

    /// Set up `startupTimer`.
    private func setupStartupTimer() {
        startupTimer.enabled = self.configData?.isYes("ITMSAMPLE_LOG_STARTUP_TIMES") ?? false
        startupTimer.useJSON = self.configData?.isYes("ITMSAMPLE_LOG_STARTUP_TIMES_JSON") ?? false
        startupTimer.logToFile = self.configData?.isYes("ITMSAMPLE_LOG_STARTUP_TIMES_LOG_TO_FILE") ?? false
    }

    /// Registers query handlers.
    open func registerQueryHandlers() {
        registerQueryHandler("didFinishLaunching") { (params: JSON) -> Void in
            self.itmMessenger.frontendLaunchSucceeded()
            self.finishRecordingStartupTimes(params["iTwinVersion"] as? String)
            self.performSampleActions()
        }
        registerQueryHandler("loading") {
            self.dormant = false
            self.startupTimer.addCheckpoint(name: "Webview load")
        }
        registerQueryHandler("signOut") {
            if let oac = self.authorizationClient as? ITMOIDCAuthorizationClient {
                do {
                    try await oac.signOut()
                } catch {
                    Self.log(.error, "Error signing out: \(error)")
                    throw error
                }
            }
        }
        registerQueryHandler("getBimDocuments", DocumentHelper.getBimDocuments)
        registerQueryHandler("firstRenderStarted") { () -> Void in
            Self.log(.debug, "Received firstRenderStarted")
        }
        registerQueryHandler("firstRenderFinished") { () -> Void in
            Self.log(.debug, "Received firstRenderFinished")
        }
        registerQueryHandler("log") { (params: JSON) -> Void in
            guard let level = params["level"] as? String,
                  let category = params["category"] as? String,
                  let message = params["message"] as? String else {
                return
            }
            let severity: ITMLogger.Severity = switch level {
            case "Trace":
                .trace
            case "Info":
                .info
            case "Warning":
                .warning
            default:
                .error
            }
            var metaDataString = ""
            if let metaData = params["metaData"] {
                metaDataString = "| metaData: \(ITMMessenger.jsonString(metaData))"
            }
            Self.log(severity, "| \(category) | \(message)\(metaDataString)")
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

    /// Set up ShowTime
    private func setupShowTime() {
        var showTimeEnabled = false
        if let configData = configData {
            showTimeEnabled = configData.isYes("ITMSAMPLE_SHOWTIME_ENABLED")
        }
        if !showTimeEnabled {
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
    /// - Parameter value: A value to be sent to the web app to be printed. It must be of a type supported by
    ///                    the native <-> JavaScript interop layer.
    private func oneWayExample<T>(_ value: T) {
        // Note: because we don't wait for any response, if there is a failure (like the web app
        // does not have a handler for the message), the app won't know (although ITMMessenger will
        // log an error).
        itmMessenger.send("oneWayExample", ["value": value])
        Self.log(.debug, "oneWayExample message sent.")
    }

    /// Example showing how to send a message with a value to the web app, and receive a response.
    ///
    /// - Note: If the result returned by the web app doesn't equal the sent value, this logs an error.
    /// - Parameter value: A value to be sent to the web app and returned back. It must be of a type supported by
    ///                    the native <-> JavaScript interop layer.
    private func queryExample<T: Equatable>(_ value: T) {
        Task {
            do {
                let result: T = try await itmMessenger.query("queryExample", ["value": value])
                Self.log(.debug, "queryExample result \(result)")
                guard result == value else {
                    throw ITMStringError(errorDescription: "queryExample result (\(result)) != sent value (\(value))!")
                }
            } catch {
                Self.log(.error, "Error with queryExample: \(error)")
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

    /// Returns the `ITMNativeUI` associated with the given `UIViewController`.
    /// - Note: Override this function if your actual view controller is not an `ITMViewController`.
    /// - Parameter viewController: The `UIViewController` from which to get the `ITMNativeUI`.
    /// - Returns: The `ITMNativeUI` associated with the given view controller, or nil if there isn't one.
    open func nativeUI(_ viewController: UIViewController) -> ITMNativeUI? {
        return (viewController as? ITMViewController)?.itmNativeUI
    }

    /// Called when the `ITMViewController` will appear.
    ///
    /// Adds our DocumentPicker component to the native UI collection.
    /// - Parameter viewController: The view controller.
    override func viewWillAppear(viewController: UIViewController) {
        super.viewWillAppear(viewController: viewController)
        if let itmNativeUI = nativeUI(viewController) {
            itmNativeUI.addComponent(DocumentPicker(itmNativeUI: itmNativeUI))
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

    private var documentsPath: String {
        get throws {
            let fm = FileManager.default
            guard let documentsURL = try? fm.url(for: .documentDirectory,
                                                 in: .userDomainMask,
                                                 appropriateFor: nil,
                                                 create: true) else {
                throw ITMStringError(errorDescription: "Cannot find app documents directory!")
            }
            return documentsURL.path
        }
    }

    /// Checks for values in configData with a prefix of "ITMSAMPLE\_ACTION\_" and places them in a dictionary
    /// using everything after ITMSAMPLE\_ACTION\_ as the key and the values from configData.
    /// - Returns: A dictionary containing all the ITMSAMPLE\_ACTION\_ prefixed values from configData.
    private func getActionsFromConfigData() -> [String: String] {
        guard let configData = self.configData else { return [:] }
        var actions: [String: String] = [:]
        for case let (key, value) as ConfigStringPair in configData {
            let shortKey = key.deletingPrefix("ITMSAMPLE_ACTION_")
            if shortKey.count < key.count {
                actions[shortKey] = value
            }
        }
        return actions
    }

    /// Checks for sample actions and uses them in a "performActions" message to TS if they exist.
    private func performSampleActions() {
        let actions = getActionsFromConfigData()
        if !actions.isEmpty {
            // Actions in configData have a prefix of ITMSAMPLE_ACTION_ that is removed above.
            // Actions currently handled by the TS code:
            //   OPEN
            Task {
                print("Performing actions: \(actions)")
                itmMessenger.send("performActions", ["actions": actions, "documentsPath": (try? documentsPath) ?? "oops"])
            }
        }
    }
}

private extension String {
    func deletingPrefix(_ prefix: String) -> String {
        guard self.hasPrefix(prefix) else { return self }
        return String(self.dropFirst(prefix.count))
    }
}
