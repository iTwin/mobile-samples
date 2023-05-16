/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import Foundation
import WebKit
import ITwinMobile

class ModelApplicationBridge: NSObject {
  let modelApplication = ModelApplication()
  var loadedOnce = false

  @objc override init() {
    print("MobileInterface created")
  }
  
  @objc public func startup(_ webView: WKWebView) {
    print("startup \(webView)")
    if !loadedOnce {
      loadedOnce = true
      Task { @MainActor in
        modelApplication.loadBackend(true)
        modelApplication.loadFrontend();
      }
    }
  }
}
