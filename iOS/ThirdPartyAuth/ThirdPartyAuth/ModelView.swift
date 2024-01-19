/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import SwiftUI
import ITwinMobile

struct ModelView: View {
    var viewModel: ViewModel
    var body: some View {
        ITMSwiftUIContentView(application: viewModel.application)
            .edgesIgnoringSafeArea(.all)
            .onOpenURL() { url in
                DocumentHelper.openInboxURL(url)
            }
    }
}
