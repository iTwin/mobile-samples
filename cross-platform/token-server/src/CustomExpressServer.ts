/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import * as express from "express";
import * as jwt from "jsonwebtoken";
import axios from "axios";
import { Server as HttpServer } from "http";
import type { AccessToken } from "@itwin/core-bentley";
import type { AuthorizationClient } from "@itwin/core-common";

export class CustomExpressServer {
  protected _app: import("express").Application = express();
  private _publicKey: string | undefined;

  constructor(private _client: AuthorizationClient, private _auth0Domain: string) { }

  private async getJSON(url: string): Promise<any> {
    return (await axios.get(url)).data;
  }

  public async getPublicKey() {
    if (this._publicKey) {
      return this._publicKey;
    }
    const jsonData = await this.getJSON(`https://${this._auth0Domain}/.well-known/jwks.json`);
    const keys = jsonData.keys;
    if (Array.isArray(keys) && keys.length > 0) {
      const key = keys[0];
      const x5c = key.x5c;
      if (Array.isArray(x5c) && x5c.length > 0) {
        console.log("Successfully fetched public key from Auth0.");
        this._publicKey = `-----BEGIN CERTIFICATE-----\n${x5c[0]}\n-----END CERTIFICATE-----`;
        return this._publicKey;
      }
    }
    throw new Error("Error fetching public key.");
  }

  protected _configureHeaders() {
    // enable CORS for all apis
    this._app.all("/**", (_req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
      res.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With, X-Correlation-Id, X-Session-Id, X-Application-Id, X-Application-Version, X-User-Id, X-Protocol-Version"
      );
      next();
    });
  }

  protected _configureRoutes() {
    this._app.get("/getToken", async (req, res) => this._getToken(req, res));
  }

  /**
   * Configure the express application with necessary headers, routes, and middleware, then starts listening on the given port.
   * @param port The port to listen on
   */
  public async initialize(port: number | string): Promise<HttpServer> {
    this._configureHeaders();
    this._configureRoutes();

    this._app.set("port", port);
    return new Promise<HttpServer>((resolve) => {
      const server: HttpServer = this._app.listen(this._app.get("port"), () =>
        resolve(server)
      );
    });
  }

  private async _getToken(req: express.Request, res: express.Response) {
    try {
      const auth = req.header("Authorization");
      if (!auth) {
        console.log("Authorization missing.");
        res.sendStatus(401); // Unauthorized
        return;
      }
      const words = auth.split(" ");
      if (words.length < 2 || words[0] !== "Bearer") {
        console.log("Unsupported Authorization.");
        res.sendStatus(401); // Unauthorized
        return;
      }
      jwt.verify(words[1], await this.getPublicKey(), { algorithms: ['RS256'] }, async (error, decoded) => {
        if (error) {
          console.log(`Error verifying auth0 token:\n${error}`);
          res.sendStatus(403);
          return;
        }
        if (typeof decoded === "string") {
          console.log(`Auth0 token payload is string instead of object: ${decoded}`);
          res.sendStatus(403);
          return;
        }
        if (decoded === undefined) {
          console.log(`No payload in Auth0 token.`);
          res.sendStatus(403);
          return;
        }
        console.log(`Auth0 Profile: ${JSON.stringify(decoded, undefined, 2)}`);
        const exp = decoded.exp;
        if (exp === undefined) {
          console.log(`No expiration date in Auth0 token.`);
          res.sendStatus(403);
          return;
        }
        const expiresAt = new Date(exp * 1000);
        if (expiresAt < new Date()) {
          console.log(`Auth0 token expired on ${expiresAt.toLocaleString()}.`);
          res.sendStatus(403);
          return;
        }
        if (decoded.iss !== `https://${this._auth0Domain}/`) {
          console.log(`Invalid issuer of Auth0 token: ${decoded.iss}`);
          res.sendStatus(403);
          return;
        }
        console.log(`Valid Auth0 token found for user ${decoded.name}`);
        console.log(`It will expire at ${expiresAt.toLocaleString()}`);
        const token: AccessToken = await this._client.getAccessToken();
        res.send(token);
        console.log("Successful token response.\n\n\n");
      });
    } catch (err) {
      console.log(err);
      res.sendStatus(500);
    }
  }
}
