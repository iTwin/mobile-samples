/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import * as http from "http";
import * as jwt from "jsonwebtoken";
import {
  AccessToken,
  AuthStatus,
  BeUiEvent,
  BentleyError,
} from "@itwin/core-bentley";
import { PromiseUtil } from "./PromiseUtil";
import { AuthorizationClient } from "@itwin/core-common";

export class TokenServerAuthClient implements AuthorizationClient {
  public readonly onAccessTokenChanged = new BeUiEvent<AccessToken>();
  protected _accessToken?: AccessToken;
  protected _expiresAt?: Date;

  constructor(protected _tokenServerUrl: string, protected _tokenServerIdToken: string) {
  }

  private async fetchAccessToken() {
    return new Promise<void>((resolve, reject) => {
      // NOTE: This has to run on the backend and the frontend. The http package does that.
      const request = http.request(this._tokenServerUrl, (response) => {
        let rawData = "";
        let rawError: Error | undefined;
        response.on("data", (data) => {
          rawData += data;
        });
        response.on("error", (error) => {
          rawError = error;
        });
        response.on("end", () => {
          if (response.statusCode !== 200) {
            reject(new Error(`Error fetching public key: ${response.statusCode}: ${response.statusMessage}`));
          }
          else if (rawError) {
            reject(rawError);
          }
          else {
            this._accessToken = rawData;
            const tokenJson = jwt.decode(this._accessToken.split(" ")[1]);
            if (typeof tokenJson === "object" && tokenJson?.exp) {
              this._expiresAt = new Date(tokenJson.exp * 1000);
              console.log(`Fetched access token will expire at ${this._expiresAt.toLocaleString()}`);
            } else {
              this._expiresAt = undefined;
            }
            this.onAccessTokenChanged.emit(this._accessToken);
            resolve();
          }
        });
      });
      request.setHeader("Authorization", `Bearer ${this._tokenServerIdToken}`);
      request.end();
    });
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

  public async getAccessToken(): Promise<AccessToken> {
    try {
      if (this.needsAccessToken()) {
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
