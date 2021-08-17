/*---------------------------------------------------------------------------------------------
* Copyright (c) 2019 Bentley Systems, Incorporated. All rights reserved.
*--------------------------------------------------------------------------------------------*/
import { IModelStatus, OpenMode } from "@bentley/bentleyjs-core";
import { BriefcaseManager, IModelDb, IModelHost, IModelJsFs, IpcHandler, NativeHost } from "@bentley/imodeljs-backend";
import { IModelError, LocalBriefcaseProps } from "@bentley/imodeljs-common";
import { appFilesChannel, AppFilesIpcInterface } from "../common/AppFilesIpcInterface";
import * as path from "path";

export class AppFilesHandler extends IpcHandler implements AppFilesIpcInterface {

  public get channelName() { return appFilesChannel; }

  public async getLocalBriefcases(iModelsDir: string) {
    try {
      if (!IModelJsFs.existsSync(iModelsDir) || !IModelJsFs.lstatSync(iModelsDir)?.isDirectory)
        return [];
    } catch (err) {
      return [];
    }

    const briefcaseList: LocalBriefcaseProps[] = [];
    const iModelDirs = IModelJsFs.readdirSync(iModelsDir);
    for (const iModelDir of iModelDirs) {
      const fileName = path.join(iModelsDir, iModelDir, "bc.bim");
      try {
        if (IModelJsFs.existsSync(fileName) && !IModelJsFs.lstatSync(fileName)?.isDirectory) {
          const fileSize = IModelJsFs.lstatSync(fileName)?.size ?? 0;
          const db = IModelDb.openDgnDb({ path: fileName }, OpenMode.Readonly);
          briefcaseList.push({ fileName, contextId: db.queryProjectGuid(), iModelId: db.getDbGuid(), briefcaseId: db.getBriefcaseId(), changeSetId: db.getParentChangeset().id, fileSize });
          db.closeIModel();
        }
      } catch (_err) {
      }
    }
    return briefcaseList;
  }

  public async deleteBriefcase(filePath: string) {
    await BriefcaseManager.deleteBriefcaseFiles(filePath, await IModelHost.getAuthorizedContext())
    try {
      const dirName = path.dirname(filePath);
      if (IModelJsFs.existsSync(dirName))
        IModelJsFs.removeSync(dirName);
    } catch (err) {
      throw new IModelError(IModelStatus.BadRequest, `cannot delete briefcase directory ${err}`);
    }
  }

  public async overrideNativeHostAppSettingsCacheDir(dirName: string) {
    // @todo: this is a HACK to override private variable.
    (<any>NativeHost)._appSettingsCacheDir = dirName;
  }
}
