/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { BeUiEvent } from "@itwin/core-bentley";
import { OfflineMapRpcInterface } from "../common/OfflineMapRpcInterface";

export class OfflineMapPort {
  public static value: number | undefined;
  public static onChanged = new BeUiEvent<number | undefined>();

  public static initialize() {
    this.updatePort(); // eslint-disable-line @typescript-eslint/no-floating-promises
    // Since the MobileApp.onEnterForeground event does not work right now, we will instead
    // wait for the document's URL hash to change. This happens when iTwin reconnects to a
    // new port after returning to the foreground.
    window.addEventListener("hashchange", () => {
      setTimeout(async () => {
        await this.updatePort();
      }, 0);
    });
  }

  private static async updatePort() {
    const port = await OfflineMapRpcInterface.getClient().getPort();
    OfflineMapPort.value = port;
    OfflineMapPort.onChanged.raiseEvent(port);
    console.log(`Offline map port set to ${port}`);
  }
}
