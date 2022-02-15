/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import { IModelHost, IpcHandler } from "@itwin/core-backend";
import { SamplesIpc, samplesIpcChannel } from "../common/SamplesIpc";
import { TokenServerAuthClient } from "../common/TokenServerAuthClient";

/**
 * Backend handler for dealing with communication from the frontend to the backend.
 */
export class SamplesIpcHandler extends IpcHandler implements SamplesIpc {
  public get channelName() { return samplesIpcChannel; }

  /**
   * Only used by ThirdPartyAuthSample. Updates the token on the backend that is used to communicate
   * with the token server.
   * @param token The new token to use when communicating with the token server.
   */
  public async setTokenServerToken(token: string) {
    if (IModelHost.authorizationClient instanceof TokenServerAuthClient) {
      IModelHost.authorizationClient.tokenServerIdToken = token;
    }
  }
}
