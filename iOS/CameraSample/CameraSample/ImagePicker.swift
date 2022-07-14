/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import PromiseKit
import UIKit
import ITwinMobile
import WebKit

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
    /// The promise for the active query.
    var presentedPromise: Promise<String?>?
    /// The resolver for the active query.
    var presentedResolver: Resolver<String?>?
    /// The iModelId for the active query.
    var iModelId: String?
    override init(itmNativeUI: ITMNativeUI) {
        super.init(itmNativeUI: itmNativeUI)
        queryHandler = itmMessenger.registerQueryHandler("pickImage", handleQuery)
    }
    
    /// Handles the "pickImage" query.
    ///
    /// This shows the camera UI and returns a promise that when fulfilled will contain a URL using a custom scheme that
    /// resolves to the image taken by the camera.
    /// - Parameter params: The input params from JavaScript. This must contain an `iModelId` string property.
    /// - Returns: A `Promise` object that when fulfilled will contain a URL to the captured image. Note that this URL
    /// uses a custom URL scheme to allow the image to be loaded from the WKWebView.
    private func handleQuery(params: [String: Any]) -> Promise<String?> {
        (presentedPromise, presentedResolver) = Promise<String?>.pending()
        let presentedPromise = presentedPromise!
        let presentedResolver = presentedResolver!
        guard let viewController = viewController else {
            presentedResolver.reject(ITMError())
            return presentedPromise
        }
        iModelId = params["iModelId"] as? String
        if iModelId == nil {
            presentedResolver.reject(ITMError())
            return presentedPromise
        }
        if ITMDevicePermissionsHelper.isPhotoCaptureDenied {
            // The user has previously denined camera access to this app. Show a dialog that states
            // this, and allows the user to open iOS Settings to change the setting.
            ITMDevicePermissionsHelper.openPhotoCaptureAccessAccessDialog()
            presentedResolver.fulfill(nil)
            return presentedPromise
        }
        let picker = ImagePickerFix()
        picker.modalPresentationStyle = .fullScreen
        let sourceType = params["sourceType"] as? String
        if sourceType != "photoLibrary" {
            picker.sourceType = .camera
        }
        picker.delegate = self
        viewController.present(picker, animated: true, completion: nil)
        return presentedPromise
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
    /// Fulfills the `Promise` with nil.
    /// - Parameter picker: The controller object managing the image picker interface.
    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        presentedResolver?.fulfill(nil)
        picker.dismiss(animated: true, completion: nil)
    }
    
    /// Called after the user takes a picture.
    ///
    /// Writes the image to the app's cache and fulfills the promise with a custom URL scheme URL referencing the file.
    ///
    /// If there is any kind of error, rejects the promise.
    /// - Parameters:
    ///   - picker: The controller object managing the image picker interface.
    ///   - info: A dictionary containing the original image and the edited image.
    func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
        let imageUrl = info[UIImagePickerController.InfoKey.imageURL] as? URL
        let image = info[UIImagePickerController.InfoKey.originalImage] as? UIImage
        if imageUrl == nil, image == nil {
            presentedResolver?.fulfill(nil)
            picker.dismiss(animated: true, completion: nil)
            return
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
            if let imageUrl = imageUrl {
                do {
                    // It has been reported that using moveItem here doesn't work in all versions of iOS.
                    try fm.moveItem(at: imageUrl, to: fileUrl)
                } catch {
                    // If moveItem fails, fall back to copyItem. Note that if copyItem fails here, it will jump to the
                    // catch block below, which rejects the promise.
                    try fm.copyItem(at: imageUrl, to: fileUrl)
                }
            } else if let image = image {
                // Write the UIImage to the given filename.
                try ImageCache.writeImage(image, to: fileUrl, with: info[.mediaMetadata] as? NSDictionary)
            }
            // Fulfill the promise with a custom URL scheme URL of the form:
            // com.bentley.itms-image-cache://<iModelId>/<filename>
            // The custom ImageCacheSchemeHandler will convert that back into a file URL and then load that file.
            // Note: the absolute file URL is converted to an NSString to maintain any encoded characters, instead
            // of using lastPathComponent directly on fileUrl. Even though we're fulfilling a string, that string
            // represents a URL.
            presentedResolver?.fulfill("\(ImageCacheSchemeHandler.urlScheme)://\(iModelId)/\(NSString(string: fileUrl.absoluteString).lastPathComponent)")
        } catch {
            // If anything went wrong above, reject the promise.
            presentedResolver?.reject(error)
        }
        picker.dismiss(animated: true, completion: nil)
    }
}
