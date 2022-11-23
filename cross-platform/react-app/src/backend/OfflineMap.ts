/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { RpcInterface, RpcManager } from "@itwin/core-common";
import { OfflineMapRpcInterface } from "../common/OfflineMap";
import { getOfflineMapServerPort, startOfflineMapServer, stopOfflineMapServer } from "@itwin/offline-map";

export class OfflineMapRpcImpl extends RpcInterface implements OfflineMapRpcInterface {
  public static register() {
    RpcManager.registerImpl(OfflineMapRpcInterface, OfflineMapRpcImpl);
  }
  public async startServer(): Promise<number> {
    return startOfflineMapServer();
  }

  public async stopServer(): Promise<void> {
    return stopOfflineMapServer();
  }

  public async getPort(): Promise<number | undefined> {
    return getOfflineMapServerPort();
  }
}
