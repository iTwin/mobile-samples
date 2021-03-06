/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import SwiftUI
import ITwinMobile

@main
struct SwiftUIStarterApp: App {
    private var application = ModelApplication()
    
    var body: some Scene {
        return WindowGroup {
            ITMSwiftUIContentView(application: application)
                .edgesIgnoringSafeArea(.all)
                .onOpenURL() { url in
                    DocumentHelper.openInboxUrl(url)
                }
        }
    }
}
