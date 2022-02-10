/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import SwiftUI
import ITwinMobile

struct ModelView: View {
    var viewModel: ViewModel
    // ToDo: The onOpenURL below will only work if the user is already signed in with
    // this ModelView as the current page. Ideally it would handle things correctly if
    // the app were launched with a URL.
    var body: some View {
        ITMSwiftUIContentView(application: viewModel.application)
            .edgesIgnoringSafeArea(.all)
            .onOpenURL() { url in
                DocumentHelper.openInboxUrl(url)
            }
    }
}
