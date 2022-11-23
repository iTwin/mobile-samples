/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { RpcInterface, RpcManager } from "@itwin/core-common";

export abstract class OfflineMapRpcInterface extends RpcInterface {
  public static readonly interfaceName = "OfflineMapInterface";
  public static interfaceVersion = "1.0.0";

  public static getClient(): OfflineMapRpcInterface {
    return RpcManager.getClientForInterface(OfflineMapRpcInterface);
  }

  public async startServer(): Promise<number> {
    return this.forward(arguments);
  }

  public async stopServer(): Promise<void> {
    return this.forward(arguments);
  }

  public async getPort(): Promise<number | undefined> {
    return this.forward(arguments);
  }
}
