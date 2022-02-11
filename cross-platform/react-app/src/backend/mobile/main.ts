/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { RpcInterfaceDefinition } from "@itwin/core-common";
import { MobileRpcManager } from "@itwin/core-mobile/lib/cjs/MobileBackend";

/**
 * Initializes Mobile backend
 */
export default function initialize(rpcs: RpcInterfaceDefinition[]) {
  MobileRpcManager.initializeImpl(rpcs);
}