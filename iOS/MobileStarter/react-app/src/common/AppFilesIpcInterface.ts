import { LocalBriefcaseProps } from "@bentley/imodeljs-common";

/*---------------------------------------------------------------------------------------------
* Copyright (c) 2019 Bentley Systems, Incorporated. All rights reserved.
*--------------------------------------------------------------------------------------------*/
export const appFilesChannel = "appFilesIpc";

export interface AppFilesIpcInterface {
  getLocalBriefcases: (iModelsDir: string) => Promise<LocalBriefcaseProps[]>;
  deleteBriefcase: (filePath: string) => Promise<void>;
  overrideNativeHostAppSettingsCacheDir: (dirName: string) => Promise<void>;
}
