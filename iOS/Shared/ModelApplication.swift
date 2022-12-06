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

    /// Registers query handlers.
    required init() {
        super.init()
        startupTimer.enabled = self.configData?.isYes("ITMSAMPLE_LOG_STARTUP_TIMES") ?? false
        startupTimer.useJSON = self.configData?.isYes("ITMSAMPLE_LOG_STARTUP_TIMES_JSON") ?? false
        ITMApplication.logger = PrintLogger()
        registerQueryHandler("didFinishLaunching") {
            self.itmMessenger.frontendLaunchSucceeded()
            self.startupTimer.addCheckpoint(name: "Launch total")
            self.startupTimer.logTimes(title: "STARTUP TIMES")
        }
        registerQueryHandler("loading") {
            self.webView.isHidden = false
            self.startupTimer.addCheckpoint(name: "Webview load")
        }
        registerQueryHandler("reload") {
            self.webView.reload()
        }
        registerQueryHandler("getBimDocuments") { () -> [String] in
            return DocumentHelper.getBimDocuments()
        }
        
        var showtimeEnabled = false
        if let configData = configData {
            extractConfigDataToEnv(configData: configData, prefix: "ITMSAMPLE_");
            showtimeEnabled = configData.isYes("ITMSAMPLE_SHOWTIME_ENABLED")
        }
        if !showtimeEnabled {
            ShowTime.enabled = ShowTime.Enabled.never
        }
    }

    override func loadBackend(_ allowInspectBackend: Bool) {
        startupTimer.addCheckpoint(name: "Before backend load")
        super.loadBackend(allowInspectBackend)
        Task {
            await backendLoaded
            startupTimer.addCheckpoint(name: "After backend load")
        }
    }

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
