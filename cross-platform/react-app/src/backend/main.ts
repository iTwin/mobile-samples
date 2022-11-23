/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import * as path from "path";
import { Presentation, PresentationManagerMode } from "@itwin/presentation-backend";
import { LogFunction, Logger, LoggingMetaData, LogLevel } from "@itwin/core-bentley";
import { MobileHost, MobileHostOpts } from "@itwin/core-mobile/lib/cjs/MobileBackend";
import { getSupportedRpcs } from "../common/rpcs";
import { IModelHostConfiguration, IpcHost } from "@itwin/core-backend";
import { BackendIModelsAccess } from "@itwin/imodels-access-backend";
import { OfflineMap, OfflineMapRpcImpl } from "./OfflineMap";
import { startOfflineMapServer, stopOfflineMapServer } from "@itwin/offline-map";

// This is the file that generates main.js, which is loaded by the backend into a Google V8 JavaScript
// engine instance that is running for node.js. This code runs when the iTwin Mobile backend is
// initialized from the native code.

export const qaIssuerUrl = "https://qa-ims.bentley.com/";
export const prodIssuerUrl = "https://ims.bentley.com/";

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
  // Initialize logging
  redirectLoggingToFrontend();
  Logger.setLevelDefault(LogLevel.Warning);

  const iModelHost = new IModelHostConfiguration();
  iModelHost.hubAccess = new BackendIModelsAccess();
  // Initialize imodeljs-backend
  const options: MobileHostOpts = {
    iModelHost,
  };
  await MobileHost.startup(options);

  const backendRoot = path.dirname(process.mainModule!.filename);
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
  OfflineMapRpcImpl.register();
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  startOfflineMapServer();
  MobileHost.onEnterBackground.addListener(() => {
    stopOfflineMapServer();
    // The following message doesn't actually make it through. I believe that this code
    // executes after the connection between the frontend and the backend has already
    // closed due to the app entering the backend.
    OfflineMap.notifyFrontend("notifyPort", undefined);
  });
  MobileHost.onEnterForeground.addListener(async () => {
    // This listener gets called before the frontend has been reconnected to the backend
    // after the app has entered the foreground. Because of that, any message sent to
    // the frontend will not be received. For now, waiting for 1000ms before sending
    // the message gives the frontend time to reconnect to the backend.
    setTimeout(async () => {
      const port = await startOfflineMapServer();
      OfflineMap.notifyFrontend("notifyPort", port);
    }, 1000);
  });
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
