/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { AlertAction, MobileCore } from "@itwin/mobile-sdk-core";
import { ActionSheetButton, BackButton, useIsMountedRef } from "@itwin/mobile-ui-react";
import { BriefcaseConnection, IModelConnection } from "@itwin/core-frontend";
import { Button, HubStep, i18n, IModelDownloader, IModelInfo, IModelPicker, presentError, ProjectPicker, Screen, SignIn, signOut, useLocalizedString } from "../../Exports";
import "./HubScreen.scss";

HubScreen.ACTIVE_PROJECT_INFO = "activeProjectInfo";

/**
 * Gets the active project id stored in `localStorage`, or undefined if there isn't one.
 * @see {@link saveActiveProjectId}.
 * @returns The active project id or undefined.
 */
function getActiveProjectId() {
  const storedValue = localStorage.getItem(HubScreen.ACTIVE_PROJECT_INFO);
  if (!storedValue) return undefined;

  // Previously we stored the whole Project object, now we just store the id.
  // This code attempts to properly handle the old data.
  if (storedValue.includes("{")) {
    try {
      const project = JSON.parse(storedValue);
      if (typeof (project) === "object" && project.id)
        return project.id;
    } catch (_e) {
      console.log(`Exception parsing: ${storedValue}`);
    }
  }
  return storedValue;
}

/**
 * Stores the active project in `localStorage`.
 * @see {@link getActiveProjectId}.
 * @param iTwinId The id to set as the active project.
 */
function saveActiveProjectId(iTwinId: string) {
  localStorage.setItem(HubScreen.ACTIVE_PROJECT_INFO, iTwinId);
}

/** Properties for the {@link HubScreen} React component. */
export interface HubScreenProps {
  /** Callback called when an iModel is opened. */
  onOpen: (filename: string, iModelPromise: Promise<IModelConnection>) => Promise<void>;
  /** Callback called when the back button is pressed to go to the previous screen. */
  onBack: () => void;
  /**
   * If the performActions includes and OPEN action with a remote: prefix, this will be set to
   * the rest of the value, split on the colon character.
   */
  openRemoteValues?: string[];
}

