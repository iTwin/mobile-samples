/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import Foundation
import ITwinMobile

/// Custom subclass of the ModelApplication class. That class is shared by all the samples. This one takes care of the custom behavior
/// that is specific to this sample.
class AuthModelApplication: ModelApplication {
    var auth0Token: String?

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
        return configData
    }
}
