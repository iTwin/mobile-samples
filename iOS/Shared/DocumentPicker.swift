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
        
        func clearDocumentPath() {
            resolver.fulfill("")
        }
        
        func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
            // Copy file to documents folder and return that new url
            let documentsDirs = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)
            if documentsDirs.count < 1 {
                clearDocumentPath()
                return
            }
            let fm = FileManager.default
            let srcUrl = urls[0]
            let destUrl = URL(fileURLWithPath: documentsDirs[0]).appendingPathComponent(srcUrl.lastPathComponent)
            let copyFile = {
                let secure = srcUrl.startAccessingSecurityScopedResource()
                do {
                    try fm.copyItem(at: srcUrl, to: destUrl)
                    self.resolver.fulfill(destUrl.path)
                } catch let error {
                    print("Error copying file: \(error).")
                    ITMApplication.showAlert(title: "Error", message: error.localizedDescription)
                    self.clearDocumentPath()
                }
                if secure {
                    srcUrl.stopAccessingSecurityScopedResource()
                }
            }
            
            if fm.fileExists(atPath: destUrl.path) {
                ITMApplication.showAlert(
                    title: "Warning", message: "\(srcUrl.lastPathComponent) already exists in the application's documents. Do you want to replace it?",
                    cancelButton: ITMApplication.AlertButtonParams() {
                        self.clearDocumentPath()
                    },
                    okButton: ITMApplication.AlertButtonParams() {
                        do {
                            try fm.removeItem(at: destUrl)
                            copyFile()
                        } catch let error {
                            print("Error deleting file: \(error).")
                            ITMApplication.showAlert(title: "Error", message: error.localizedDescription)
                            self.clearDocumentPath()
                        }
                    })
            } else {
                copyFile()
            }
        }
        
        func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
            clearDocumentPath()
        }
    }
}
