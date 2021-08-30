//
//  ModelApplication.swift
//  MobileStarter
//
//  Created by Travis Local on 8/10/21.
//

import UIKit
import WebKit
import ITwinMobile
import PromiseKit

/// Custom subclass of `ITMApplication` used by the sample app to show some basic functionality.
class ModelApplication: ITMApplication {
    required init() {
        super.init()
        // Messaging from native to JavaScript needs to wait for the JavaScript side to finish
        // its own initialization.
        registerQueryHandler("didFinishLaunching") { () -> Promise<()> in
            // Let our itmMessenger know that it is ok to send messages to JavaScript.
            self.itmMessenger.frontendLaunchSuceeded()
            return Promise.value(())
        }
        registerQueryHandler("loading") { () -> Promise<()> in
            // Once the iTwin Mobile app's web page has loaded far enough to start the process of
            // initializing, show the WKWebView.
            self.webView.isHidden = false
            return Promise.value(())
        }
        registerQueryHandler("reload") { () -> Promise<()> in
            self.webView.reload()
            return Promise.value(())
        }
        // Get a list of all *.bim files in the application's main Documents folder and return the
        // full path to each of these files to the frontend.
        registerQueryHandler("getBimDocuments") { () -> Promise<[String]> in
            return Promise.value(self.getBimDocuments())
        }
        registerQueryHandler("chooseDocument") { () -> Promise<String> in
            // TODO: implement this
            ModelApplication.showAlert(message: "Not yet implemented!")
            return Promise.value("")
        }
    }

    static func showAlert(_ title: String? = nil, message: String) {
        let alert = UIAlertController(title: title, message: message, preferredStyle: UIAlertController.Style.alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        ITMApplication.topViewController?.present(alert, animated: true, completion: nil)
    }

    func getBimDocuments() -> [String] {
        return getDocumentsWith(extension: "bim")
    }

    func getDocumentsWith(extension matchExtension: String) -> [String] {
        let fm = FileManager.default
        let lcMatchExtension = matchExtension.lowercased()
        let documentsDirs = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
        if documentsDirs.count < 1 {
            return []
        }
        let documentsDir = documentsDirs[0]
        if let allDocuments = try? fm.contentsOfDirectory(atPath: documentsDir) {
            var bimDocuments: [String] = []
            let nsDocumentsDir = NSString(string: documentsDir)
            for document in allDocuments {
                let ext = NSString(string: document).pathExtension
                if ext.lowercased() == lcMatchExtension {
                    bimDocuments.append(nsDocumentsDir.appendingPathComponent(document))
                }
            }
            return bimDocuments
        }
        return []
    }
}
