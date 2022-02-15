/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import Foundation
import Auth0
import PromiseKit
import JWTDecode

enum Page {
    case login
    case model
}

class ViewModel: ObservableObject {
    @Published var application = AuthModelApplication()
    @Published var page = Page.login
    private var refreshTimer: Timer?
    private var refreshToken: String?
    @Published var credentials: Credentials? {
        didSet {
            application.auth0Token = nil
            if let credentials = credentials {
                application.auth0Token = credentials.idToken
                page = .model
                if credentials.refreshToken != nil {
                    refreshToken = credentials.refreshToken
                }
                requestIDTokenRefresh()
            }
        }
    }
    
    init() {
        application.registerQueryHandler("goBack") { () -> Promise<()> in
            self.page = .login
            return Promise.value(())
        }
    }
    
    var clientId: String {
        get {
            application.configData!["ITMSAMPLE_AUTH0_CLIENT_ID"] as! String
        }
    }

    var domain: String {
        get {
            application.configData!["ITMSAMPLE_AUTH0_DOMAIN"] as! String
        }
    }

    var audience: String {
        get {
            application.configData!["ITMSAMPLE_AUTH0_AUDIENCE"] as! String
        }
    }
    
    var webAuth: WebAuth {
        Auth0.webAuth(clientId: clientId, domain: domain)
    }

    func refreshIDToken(_ refreshToken: String, _ callback: @escaping LoginView.CredentialsCallback) {
        Auth0
            .authentication(
                clientId: clientId,
                domain: domain
            )
            .renew(withRefreshToken: refreshToken)
            .start { result in
                switch result {
                case .success(let credentials):
                    callback(credentials, nil)
                case .failure(let error):
                    callback(nil, error)
                }
        }
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

    func requestIDTokenRefresh(_ minTimeInterval: TimeInterval = 0.0) {
        if let refreshToken = refreshToken,
           let expiresAt = idTokenExpiresAt {
            let formatter = DateFormatter()
            formatter.dateStyle = .medium
            formatter.timeStyle = .medium
            // Refresh 30 seconds before the ID token expires
            let timeInterval = max(expiresAt.timeIntervalSinceNow - 30.0, minTimeInterval)
            DispatchQueue.main.async {
                self.refreshTimer = Timer.scheduledTimer(withTimeInterval: timeInterval, repeats: false) { _ in
                    self.refreshIDToken(refreshToken) { refreshCredentials, refreshError in
                        if let refreshCredentials = refreshCredentials, let idToken = refreshCredentials.idToken {
                            DispatchQueue.main.async {
                                if refreshCredentials.refreshToken != nil {
                                    self.refreshToken = refreshCredentials.refreshToken
                                }
                                self.application.itmMessenger.query("setTokenServerToken", idToken)
                                self.credentials = refreshCredentials
                            }
                        } else if refreshError != nil {
                            self.requestIDTokenRefresh(5.0)
                        }
                    }
                }
            }
        }
    }
}
