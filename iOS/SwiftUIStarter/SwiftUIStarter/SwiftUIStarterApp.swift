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
    static func promptUser(title: String, message: String, cancelPressed: (() -> Void)? = nil, okPressed: (() -> Void)? = nil) {
        let refreshAlert = UIAlertController(title: title, message: message, preferredStyle: UIAlertController.Style.alert)
        
        refreshAlert.addAction(UIAlertAction(title: "OK", style: .default, handler: { (action: UIAlertAction!) in
            okPressed?()
        }))
        
        if let cancelPressed = cancelPressed {
            refreshAlert.addAction(UIAlertAction(title: "Cancel", style: .cancel, handler: { (action: UIAlertAction!) in
                cancelPressed()
            }))
        }
        
        ITMApplication.topViewController?.present(refreshAlert, animated: true, completion: nil)
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
                    ITMApplication.promptUser(title: "Error", message: error.localizedDescription)
                    self.clearDocumentPath()
                }
                if secure {
                    srcUrl.stopAccessingSecurityScopedResource()
                }
            }
            
            if fm.fileExists(atPath: destUrl.path) {
                ITMApplication.promptUser(
                    title: "Warning", message: "\(srcUrl.lastPathComponent) already exists in the application's documents. Do you want to replace it?",
                    cancelPressed: {
                        self.clearDocumentPath()
                    },
                    okPressed: {
                        do {
                            try fm.removeItem(at: destUrl)
                            copyFile()
                        } catch let error {
                            print("Error deleting file: \(error).")
                            ITMApplication.promptUser(title: "Error", message: error.localizedDescription)
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
