/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { Id64String } from "@itwin/core-bentley";

export const editChannel = "itwin-mobile-sample-editIpc";

/**
 * Interface for editing elements in an iModel.
 */
export interface EditInterface {
  /**
   * Update the userLabel value on the specified element
   * @param key The key of the already-open iModel.
   * @param elementId The id of the element to update.
   * @param userLabel The new user label value.
   */
  editUserLabel: (iModelKey: string, elementId: Id64String, userLabel: string) => Promise<void>;

  /**
   * Check if the given iModel has pending transactions waiting to be pushed.
   * @param key The key of the already-open iModel.
   * @returns A promise that resolves to true if there are pending transactions, false otherwise.
   */
  hasPendingTxns: (iModelKey: string) => Promise<boolean>;
}
