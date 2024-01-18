/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import Foundation
import Auth0
import JWTDecode
import ITwinMobile

enum Page {
    case login
    case model
}

class ViewModel: ObservableObject {
    @Published var application = AuthModelApplication()
    @Published var page = Page.login
    private var refreshTimer: Timer?
    private var loadingRefreshToken = false
    private var refreshToken: String? {
        didSet {
            saveRefreshToken()
        }
    }
    @Published var credentials: Credentials? {
        didSet {
            application.auth0Token = nil
            if let credentials = credentials {
                application.auth0Token = credentials.idToken
                if let authClient = application.authorizationClient as? TokenServerAuthClient {
                    authClient.auth0Token = credentials.idToken
                }
                page = .model
                if credentials.refreshToken != nil {
                    refreshToken = credentials.refreshToken
                }
                requestIDTokenRefresh()
            }
        }
    }
    // Note: the following has to be lazy due to clientId and domain not being accessible initially.
    private lazy var keychainHelper = ITMKeychainHelper(service: "ThirdPartyAuthRefreshToken", account: "\(clientId)@\(domain)")

    init() {
        // The following happens again once the ModelView's ITMViewController is initialized, but we need
        // it to be done before we have shown the model page for the first time, since we send a message
        // from this page if a user opens a BIM file using this app.
        ITMViewController.application = application
        loadRefreshToken()
        application.registerQueryHandler("goBack") {
            // Reset the ITMMessenger to the unlaunched state, since we will be redoing the launch
            // the next time we show the model page.
            self.application.itmMessenger.initFrontendLaunch()
            self.page = .login
        }
    }

    deinit {
        application.unregisterQueryHandler("goBack")
    }
    
    /// Attempt to load the refresh token from the iOS keychain.
    private func loadRefreshToken() {
        loadingRefreshToken = true
        refreshToken = keychainHelper.loadString()
        loadingRefreshToken = false
    }

    /// Save the refresh token to the iOS keychain (or delete it from the keychain if it is `nil`).
    private func saveRefreshToken() {
        if !loadingRefreshToken {
            if let refreshToken = refreshToken {
                keychainHelper.save(string: refreshToken)
            } else {
                keychainHelper.deleteData()
            }
        }
    }

    var clientId: String {
        get {
            application.configData?["ITMSAMPLE_AUTH0_CLIENT_ID"] as? String ?? "Unknown cliendId!"
        }
    }

    var domain: String {
        get {
            application.configData?["ITMSAMPLE_AUTH0_DOMAIN"] as? String ?? "Unknown domain!"
        }
    }

    var audience: String {
        get {
            application.configData?["ITMSAMPLE_AUTH0_AUDIENCE"] as? String ?? "Unknown audience!"
        }
    }

    var webAuth: WebAuth {
        Auth0.webAuth(clientId: clientId, domain: domain)
    }

    @MainActor
    func logOut() {
        if let refreshTimer = self.refreshTimer {
            self.refreshTimer = nil
            refreshTimer.invalidate()
        }
        refreshToken = nil
        if let authClient = application.authorizationClient as? TokenServerAuthClient {
            authClient.auth0Token = nil
        }
        application.auth0Token = nil
    }

    @MainActor
    func refreshIDToken(_ refreshToken: String, _ callback: @escaping LoginView.CredentialsCallback) {
        Auth0
            .authentication(clientId: clientId, domain: domain)
            .renew(withRefreshToken: refreshToken)
            .start(callback)
    }

    var idTokenExpiresAt: Date? {
        get {
            if let idToken = credentials?.idToken,
               let jwt = try? decode(jwt: idToken) {
                return jwt.expiresAt
            }
            return nil
        }
    }

    @MainActor
    func refresh(_ callback: @escaping LoginView.CredentialsCallback) {
        guard let refreshToken = refreshToken else {
            callback(.failure(ITMStringError(errorDescription: "No refresh token")))
            return
        }
        refreshIDToken(refreshToken, callback)
    }

    func requestIDTokenRefresh(_ minTimeInterval: TimeInterval = 0.0) {
        if let refreshToken = refreshToken,
           let expiresAt = idTokenExpiresAt {
            DispatchQueue.main.async {
                // Refresh 30 seconds before the ID token expires
                let timeInterval = max(expiresAt.timeIntervalSinceNow - 30.0, minTimeInterval)
                self.refreshTimer = Timer.scheduledTimer(withTimeInterval: timeInterval, repeats: false) { _ in
                    self.refreshTimer = nil
                    self.refreshIDToken(refreshToken) { result in
                        switch result {
                        case .success(let refreshCredentials):
                            if let idToken = refreshCredentials.idToken {
                                DispatchQueue.main.async { [self] in
                                    if refreshCredentials.refreshToken != nil {
                                        self.refreshToken = refreshCredentials.refreshToken
                                    }
                                    if let authClient = application.authorizationClient as? TokenServerAuthClient {
                                        authClient.auth0Token = idToken
                                    }
                                    // Note: The didSet on credentials triggers another call
                                    // to requestIDTokenRefresh so that the new one will also be
                                    // refreshed before it expires.
                                    credentials = refreshCredentials
                                }
                            }
                        case .failure:
                            // Try again in 5 seconds.
                            self.requestIDTokenRefresh(5.0)
                        }
                    }
                }
            }
        }
    }
}
