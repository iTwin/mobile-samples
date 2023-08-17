/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { MobileCore } from "@itwin/mobile-sdk-core";
import { IconImage, useIsMountedRef } from "@itwin/mobile-ui-react";
import { IModelApp, NativeApp } from "@itwin/core-frontend";
import { IModelsClient, MinimalIModel } from "@itwin/imodels-client-management";
import { AccessTokenAdapter } from "@itwin/imodels-access-frontend";
import { LocalBriefcaseProps } from "@itwin/core-common";
import { ButtonProps, fileSizeString, HubScreenButton, HubScreenButtonList, HubScreenButtonListProps, i18n, presentError, PromiseUtil } from "../../Exports";

/** @internal */
export interface IModelInfo {
  minimalIModel: MinimalIModel;
  briefcase?: LocalBriefcaseProps;
}

/** Properties for the {@link IModelButton} React component. */
interface IModelButtonProps extends Omit<ButtonProps, "title"> {
  modelInfo: IModelInfo;
  onCacheDeleted?: (modelInfo: IModelInfo) => void;
}

/** React component to show a button to select an iModel. */
function IModelButton(props: IModelButtonProps) {
  const { modelInfo, onCacheDeleted, ...others } = props;
  const { minimalIModel, briefcase } = modelInfo;
  const isMountedRef = useIsMountedRef();

  // The button title includes the iModel's display name, and if the iModel is downloaded, also
  // includes the iModel's file size.
  const getTitle = React.useCallback(() => {
    if (!briefcase)
      return minimalIModel.displayName;
    return i18n("HubScreen", "IModelButtonFormat", { name: minimalIModel.displayName, size: fileSizeString(briefcase.fileSize) });
  }, [briefcase, minimalIModel.displayName]);

  // Callback to call to delete the downloaded briefcase for an iModel.
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

  return <HubScreenButton title={getTitle()} {...others}>
    {briefcase && <div className="delete-button" onClick={deleteBriefcase}>
      <IconImage iconSpec="icon-delete" />
    </div>}
  </HubScreenButton>;
}

/** Properties for the {@link IModelList} React component. */
interface IModelListProps extends HubScreenButtonListProps {
  models: IModelInfo[];
  onSelect?: (model: IModelInfo) => void;
  onCacheDeleted?: (modelInfo: IModelInfo) => void;
}

/** React component to show a list of iModels. */
function IModelList(props: IModelListProps) {
  const { models, onSelect, onCacheDeleted, children, ...others } = props;
  return <HubScreenButtonList {...others}>
    {models.map((model, index) => <IModelButton key={index} modelInfo={model} onClick={() => onSelect?.(model)} onCacheDeleted={onCacheDeleted} />)}
    {children}
  </HubScreenButtonList>;
}

/**
 * Get all the iModels in the given iTwin.
 * @param iTwinId The iTwin from which to get the list of iModels.
 * @returns The iModels in the iTwin.
 */
async function getIModels(iTwinId: string) {
  const baseUrl = `https://${window.itmSampleParams.apiPrefix}api.bentley.com/imodels`;
  const imodelsClient = new IModelsClient({ api: { baseUrl } });
  const accessToken = await IModelApp.getAccessToken();
  const minimalIModels: MinimalIModel[] = [];
  // Fetch the list of iModels.
  for await (const minimalIModel of imodelsClient.iModels.getMinimalList({
    authorization: AccessTokenAdapter.toAuthorizationCallback(accessToken),
    urlParams: { iTwinId },
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

/** Properties for the {@link IModelPicker} React component. */
export interface IModelPickerProps {
  iTwinId: string;
  onSelect?: (model: IModelInfo) => void;
  onLoaded?: (models: IModelInfo[]) => void;
  onError?: (error: any) => void;
  onCacheDeleted?: (modelInfo: IModelInfo) => void;
}

/** React component to show a list of iModels in an iTwin so they can be picked. */
export function IModelPicker(props: IModelPickerProps) {
  const { iTwinId, onSelect, onLoaded, onError, onCacheDeleted } = props;
  const [iModels, setIModels] = React.useState<IModelInfo[]>([]);
  const [loading, setLoading] = React.useState(false);
  const isMountedRef = useIsMountedRef();

  // Fetch the iModels for the active iTwin so they can be picked.
  React.useEffect(() => {
    if (!isMountedRef.current)
      return;

    const fetchModels = async () => {
      try {
        setLoading(true);
        const models = await getIModels(iTwinId);
        if (!isMountedRef.current)
          return;
        setIModels(models);
        onLoaded?.(models);
      } catch (error) {
        setIModels([]);
        const anyError = error as any;
        // Don't show an error message for ProjectNotFound, since the HubScreen will automatically
        // switch to the project selection screen in that case.
        if (anyError.code !== "ProjectNotFound") {
          presentError("GetIModelsErrorFormat", error, "HubScreen");
        }
        onError?.(error);
      }
      setLoading(false);
    };
    void PromiseUtil.consolidateCall(`fetchModels-${iTwinId}`, async () => fetchModels());
  }, [isMountedRef, onError, onLoaded, iTwinId]);

  return <IModelList models={iModels} loading={loading} onSelect={onSelect} onCacheDeleted={(model) => {
    onCacheDeleted?.(model);
    model.briefcase = undefined;
    setIModels([...iModels]);
  }} />;
}