/** React component to allow downloading and opening models from the iModel Hub. */
export function HubScreen(props: HubScreenProps) {
  const { onOpen, onBack, openRemoteValues = [] } = props;
  const [openRemoteITwinId, openRemoteIModelId] = openRemoteValues;
  const [initialized, setInitialized] = React.useState(false);
  const [hubStep, setHubStep] = React.useState(HubStep.SignIn);
  const [projectId, setProjectId] = React.useState(getActiveProjectId());
  const [haveCachedBriefcase, setHaveCachedBriefcase] = React.useState(false);
  const [iModel, setIModel] = React.useState<IModelInfo>();
  // Any time we do anything asynchronous, we have to check if the component is still mounted,
  // or it can lead to a run-time exception.
  const isMountedRef = useIsMountedRef();
  const titleLabels = React.useMemo(() => new Map<HubStep, string>([
    [HubStep.SignIn, i18n("HomeScreen", "HubIModels")],
    [HubStep.SelectProject, i18n("HubScreen", "SelectProject")],
    [HubStep.SelectIModel, i18n("Shared", "SelectIModel")],
    [HubStep.DownloadIModel, i18n("HomeScreen", "HubIModels")],
  ]), []);
  const signOutLabel = useLocalizedString("Shared", "SignOut");
  const selectProjectLabel = useLocalizedString("HubScreen", "SelectProject");
  const deleteAllDownloadsLabel = useLocalizedString("HubScreen", "DeleteAllDownloads");
  const changeProjectLabel = useLocalizedString("HubScreen", "ChangeProject");

  let moreButton: React.ReactNode;
  let stepContent: React.ReactNode;

  // Download and open a remote iModel based on openRemoteITwinId and openRemoteIModelId.
  const openRemoteIModel = React.useCallback(async () => {
    if (!openRemoteITwinId || !openRemoteIModelId) return;
    setProjectId(openRemoteITwinId);
    setIModel({ minimalIModel: { id: openRemoteIModelId, displayName: "" } });
    // Note: by switching to HubStep.DownloadIModel, it will automatically delete the model if it
    // already exists locally before downloading it. If a user taps on the button for a downloaded
    // iModel, it will simply open it.
    setHubStep(HubStep.DownloadIModel);
  }, [openRemoteITwinId, openRemoteIModelId]);

  switch (hubStep) {
    case HubStep.SignIn:
      stepContent = <SignIn
        onBack={onBack}
        onSignedIn={() => {
          setHubStep(projectId ? HubStep.SelectIModel : HubStep.SelectProject);
          setInitialized(true);
        }}
        onError={() => setHubStep(HubStep.Error)}
      />;
      break;

    case HubStep.SelectProject:
      if (!initialized) break;
      if (openRemoteITwinId && openRemoteIModelId) {
        setProjectId(openRemoteITwinId);
      }
      stepContent = <ProjectPicker
        onSelect={(newProjectId) => {
          saveActiveProjectId(newProjectId);
          setProjectId(newProjectId);
          setHubStep(HubStep.SelectIModel);
        }}
        onError={() => setHubStep(HubStep.Error)}
      />;
      break;

    case HubStep.SelectIModel:
      if (!projectId) break;
      void openRemoteIModel();
      stepContent = <IModelPicker iTwinId={projectId}
        onLoaded={(models) => setHaveCachedBriefcase(models.some((model) => model.briefcase !== undefined))}
        onSelect={(model) => {
          setIModel(model);
          if (model.briefcase)
            void onOpen(model.briefcase.fileName, BriefcaseConnection.openFile(model.briefcase));
          else
            setHubStep(HubStep.DownloadIModel);
        }}
        onError={(error) => {
          if (error.code === "ProjectNotFound") {
            // The project that was being used before is no longer accessible. This could be due to a
            // user change, a permissions change (user was removed from the project), or a project deletion.
            // Switch to project selection.
            setHubStep(HubStep.SelectProject);
          } else {
            setHubStep(HubStep.Error);
          }
        }}
        onCacheDeleted={(modelInfo) => {
          ModelNameCache.remove(modelInfo.minimalIModel.id);
        }}
      />;
      const actions: AlertAction[] = [];
      if (haveCachedBriefcase) {
        // If any iModels have been downloaded, include a "Delete All Downloads" button at the top
        // of the list of actions in the more button.
        actions.push({
          name: "deleteAll",
          title: deleteAllDownloadsLabel,
          onSelected: async () => {
            if (!projectId) return;
            try {
              const deleted = await MobileCore.deleteCachedBriefcases(projectId);
              // Note: Do the below even if isMounted is no longer true.
              deleted.forEach((briefcase) => ModelNameCache.remove(briefcase.iModelId));
              // But don't do anything else if isMounted is not true.
              if (!isMountedRef.current) return;
              setHaveCachedBriefcase(false);
            } catch (error) {
              // There was a problem deleting the cached briefcases. Show the error, then refresh
              // anyway so if any were successfully deleted, it will reflect that.
              presentError("DeleteAllErrorFormat", error, "HubScreen");
              setProjectId(projectId);
            }
          },
        });
      }
      actions.push({
        name: "changeProject",
        title: changeProjectLabel,
        onSelected: () => setHubStep(HubStep.SelectProject),
      });
      moreButton = <ActionSheetButton actions={actions} showStatusBar />;
      break;

    case HubStep.DownloadIModel:
      if (!projectId || !iModel) break;
      stepContent = <IModelDownloader
        iTwinId={projectId}
        model={iModel}
        onDownloaded={(model) => {
          setIModel(model);
          if (model.briefcase) {
            ModelNameCache.set(model.minimalIModel.id, model.minimalIModel.displayName);
            void onOpen(model.briefcase.fileName, BriefcaseConnection.openFile(model.briefcase));
          } else {
            if (openRemoteITwinId && openRemoteIModelId) {
              // We were unabled to download requested iModelId, so go back to the Home screen.
              onBack();
            } else {
              setHubStep(HubStep.SelectIModel);
            }
          }
        }}
        onCanceled={() => setHubStep(HubStep.SelectIModel)}
      />;
      break;

    case HubStep.Error:
      stepContent = <div className="centered-list">
        <Button title={signOutLabel} onClick={async () => {
          await signOut();
          // Note: isMounted check not needed because onBack comes from HomeScreen.
          onBack();
        }} />
        <Button title={selectProjectLabel} onClick={async () => {
          setHubStep(HubStep.SelectProject);
        }} />
      </div>;
      break;
  }

  return (
    <Screen className="hub-screen">
      <div className="title">
        <BackButton onClick={() => hubStep === HubStep.DownloadIModel ? setHubStep(HubStep.SelectIModel) : onBack()} />
        <div className="title-text">{titleLabels.get(hubStep)}</div>
        <div className="right-tools-parent">{moreButton}</div>
      </div>
      {stepContent}
    </Screen >
  );
}

export class ModelNameCache {
  private static MODEL_ID_PREFIX = "modelIdToName_";

  public static get(modelId: string) {
    return localStorage.getItem(this.MODEL_ID_PREFIX + modelId);
  }

  public static set(modelId: string, modelName: string) {
    localStorage.setItem(this.MODEL_ID_PREFIX + modelId, modelName);
  }

  public static remove(modelId: string) {
    localStorage.removeItem(this.MODEL_ID_PREFIX + modelId);
  }
}
