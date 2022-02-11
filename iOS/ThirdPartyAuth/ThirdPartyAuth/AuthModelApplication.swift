/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import Foundation
import ITwinMobile
import SystemConfiguration

/// Custom subclass of the ModelApplication class. That class is shared by all the samples. This one takes care of the custom behavior
/// that is specific to this sample.
class AuthModelApplication: ModelApplication {
    var auth0Token: String?
    
    /// Check to see if the given URL is on the local network.
    /// - Parameter url: The URL to check
    /// - Returns: true if URL is on the local network, or false otherwise
    func isURLLocal(_ url: URL) -> Bool {
        if let host = url.host {
            // We need to use SCNetworkReachabilityGetFlags to determined if the given URL is on
            // the local network. Unfortunately, in order to do that, we need to create a reachability
            // object, and to do that we need a sockaddr. Most of this function is dedicated to
            // converting the URL into a sockaddr.
            var addrinfoList: UnsafeMutablePointer<addrinfo>?
            var hints = addrinfo()
            hints.ai_socktype = SOCK_STREAM
            hints.ai_protocol = IPPROTO_TCP
            let portString: String
            if let port = url.port {
                portString = "\(port)"
            } else if url.scheme == "http" {
                portString = "80"
            } else if url.scheme == "https" {
                portString = "443"
            } else {
                portString = "0"
            }
            // Note: getaddrinfo allocates addrinfoList, which must then be freed using freeaddrinfo.
            getaddrinfo(host, portString, &hints, &addrinfoList)
            defer {
                // No matter what code path we take, make sure that addrinfoList gets freed.
                freeaddrinfo(addrinfoList)
            }
            guard let firstAddress = addrinfoList else {
                return false
            }
            // addrinfoList is a linked list of addrinfo values. Iterate through that list. There
            // could be multiple entries if (for example) the device is on a network that supports
            // both IPV4 and IPV6. Some of the entires might fail, so keep checking until we find
            // one that is reachable.
            for infoPointer in sequence(first: firstAddress, next: { $0.pointee.ai_next }) {
                if let reachability = withUnsafePointer(to: &infoPointer.pointee.ai_addr.pointee, {
                    $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                        SCNetworkReachabilityCreateWithAddress(nil, UnsafePointer($0))
                    }
                }) {
                    var flags: SCNetworkReachabilityFlags = []
                    if SCNetworkReachabilityGetFlags(reachability, &flags), flags.contains(.reachable) {
                        // If we find a single reachable destination in the list, return to indicate whether
                        // or not it is a on the local network.
                        return flags.contains(.isDirect)
                    }
                }
            }
        }
        return false
    }

    /// If the given URL is on a local network connection, send it an http GET request to force iOS to show the panel
    /// asking the user if it is ok to access the local network. The panel will only be shown once, but there is no easy
    /// way to find out if it has already been shown (and maybe no way at all).
    /// - Parameter tokenServerUrl: String with token server URL
    func pingTokenServerIfLocal(_ tokenServerUrl: String) {
        if let url = URL(string: tokenServerUrl) {
            if isURLLocal(url) {
                var request = URLRequest(url: url)
                request.httpMethod = "GET"
                let session = URLSession(configuration: URLSessionConfiguration.default)
                let task = session.dataTask(with: request) { (_, _, _) in
                    // The only reason we're making this connection is to trigger the iOS
                    // permissions dialog requesting permission to access the local network.
                    // We will completely ignore the result. Either there is an error (which
                    // happens when the permissions dialog appears, or if the token server
                    // isn't running), or there is a response, but that response is that
                    // we are unauthorized, since we didn't include authorization in our
                    // URLRequest.
                }
                task.resume()
            }
        }
    }

    override func getUrlHashParams() -> HashParams {
        var hashParams = super.getUrlHashParams()
        if let configData = configData {
            if let tokenServerUrl = configData["ITMSAMPLE_TOKEN_SERVER_URL"] as? String,
               let tokenServerIdToken = auth0Token {
                hashParams.append(HashParam(name: "tokenServerUrl", value: tokenServerUrl))
                hashParams.append(HashParam(name: "tokenServerIdToken", value: tokenServerIdToken))
                hashParams.append(HashParam(name: "haveBackButton", value: true))
                hashParams.append(HashParam(name: "thirdPartyAuth", value: true))
            }
        }
        return hashParams
    }

    override func loadITMAppConfig() -> JSON? {
        var configData = super.loadITMAppConfig() ?? JSON()
        // Add ITMSAMPLE_THIRD_PARTY_AUTH to configData with value of YES so that it will get
        // into the environment used by the backend.
        configData["ITMSAMPLE_THIRD_PARTY_AUTH"] = "YES"
        if let tokenServerUrl = configData["ITMSAMPLE_TOKEN_SERVER_URL"] as? String {
            pingTokenServerIfLocal(tokenServerUrl)
        }
        return configData
    }
}
