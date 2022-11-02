/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import IModelJsNative
import ITwinMobile
import JWTDecode

/// An ITMAuthorizationClient that communicates with a token server.
open class TokenServerAuthClient: NSObject, ITMAuthorizationClient {
    /// Instance for `onAccessTokenChanged` property from the `AuthorizationClient` protocol.
    public var onAccessTokenChanged: AccessTokenChangedCallback?
    /// Instance for `errorDomain` property from the `ITMAuthorizationClient` protocol.
    public let errorDomain = "com.bentley.sample.ThirdPartyAuth"
    /// The auth0 token used for authentication with the token server.
    private var auth0Token: String? = nil
    /// The URL of the token server
    private let tokenServerURL: URL
    /// The `ITMApplication` of the active web app.
    private let itmApplication: ITMApplication

    init?(itmApplication: ITMApplication, tokenServerURLString: String, auth0Token: String?) {
        guard let tokenServerURL = URL(string: tokenServerURLString) else {
            return nil
        }
        self.tokenServerURL = tokenServerURL
        self.auth0Token = auth0Token
        self.itmApplication = itmApplication
    }
    
    /// Updates the auth0 token and instructs the iTwin backend to flush its cached token.
    /// - Parameter value: The new value for the auth0 token used when communicating with the token server.
    public func setAuth0Token(_ value: String?) {
        auth0Token = value
        raiseOnAccessTokenChanged()
    }

    /// Main functionality from `AuthorizationClient`. Uses `completion` to communicate the result.
    /// - Parameter completion: The callback to call with the token result.
    public func getAccessToken(_ completion: @escaping GetAccessTokenCallback) {
        guard let auth0Token = auth0Token else {
            completion(nil, nil, nil)
            return
        }
        if !itmApplication.itmMessenger.frontendLaunchDone {
            completion(nil, nil, nil)
            return
        }
        Task {
            do {
                var request = URLRequest(url: tokenServerURL)
                request.httpMethod = "GET"
                request.setValue("Bearer \(auth0Token)", forHTTPHeaderField: "Authorization")
                let (data, _) = try await URLSession.shared.data(for: request)
                let token = String(decoding: data, as: UTF8.self)
                let expiresAt: Date?
                if let jwt = try? decode(jwt: token.components(separatedBy: " ")[1]) {
                    expiresAt = jwt.expiresAt
                } else {
                    expiresAt = nil
                }
                completion(token, expiresAt, nil)
            } catch {
                completion(nil, nil, error)
            }
        }
    }
}
