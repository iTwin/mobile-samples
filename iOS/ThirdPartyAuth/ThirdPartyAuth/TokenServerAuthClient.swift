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
    /// - Note: When this value is changed, the iTwin backend is provided with a new token and
    /// expiration date (both possibly `nil`).
    public var auth0Token: String? {
        didSet {
            getAccessToken() { accessToken, expirationDate, error in
                self.raiseOnAccessTokenChanged(accessToken, expirationDate)
            }
        }
    }
    /// The URL of the token server.
    private let tokenServerURL: URL
    /// The `ITMApplication` of the active web app.
    private let itmApplication: ITMApplication

    /// Create a token server-based auth client
    /// - Parameters:
    ///   - itmApplication: The `ITMApplication` of the active web app.
    ///   - tokenServerURL: The URL of the token server.
    ///   - auth0Token: The Auth0 token used for authentication with the token server.
    init(itmApplication: ITMApplication, tokenServerURL: URL, auth0Token: String?) {
        self.itmApplication = itmApplication
        self.tokenServerURL = tokenServerURL
        // Note: Initialiazation of auth0Token below does NOT trigger its didSet.
        self.auth0Token = auth0Token
    }

    /// Get the access token and expiration date. This is an async wrapper around the `AuthorizationClient` protocol's
    /// completion-based `getAccessToken()` function.
    /// - Parameter auth0Token: The Auth0 token to use when communicating with the token server.
    /// - Returns: Tuple containing the access token and expiration date.
    /// - Throws: If token fetching fails, this throws an exception.
    private func getAccessToken(_ auth0Token: String) async throws -> (String, Date) {
        var request = URLRequest(url: tokenServerURL)
        request.httpMethod = "GET"
        request.setValue("Bearer \(auth0Token)", forHTTPHeaderField: "Authorization")
        let (data, _) = try await URLSession.shared.data(for: request)
        let token = String(decoding: data, as: UTF8.self)
        if let jwt = try? decode(jwt: token.components(separatedBy: " ")[1]),
           let expiresAt = jwt.expiresAt {
            return (token, expiresAt)
        }
        throw ITMStringError(errorDescription: "Token does not include an expiration date")
    }

    /// Main functionality from `AuthorizationClient`. Uses `completion` to communicate the result.
    /// - Parameter completion: The callback to call with the token result.
    public func getAccessToken(_ completion: @escaping GetAccessTokenCallback) {
        guard let auth0Token = auth0Token,
              itmApplication.itmMessenger.frontendLaunchDone else {
            completion(nil, nil, nil)
            return
        }
        Task {
            do {
                let (token, expiresAt) = try await getAccessToken(auth0Token)
                completion(token, expiresAt, nil)
            } catch {
                completion(nil, nil, error)
            }
        }
    }
}
