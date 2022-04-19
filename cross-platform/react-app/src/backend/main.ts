/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import * as path from "path";
import { Presentation, PresentationManagerMode } from "@itwin/presentation-backend";
import { LogFunction, Logger, LoggingMetaData, LogLevel } from "@itwin/core-bentley";
import { IOSHost, MobileHostOpts } from "@itwin/core-mobile/lib/cjs/MobileBackend";
import { getSupportedRpcs } from "../common/rpcs";
import { IModelHost, IModelHostConfiguration, IpcHost } from "@itwin/core-backend";
import { BackendIModelsAccess } from "@itwin/imodels-access-backend";
import { TokenServerAuthClient } from "../common/TokenServerAuthClient";
import { SamplesIpcHandler } from "./SamplesIpcHandler";

// This is the file that generates main.js, which is loaded by the backend into a Google V8 JavaScript
// engine instance that is running for node.js. This code runs when the iTwin Mobile backend is
// initialized from the native code.

export const qaIssuerUrl = "https://qa-ims.bentley.com/";
export const prodIssuerUrl = "https://ims.bentley.com/";

function setupForTokenServer(iModelHost: IModelHostConfiguration) {
  // Only try to set up to use the token server if we are running the ThirdPartyAuth sample app. That
  // way the same ITMApplication.xcconfig file can be used with all the samples, and the presence of
  // the ITMSAMPLE_TOKEN_SERVER_URL setting won't trigger a non-working attempt to use the token
  // server in the other samples.
  if (process.env.ITMSAMPLE_THIRD_PARTY_AUTH === "YES") {
    const tokenServerUrl = process.env.ITMSAMPLE_TOKEN_SERVER_URL;
    if (tokenServerUrl) {
      // We don't have an token to use with the token server because the backend is initialized before
      // the user signs in to auth0. The token will be sent later from the frontend using samplesIpcChannel.
      iModelHost.authorizationClient = new TokenServerAuthClient(tokenServerUrl);
      return true;
    } else {
      // The ThirdPartyAuth sample app automatically sets ITMSAMPLE_THIRD_PARTY_AUTH to "YES", but it won't
      // work properly if ITMSAMPLE_TOKEN_SERVER_URL isn't also configured.
      throw new Error("The ThirdPartyAuth sample requires the ITMSAMPLE_TOKEN_SERVER_URL environment variable to be set.");
    }
  }
  return false;
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
  // Initialize logging
  redirectLoggingToFrontend();
  Logger.setLevelDefault(LogLevel.Warning);

  const iModelHost = new IModelHostConfiguration();
  const haveTokenServer = setupForTokenServer(iModelHost);
  iModelHost.hubAccess = new BackendIModelsAccess();
  // Initialize imodeljs-backend
  const options: MobileHostOpts = {
    iModelHost,
  };
  if (!haveTokenServer) {
    const issuerUrl = process.env.ITMAPPLICATION_ISSUER_URL ?? prodIssuerUrl;
    const clientId = process.env.ITMAPPLICATION_CLIENT_ID ?? "<Error>";
    const redirectUri = process.env.ITMAPPLICATION_REDIRECT_URI ?? "imodeljs://app/signin-callback";
    const scope = process.env.ITMAPPLICATION_SCOPE ?? "email openid profile organization itwinjs";
    options.mobileHost = { authConfig: { issuerUrl, clientId, redirectUri, scope } };
  }
  await IOSHost.startup(options);
  if (haveTokenServer) {
    // Even though we don't use the mobile auth client, and asked for it not to be initialized, it
    // still got attached to IModelHost in IOSHost.startup. Replace it with our token server auth
    // client here.
    IModelHost.authorizationClient = iModelHost.authorizationClient;
  }

  const backendRoot = process.env.ITMAPPLICATION_BACKEND_ROOT;
  const assetsRoot = backendRoot ? path.join(backendRoot, "assets") : "assets";
  // Initialize presentation-backend
  Presentation.initialize({
    // Specify location of where application's presentation rule sets are located.
    // May be omitted if application doesn't have any presentation rules.
    rulesetDirectories: [path.join(assetsRoot, "presentation_rules")],
    localeDirectories: [path.join(assetsRoot, "locales")],
    supplementalRulesetDirectories: [path.join(assetsRoot, "supplemental_presentation_rules")],
    mode: PresentationManagerMode.ReadOnly,
  });
  // Invoke platform-specific initialization
  const init = (await import("./mobile/main")).default;
  // Get RPCs supported by this backend
  const rpcs = getSupportedRpcs();
  // Do initialize
  init(rpcs);
  // SamplesIpcHandler is currently only used by ThirdPartyAuthSample, but could in the future
  // be used by other samples for other purposes.
  SamplesIpcHandler.register();
})();

function redirectLoggingToFrontend(this: any): void {
  const getLogFunction = (level: LogLevel): LogFunction => {
    return (category: string, message: string, getMetaData?: LoggingMetaData): void => {
      let metaData = {};
      if (getMetaData) {
        // Sometimes getMetaData sent to this function is an Object instead of a GetMetaDataFunction.
        // The following code is a defensive workaround to stop getMetaData() raising an exception in above case.
        if (typeof getMetaData === "function") {
          try {
            metaData = getMetaData();
          } catch (_ex) {
            // NEEDS_WORK: Need to improve handling of exception and return data correctly.
          }
        } else {
          metaData = getMetaData;
        }
      }
      IpcHost.send("backend-log", { level, category, message, metaData });
    };
  };
  Logger.initialize(getLogFunction(LogLevel.Error), getLogFunction(LogLevel.Warning), getLogFunction(LogLevel.Info), getLogFunction(LogLevel.Trace));
}
