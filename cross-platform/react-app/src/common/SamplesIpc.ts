/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
export const samplesIpcChannel = "iTwinMobileSamplesIpc";

/**
 * IPC interface for [[samplesIpcChannel]], implemented by [[SamplesIpcHandler]].
 */
export interface SamplesIpc {
  setTokenServerToken: (token: string) => Promise<void>;
}
