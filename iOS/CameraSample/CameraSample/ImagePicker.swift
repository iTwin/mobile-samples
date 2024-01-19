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
/// `UIImagePickerController` does not officially support landscape mode, but it works fine
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

/// An `ITMNativeUIComponent` subclass for taking a picture with the camera or selecting a picture
/// from the device's photo gallery.
class ImagePicker: ITMNativeUIComponent {
    /// The continuation for the active query.
    var continuation: CheckedContinuation<String?, Error>?
    /// The iModelId for the active query.
    var iModelId: String?
    /// The picker for the active query.
    var picker: UIViewController?

    /// Creates an image picker.
    /// - Parameter itmNativeUI: The `ITMNativeUI` used to present the image picker.
    override init(itmNativeUI: ITMNativeUI) {
        super.init(itmNativeUI: itmNativeUI)
        queryHandler = itmMessenger.registerQueryHandler("pickImage", handleQuery)
    }
    
    /// Determine if the given params request a camera photo or an image from the photo gallery.
    /// - Parameter params: The params from the query.
    /// - Returns: false if `"sourceType"` is set to `"photoLibrary"` in `params`, or true otherwise.
    private func useCamera(params: [String: Any]) -> Bool {
        let sourceType = params["sourceType"] as? String
        return sourceType != "photoLibrary"
    }

    /// Creates a "picker". When in camera mode, this will always return a UIImagePickerController. However, when in photoLibrary
    /// mode, this will return a PHPickerViewController in iOS 14 and later, and a UIImagePickerController in iOS 13.
    /// - Parameter params: The params from the query.
    /// - Returns: An appropriate picker configured based on the information contained in `params`.
    private func createPicker(params: [String: Any]) -> UIViewController {
        let useCamera = useCamera(params: params)
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

    /// Handles the `"pickImage"` query.
    ///
    /// This shows the picker UI and returns a URL using a custom scheme that resolves to the image taken by the camera
    /// or picked from the photo gallery.
    /// - Parameter params: The input params from JavaScript. This must contain an `iModelId` string property.
    /// - Returns: A URL to the image. Note that this URL uses a custom URL scheme to allow the image to be
    ///            loaded from the WKWebView.
    @MainActor
    private func handleQuery(params: [String: Any]) async throws -> String? {
        guard let viewController = viewController, let iModelId = params["iModelId"] as? String else {
            throw ITMStringError(errorDescription: "Required param 'iModelId' missing from 'pickImage' query!")
        }
        self.iModelId = iModelId
        if useCamera(params: params) {
            if ITMDevicePermissionsHelper.isVideoCaptureDenied {
                // The user has previously denied camera access to this app. Show a dialog that states
                // this, and allows the user to open iOS Settings to change the setting.
                ITMDevicePermissionsHelper.openPhotoCaptureAccessAccessDialog()
                return nil
            }
        } else {
            // Note: On iOS 14 and above, photo library access isn't required, because PHPickerViewController
            // runs in a separate process and only returns the picked image to the app.
            if #unavailable(iOS 14), ITMDevicePermissionsHelper.isPhotoLibraryDenied {
                // The user has previously denied photo library access to this app. Show a dialog that states
                // this, and allows the user to open iOS Settings to change the setting.
                ITMDevicePermissionsHelper.openPhotoCaptureAccessAccessDialog()
                return nil
            }
        }
        // If a previous query hasn't fully resolved yet, resolve it now with nil.
        resume(returning: nil)
        return try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation
            let picker = createPicker(params: params)
            self.picker = picker
            picker.modalPresentationStyle = .fullScreen
            viewController.present(picker, animated: true)
        }
    }
    
    /// Dismiss ``picker`` and set it to nil.
    private func dismissPicker() {
        if let picker = picker {
            self.picker = nil
            DispatchQueue.main.async {
                picker.dismiss(animated: true)
            }
        }
    }

    /// Convenience function that dismisses ``picker``, calls `resume(returning:)` on ``continuation``, and resets
    /// ``continuation`` and ``picker`` to nil.
    /// - Parameter value: The value with which to resume ``continuation``.
    private func resume(returning value: String?) {
        dismissPicker()
        continuation?.resume(returning: value)
        continuation = nil
    }
    
    /// Convenience function that dismisses ``picker``, calls `resume(throwing:)` on ``continuation``, and resets
    /// ``continuation`` and ``picker`` to nil.
    /// - Parameter value: The error with which to resume ``continuation``.
    private func resume(throwing error: Error) {
        dismissPicker()
        continuation?.resume(throwing: error)
        continuation = nil
    }
    
    /// Store the image chosen by the user in the image cache and use ``continuation`` to return the image cache URL.
    ///
    /// - Note: If `imageURL` is non-nil, `image` and `metadata` will be ignored.
    /// - Parameters:
    ///   - imageURL: The URL of the picked image, or nil. If this is non-nil, the specified file will be moved or (failing that) copied
    ///               into the image cache.
    ///   - image: The picked image, or nil. If this is non-nil, the image data will be written to the image cache as a JPEG file.
    ///   - metadata: Metadata for `image`, or nil.
    private func pick(imageURL: URL?, image: UIImage?, metadata: NSDictionary?) {
        guard imageURL != nil || image != nil else {
            // The user canceled.
            resume(returning: nil)
            return
        }
        let dateFmt = DateFormatter()
        dateFmt.dateFormat = "yyyy-MM-dd HH-mm-ss.SSS"
        // Use a timestamp for the image cache filename.
        let filenameBase = "\(dateFmt.string(from: Date()))"
        do {
            guard let baseURL = ImageCache.baseURL else {
                throw ITMStringError(errorDescription: "Error getting App sandbox cache URL!")
            }
            let iModelId = self.iModelId!
            // The file will be stored in <Caches>/images/<iModelId>/. All pictures for a given iModel end up in the
            // same directory.
            let dirURL = baseURL.appendingPathComponent(iModelId)
            let fm = FileManager.default
            // Make sure the output directory exists.
            try fm.createDirectory(at: dirURL, withIntermediateDirectories: true, attributes: nil)
            let destURLBase = dirURL.appendingPathComponent(filenameBase)
            let destURL: URL
            // If the user picks from the photo library, we'll get a URL for a local copy of the file from the photo
            // library. If the original file in the photo library was HEIC, the URL will be for a local JPEG copy. If
            // the original file in the photo library was a PNG or JPEG, the URL will be the exact original file. If we
            // get a URL, simply copy it to our cache, preserving the original file extension.
            if let imageURL = imageURL {
                destURL = destURLBase.appendingPathExtension(imageURL.pathExtension)
                do {
                    // It has been reported that using moveItem here doesn't work in all versions of iOS.
                    try fm.moveItem(at: imageURL, to: destURL)
                } catch {
                    // If moveItem fails, fall back to copyItem. Note that if copyItem fails here, it will jump to the
                    // catch block below, which resumes the continuation throwing the error.
                    try fm.copyItem(at: imageURL, to: destURL)
                }
            } else {
                destURL = destURLBase.appendingPathExtension(".jpeg")
                // Write the UIImage to the given filename.
                // Note: The guard on the first line of this function ensures that imageURL and
                // image cannot both be non-nil, so the image! below is safe.
                try ImageCache.writeImage(image!, to: destURL, with: metadata)
            }
            // Resume the continuation returning a custom URL scheme URL of the form:
            // com.bentley.itms-image-cache://<iModelId>/<filename>
            // The custom ImageCacheSchemeHandler will convert that back into a file URL and then load that file.
            let scheme = ImageCacheSchemeHandler.urlScheme
            let path = "\(iModelId)/\(destURL.lastPathComponent)"
            // Note: Our generated URL contains spaces and they are not yet URL-encoded. Feeding it into
            // ImageCache.URL and then extracting the absoluteString from that adds the necessary percent
            // encodings. Also, while in theory ImageCache.URL can return nil, it won't do so with the URLs
            // that we generate.
            resume(returning: ImageCache.URL(string: "\(scheme)://\(path)")?.absoluteString)
        } catch {
            // If anything went wrong above, resume the continuation throwing the error.
            resume(throwing: error)
        }
    }
}

