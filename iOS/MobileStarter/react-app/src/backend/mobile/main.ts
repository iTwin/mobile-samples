/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { RpcInterfaceDefinition } from "@bentley/imodeljs-common";
import { MobileRpcManager } from "@bentley/mobile-manager/lib/MobileBackend";

/**
 * Initializes Mobile backend
 */
export default function initialize(rpcs: RpcInterfaceDefinition[]) {
  MobileRpcManager.initializeImpl(rpcs);
}
