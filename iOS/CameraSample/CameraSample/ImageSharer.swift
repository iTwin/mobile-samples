/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import UIKit
import ITwinMobile

/// An `ITMNativeUIComponent` subclass for one or more pictures by URL.
class ImageSharer: ITMNativeUIComponent {
    override init(itmNativeUI: ITMNativeUI) {
        super.init(itmNativeUI: itmNativeUI)
        queryHandler = itmMessenger.registerMessageHandler("shareImages", handleQuery)
    }
    
    /// Simple wrapper for sharing anything via the `UIActivityViewController`.
    /// - Parameters:
    ///   - items: The items to share.
    ///   - vc: The view controller used to present the sharing UI.
    ///   - sourceRect: The rectangle in the coordinate space of `vc` that the popover should point at.
    static func shareItems(items: [Any], vc: UIViewController, sourceRect: CGRect) {
        let shareActivity = UIActivityViewController(activityItems: items, applicationActivities: nil)
        if let popover = shareActivity.popoverPresentationController {
            popover.sourceView = vc.view
            popover.sourceRect = sourceRect
        }
        vc.present(shareActivity, animated: true)
    }
    
    /// Handles the shareImages message.
    /// - Parameter params: The input params from JavaScript. This must contain a `urls` array string property.
    /// It can optionally also contain a `sourceRect` proprty that indicates the screen component this share action
    /// corresponds with. It is expected to be a javascript object with the same properties in ITMRect.
    func handleQuery(params: [String: Any]) {
        if let urls = params["urls"] as? [String],
           let vc = self.viewController {
            var rect = CGRect(x: UIScreen.main.bounds.width / 2, y: UIScreen.main.bounds.height, width: 0, height: 0)
            // Try to convert the sourceRect parameter to a CGRect if it is supplied.
            if let sourceRect = params["sourceRect"] as? [String: Any],
               let sourceRect: ITMRect = try? ITMDictionaryDecoder.decode(sourceRect) {
                rect = CGRect(sourceRect)
            }
            ImageSharer.shareItems(items: urls.compactMap { ImageCache.getFileUrl(URL(string: $0)) }, vc: vc, sourceRect: rect)
        }
    }
}
