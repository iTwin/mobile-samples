/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import UIKit
import ITwinMobile
import WebKit
import PhotosUI

/// A `UIImagePickerController` subclass that supports landscape.
///
/// `UIImagePickerController` does not officially support landscape mode, but it works well enough
/// for both the camera UI and the photo library picker. This class simply enables all interface orientations
/// (other than upside down on phone).
class ImagePickerFix: UIImagePickerController {
    override open var supportedInterfaceOrientations: UIInterfaceOrientationMask {
        if UIDevice.current.userInterfaceIdiom == .phone {
            return .allButUpsideDown
        }
        return .all
    }
}

/// An `ITMNativeUIComponent` subclass for taking a picture with the camera.
class ImagePicker: ITMNativeUIComponent {
    /// The continuation for the active query.
    var continuation: CheckedContinuation<String?, Error>?
    /// The iModelId for the active query.
    var iModelId: String?
    override init(itmNativeUI: ITMNativeUI) {
        super.init(itmNativeUI: itmNativeUI)
        queryHandler = itmMessenger.registerQueryHandler("pickImage", handleQuery)
    }

    private func useCamera(params: [String: Any]) -> Bool {
        let sourceType = params["sourceType"] as? String
        if sourceType != "photoLibrary" {
            return true
        }
        return false
    }

    /// Creates a "picker". When in camera mode, this will always return a UIImagePickerController. However, when in photoLibrary
    /// mode, this will return a PHPickerViewController in iOS 14 and later, and a UIImagePickerController in iOS 13.
    private func createPicker(params: [String: Any]) -> UIViewController {
        let useCamera = self.useCamera(params: params)
        if !useCamera, #available(iOS 14, *) {
            // Note: configuration.selectionLimit defaults to 1, which is what we want.
            var configuration = PHPickerConfiguration()
            configuration.filter = .any(of: [.images])
            let picker = PHPickerViewController(configuration: configuration)
            picker.delegate = self
            return picker
        } else {
            let picker = ImagePickerFix()
            if useCamera {
                picker.sourceType = .camera
            }
            picker.delegate = self
            return picker
        }
    }

    /// Handles the "pickImage" query.
    ///
    /// This shows the camera UI and returns a URL using a custom scheme that resolves to the image taken by the camera.
    /// - Parameter params: The input params from JavaScript. This must contain an `iModelId` string property.
    /// - Returns: A URL to the captured image. Note that this URL uses a custom URL scheme to allow the image to be
    ///            loaded from the WKWebView.
    private func handleQuery(params: [String: Any]) async throws -> String? {
        guard let viewController = viewController, let iModelId = params["iModelId"] as? String else {
            throw ITMError()
        }
        self.iModelId = iModelId
        if self.useCamera(params: params) {
            if ITMDevicePermissionsHelper.isVideoCaptureDenied {
                // The user has previously denied camera access to this app. Show a dialog that states
                // this, and allows the user to open iOS Settings to change the setting.
                await ITMDevicePermissionsHelper.openPhotoCaptureAccessAccessDialog()
                return nil
            }
        } else {
            // Note: On iOS 14 and above, photo library access isn't required, because PHPickerViewController
            // runs in a separate process and only returns the picked image to the app.
            if #unavailable(iOS 14), ITMDevicePermissionsHelper.isPhotoLibraryDenied {
                // The user has previously denied photo library access to this app. Show a dialog that states
                // this, and allows the user to open iOS Settings to change the setting.
                await ITMDevicePermissionsHelper.openPhotoCaptureAccessAccessDialog()
                return nil
            }
        }
        return try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation
            DispatchQueue.main.async {
                let picker = self.createPicker(params: params)
                picker.modalPresentationStyle = .fullScreen
                viewController.present(picker, animated: true)
            }
        }
    }
    
    /// Convenience function that dismisses the picker, calls `resume(returning:)` on ``continuation``, and resets
    /// ``continuation`` to nil.
    private func resume(returning value: String?, picker: UIViewController) {
        DispatchQueue.main.async {
            picker.dismiss(animated: true)
        }
        continuation?.resume(returning: value)
        continuation = nil
    }
    
    /// Convenience function that dismisses the picker, calls `resume(throwing:)` on ``continuation``, and resets
    /// ``continuation`` to nil.
    private func resume(throwing error: Error, picker: UIViewController) {
        DispatchQueue.main.async {
            picker.dismiss(animated: true)
        }
        continuation?.resume(throwing: error)
        continuation = nil
    }
    
    private func pick(_ picker: UIViewController, imageURL: URL?, image: UIImage?, metadata: NSDictionary?) {
        if imageURL == nil, image == nil {
            resume(returning: nil, picker: picker)
        }
        let dateFmt = DateFormatter()
        dateFmt.dateFormat = "yyyy-MM-dd HH-mm-ss.SSS"
        // Use a timestamp for the filename.
        let filename = "\(dateFmt.string(from: Date())).jpg"
        do {
            let baseURL = ImageCache.baseURL!
            let iModelId = self.iModelId!
            // The file will be stored in <Caches>/images/<iModelId>/. All pictures for a given iModel end up in the same directory.
            let dirUrl = baseURL.appendingPathComponent(iModelId)
            let fm = FileManager.default
            // Make sure the output directory exists.
            try fm.createDirectory(at: dirUrl, withIntermediateDirectories: true, attributes: nil)
            let fileUrl = dirUrl.appendingPathComponent(filename)
            // If the user picks from the photo library, we'll get a URL for a local copy of the file from the photo library.
            // If the original file in the photo library was HEIC, the URL will be for a local JPEG copy. If the original file
            // in the photo library was a PNG or JPEG, the URL will be the exact original file. If we get a URL, simply copy
            // it to our cache.
            if let imageURL = imageURL {
                do {
                    // It has been reported that using moveItem here doesn't work in all versions of iOS.
                    try fm.moveItem(at: imageURL, to: fileUrl)
                } catch {
                    // If moveItem fails, fall back to copyItem. Note that if copyItem fails here, it will jump to the
                    // catch block below, which resumes the continuation throwing the error.
                    try fm.copyItem(at: imageURL, to: fileUrl)
                }
            } else if let image = image {
                // Write the UIImage to the given filename.
                try ImageCache.writeImage(image, to: fileUrl, with: metadata)
            }
            // Resume the continuation returning a custom URL scheme URL of the form:
            // com.bentley.itms-image-cache://<iModelId>/<filename>
            // The custom ImageCacheSchemeHandler will convert that back into a file URL and then load that file.
            // Note: the absolute file URL is converted to an NSString to maintain any encoded characters, instead
            // of using lastPathComponent directly on fileUrl. Even though we're fulfilling a string, that string
            // represents a URL.
            resume(returning: "\(ImageCacheSchemeHandler.urlScheme)://\(iModelId)/\(NSString(string: fileUrl.absoluteString).lastPathComponent)", picker: picker)
        } catch {
            // If anything went wrong above, resume the continuation throwing the error.
            resume(throwing: error, picker: picker)
        }
    }
}

