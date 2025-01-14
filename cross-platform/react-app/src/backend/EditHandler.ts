/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { Id64String } from "@itwin/core-bentley";
import { editChannel, EditInterface } from "../common/EditInterface";
import { BriefcaseDb, IModelDb, IpcHandler } from "@itwin/core-backend";

/**
 * Backend handler for the EditInterface.
 */
export class EditHandler extends IpcHandler implements EditInterface {
  public get channelName() { return editChannel; }

  public async editUserLabel(iModelKey: string, elementId: Id64String, userLabel: string) {
    const iModel = IModelDb.findByKey(iModelKey);
    if (!iModel) {
      throw new Error(`iModel with key ${iModelKey} not found.`);
    }
    if (!(iModel instanceof BriefcaseDb)) {
      throw new Error(`iModel with key ${iModelKey} is not a BriefcaseDb.`);
    }
    // Note: pushChanges() (called from fontend) will release all locks.
    await iModel.locks.acquireLocks({ exclusive: elementId });
    iModel.elements.updateElement({ id: elementId, userLabel });
    iModel.saveChanges(`Element ${elementId} User Label updated: ${userLabel}`);
  }

  public async hasPendingTxns(iModelKey: string) {
    const iModel = IModelDb.findByKey(iModelKey);
    if (!iModel) {
      throw new Error(`iModel with key ${iModelKey} not found.`);
    }
    if (!(iModel instanceof BriefcaseDb)) {
      throw new Error(`iModel with key ${iModelKey} is not a BriefcaseDb.`);
    }
    return iModel.txns.hasPendingTxns;
  }
}
