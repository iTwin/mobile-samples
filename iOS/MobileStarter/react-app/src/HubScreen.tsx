/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { AlertAction, ITMAuthorizationClient, MobileCore } from "@itwin/mobile-sdk-core";
import { ActionSheetButton, BackButton, useIsMountedRef } from "@itwin/mobile-ui-react";
import { Project } from "@itwin/projects-client";
import { BriefcaseConnection, IModelApp, IModelConnection } from "@itwin/core-frontend";
import { Button, i18n, presentError, Screen, IModelInfo, IModelPicker, IModelDownloader, ProjectPicker } from "./Exports";
import "./HubScreen.scss";

HubScreen.ACTIVE_PROJECT_INFO = "activeProjectInfo";

function getActiveProject() {
  const projectInfoJson = localStorage.getItem(HubScreen.ACTIVE_PROJECT_INFO);
  if (projectInfoJson) {
    let project = JSON.parse(projectInfoJson);
    if (project.id) {
      // The format of the project object changed in iTwin 3. Since the id field is required, return
      // undefined if our stored project does not have a value for that field.
      return project as Project;
    } else {
      return undefined;
    }
  }
  return undefined;
}

function saveActiveProject(project: Project) {
  localStorage.setItem(HubScreen.ACTIVE_PROJECT_INFO, JSON.stringify(project));
}

enum HubStep {
  SignIn,
  SelectProject,
  SelectIModel,
  DownloadIModel,
  Error
}

/// Properties for the [[HubScreen]] React component.
export interface HubScreenProps {
  /// Callback called when an iModel is opened.
  onOpen: (filename: string, iModelPromise: Promise<IModelConnection>) => Promise<void>;
  /// Callback called when the back button is pressed to go to the previous screen.
  onBack: () => void;
}

/// React component to allow downloading and opening models from the iModel Hub.
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
  const titleLabels = React.useMemo(() => [
    i18n("HubScreen", "Connecting"),
    i18n("HubScreen", "SelectProject"),
    i18n("Shared", "SelectIModel"),
    i18n("HubScreen", "DownloadingIModel"),
  ], []);
  const signOutLabel = React.useMemo(() => i18n("HubScreen", "SignOut"), []);
  const deleteAllDownloadsLabel = React.useMemo(() => i18n("HubScreen", "DeleteAllDownloads"), []);
  const changeProjectLabel = React.useMemo(() => i18n("HubScreen", "ChangeProject"), []);

  // Effect that makes sure we are signed in, then continues to whatever comes next.
  React.useEffect(() => {
    // Figure out what to do after we are signed in, then do it.
    const afterSignedIn = () => {
      if (project === undefined) {
        // If we don't have an active project, let user select one.
        setHubStep(HubStep.SelectProject);
      } else {
        // Let the user select an iModel.
        setHubStep(HubStep.SelectIModel);
      }
    }
    // Sign in.
    const signin = async () => {
      try {
        const startTicks = performance.now();
        console.log("About to sign in.");
        // @Todo sign in handling.
        // await IModelApp.authorizationClient?.signIn();
        await IModelApp.authorizationClient?.getAccessToken();
        if (!isMountedRef.current) return;
        const elapsed = performance.now() - startTicks;
        console.log("Signin took " + (elapsed / 1000) + " seconds.");
        // Do whatever comes next.
        afterSignedIn();
      } catch (error) {
        // There was a problem signing in. Show the error, and give the user the option
        // to sign out.
        presentError("SigninErrorFormat", error, "HubScreen");
        setHubStep(HubStep.Error);
      }
    }
    // We only want to do this once, and since the effect gets called when various things
    // change, use the initialized state variable to track whether or not we have executed.
    if (!initialized) {
      // Set the initialized state variable to true to prevent us from redoing this.
      setInitialized(true);
      // @Todo sign in handling.
      // if (IModelApp.authorizationClient?.hasSignedIn) {
      //   // We're already signed in, so do whatever comes next.
      //   afterSignedIn();
      // } else {
      // Sign in, then do whatever comes next.
      signin();
      // }
    }
  }, [isMountedRef, project, initialized]);

  let moreButton: React.ReactNode;
  let stepContent: React.ReactNode;

  switch (hubStep) {
    case HubStep.SelectProject:
      stepContent = <ProjectPicker signedIn={initialized}
        onSelect={(newProject) => {
          saveActiveProject(newProject);
          setProject(newProject);
          setHubStep(HubStep.SelectIModel);
        }}
        onError={() => setHubStep(HubStep.Error)}
      />;
      break;

    case HubStep.SelectIModel:
      if (project) {
        stepContent = <IModelPicker project={project}
          onLoaded={(models) => setHaveCachedBriefcase(models.some(model => model.briefcase !== undefined))}
          onSelect={(model) => {
            setIModel(model);
            if (model.briefcase)
              onOpen(model.briefcase.fileName, BriefcaseConnection.openFile(model.briefcase));
            else
              setHubStep(HubStep.DownloadIModel);
          }}
          onError={() => setHubStep(HubStep.Error)}
        />;
        const actions: AlertAction[] = [];
        if (haveCachedBriefcase) {
          actions.push({
            name: "deleteAll",
            title: deleteAllDownloadsLabel,
            onSelected: async () => {
              if (project) {
                try {
                  await MobileCore.deleteCachedBriefcases(project.id);
                  if (!isMountedRef.current) return;
                  setHaveCachedBriefcase(false);
                } catch (error) {
                  // There was a problem deleting the cached briefcases. Show the error, then refresh
                  // anyway so if any were successfully deleted, it will reflect that.
                  presentError("DeleteAllErrorFormat", error, "HubScreen");
                  setProject({ ...project });
                }
              }
            }
          });
        }
        actions.push({
          name: "changeProject",
          title: changeProjectLabel,
          onSelected: () => setHubStep(HubStep.SelectProject),
        })
        moreButton = <ActionSheetButton actions={actions} showStatusBar />;
      }
      break;

    case HubStep.DownloadIModel:
      if (project && iModel) {
        stepContent = <IModelDownloader
          project={project}
          model={iModel}
          onDownloaded={(model) => {
            setIModel(model);
            if (model.briefcase)
              onOpen(model.briefcase.fileName, BriefcaseConnection.openFile(model.briefcase));
          }}
          onCanceled={() => setHubStep(HubStep.SelectIModel)}
        />;
      }
      break;

    case HubStep.Error:
      stepContent = <div className="centered">
        <Button title={signOutLabel} onClick={async () => {
          if (IModelApp.authorizationClient instanceof ITMAuthorizationClient) {
            try {
              await IModelApp.authorizationClient.signOut();
            } catch (error) {
              console.log(`Error signing out: ${error}`);
            }
          }
          onBack();
        }} />
      </div>
      break;
  }

  return (
    <Screen>
      <div className="hub-screen">
        <div className="title">
          <BackButton onClick={() => hubStep === HubStep.DownloadIModel ? setHubStep(HubStep.SelectIModel) : onBack()} />
          <div className="title-text">{titleLabels[hubStep]}</div>
          <div className="right-tools-parent">{moreButton}</div>
        </div>
        {stepContent}
      </div>
    </Screen >
  );
}
