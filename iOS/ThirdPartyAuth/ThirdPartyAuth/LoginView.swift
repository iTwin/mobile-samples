/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import SwiftUI
import Auth0

struct LoginView: View {
    @ObservedObject var viewModel: ViewModel
    typealias CredentialsCallback = (Result<Credentials>) -> Void
    var callback: CredentialsCallback
    @State private var showingAlert = false
    @State private var alertTitle = ""
    @State private var alertMessage: String?
    @State private var busy = false
    @State private var urlToOpen: URL?
    @Environment(\.scenePhase) private var scenePhase
    
    /// Log into Auth0.
    func logIn() {
        viewModel
            .webAuth
            .scope("openid profile offline_access")
            .audience(viewModel.audience)
            .start { result in
                busy = false
                callback(result)
                switch result {
                case .success: break // Nothing more to do for success
                case .failure(let error):
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
    }
    
    /// Get an Auth0 token, either by using a stored refresh token or logging in.
    func logInAction() {
        busy = true
        // Attempt to refresh our access token using a stored refresh token.
        viewModel.refresh { result in
            switch result {
            case .success(let credentials):
                callback(.success(credentials))
            case .failure:
                // The refresh attempt failed, so do a full log in.
                logIn()
            }
        }
    }

    var body: some View {
        VStack(spacing: 24) {
            if busy {
                ProgressView()
                    .progressViewStyle(CircularProgressViewStyle(tint: Color.accentColor))
                    .scaleEffect(2.0, anchor: .center)
            } else {
                Button(action: logInAction) {
                    Label {
                        Text("Log in")
                            .font(.system(size: 24, weight: .regular))
                    } icon: {
                        Image(systemName: "person")
                            .font(.system(size: 24, weight: .regular))
                    }
                }
                Button {
                    busy = true
                    viewModel
                        .webAuth
                        .clearSession(federated: false) { _ in
                            busy = false
                        }
                    viewModel.logOut()
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
        }
        .onOpenURL() { url in
            // We get this callback BEFORE the application returns to the active state, so record
            // the requested URL to let us know to log in and open it the next time we return to the
            // active state.
            urlToOpen = url
        }
        .onChange(of: scenePhase) { newValue in
            if newValue == .active, let url = urlToOpen {
                urlToOpen = nil
                logInAction()
                // Note: It's not obvious, but the order of events here means that if the file doesn't
                // already exist in our Documents folder, and the user isn't logged in, the below call
                // will fully complete before the user logs in. That doesn't matter because the message
                // that the below ends up sending to the frontend will wait for the frontend to fully
                // launch before being sent. (All messages to the frontend wait for it to fully launch.)
                DocumentHelper.openInboxURL(url)
            }
        }
    }
}
