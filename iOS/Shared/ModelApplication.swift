/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import UIKit
import WebKit
import ITwinMobile
import PromiseKit
import UniformTypeIdentifiers
import ShowTime

/// This app's `ITMApplication` sub-class that handles the messages coming from the web view.
class ModelApplication: ITMApplication {
    private var debugI18n = false
    private var lowResolution = false

    /// Registers query handlers.
    required init() {
        super.init()
        ITMApplication.logger = PrintLogger()
        registerQueryHandler("didFinishLaunching") { () -> Promise<()> in
            self.itmMessenger.frontendLaunchSuceeded()
            return Promise.value(())
        }
        registerQueryHandler("loading") { () -> Promise<()> in
            self.webView.isHidden = false
            return Promise.value(())
        }
        registerQueryHandler("reload") { () -> Promise<()> in
            self.webView.reload()
            return Promise.value(())
        }
        registerQueryHandler("getBimDocuments") { () -> Promise<[String]> in
            if #available(iOS 14.0, *) {
                return Promise.value(DocumentHelper.getDocumentsWith(extension: UTType.bim_iModel.preferredFilenameExtension!))
            } else {
                return Promise.value(DocumentHelper.getDocumentsWith(extension: "bim"))
            }
        }
    }
    
    /// Called when the `ITMViewController` will appear.
    ///
    /// Adds our DocumentPicker component to the native UI collection.
    /// - Parameter viewController: The view controller.
    override func viewWillAppear(viewController: ITMViewController) {
        super.viewWillAppear(viewController: viewController)
        viewController.itmNativeUI?.addComponent(DocumentPicker(viewController: viewController, itmMessenger: ITMViewController.application.itmMessenger))
    }
    
    override func loadITMAppConfig() -> JSON? {
        let configData = super.loadITMAppConfig()
        var showtimeEnabled = false
        if let configData = configData {
            extractConfigDataToEnv(configData: configData, "ITMSAMPLE_");
            debugI18n = configData["ITMSAMPLE_DEBUG_I18N"] as? String == "YES"
            lowResolution = configData["ITMSAMPLE_LOW_RESOLUTION"] as? String == "YES"
            showtimeEnabled = configData["ITMSAMPLE_SHOWTIME_ENABLED"] as? String == "YES"
        }
        if !showtimeEnabled {
            ShowTime.enabled = ShowTime.Enabled.never
        }
        return configData
    }
    
    override func getUrlHashParams() -> String {
        var hashParams = ""
        if debugI18n {
            hashParams += "&debugI18n=YES"
        }
        if lowResolution {
            hashParams += "&lowResolution=YES"
        }
        return hashParams
    }
}
