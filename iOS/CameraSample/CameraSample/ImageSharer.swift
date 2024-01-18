/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import UIKit
import ITwinMobile

/// An `ITMNativeUIComponent` subclass for sharing one or more pictures by URL.
class ImageSharer: ITMNativeUIComponent {
    override init(itmNativeUI: ITMNativeUI) {
        super.init(itmNativeUI: itmNativeUI)
        queryHandler = itmMessenger.registerQueryHandler("shareImages", handleQuery)
    }
    
    /// Simple wrapper for sharing anything via the `UIActivityViewController`.
    /// - Throws: Throws an exception if `items` is empty.
    /// - Parameters:
    ///   - items: The items to share. The URLs are file URLs representing images in the image cache.
    ///   - vc: The view controller used to present the sharing UI.
    ///   - sourceRect: The rectangle in the coordinate space of `vc` that the popover should point at.
    static func shareItems(items: [URL], vc: UIViewController, sourceRect: CGRect) throws {
        guard !items.isEmpty else {
            throw ITMStringError(errorDescription: "No items to share!")
        }
        let shareActivity = UIActivityViewController(activityItems: items, applicationActivities: nil)
        if let popover = shareActivity.popoverPresentationController {
            popover.sourceView = vc.view
            popover.sourceRect = sourceRect
        }
        vc.present(shareActivity, animated: true)
    }
    
    /// Handles the `"shareImages"` query.
    /// - Throws: Throws an exception if any problems are encountered.
    /// - Parameter params: The input params from JavaScript. This must contain a `urls` array string property.
    /// It can optionally also contain a `sourceRect` property that indicates the screen component this share action
    /// corresponds with. It is expected to be a JavaScript object with the same properties in ITMRect.
    func handleQuery(params: [String: Any]) throws {
        guard let urlStrings = params["urls"] as? [String] else {
            throw ITMStringError(errorDescription: "shareImages requires 'urls' as input!")
        }
        guard let vc = self.viewController else {
            throw ITMStringError(errorDescription: "No view controller for shareImages!")
        }
        // Start with a default empty rect in the middle of the screen.
        var rect = CGRect(x: UIScreen.main.bounds.width / 2, y: UIScreen.main.bounds.height, width: 0, height: 0)
        // Try to convert the sourceRect parameter to a CGRect if it is supplied.
        if let sourceRect = try? ITMActionSheet.getSourceRect(from: params) {
            rect = CGRect(sourceRect)
        }
        try ImageSharer.shareItems(items: urlStrings.compactMap {
            ImageCache.getFileURL(ImageCache.URL(string: $0))
        }, vc: vc, sourceRect: rect)
    }
}
