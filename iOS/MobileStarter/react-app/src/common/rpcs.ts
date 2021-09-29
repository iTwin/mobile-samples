/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { PresentationRpcInterface } from "@bentley/presentation-common";
import {
  IModelReadRpcInterface,
  IModelTileRpcInterface,
  RpcInterfaceDefinition,
  SnapshotIModelRpcInterface,
} from "@bentley/imodeljs-common";

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
