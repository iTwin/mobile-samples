/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import Foundation
import IModelJsNative
import ITwinMobile
import SystemConfiguration

/// Custom subclass of the ModelApplication class. That class is shared by all the samples. This one takes care of the custom behavior
/// that is specific to this sample.
class AuthModelApplication: ModelApplication {
    var auth0Token: String?

    /// Check to see if the given URL is on the local network.
    /// - Parameter url: The URL to check.
    /// - Returns: `true` if URL is on the local network, or `false` otherwise.
    func isOnLocalNetwork(url: URL) -> Bool {
        guard let host = url.host, let reachability = SCNetworkReachabilityCreateWithName(nil, host) else {
            return false
        }
        var flags: SCNetworkReachabilityFlags = []
        if SCNetworkReachabilityGetFlags(reachability, &flags), flags.contains(.reachable) {
            // If the host is reachable, return to indicate whether or not it is a on the local
            // network.
            // Note: The isLocalAddress check means that this function will return false for
            //       localhost addresses.
            return flags.contains(.isDirect) && !flags.contains(.isLocalAddress)
        }
        return false
    }

    /// If the given URL is on a local network connection, send it an http GET request to force iOS to show the panel
    /// asking the user if it is ok to access the local network. The panel will only be shown once, but there is no easy
    /// way to find out if it has already been shown (and maybe no way at all).
    /// - Parameter tokenServerURL: String with token server URL
    func pingTokenServerIfLocal(_ tokenServerURL: String) {
        if let url = URL(string: tokenServerURL) {
            if isOnLocalNetwork(url: url) {
                Task {
                    let _ = try? await URLSession.shared.data(from: url)
                    // The only reason we're making this connection is to trigger the iOS
                    // permissions dialog requesting permission to access the local network.
                    // We will completely ignore the result. Either there is an error (which
                    // happens when the permissions dialog appears, or if the token server
                    // isn't running), or there is a response, but that response is that
                    // we are unauthorized, since we didn't include authorization in our
                    // URLRequest.
                }
            }
        }
    }

    /// Gets custom URL hash parameters to be passed when loading the frontend.
    /// This override adds `haveBackButton=true` to the list or params from super.
    /// - Returns: The hash params from super, with `haveBackButton=true` added.
    override func getUrlHashParams() -> HashParams {
        var hashParams = super.getUrlHashParams()
        hashParams.append(HashParam(name: "haveBackButton", value: true))
        return hashParams
    }

    /// Loads the app config JSON from the main bundle.
    /// This override pings the token server if it is a local URL in order to force iOS to ask the user if connecting
    /// to the local network is OK.
    /// - Returns: The result from super.
    override func loadITMAppConfig() -> JSON? {
        let configData = super.loadITMAppConfig() ?? JSON()
        if let tokenServerURL = configData["ITMSAMPLE_TOKEN_SERVER_URL"] as? String {
            pingTokenServerIfLocal(tokenServerURL)
        }
        return configData
    }

    /// Creates the `AuthorizationClient` to be used for this iTwin Mobile web app.
    /// - Returns: An instance of TokenServerAuthClient as long as `ITMSAMPLE_TOKEN_SERVER_URL` is present in
    /// `configData`.
    override func createAuthClient() -> AuthorizationClient? {
        if let configData = configData,
           let tokenServerURLString = configData["ITMSAMPLE_TOKEN_SERVER_URL"] as? String,
           let tokenServerURL = URL(string: tokenServerURLString) {
            return TokenServerAuthClient(itmApplication: self, tokenServerURL: tokenServerURL, auth0Token: auth0Token)
        }
        return super.createAuthClient()
    }
}
