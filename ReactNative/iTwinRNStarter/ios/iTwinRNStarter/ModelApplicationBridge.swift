/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import Foundation
import WebKit
import ITwinMobile

extension UIView {
  /// Find the `UIViewController` associated with the receiver
  /// - Returns: The receiver's `UIViewController`, or nil if one isn't found.
    func findViewController() -> UIViewController? {
        if let nextResponder = self.next as? UIViewController {
            return nextResponder
        } else if let nextResponder = self.next as? UIView {
            return nextResponder.findViewController()
        } else {
            return nil
        }
    }
}

/// Subclass of ModelApplication that is customized for use in this React Native sample.
class RNModelApplication: ModelApplication {
  /// The React Native UI's web view.
  static var rnWebView: WKWebView?
  /// The `ITMNativeUI`.
  public private(set) var itmNativeUI: ITMNativeUI!
  
  /// Override to return the `WKWebView` from the React Native UI, instead of creating a new one.
  /// - Note: If this is called before ``rnWebView`` is set to a value, the application will crash. This is intentional.
  /// - Returns: The value of ``rnWebView``.
  override class func createEmptyWebView() -> WKWebView {
    return rnWebView!
  }
  
  /// Initialize the class.
  /// - Note: You __must__ set ``rnWebView`` to the web view from the React Native UI __before__ creating this object.
  /// Otherwise the application will crash. This is intentional.
  required init() {
    super.init()
    let vc = RNModelApplication.rnWebView!.findViewController()!
    itmNativeUI = ITMNativeUI(viewController: vc, itmMessenger: itmMessenger)
    viewWillAppear(viewController: vc)
  }

  override func nativeUI(_ viewController: UIViewController) -> ITMNativeUI? {
    return itmNativeUI
  }
}

/// Bridge object to hold iTwin Mobile information, designed to be accessed from Objective C.
class ModelApplicationBridge: NSObject {
  private var modelApplication: RNModelApplication!
  private var loadedOnce = false
  
  /// Initialization function for ``ModelApplicationBridge``. Call once the React Native UI has been initialized.
  /// - Parameter webView: The `WKWebView` from the React Native UI.
  @objc public func startup(_ webView: WKWebView) {
    if #available(iOS 16.4, *) {
      webView.isInspectable = true
    }
    RNModelApplication.rnWebView = webView
    modelApplication = RNModelApplication()
    if !loadedOnce {
      loadedOnce = true
      Task { @MainActor in
        modelApplication.loadBackend(true)
        modelApplication.loadFrontend();
      }
    }
  }
}
