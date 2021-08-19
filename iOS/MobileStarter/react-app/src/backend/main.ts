/*---------------------------------------------------------------------------------------------
* Copyright (c) 2019 Bentley Systems, Incorporated. All rights reserved.
*--------------------------------------------------------------------------------------------*/
import * as path from "path";
import { Presentation, PresentationManagerMode } from "@bentley/presentation-backend";
import { GetMetaDataFunction, LogFunction, Logger, LogLevel } from "@bentley/bentleyjs-core";
import { IOSHost, MobileHostOpts } from "@bentley/mobile-manager/lib/MobileBackend";
import { RpcInterfaceDefinition } from "@bentley/imodeljs-common";
import { getSupportedRpcs } from "../common/rpcs";
import setupEnv from "../common/configuration";
import { IpcHost } from "@bentley/imodeljs-backend";
import { AppFilesHandler } from "./AppFilesHandler";

export const qaIssuerUrl = "https://qa-ims.bentley.com/";
// export const qaIssuerUrl = "https://qa-imsoidc.bentley.com/";
export const prodIssuerUrl = "https://ims.bentley.com/";
// export const prodIssuerUrl = "https://imsoidc.bentley.com/";

// tslint:disable-next-line:no-floating-promises
(async () => {
  // setup environment
  setupEnv();

  // initialize logging
  redirectLoggingToFrontend();
  Logger.setLevelDefault(LogLevel.Warning);

  // initialize imodeljs-backend
  const options: MobileHostOpts = {
    mobileHost: {
      noInitializeAuthClient: true,
      authConfig: { issuerUrl: prodIssuerUrl, clientId: "<Client ID goes here>", redirectUri: "imodeljs://app/signin-callback", scope: "email openid profile organization itwinjs" },
      },
    };
  await IOSHost.startup(options);

  const backendRoot = process.env.FIELDMODEL_BACKEND_ROOT;
  const assetsRoot = backendRoot ? path.join(backendRoot, "assets") : "assets";
  // initialize presentation-backend
  Presentation.initialize({
    // Specify location of where application's presentation rule sets are located.
    // May be omitted if application doesn't have any presentation rules.
    rulesetDirectories: [path.join(assetsRoot, "presentation_rules")],
    localeDirectories: [path.join(assetsRoot, "locales")],
    supplementalRulesetDirectories: [path.join(assetsRoot, "supplemental_presentation_rules")],
    mode: PresentationManagerMode.ReadOnly,
  });
  // invoke platform-specific initialization
  // get platform-specific initialization function
  let init: (rpcs: RpcInterfaceDefinition[]) => void;
  // if (electron) {
  //   init = (await import("./electron/main")).default;
  // } else if (MobileRpcConfiguration.isMobileBackend) {
  init = (await import("./mobile/main")).default;
  // } else {
  //   init = (await import("./web/BackendServer")).default;
  // }
  // get RPCs supported by this backend
  const rpcs = getSupportedRpcs();
  // do initialize
  init(rpcs);

  AppFilesHandler.register();
})();

function redirectLoggingToFrontend(this: any): void {
  const getLogFunction = (level: LogLevel): LogFunction => {
    return (category: string, message: string, getMetaData?: GetMetaDataFunction): void => {
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
