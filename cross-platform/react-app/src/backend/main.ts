/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import * as path from "path";
import { Presentation } from "@itwin/presentation-backend";
import { LogFunction, Logger, LoggingMetaData, LogLevel } from "@itwin/core-bentley";
import { MobileHost, MobileHostOpts } from "@itwin/core-mobile/lib/cjs/MobileBackend";
import { BackendLogParams, getSupportedRpcs } from "../common/rpcs";
import { IModelHostConfiguration, IpcHost } from "@itwin/core-backend";
import { BackendIModelsAccess } from "@itwin/imodels-access-backend";
import { EditHandler } from "./EditHandler";

// This is the file that generates main.js, which is loaded by the backend into a Google V8 JavaScript
// engine instance that is running for node.js. This code runs when the iTwin Mobile backend is
// initialized from the native code.

const logQueue: BackendLogParams[] = [];
let frontendListening = false;

void (async () => {
  // Initialize logging
  redirectLoggingToFrontend();
  Logger.setLevelDefault(LogLevel.Warning);

  const iModelHost = new IModelHostConfiguration();
  const baseUrl = `https://${process.env.ITMAPPLICATION_API_PREFIX ?? ""}api.bentley.com/imodels`;
  // eslint-disable-next-line @itwin/no-internal
  iModelHost.hubAccess = new BackendIModelsAccess({ api: { baseUrl } });
  // Get RPCs supported by this backend
  const rpcs = getSupportedRpcs();
  // Initialize imodeljs-backend
  const options: MobileHostOpts = {
    iModelHost,
    mobileHost: {
      rpcInterfaces: rpcs,
    },
  };
  await MobileHost.startup(options);

  const backendRoot = path.dirname(process.mainModule?.filename ?? "");
  const assetsRoot = backendRoot ? path.join(backendRoot, "assets") : "assets";
  // Initialize presentation-backend
  Presentation.initialize({
    // Specify location of where application's presentation rule sets are located.
    // May be omitted if application doesn't have any presentation rules.
    rulesetDirectories: [path.join(assetsRoot, "presentation_rules")],
    supplementalRulesetDirectories: [path.join(assetsRoot, "supplemental_presentation_rules")],
  });
  IpcHost.addListener("frontend-listening", () => {
    frontendListening = true;
  });
  MobileHost.onConnected.addListener(() => {
    setTimeout(() => {
      processLogQueue();
    }, 10);
  });
  EditHandler.register();
})();

function processLogQueue() {
  if (!frontendListening && logQueue.length > 0) {
    setTimeout(() => {
      processLogQueue();
    }, 100);
    return;
  }
  while (logQueue.length > 0) {
    const params = logQueue.shift();
    if (params === undefined) {
      break;
    }
    try {
      // NOTE: Until iTwin 4.4 is released, the following will CRASH the app instead of throwing an
      // exception if the backend is not connected to the frontend. Unfortunately, there is also no
      // way to know if the connection is alive.
      IpcHost.send("backend-log", params);
    } catch {
      logQueue.unshift(params);
      break;
    }
  }
}

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
          } catch {
            // NEEDS_WORK: Need to improve handling of exception and return data correctly.
          }
        } else {
          metaData = getMetaData;
        }
      }
      logQueue.push({ level, category, message, metaData });
      processLogQueue();
    };
  };
  Logger.initialize(getLogFunction(LogLevel.Error), getLogFunction(LogLevel.Warning), getLogFunction(LogLevel.Info), getLogFunction(LogLevel.Trace));
}
