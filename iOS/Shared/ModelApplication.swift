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
    /// Registers query handlers.
    required init() {
        super.init()
        ITMApplication.logger = PrintLogger()
        registerQueryHandler("didFinishLaunching") {
            self.itmMessenger.frontendLaunchSuceeded()
        }
        registerQueryHandler("loading") {
            self.webView.isHidden = false
        }
        registerQueryHandler("reload") {
            self.webView.reload()
        }
        registerQueryHandler("getBimDocuments") { () -> [String] in
            if #available(iOS 14.0, *) {
                return DocumentHelper.getDocumentsWith(extension: UTType.bim_iModel.preferredFilenameExtension!)
            } else {
                return DocumentHelper.getDocumentsWith(extension: "bim")
            }
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