/// `PHPickerViewController`'s delgate must implement this protocol.
@available(iOS 14, *)
extension ImagePicker: PHPickerViewControllerDelegate {
    /// Called when the user picks an image from the photo library or cancels picking.
    /// - Parameters:
    ///   - picker: The currently presented picker view controller.
    ///   - results: The results of the user’s selections.
    func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
        let itemProviders = results.map(\.itemProvider)
        if itemProviders.isEmpty {
            // User canceled.
            resume(returning: nil, picker: picker)
        } else {
            // We only allow one item to be picked, so there will either be 0 or 1, and 0 was handled above.
            let item = itemProviders[0]
            // loadFileRepresentation creates a file with metadata.
            Task {
                do {
                    let url = try await item.loadItem(forTypeIdentifier: "public.image") as! URL
                    let data = try Data(contentsOf: url)
                    if let image = UIImage(data: data) {
                        print("Image loaded: \(image)")
                    } else {
                        print("Error loading image!");
                    }
                } catch {
                    print("async loadItem failed: \(error)")
                }
            }
            item.loadFileRepresentation(forTypeIdentifier: "public.image") { (url, error) in
                if error != nil {
                    // If loadFileRepresentation fails, try to create a UIImage from the item.
                    Task {
                        do {
                            let image = try await item.loadItem(forTypeIdentifier: String(describing: UIImage.self)) as? UIImage
                            self.pick(picker, imageURL: nil, image: image, metadata: nil)
                        } catch {
                            self.resume(throwing: error, picker: picker)
                        }
                    }
//                    if item.canLoadObject(ofClass: UIImage.self) {
//                        item.loadObject(ofClass: UIImage.self) { (image, error) in
//                            if let error = error {
//                                self.resume(throwing: error, picker: picker)
//                            } else {
//                                if let image = image as? UIImage {
//                                    self.pick(picker, imageURL: nil, image: image, metadata: nil)
//                                } else {
//                                    self.resume(throwing: ITMError(json: ["message": "Error picking image"]), picker: picker)
//                                }
//                            }
//                        }
//                    } else {
//                        self.resume(throwing: ITMError(json: ["message": "Error picking image"]), picker: picker)
//                    }
                } else {
                    self.pick(picker, imageURL: url, image: nil, metadata: nil)
                }
            }
        }
    }
}

/// `UIImagePickerController`'s delgate must implement these protocols.
///
/// Everything in `UINavigationControllerDelegate` is optional, and we don't need to implement any of those methods.
///
/// This extension implements the `UIImagePickerControllerDelegate` methods that handle picking and image and canceling.
extension ImagePicker: UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    /// Called when the user cancels picture taking.
    ///
    /// Resumes the continuation returning nil.
    /// - Parameter picker: The controller object managing the image picker interface.
    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        resume(returning: nil, picker: picker)
    }
    
    /// Called after the user takes a picture.
    ///
    /// Writes the image to the app's cache and resumes the continuation returning a custom URL scheme URL referencing the file.
    ///
    /// If there is any kind of error, resumes the continuation throwing the error.
    /// - Parameters:
    ///   - picker: The controller object managing the image picker interface.
    ///   - info: A dictionary containing the original image and the edited image.
    func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
        let imageURL = info[UIImagePickerController.InfoKey.imageURL] as? URL
        let image = info[UIImagePickerController.InfoKey.originalImage] as? UIImage
        pick(picker, imageURL: imageURL, image: image, metadata: info[.mediaMetadata] as? NSDictionary)
    }
}
