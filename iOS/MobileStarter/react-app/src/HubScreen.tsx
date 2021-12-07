/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { AlertAction, MobileCore } from "@itwin/mobile-sdk-core";
import { ActionSheetButton, IconImage, useIsMountedRef, VisibleBackButton } from "@itwin/mobile-ui-react";
import { Project as ITwin, ProjectsAccessClient } from "@itwin/projects-client";
import { ProgressInfo } from "@bentley/itwin-client";
// import { ProjectInfo, ProjectScope } from "@itwin/appui-react";
// import { DefaultProjectServices } from "@bentley/ui-framework/lib/ui-framework/clientservices/DefaultProjectServices";
import { BriefcaseConnection, DownloadBriefcaseOptions, IModelApp, IModelConnection, NativeApp } from "@itwin/core-frontend";
import { HubIModel, IModelHubClient } from "@bentley/imodelhub-client";
import { LocalBriefcaseProps, SyncMode } from "@itwin/core-common";
import { Button, fileSizeString, i18n, progressString, Screen } from "./Exports";
import "./HubScreen.scss";

/// Properties for the [[HubScreen]] React component.
export interface HubScreenProps {
  /// Callback called when an iModel is opened.
  onOpen: (filename: string, iModelPromise: Promise<IModelConnection>) => Promise<void>;
  /// Callback called when the back button is pressed to go to the previous screen.
  onBack: () => void;
}

// Get all the projects that this user has access to, sorted by most recent use.
async function getProjects() {
  const client = new ProjectsAccessClient();
  return client.getAll(await IModelApp.getAccessToken(), { pagination: { skip: 0, top: 10 } });
  // const projectServices = new DefaultProjectServices();
  // return projectServices.getProjects(ProjectScope.MostRecentlyUsed, 40, 0);
}

enum HubStep {
  SignIn,
  FetchingProjects,
  SelectProject,
  FetchingIModels,
  SelectIModel,
  DownloadIModel,
}

function getActiveProject() {
  const projectInfoJson = localStorage.getItem("activeProjectInfo");
  if (projectInfoJson) {
    return JSON.parse(projectInfoJson) as ITwin;
  }
  return undefined;
}

interface IModelInfo {
  hubIModel: HubIModel;
  briefcase?: LocalBriefcaseProps;
}

