/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import UIKit
import ITwinMobile
import UniformTypeIdentifiers

@available(iOS 14.0, *)
extension UTType {
    /// The UTType exported by this application (in Info.plist).
    static let bim_iModel = UTType(exportedAs: "com.bentley.bim-imodel")
}

extension ITMApplication {
    /// The parameters for an alert button used in `showAlert`
    struct AlertButtonParams {
        /// The string to display on the button.
        var label: String?

        /// The optional callback to run when the button is pressed.
        var handler: (() -> Void)?
    }

    /// Shows a modal alert dialog presented using `ITMApplication.topViewController`.
    /// - Parameters:
    ///   - title: The optional title shown at the top of the dialog.
    ///   - message: The message shown in the dialog.
    ///   - cancelButton: The optional parameters for the Cancel button. If nil, a cancel button will not be added.
    ///   If the label is not specified, "Cancel" will be used.
    ///   - okButton: The optional parameters for the OK button. If nil or the label is nil, "OK" will be used.
    @MainActor
    static func showAlert(
        title: String? = nil,
        message: String,
        cancelButton: AlertButtonParams? = nil,
        okButton: AlertButtonParams? = nil
    ) {
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: okButton?.label ?? "OK", style: .default) { _ in
            okButton?.handler?()
        })

        if let cancelButton = cancelButton {
            alert.addAction(UIAlertAction(title: cancelButton.label ?? "Cancel", style: .cancel) { _ in
                cancelButton.handler?()
            })
        }

        ITMApplication.topViewController?.present(alert, animated: true)
    }

    /// Shows a modal alert dialog by calling `showAlert`, asynchronously returning the result.
    /// - Parameters:
    ///   - title: The optional title shown at the top of the dialog.
    ///   - message: The message shown in the dialog.
    ///   - cancelLabel: The optional label for the cancel button. If nil, "Cancel" will be used.
    ///   - okLabel: The optional label for the OK button. If nil, "OK" will be used.
    /// - Returns: A boolean value when the user presses a button: OK (true) or Cancel (false).
    @MainActor
    @discardableResult static func showAlert(
        title: String? = nil,
        message: String,
        cancelLabel: String? = nil,
        okLabel: String? = nil
    ) async -> Bool {
        return await withCheckedContinuation { continuation in
            ITMApplication.showAlert(title: title, message: message,
                cancelButton: AlertButtonParams(label: cancelLabel) {
                    continuation.resume(returning: false)
                },
                okButton: AlertButtonParams(label: okLabel) {
                    continuation.resume(returning: true)
                })
        }
    }
}

/// A collection of static functions to help with picking documents and opening URLs.
class DocumentHelper {
    /// Gets files with a given extension in the documents directory.
    /// - Parameter matchExtension: The file extension to search for.
    /// - Returns: An array of file paths to the found documents, could be empty if none found.
    public static func getDocumentsWith(extension matchExtension: String) -> [String] {
        let fm = FileManager.default
        guard let documentsURL = try? fm.url(for: .documentDirectory,
                                             in: .userDomainMask,
                                             appropriateFor: nil,
                                             create: true) else {
            return []
        }
        if let allDocuments = try? fm.contentsOfDirectory(at: documentsURL, includingPropertiesForKeys: [.pathKey]) {
            return Array(allDocuments
                .lazy
                .filter { $0.pathExtension.caseInsensitiveCompare(matchExtension) == .orderedSame }
                .map(\.path)
            )
        }
        return []
    }

