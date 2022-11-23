/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { BeUiEvent } from "@itwin/core-bentley";
import { NotificationHandler } from "@itwin/core-frontend";
import { offlineMapNotifications, OfflineMapNotifications, OfflineMapRpcInterface } from "../common/OfflineMap";

export class OfflineMapNotifyHandler extends NotificationHandler implements OfflineMapNotifications {
  public get channelName() { return offlineMapNotifications; }
  public static port: number | undefined;
  public static onPortChanged = new BeUiEvent<number | undefined>();

  constructor() {
    super();
    console.log("OfflineMapNotifyHandler constructor");
    this.initPort(); // eslint-disable-line @typescript-eslint/no-floating-promises
  }

  private async initPort() {
    this.notifyPort(await OfflineMapRpcInterface.getClient().getPort());
  }

  public notifyPort(port: number | undefined) {
    console.log(`Offline map port set to ${port}`);
    OfflineMapNotifyHandler.port = port;
    OfflineMapNotifyHandler.onPortChanged.raiseEvent(port);
  }
}
