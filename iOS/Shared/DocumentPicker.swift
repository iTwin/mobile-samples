//
//  DocumentPicker.swift
//  SwiftUIStarter
//
//  Created by Todd Southen on 2021-08-30.
//

import UIKit
import ITwinMobile
import PromiseKit
import UniformTypeIdentifiers

extension UTType {
    static var bim_iModel = UTType(exportedAs: "com.bentley.bim-imodel")
}

extension ITMApplication {
    struct AlertButtonParams {
        var label: String?
        var handler: (() -> Void)?
    }

    static func showAlert(title: String? = nil, message: String, cancelButton: AlertButtonParams? = nil, okButton: AlertButtonParams? = nil) {
        let alert = UIAlertController(title: title, message: message, preferredStyle: UIAlertController.Style.alert)
        
        alert.addAction(UIAlertAction(title: okButton?.label ?? "OK", style: .default, handler: { (action: UIAlertAction!) in
            okButton?.handler?()
        }))
        
        if let cancelButton = cancelButton {
            alert.addAction(UIAlertAction(title: cancelButton.label ?? "Cancel", style: .cancel, handler: { (action: UIAlertAction!) in
                cancelButton.handler?()
            }))
        }
        
        ITMApplication.topViewController?.present(alert, animated: true, completion: nil)
    }
    
    @discardableResult static func awaitAlert(title: String? = nil, message: String, cancelLabel: String? = nil, okLabel: String? = nil) -> Promise<Bool> {
        let (promise, resolver) = Promise<Bool>.pending()
        ITMApplication.showAlert(title: title, message: message,
            cancelButton: AlertButtonParams(label: cancelLabel) {
                resolver.fulfill(false)
            },
            okButton: AlertButtonParams(label: okLabel) {
                resolver.fulfill(true)
            })
        return promise
    }
}

class DocumentHelper {
    public static func getDocumentsDestinationUrl(_ srcUrl: URL) throws -> URL {
        let documentsDirs = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
        if documentsDirs.count < 1 {
            throw ITMError()
        }
        let destUrl = URL(fileURLWithPath: documentsDirs[0]).appendingPathComponent(srcUrl.lastPathComponent)
        return destUrl
    }
    
    public static func copyExternalFile(srcUrl: URL, destUrl: URL) throws {
        let secure = srcUrl.startAccessingSecurityScopedResource()
        defer {
            if secure {
                srcUrl.stopAccessingSecurityScopedResource()
            }
        }
        try FileManager.default.copyItem(at: srcUrl, to: destUrl)
    }
    
    public static func promptToReplaceFile(_ destUrl: URL) throws -> Promise<URL> {
        if !FileManager.default.fileExists(atPath: destUrl.path) {
            return Promise.value(destUrl)
        }
        
        return ITMApplication.awaitAlert(
                title: "Warning",
                message: "\(destUrl.lastPathComponent) already exists in the application's documents. Do you want to replace it?")
        .then { (okPressed) -> Promise<URL> in
            if !okPressed {
                throw ITMError()
            }
            try FileManager.default.removeItem(at: destUrl)
            return Promise.value(destUrl)
        }
    }
    
    public static func copyExternalFileIntoDocumentsWithPrompt(_ srcUrl: URL) -> Promise<String> {
        return firstly {
            try promptToReplaceFile(try getDocumentsDestinationUrl(srcUrl))
        }.then { destUrl -> Promise<String> in
            try copyExternalFile(srcUrl: srcUrl, destUrl: destUrl)
            return Promise.value(destUrl.path)
        }.recover { _ in
            Promise.value("")
        }
    }

    public static func moveInboxFileIntoDocumentsWithPrompt(_ srcUrl: URL) -> Promise<String> {
        return firstly {
            try promptToReplaceFile(try getDocumentsDestinationUrl(srcUrl))
        }.then { destUrl -> Promise<String> in
            try FileManager.default.moveItem(at: srcUrl, to: destUrl)
            return Promise.value(destUrl.path)
        }.recover { _ in
            Promise.value("")
        }
    }
    
    public static func openInboxUrl(_ url: URL, messenger: ITMMessenger = ITMViewController.application.itmMessenger, query: String = "openModel") {
        _ = moveInboxFileIntoDocumentsWithPrompt(url).done { path in
            if !path.isEmpty {
                messenger.query(query, path)
            } else {
                // Try to remove the file from the Inbox if the move failed or the user cancelled
                do {
                    try FileManager.default.removeItem(at: url)
                } catch {
                    // do nothing
                }
            }
        }
    }
}

class DocumentPicker: ITMNativeUIComponent {
    private var coordinator: DocumentPickerCoordinator!
    
    override init(viewController: UIViewController, itmMessenger: ITMMessenger) {
        super.init(viewController: viewController, itmMessenger: itmMessenger)
        queryHandler = itmMessenger.registerQueryHandler("chooseDocument", handleQuery)
    }
    
    private func handleQuery() -> Promise<String> {
        let (promise, resolver) = Promise<String>.pending()
        if let viewController = viewController {
            coordinator = DocumentPickerCoordinator(resolver)
            let controller = makeUIViewController(coordinator: coordinator)
            viewController.present(controller, animated: true, completion: nil)
        } else {
            resolver.reject(ITMError())
        }
        return promise
    }
    
    private func makeUIViewController(coordinator: DocumentPickerCoordinator) -> some UIDocumentPickerViewController {
        let controller: UIDocumentPickerViewController
        if #available(iOS 14, *) {
            controller = UIDocumentPickerViewController(forOpeningContentTypes: [.bim_iModel], asCopy: false)
        } else {
            controller = UIDocumentPickerViewController(documentTypes: [UTType.bim_iModel.identifier], in: .open)
        }
        controller.allowsMultipleSelection = false
        controller.modalPresentationStyle = .fullScreen
        controller.delegate = coordinator
        return controller
    }
   
    class DocumentPickerCoordinator: NSObject, UIDocumentPickerDelegate {
        var resolver: Resolver<String>
        
        init(_ resolver: Resolver<String>) {
            self.resolver = resolver
        }
        
        func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
            _ = DocumentHelper.copyExternalFileIntoDocumentsWithPrompt(urls[0]).done { path in
                self.resolver.fulfill(path)
            }
        }
        
        func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
            resolver.fulfill("")
        }
    }
}
