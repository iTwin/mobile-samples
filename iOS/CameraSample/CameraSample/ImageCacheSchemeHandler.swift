/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import ITwinMobile
import WebKit

/// Custom `WKURLSchemeHandler` to support loading images from cache, since `WKWebView` will not allow loading file:// URLs for security reasons.
class ImageCacheSchemeHandler: NSObject, WKURLSchemeHandler {
    /// The URL scheme for this handler. FYI, "itms" stands for iTwin Mobile Sample.
    static let urlScheme = "com.bentley.itms-image-cache"
    /// `WKURLSchemeHandler` protocol method.
    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let fileURL = ImageCache.getFileUrl(urlSchemeTask.request.url) else {
            ITMAssetHandler.cancelWithFileNotFound(urlSchemeTask: urlSchemeTask)
            return
        }
        ITMAssetHandler.respondWithDiskFile(urlSchemeTask: urlSchemeTask, fileUrl: fileURL)
    }

    /// `WKURLSchemeHandler` protocol method.
    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        // Nothing to do here.
    }
}
