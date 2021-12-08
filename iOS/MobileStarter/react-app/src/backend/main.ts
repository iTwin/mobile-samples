/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import * as path from "path";
import { Presentation, PresentationManagerMode } from "@itwin/presentation-backend";
import { LogFunction, Logger, LoggingMetaData, LogLevel } from "@itwin/core-bentley";
import { IOSHost, MobileHost, MobileHostOpts } from "@itwin/core-mobile/lib/cjs/MobileBackend";
import { getSupportedRpcs } from "../common/rpcs";
import { IModelHostConfiguration, IpcHost } from "@itwin/core-backend";
import { IModelHubBackend } from "@bentley/imodelhub-client/lib/cjs/imodelhub-node";

// This is the file that generates main.js, which is loaded by the backend into a Google V8 JavaScript
// engine instance that is running for node.js. This code runs when the iTwin Mobile backend is
// initialized from the native code.

export const qaIssuerUrl = "https://qa-ims.bentley.com/";
export const prodIssuerUrl = "https://ims.bentley.com/";

// tslint:disable-next-line:no-floating-promises
(async () => {
  // Initialize logging
  redirectLoggingToFrontend();
  Logger.setLevelDefault(LogLevel.Warning);

  const issuerUrl = process.env.ITMAPPLICATION_ISSUER_URL ?? prodIssuerUrl;
  const clientId = process.env.ITMAPPLICATION_CLIENT_ID ?? "<Error>";
  const redirectUri = process.env.ITMAPPLICATION_REDIRECT_URI ?? "imodeljs://app/signin-callback";
  const scope = process.env.ITMAPPLICATION_SCOPE ?? "email openid profile organization itwinjs";
  const iModelHost = new IModelHostConfiguration();
  iModelHost.hubAccess = new IModelHubBackend();
  // Initialize imodeljs-backend
  const options: MobileHostOpts = {
    iModelHost,
    mobileHost: {
      noInitializeAuthClient: true,
      authConfig: { issuerUrl, clientId, redirectUri, scope },
    },
  };
  await IOSHost.startup(options);
  setTimeout(() => {
    MobileHost.device.authInit({ issuerUrl, clientId, redirectUri, scope }, (err) => {
      if (err)
        console.log(`AuthInit ${err}`);
      // MobileHost.authorization.signIn();
    });
  }, 1000);

  const backendRoot = process.env.FIELDMODEL_BACKEND_ROOT;
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
