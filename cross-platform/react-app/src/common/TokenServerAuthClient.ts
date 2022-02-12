/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import axios from "axios";
import * as jwt from "jsonwebtoken";
import {
  AccessToken,
  AuthStatus,
  BentleyError,
} from "@itwin/core-bentley";
import { PromiseUtil } from "./PromiseUtil";
import { AuthorizationClient } from "@itwin/core-common";

/**
 * AuthorizationClient implementation that communicates with a sample token server. This
 * uses a local ID token as the authorization in the request it makes to the token server.
 * 
 * Note: This class is instantiated in both the frontend and the backend.
 */
export class TokenServerAuthClient implements AuthorizationClient {
  private _accessToken?: AccessToken;
  private _expiresAt?: Date;
  private _tokenServerIdToken?: string;

  /// The ID token to use when communicating with the token server. This token must NOT include
  /// a "Bearer " prefix. Any time this is undefined, getAccessToken will return an empty string.
  public get tokenServerIdToken() { return this._tokenServerIdToken; }
  public set tokenServerIdToken(token: string | undefined) {
    this._tokenServerIdToken = token;
    this._accessToken = undefined;
    this._expiresAt = undefined;
  }
  /**
   * Constructor.
   * @param _tokenServerUrl The URL of the token server.
   * @param token The token to use for authorization when communicating with the token server.
   */
  constructor(private _tokenServerUrl: string, token: string | undefined = undefined) {
    this._tokenServerIdToken = token;
  }

  private async fetchAccessToken() {
    const response = await axios.get(this._tokenServerUrl, {
      headers: {
        "Authorization": `Bearer ${this.tokenServerIdToken}`
      },
    });
    this._accessToken = response.data;
    this._expiresAt = undefined;
    if (this._accessToken) {
      const tokenJson = jwt.decode(this._accessToken.split(" ")[1]);
      if (typeof tokenJson === "object" && tokenJson?.exp)
        this._expiresAt = new Date(tokenJson.exp * 1000);
    }
  }

  private needsAccessToken() {
    if (!this._accessToken || !this._expiresAt) {
      return true;
    }
    // Note: The ServiceAuthorizationClient class used by the token server uses a
    // calculation like the one below but with 60 seconds. It does us no good to ask
    // for a new token before that, because it will just return the same token. So
    // use 59 seconds instead of 60 to guarantee that we will actually get a new token
    // when we ask for one.
    return this._expiresAt.getTime() - Date.now() <= 1 * 59 * 1000; // Consider 59 seconds before expiry as expired
  }

  /**
   * Returns an access token from the token server.
   * 
   * Note: Once a token is fetched from the token server, that token will be returned
   * repeatedly as long as it isn't due to expire for at least 59 seconds. When it is due
   * to expire, a new token will be fetched. The 59 second figure was chosen due to the
   * implementation details of the way the token server works. Until the token is within
   * 1 minute of expiring, it will always return the same token, so asking for a new one
   * doesn't do any good.
   * @returns The access token from the token server.
   */
  public async getAccessToken(): Promise<AccessToken> {
    try {
      if (this.needsAccessToken() && this.tokenServerIdToken) {
        await PromiseUtil.consolidateCall("TokenServerAuthClient.fetchAccessToken", () => this.fetchAccessToken());
      }
      if (!this._accessToken) {
        throw new BentleyError(AuthStatus.Error, "Cannot get access token");
      }
      return this._accessToken;
    } catch (error) {
      console.error(`Error getting token server access token: ${error}`);
      return "";
    }
  }
}
