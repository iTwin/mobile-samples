/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { MobileCore } from "@itwin/mobile-sdk-core";
import { IconImage, useIsMountedRef } from "@itwin/mobile-ui-react";
import { Project } from "@itwin/projects-client";
import { IModelApp, NativeApp } from "@itwin/core-frontend";
import { IModelsClient, MinimalIModel } from "@itwin/imodels-client-management";
import { AccessTokenAdapter } from "@itwin/imodels-access-frontend";
import { LocalBriefcaseProps } from "@itwin/core-common";
import { fileSizeString, presentError, ButtonProps, HubScreenButton, HubScreenButtonListProps, HubScreenButtonList } from "./Exports";

export interface IModelInfo {
  minimalIModel: MinimalIModel;
  briefcase?: LocalBriefcaseProps;
}

interface IModelButtonProps extends Omit<ButtonProps, "title"> {
  modelInfo: IModelInfo;
  onCacheDeleted?: (modelInfo: IModelInfo) => void;
};

function IModelButton(props: IModelButtonProps) {
  const { modelInfo, onClick, onCacheDeleted } = props;
  const { minimalIModel, briefcase } = modelInfo;
  const isMountedRef = useIsMountedRef();

  const getTitle = (title: string, briefcase: LocalBriefcaseProps | undefined) => {
    if (!briefcase) return title;
    return title + " (" + fileSizeString(briefcase.fileSize) + ")";
  }

  const deleteBriefcase = React.useCallback(async (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation();
    if (!briefcase) return;
    try {
      await MobileCore.deleteCachedBriefcase(briefcase);
      if (!isMountedRef.current) return;
      onCacheDeleted?.(modelInfo);
    } catch (error) {
      // There was a problem deleting the cached briefcase. Show the error.
      presentError("DeleteErrorFormat", error, "HubScreen");
    }
  }, [briefcase, isMountedRef, modelInfo, onCacheDeleted]);

  return <HubScreenButton
    title={getTitle(minimalIModel.displayName, briefcase)}
    onClick={onClick}
  >
    {briefcase && <div className="delete-button" onClick={deleteBriefcase}>
      <IconImage iconSpec="icon-delete" />
    </div>}
  </HubScreenButton>
}

interface IModelListProps extends HubScreenButtonListProps {
  models: IModelInfo[];
  onClick?: (model: IModelInfo) => void;
  onCacheDeleted?: (modelInfo: IModelInfo) => void;
}

function IModelList(props: IModelListProps) {
  const { models, loading, onClick, onCacheDeleted, children } = props;
  return <HubScreenButtonList loading={loading}>
    {models.map((model, index) => <IModelButton key={index} modelInfo={model} onClick={() => onClick?.(model)} onCacheDeleted={onCacheDeleted} />)}
    {children}
  </HubScreenButtonList>;
}

async function getIModels(project: Project) {
  const imodelsClient = new IModelsClient();
  const accessToken = await IModelApp.getAccessToken();
  const minimalIModels: MinimalIModel[] = [];
  // Fetch the list of iModels.
  for await (const minimalIModel of imodelsClient.iModels.getMinimalList({
    authorization: AccessTokenAdapter.toAuthorizationCallback(accessToken),
    urlParams: {
      projectId: project.id,
    }
  })) {
    minimalIModels.push(minimalIModel);
  }
  // Sort them by name using case-insensitive sort.
  minimalIModels.sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }));
  const iModelInfos: IModelInfo[] = [];
  for (const minimalIModel of minimalIModels) {
    const localBriefcases = await NativeApp.getCachedBriefcases(minimalIModel.id);
    const briefcase = localBriefcases.length > 0 ? localBriefcases[0] : undefined;
    iModelInfos.push({ minimalIModel, briefcase });
  }
  return iModelInfos;
}

export interface IModelPickerProps {
  project: Project | undefined;
  signedIn: boolean;
  onSelect?: (model: IModelInfo) => void;
  onLoaded?: (models: IModelInfo[]) => void;
  onError?: (error: any) => void;
}

export function IModelPicker(props: IModelPickerProps) {
  const { project, signedIn, onSelect, onLoaded, onError } = props;
  const [iModels, setIModels] = React.useState<IModelInfo[]>([]);
  const [loading, setLoading] = React.useState(false);
  const isMountedRef = useIsMountedRef();

  React.useEffect(() => {
    if (!isMountedRef.current)
      return;

    if (!project || !signedIn) {
      setIModels([]);
      setLoading(false);
      return;
    }

    const fetchModels = async () => {
      try {
        setLoading(true);
        const models = await getIModels(project);
        if (!isMountedRef.current)
          return;
        setIModels(models);
        onLoaded?.(models);
      } catch (error) {
        setIModels([]);
        presentError("GetIModelsErrorFormat", error, "HubScreen");
        onError?.(error);
      }
      setLoading(false);
    };
    fetchModels();
  }, [isMountedRef, onError, onLoaded, project, signedIn]);

  return <IModelList models={iModels} loading={loading} onClick={onSelect} onCacheDeleted={(model) => {
    model.briefcase = undefined;
    setIModels([...iModels]);
  }} />;
}
