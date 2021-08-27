//
//  SwiftUIStarterApp.swift
//  SwiftUIStarter
//
//  Created by Todd Southen on 2021-08-18.
//

import SwiftUI
import ITwinMobile
import UniformTypeIdentifiers
import PromiseKit

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

extension Binding {
    /// When the `Binding`'s `wrappedValue` changes, the given closure is executed.
    /// - Parameter closure: Chunk of code to execute whenever the value changes.
    /// - Returns: New `Binding`.
    func onUpdate(_ closure: @escaping () -> Void) -> Binding<Value> {
        Binding(get: {
            wrappedValue
        }, set: { newValue in
            wrappedValue = newValue
            closure()
        })
    }
}

struct DocumentPicker: UIViewControllerRepresentable {
    @Binding var documentPath: String
    
    class DocumentPickerCoordinator: NSObject, UIDocumentPickerDelegate, UINavigationControllerDelegate {
        var parent: DocumentPicker
        
        init(_ documentPicker: DocumentPicker) {
            parent = documentPicker
        }
        
        func clearDocumentPath() {
            parent.documentPath = ""
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
                    self.parent.documentPath = destUrl.path
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
    
    func makeCoordinator() -> DocumentPickerCoordinator {
        return DocumentPickerCoordinator(self)
    }
    
    func makeUIViewController(context: Context) -> some UIDocumentPickerViewController {
        let controller: UIDocumentPickerViewController
        if #available(iOS 14, *) {
            controller = UIDocumentPickerViewController(forOpeningContentTypes: [.bim_iModel], asCopy: false)
        } else {
            controller = UIDocumentPickerViewController(documentTypes: [UTType.bim_iModel.identifier], in: .open)
        }
        controller.allowsMultipleSelection = false
        controller.delegate = context.coordinator
        return controller
    }
    
    func updateUIViewController(_ uiViewController: UIViewControllerType, context: Context) {
        // do nothing
    }
}

@main
struct SwiftUIStarterApp: App {
    @State private var showDocumentPicker = false
    @State private var documentPath = ""
    @State private var resolver: Resolver<String>?
    private var application = ModelApplication()
    
    var body: some Scene {
        application.onChooseDocument = { resolver in
            showDocumentPicker = true
            self.resolver = resolver
        }
        return WindowGroup {
            let view = ITMSwiftUIContentView(application: application).edgesIgnoringSafeArea(.all)
            let docPickerContent = {
                DocumentPicker(documentPath: $documentPath.onUpdate {
                    resolver?.fulfill(documentPath)
                })
            }
            if #available(iOS 14, *) {
                view.fullScreenCover(isPresented: $showDocumentPicker, content: docPickerContent)
            } else {
                view.sheet(isPresented: $showDocumentPicker, content: docPickerContent)
            }
        }
    }
}
