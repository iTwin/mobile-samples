/*---------------------------------------------------------------------------------------------
* Copyright (c) 2019 Bentley Systems, Incorporated. All rights reserved.
*--------------------------------------------------------------------------------------------*/
import { RpcInterfaceDefinition } from "@bentley/imodeljs-common";
import { MobileRpcManager } from "@bentley/mobile-manager/lib/MobileBackend";

/**
 * Initializes Mobile backend
 */
export default function initialize(rpcs: RpcInterfaceDefinition[]) {
  MobileRpcManager.initializeImpl(rpcs);
}
