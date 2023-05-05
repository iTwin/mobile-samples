/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { AlertAction, MobileCore } from "@itwin/mobile-sdk-core";
import { ActionSheetButton, BackButton, useIsMountedRef } from "@itwin/mobile-ui-react";
import { ITwin } from "@itwin/itwins-client";
import { BriefcaseConnection, IModelConnection } from "@itwin/core-frontend";
import { Button, HubStep, i18n, IModelDownloader, IModelInfo, IModelPicker, presentError, Project, ProjectPicker, Screen, SignIn, signOut, useLocalizedString } from "../../Exports";
import "./HubScreen.scss";

HubScreen.ACTIVE_PROJECT_INFO = "activeProjectInfo";

/**
 * Gets active project stored in `localStorage`, or undefined if there isn't one
 * @see {@link saveActiveProject}.
 * @returns A {@link Project} object representing the active project, or undefined if there is none.
 */
function getActiveProject() {
  const projectInfoJson = localStorage.getItem(HubScreen.ACTIVE_PROJECT_INFO);
  if (projectInfoJson) {
    const project = JSON.parse(projectInfoJson);
    if (project.id) {
      return project as Project;
    }
  }
  return undefined;
}

/**
 * Stores the active project in `localStorage`.
 * @see {@link getActiveProject}.
 * @param project The {@link Project} to set as the active project.
 */
function saveActiveProject(project: ITwin) {
  localStorage.setItem(HubScreen.ACTIVE_PROJECT_INFO, JSON.stringify(project));
}

/** Properties for the {@link HubScreen} React component. */
export interface HubScreenProps {
  /** Callback called when an iModel is opened. */
  onOpen: (filename: string, iModelPromise: Promise<IModelConnection>) => Promise<void>;
  /** Callback called when the back button is pressed to go to the previous screen. */
  onBack: () => void;
}

/** React component to allow downloading and opening models from the iModel Hub. */
export function HubScreen(props: HubScreenProps) {
  const { onOpen, onBack } = props;
  const [initialized, setInitialized] = React.useState(false);
  const [hubStep, setHubStep] = React.useState(HubStep.SignIn);
  const [project, setProject] = React.useState(getActiveProject());
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

  switch (hubStep) {
    case HubStep.SignIn:
      stepContent = <SignIn
        onBack={onBack}
        onSignedIn={() => {
          setHubStep(project ? HubStep.SelectIModel : HubStep.SelectProject);
          setInitialized(true);
        }}
        onError={() => setHubStep(HubStep.Error)}
      />;
      break;

    case HubStep.SelectProject:
      if (!initialized) break;
      stepContent = <ProjectPicker
        onSelect={(newProject) => {
          saveActiveProject(newProject);
          setProject(newProject);
          setHubStep(HubStep.SelectIModel);
        }}
        onError={() => setHubStep(HubStep.Error)}
      />;
      break;

    case HubStep.SelectIModel:
      if (!project) break;
      stepContent = <IModelPicker iTwinId={project.id}
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
            if (!project) return;
            try {
              const deleted = await MobileCore.deleteCachedBriefcases(project.id);
              // Note: Do the below even if isMounted is no longer true.
              deleted.forEach((briefcase) => ModelNameCache.remove(briefcase.iModelId));
              // But don't do anything else if isMounted is not true.
              if (!isMountedRef.current) return;
              setHaveCachedBriefcase(false);
            } catch (error) {
              // There was a problem deleting the cached briefcases. Show the error, then refresh
              // anyway so if any were successfully deleted, it will reflect that.
              presentError("DeleteAllErrorFormat", error, "HubScreen");
              setProject({ ...project });
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
      if (!project || !iModel) break;
      stepContent = <IModelDownloader
        iTwinId={project.id}
        model={iModel}
        onDownloaded={(model) => {
          setIModel(model);
          if (model.briefcase) {
            ModelNameCache.set(model.minimalIModel.id, model.minimalIModel.displayName);
            void onOpen(model.briefcase.fileName, BriefcaseConnection.openFile(model.briefcase));
          } else {
            setHubStep(HubStep.SelectIModel);
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
