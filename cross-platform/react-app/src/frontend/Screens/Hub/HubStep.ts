/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/**
 * The hub screen's active step.
 *
 * Note: putting this in HubScreen.tsx leads to circular dependencies.
 */
export enum HubStep {
  SignIn,
  SelectProject,
  SelectIModel,
  DownloadIModel,
  Error
}
