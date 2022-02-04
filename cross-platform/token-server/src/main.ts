/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { config } from "dotenv-flow";
import * as dotenv_expand from "dotenv-expand";
import { CustomExpressServer } from "./CustomExpressServer";
import { ServiceAuthorizationClient } from "@itwin/service-authorization";

(async () => {
  const envResult = config();
  if (envResult.error) {
    throw envResult.error;
  }
  dotenv_expand(envResult);

  const clientId = process.env.ITM_TOKEN_SERVER_CLIENT_ID;
  const clientSecret = process.env.ITM_TOKEN_SERVER_CLIENT_SECRET;
  const auth0Domain = process.env.ITM_TOKEN_SERVER_AUTH0_DOMAIN;
  if (!clientId || !clientSecret || !auth0Domain) {
    throw new Error("ITM_TOKEN_SERVER_CLIENT_ID, ITM_TOKEN_SERVER_CLIENT_SECRET, and\nAUTH0_DOMAIN must be set in the environment!");
  }

  try {
    // Setup a client using the client credentials workflow.
    const authClient = new ServiceAuthorizationClient({
      clientId,
      clientSecret,
      scope: process.env.ITM_TOKEN_SERVER_SCOPE ?? "itwinjs imodelaccess:read realitydata:read imodels:read projects:read",
      authority: process.env.ITM_TOKEN_SERVER_AUTHORITY,
    }); 

    const server = new CustomExpressServer(authClient, auth0Domain);

    const port = process.env.ITM_TOKEN_SERVER_PORT ?? 3001;
    await server.initialize(port);
    console.log(`READY on port ${port}.`);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
})().catch((error) => {
  console.log(error.message);
});