/// React component to allow downloading and opening models from the iModel Hub.
export function HubScreen(props: HubScreenProps) {
  const { onOpen, onBack } = props;
  const [hubStep, setHubStep] = React.useState(HubStep.SignIn);
  const [projects, setProjects] = React.useState<ITwin[]>([]);
  const [iModels, setIModels] = React.useState<IModelInfo[]>([]);
  const [buttonTitles, setButtonTitles] = React.useState<string[]>([]);
  const [project, setProject] = React.useState(getActiveProject());
  const [initialized, setInitialized] = React.useState(false);
  const [haveCachedBriefcase, setHaveCachedBriefcase] = React.useState(false);
  const [progress, setProgress] = React.useState<ProgressInfo>();
  // Any time we do anything asynchronous, we have to check if the component is still mounted,
  // or it can lead to a run-time exception.
  const isMountedRef = useIsMountedRef();
  const titleLabels = React.useMemo(() => [
    i18n("HubScreen", "Connecting"),
    i18n("HubScreen", "GettingProjectList"),
    i18n("HubScreen", "SelectProject"),
    i18n("HubScreen", "GettingIModelList"),
    i18n("Shared", "SelectIModel"),
    i18n("HubScreen", "DownloadingIModel"),
  ], []);
  // const signOutLabel = React.useMemo(() => i18n("HubScreen", "SignOut"), []);
  const unknownLabel = React.useMemo(() => i18n("HubScreen", "Unknown"), []);
  const deleteAllDownloadsLabel = React.useMemo(() => i18n("HubScreen", "DeleteAllDownloads"), []);
  const changeProjectLabel = React.useMemo(() => i18n("HubScreen", "ChangeProject"), []);

  // Fetch the list of all projects that this user has access to, then let the user choose one.
  const fetchProjects = React.useCallback(async () => {
    try {
      setProject(undefined);
      setButtonTitles([]);
      setHubStep(HubStep.FetchingProjects);
      console.log("Fetching projects list...");
      const startTicks = performance.now();
      const fetchedProjects = await getProjects();
      if (!isMountedRef.current) return;
      setProjects(fetchedProjects);
      const elapsed = performance.now() - startTicks;
      console.log("Fetched projects list in " + (elapsed / 1000) + " seconds.");
      const names = fetchedProjects.filter((project) => project.name).map((project) => project.name!);
      setButtonTitles(names);
      setHubStep(HubStep.SelectProject);
    } catch (error) {
      // There was a problem fetching the projects. Show the error, and give the user the option
      // to sign out. (A token expired error requires sign out.)
      // setButtonTitles([i18n("HubScreen", "FetchProjectsErrorFormat", { error }), signOutLabel]);
    }
  }, [isMountedRef]);

  // Called when a user selects a project from the list, or when loading the
  // active project stored in localState.
  const selectProject = React.useCallback(async (project: ITwin) => {
    setHubStep(HubStep.FetchingIModels);
    setIModels([]);
    setButtonTitles([]);
    const hubClient = new IModelHubClient();
    // const requestContext = await AuthorizedFrontendRequestContext.create();
    if (!isMountedRef.current) return;
    const getName = (imodel: HubIModel) => {
      return imodel.name ?? unknownLabel;
    };
    // Fetch the list of imodels, then sort them by name using case-insensitive sort.
    const hubIModels = (await hubClient.iModels.get(await IModelApp.getAccessToken(), project.id)).sort((a, b) => (getName(a)).localeCompare(getName(b), undefined, { sensitivity: "base" }));
    if (!isMountedRef.current) return;
    const iModelInfos: IModelInfo[] = [];
    let numCachedBriefcases = 0;
    for (let i = 0; i < hubIModels.length; ++i) {
      const hubIModel = hubIModels[i];
      const localBriefcases = await NativeApp.getCachedBriefcases(hubIModel.id);
      if (!isMountedRef.current) return;
      const briefcase = localBriefcases.length > 0 ? localBriefcases[0] : undefined;
      if (briefcase) {
        ++numCachedBriefcases;
      }
      setHaveCachedBriefcase(numCachedBriefcases !== 0);
      iModelInfos.push({ hubIModel, briefcase });
    }
    setIModels(iModelInfos);
    const names = hubIModels.map((imodel) => getName(imodel));
    setButtonTitles(names);
    setHubStep(HubStep.SelectIModel);
  }, [isMountedRef, unknownLabel]);

  // Effect that makes sure we are signed in, then continues to whatever comes next.
  React.useEffect(() => {
    // Figure out what to do after we are signed in, then do it.
    const afterSignedIn = async () => {
      if (project === undefined) {
        // If we don't have an active project, fetch the list of projects.
        fetchProjects();
      } else {
        // Select the active project.
        selectProject(project);
      }
    }
    // Sign in.
    const signin = async () => {
      try {
        const startTicks = performance.now();
        console.log("About to sign in.");
        // @Todo sign in handling.
        // await IModelApp.authorizationClient?.signIn();
        if (!isMountedRef.current) return;
        const elapsed = performance.now() - startTicks;
        console.log("Signin took " + (elapsed / 1000) + " seconds.");
        // Do whatever comes next.
        afterSignedIn();
      } catch (error) {
        console.log(`Error signing in: ${error}`);
        // There was a problem signing in. Show the error, and give the user the option
        // to sign out. (A token expired error requires sign out.)
        // setButtonTitles([i18n("HubScreen", "SigninErrorFormat", { error }), signOutLabel]);
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
  }, [project, initialized, fetchProjects, selectProject, isMountedRef]);

  // onClick handler for the project list.
  const handleSelectProject = React.useCallback((index) => {
    const newProject = projects[index];
    setProject(newProject);
    // Remember the most recently selected project so that it will load by default later.
    localStorage.setItem("activeProjectInfo", JSON.stringify(newProject))
    selectProject(newProject);
  }, [projects, selectProject]);

  // Open the imodel referenced by the briefcase. It is already downloaded before this is called.
  const openIModel = React.useCallback((briefcase: LocalBriefcaseProps) => {
    onOpen(briefcase.fileName, BriefcaseConnection.openFile(briefcase));
  }, [onOpen]);

  // Download the specified imodel, then open it once it has been downloaded.
  const downloadIModel = React.useCallback(async (iModel: HubIModel) => {
    setButtonTitles([]);
    setHubStep(HubStep.DownloadIModel);
    const opts: DownloadBriefcaseOptions = { syncMode: SyncMode.PullOnly };
    const downloader = await NativeApp.requestDownloadBriefcase(project!.id!, iModel.id!, opts, undefined, (progress: ProgressInfo) => {
      if (isMountedRef.current) {
        setProgress(progress);
      }
    });
    if (!isMountedRef.current) {
      downloader.requestCancel();
      return;
    }
    // Wait for the download to complete.
    await downloader.downloadPromise;
    if (!isMountedRef.current) return;
    setProgress(undefined);
    const localBriefcases = await NativeApp.getCachedBriefcases(iModel.id);
    if (!isMountedRef.current) return;
    if (localBriefcases.length === 0) {
      // This should never happen, since we just downloaded it, but check, just in case.
      console.error("Error downloading iModel.");
    } else {
      // Open the now-downloaded imodel.
      openIModel(localBriefcases[0]);
    }
  }, [openIModel, project, isMountedRef]);

  // onClick handler for iModel list.
  const handleSelectIModel = React.useCallback(async (index) => {
    console.log("Select iModel: " + JSON.stringify(iModels[index]));
    const iModel = iModels[index].hubIModel;
    // First, check to see if we have a local copy of the iModel.
    // NOTE: This does not check to see if the iModel has been updated since it was last
    // downloaded.
    const localBriefcases = await NativeApp.getCachedBriefcases(iModel.id);
    if (!isMountedRef.current) return;
    if (localBriefcases.length === 0) {
      // We don't have a local copy of the iModel, so download it and then open it.
      downloadIModel(iModel);
    } else {
      // We do have a local copy of the iModel, so open that local copy.
      openIModel(localBriefcases[0]);
    }
  }, [iModels, downloadIModel, openIModel, isMountedRef]);

  // Convert the button titles into buttons.
  const buttons = buttonTitles.map((title: string, index: number) => {
    const getTitle = (title: string, briefcase: LocalBriefcaseProps | undefined) => {
      if (!briefcase) return title;
      return title + " (" + fileSizeString(briefcase.fileSize) + ")";
    }
    if (hubStep === HubStep.SelectIModel || hubStep === HubStep.DownloadIModel) {
      const briefcase = iModels[index].briefcase;
      let deleteButton;
      if (briefcase) {
        deleteButton = (
          <div className="delete-button" onClick={async (e) => {
            e.stopPropagation();
            await MobileCore.deleteCachedBriefcase(briefcase);
            if (!isMountedRef.current) return;
            if (project) {
              selectProject(project);
            }
          }}>
            <IconImage iconSpec="icon-delete" />
          </div>
        );
      }
      return (
        <div className="imodel-row" key={index}>
          <Button
            onClick={() => handleSelectIModel(index)}
            title={getTitle(title, briefcase)}
          >
            {deleteButton}
          </Button>
        </div>);
    } else {
      return <Button
        key={index}
        onClick={async () => {
          // if (title === signOutLabel) {
          //   IModelApp.authorizationClient?.signOut();
          //   onBack();
          // }
          if (hubStep === HubStep.SelectProject) {
            handleSelectProject(index);
          }
        }}
        title={title} />
    }
  });

  let moreButton;

  if (haveCachedBriefcase || project) {
    const actions: AlertAction[] = [];
    if (haveCachedBriefcase) {
      actions.push({
        name: "deleteAll",
        title: deleteAllDownloadsLabel,
        onSelected: async () => {
          if (project) {
            await MobileCore.deleteCachedBriefcases(project.id);
            if (!isMountedRef.current) return;
            selectProject(project);
          }
        }
      });
    }
    if (project) {
      actions.push({
        name: "changeProject",
        title: changeProjectLabel,
        onSelected: () => fetchProjects(),
      })
    }
    moreButton = (
      <ActionSheetButton actions={actions} />
    );
  }

  return (
    <Screen>
      <div className="hub-screen">
        <div className="title">
          <VisibleBackButton onClick={onBack} />
          <div className="title-text">{titleLabels[hubStep] + progressString(progress)}</div>
          <div className="more-parent">
            {moreButton}
          </div>
        </div>
        <div className="list">
          <div className="list-items">{buttons}</div>
        </div>
      </div>
    </Screen>
  );
}
