/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import UIKit
import WebKit
import ITwinMobile

/// Custom subclass of the ModelApplication class. That class is shared by all the samples. This one takes care of the custom behavior
/// that is specific to this sample.
class CamModelApplication: ModelApplication {
    /// Registers query handlers.
    override func registerQueryHandlers() {
        super.registerQueryHandlers()
        registerQueryHandler("getImages", ImageCache.handleGetImages)
        registerQueryHandler("deleteAllImages", ImageCache.handleDeleteAllImages)
        registerQueryHandler("deleteImages", ImageCache.handleDeleteImages)
    }

    /// Called when the `ITMViewController` will appear.
    ///
    /// Adds our DocumentPicker component to the native UI collection.
    /// - Parameter viewController: The view controller.
    override func viewWillAppear(viewController: ITMViewController) {
        super.viewWillAppear(viewController: viewController)
        if let itmNativeUI = viewController.itmNativeUI {
            itmNativeUI.addComponent(ImagePicker(itmNativeUI: itmNativeUI))
            itmNativeUI.addComponent(ImageSharer(itmNativeUI: itmNativeUI))
        }
    }
    
    /// Update the web view configuration to include our custom URL scheme handler for images.
    /// - Parameter configuration: The `WKWebViewConfiguration` that is about to be applied to our `WKWebView`.
    override class func updateWebViewConfiguration(_ configuration: WKWebViewConfiguration) {
        configuration.setURLSchemeHandler(ImageCacheSchemeHandler(), forURLScheme: ImageCacheSchemeHandler.urlScheme)
    }

    /// Gets custom URL hash parameters to be passed when loading the frontend.
    /// This override adds `isCameraSample=true` to the list or params from super.
    /// - Returns: The hash params from super, with `isCameraSample=true` added.
    override func getUrlHashParams() -> HashParams {
        var hashParams = super.getUrlHashParams()
        hashParams.append(HashParam(name: "isCameraSample", value: true))
        return hashParams
    }
}
