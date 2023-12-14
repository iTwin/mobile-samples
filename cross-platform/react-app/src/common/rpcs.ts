/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { PresentationRpcInterface } from "@itwin/presentation-common";
import { IModelReadRpcInterface, IModelTileRpcInterface, RpcInterfaceDefinition, SnapshotIModelRpcInterface } from "@itwin/core-common";
import { LogLevel } from "@itwin/core-bentley";

/**
 * Returns a list of RPCs supported by this application. This particular list is probably a minimum
 * for a graphical app that supports opening local snapshot files.
 */
export function getSupportedRpcs(): RpcInterfaceDefinition[] {
  return [
    IModelReadRpcInterface,
    IModelTileRpcInterface,
    PresentationRpcInterface,
    SnapshotIModelRpcInterface,
  ];
}

/**
 * Type used for "backend-log" message from backend to frontend.
 */
export interface BackendLogParams {
  level: LogLevel;
  category: string;
  message: string;
  metaData?: object;
}
