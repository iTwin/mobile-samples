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

// MARK: - JSON convenience
public typealias JSON = [String: Any]

// extension for JSON-like-Dictionaries
extension JSON {
    //! Deserializes passed String and returns Dictionary representing the JSON object encoded in the string
    //! @param jsonString: string to parse and convert to Dictionary
    //! @param encoding: encoding of the source jsonString. Defaults to UTF8.
    //! @return Dictionary representation of the JSON string
    static func fromString(_ jsonString: String?, _ encoding: String.Encoding = String.Encoding.utf8) -> JSON? {
        if jsonString == nil {
            return nil
        }
        let stringData = jsonString!.data(using: encoding)
        do {
            return try JSONSerialization.jsonObject(with: stringData!, options: []) as? JSON
        } catch {
            print(error.localizedDescription)
        }
        return nil
    }
}

class ModelApplication: ITMApplication {
    required init() {
        super.init()
        registerQueryHandler("didFinishLaunching", { () -> Promise<()> in
            self.itmMessenger.frontendLaunchSuceeded()
            return Promise.value(())
        })
        registerQueryHandler("loading", { () -> Promise<()> in
            self.webView.isHidden = false
            return Promise.value(())
        })
        registerQueryHandler("reload", { () -> Promise<()> in
            self.webView.reload()
            return Promise.value(())
        })
        registerQueryHandler("getBimDocuments", { () -> Promise<[String]> in
            return Promise.value(self.getBimDocuments())
        })
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
                print("document: \(document)")
                let ext = NSString(string: document).pathExtension
                if ext.lowercased() == lcMatchExtension {
                    bimDocuments.append(nsDocumentsDir.appendingPathComponent(document))
                }
            }
            return bimDocuments
        }
        return []
    }

    override func getBaseUrl() -> String {
        let urlString: String?
        if let configUrl = Bundle.main.url(forResource: "ITMAppConfig", withExtension: "json", subdirectory: "ITMApplication"),
            let configString = try? String(contentsOf: configUrl),
            let configData = JSON.fromString(configString),
            let baseUrlString = configData["baseUrl"] as? String {
            urlString = baseUrlString
        } else {
            urlString = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "ITMApplication/react-app")?.absoluteString
        }
        return urlString!
    }
}