/// `PHPickerViewController`'s delgate must implement this protocol.
@available(iOS 14, *)
extension ImagePicker: PHPickerViewControllerDelegate {
    /// Called when the user picks an image from the photo library or cancels picking.
    /// - Parameters:
    ///   - picker: The currently presented photo picker view controller.
    ///   - results: The results of the user’s selections.
    func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
        let itemProviders = results.map(\.itemProvider)
        if itemProviders.isEmpty {
            // User canceled.
            resume(returning: nil)
        } else {
            // We only allow one item to be picked, so there will either be 0 or 1, and 0 was handled above.
            let item = itemProviders[0]
            // loadFileRepresentation creates a file with metadata.
            item.loadFileRepresentation(forTypeIdentifier: "public.image") { (url, error) in
                if error != nil {
                    // If loadFileRepresentation fails, try to create a UIImage from the item.
                    if item.canLoadObject(ofClass: UIImage.self) {
                        item.loadObject(ofClass: UIImage.self) { (image, error) in
                            if let error = error {
                                self.resume(throwing: error)
                            } else {
                                if let image = image as? UIImage {
                                    self.pick(imageURL: nil, image: image, metadata: nil)
                                } else {
                                    self.resume(throwing: ITMStringError(errorDescription: "Error picking image"))
                                }
                            }
                        }
                    } else {
                        self.resume(throwing: ITMStringError(errorDescription: "Error picking image"))
                    }
                } else {
                    self.pick(imageURL: url, image: nil, metadata: nil)
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
        resume(returning: nil)
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
        pick(imageURL: imageURL, image: image, metadata: info[.mediaMetadata] as? NSDictionary)
    }
}