    /// Gets `*.bim` files in the documents directory.
    /// - Returns: An array of file paths to the found documents, could be empty if none found.
    public static func getBimDocuments() -> [String] {
        if #available(iOS 14.0, *) {
            return DocumentHelper.getDocumentsWith(extension: UTType.bim_iModel.preferredFilenameExtension!)
        } else {
            return DocumentHelper.getDocumentsWith(extension: "bim")
        }
    }

    /// Formulates a `URL` in the app's documents directory for the given source file.
    /// - Parameter srcURL: The source URL that we will be opening/copying to this application.
    /// - Throws: `ITMError` if the documents directory cannot be determined.
    /// - Returns: The destination URL in the documents directory.
    public static func getDocumentsDestinationURL(_ srcURL: URL) throws -> URL {
        let fm = FileManager.default
        guard let documentsURL = try? fm.url(for: .documentDirectory,
                                             in: .userDomainMask,
                                             appropriateFor: nil,
                                             create: true) else {
            throw ITMStringError(errorDescription: "Cannot find app documents directory!")
        }
        return documentsURL.appendingPathComponent(srcURL.lastPathComponent)
    }

    /// Copies the given file from the source to the destination.
    ///
    /// The proper calls are made to access security scoped URLs.
    /// - Parameters:
    ///   - srcURL: The URL of the file to copy.
    ///   - destURL: The URL of the file destination.
    ///   - copy: Whether to copy or move the file.
    /// - Throws: If the copy fails.
    public static func transferFile(srcURL: URL, destURL: URL, copy: Bool) throws {
        let secure = srcURL.startAccessingSecurityScopedResource()
        defer {
            if secure {
                srcURL.stopAccessingSecurityScopedResource()
            }
        }
        if copy {
            try FileManager.default.copyItem(at: srcURL, to: destURL)
        } else {
            try FileManager.default.moveItem(at: srcURL, to: destURL)
        }
    }

    /// Prompts the user to replace the file if it already exists.
    /// - Parameter url: The file to check.
    /// - Throws: If the file exists and the user agrees to delete the file, but the removal fails, or if the user rejects deleting the file.
    public static func promptToReplaceFile(_ url: URL) async throws {
        if !FileManager.default.fileExists(atPath: url.path) {
            return
        }

        if await !ITMApplication.showAlert(
            title: "Warning",
            message: "\(url.lastPathComponent) already exists in the application's documents. Do you want to replace it?",
            cancelLabel: "No",
            okLabel: "Yes") {
            throw ITMError()
        }
        try FileManager.default.removeItem(at: url)
    }

    /// Copies or moves the input file into the documents directory, possibly prompting the user to replace the file
    /// if it already exists.
    /// - Parameters:
    ///   - srcURL: The file to copy.
    ///   - copy: Whether to copy the file or move the file.
    /// - Returns: The URL to the new copy of the file, or `nil` if it is not replaced by the user or an error occurs.
    public static func putFileInDocumentsWithPrompt(_ srcURL: URL, copy: Bool = true) async -> URL? {
        do {
            let destURL = try getDocumentsDestinationURL(srcURL)
            try await promptToReplaceFile(destURL)
            try transferFile(srcURL: srcURL, destURL: destURL, copy: copy)
            return destURL
        } catch {
            return nil
        }
    }

    /// Opens the given Inbox file by moving it to the documents directory and sending a message to the web view.
    /// - Parameters:
    ///   - url: The file to move and open.
    ///   - messenger: Optional messenger instance.
    ///   - query: Optional query message to send.
    public static func openInboxURL(
        _ url: URL,
        messenger: ITMMessenger = ITMViewController.application.itmMessenger,
        query: String = "openModel"
    ) {
        Task {
            if let newURL = await putFileInDocumentsWithPrompt(url, copy: false) {
                messenger.send(query, newURL.path)
            } else {
                // Try to remove the file from the Inbox if the move failed or the user cancelled
                try? FileManager.default.removeItem(at: url)
            }
        }
    }
}

/// An `ITMNativeUIComponent` sub-class that displays a document picker.
@MainActor
class DocumentPicker: ITMNativeUIComponent {
    // This must be a member variable to prevent it from being deleted while the document
    // picker is visible, since the document picker's delegate property is weak.
    private var coordinator: DocumentPickerCoordinator?

    /// Creates a document picker.
    /// - Parameter itmNativeUI: The `ITMNativeUI` used to present the document picker.
    override init(itmNativeUI: ITMNativeUI) {
        super.init(itmNativeUI: itmNativeUI)
        queryHandler = itmMessenger.registerQueryHandler("chooseDocument", handleQuery)
    }

    /// The query handler for the "chooseDocument" query.
    /// - Throws: Throws if there is a problem.
    /// - Returns: The path to the file in the documents directory.
    private func handleQuery() async throws -> String {
        guard let viewController = viewController else {
            throw ITMStringError(errorDescription: "No view controller!")
        }
        return await withCheckedContinuation { continuation in
            let coordinator = DocumentPickerCoordinator(continuation) {
                self.coordinator = nil
            }
            self.coordinator = coordinator
            let controller = makeUIViewController(coordinator: coordinator)
            viewController.present(controller, animated: true)
        }
    }

    /// Creates the `UIDocumentPickerViewController` that will be presented to the user.
    /// - Parameter coordinator: The coordinator that implements the `UIDocumentPickerDelegate` functions.
    /// - Returns: The controller instance.
    private func makeUIViewController(coordinator: DocumentPickerCoordinator) -> UIDocumentPickerViewController {
        let controller: UIDocumentPickerViewController
        if #available(iOS 14, *) {
            controller = UIDocumentPickerViewController(forOpeningContentTypes: [.bim_iModel], asCopy: false)
        } else {
            controller = UIDocumentPickerViewController(documentTypes: ["com.bentley.bim-imodel"], in: .open)
        }
        controller.allowsMultipleSelection = false
        controller.modalPresentationStyle = .fullScreen
        controller.delegate = coordinator
        return controller
    }

    /// Nested class that implements the `UIDocumentPickerDelegate` protocol.
    class DocumentPickerCoordinator: NSObject, UIDocumentPickerDelegate {
        let continuation: CheckedContinuation<String, Never>
        let completion: (() -> Void)?

        /// Initializes with the given async continuation and completion.
        /// - Parameters:
        ///   - continuation: The continuation used when the user picks a file or cancels.
        ///   - completion: The block to execute after the user has picked a document or canceled.
        init(_ continuation: CheckedContinuation<String, Never>, completion: (() -> Void)? = nil) {
            self.continuation = continuation
            self.completion = completion
        }

        /// Called when the user selects a file.
        ///
        /// Copies the file into the documents directory and resumes the continuation with the file's path.
        /// - Parameters:
        ///   - controller: The parent controller.
        ///   - urls: Picked file(s).
        func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
            Task {
                let url = await DocumentHelper.putFileInDocumentsWithPrompt(urls[0])
                self.continuation.resume(returning: url?.path ?? "")
                self.completion?()
            }
        }

        /// Called when the document picker is dismissed via the cancel button.
        ///
        /// Resumes the continuation with an empty string.
        /// - Parameter controller: The paren controller.
        func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
            self.continuation.resume(returning: "")
            self.completion?()
        }
    }
}
