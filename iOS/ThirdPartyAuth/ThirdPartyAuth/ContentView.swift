/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import SwiftUI

struct ContentView: View {
    @StateObject var viewModel = ViewModel()

    var body: some View {
        switch viewModel.page {
        case .login:
            LoginView(viewModel: viewModel) { result in
                DispatchQueue.main.async {
                    switch result {
                    case .success(let credentials):
                        viewModel.credentials = credentials
                    case .failure:
                        viewModel.credentials = nil
                    }
                }
            }
        case .model:
            ModelView(viewModel: viewModel)
        }
    }
}
