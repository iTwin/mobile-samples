/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import SwiftUI
import Auth0

struct LoginView: View {
    @ObservedObject var viewModel: ViewModel
    typealias CredentialsCallback = (_ credentials: Credentials?, _ error: Error?) -> ()
    var callback: CredentialsCallback
    @State private var showingAlert = false
    @State private var alertTitle = ""
    @State private var alertMessage: String?
    @State private var busy = false

    var body: some View {
        VStack(spacing: 24) {
            if busy {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: Color.accentColor))
                    .scaleEffect(2.0, anchor: .center)
            } else {
                Button(action: {
                    busy = true
                    return viewModel
                        .webAuth
                        .scope("openid profile offline_access")
                        .audience(viewModel.audience)
                        .start { result in
                            busy = false
                            switch result {
                            case .success(let credentials):
                                callback(credentials, nil)
                            case .failure(let error):
                                callback(nil, error)
                                alertTitle = String(localized: "Log in Error")
                                if let localError = error as? LocalizedError, let errorDescription = localError.errorDescription {
                                    alertMessage = "\(errorDescription)"
                                } else if let webAuthError = error as? WebAuthError, let errorDescription = webAuthError.errorUserInfo[NSLocalizedDescriptionKey] {
                                    alertMessage = "\(errorDescription)"
                                } else {
                                    alertMessage = "\(error)"
                                }
                                showingAlert = true
                            }
                        }
                }, label: {
                    Label {
                        Text("Log in")
                            .font(.system(size: 24, weight: .regular))
                    } icon: {
                        Image(systemName: "person")
                            .font(.system(size: 24, weight: .regular))
                    }
                })
                Button {
                    busy = true
                    viewModel
                        .webAuth
                        .clearSession(federated: false) { result in
                            busy = false
                        }
                } label: {
                    Label {
                        Text("Log out")
                            .font(.system(size: 24, weight: .regular))
                    } icon: {
                        Image(systemName: "person.fill.xmark")
                            .font(.system(size: 24, weight: .regular))
                    }
                }
            }
        }
        .padding()
        .alert(isPresented: $showingAlert) {
            Alert(title: Text(alertTitle), message: alertMessage != nil ? Text(alertMessage!) : nil)
        }    }
}
