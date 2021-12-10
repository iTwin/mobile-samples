/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { AlertAction, ITMAuthorizationClient, MobileCore, presentAlert } from "@itwin/mobile-sdk-core";
import { ActionSheetButton, IconImage, useIsMountedRef, VisibleBackButton } from "@itwin/mobile-ui-react";
import { Project as ITwin, ProjectsAccessClient } from "@itwin/projects-client";
import { ProgressCallback, ProgressInfo } from "@bentley/itwin-client";
// import { ProjectInfo, ProjectScope } from "@itwin/appui-react";
// import { DefaultProjectServices } from "@bentley/ui-framework/lib/ui-framework/clientservices/DefaultProjectServices";
import { BriefcaseConnection, DownloadBriefcaseOptions, IModelApp, IModelConnection, NativeApp } from "@itwin/core-frontend";
import { Authorization, IModelsClient, MinimalIModel } from "@itwin/imodels-client-management";
import { BriefcaseDownloader, LocalBriefcaseProps, SyncMode } from "@itwin/core-common";
import { Button, fileSizeString, FilterControl, i18n, progressString, Screen } from "./Exports";
import "./HubScreen.scss";

/// Properties for the [[HubScreen]] React component.
export interface HubScreenProps {
  /// Callback called when an iModel is opened.
  onOpen: (filename: string, iModelPromise: Promise<IModelConnection>) => Promise<void>;
  /// Callback called when the back button is pressed to go to the previous screen.
  onBack: () => void;
}

// Get all the projects that this user has access to, sorted by most recent use.
async function getProjects(progress?: ProgressCallback) {
  const client = new ProjectsAccessClient();
  const chunkSize = 1000;
  const allProjects: ITwin[] = [];
  const accessToken = await IModelApp.getAccessToken();
  for (let skip = 0; true; skip += chunkSize) {
    try {
      const chunk = await client.getAll(accessToken, { pagination: { skip, top: chunkSize } });
      allProjects.push(...chunk);
      progress?.({ loaded: allProjects.length });
      if (chunk.length < chunkSize) {
        return allProjects;
      }
    } catch (ex) {
      console.log(`Exception fetching projects: ${ex}`);
      if (allProjects.length > 0) {
        return allProjects;
      } else {
        throw ex;
      }
    }
  }
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
    let project = JSON.parse(projectInfoJson);
    if (project.id) {
      // The format of the project object changed in iTwin 3. Since the id field is required, return
      // undefined if our stored project does not have a value for that field.
      return project as ITwin;
    } else {
      return undefined;
    }
  }
  return undefined;
}

interface IModelInfo {
  minimalIModel: MinimalIModel;
  briefcase?: LocalBriefcaseProps;
}

function presentError(formatKey: string, error: any, namespace = "HubScreen") {
  presentAlert({
    title: i18n("Shared", "Error"),
    message: i18n(namespace, formatKey, { error }),
    actions: [{
      name: "ok",
      title: i18n("Shared", "OK"),
    }],
  });
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
  const [filter, setFilter] = React.useState("");
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
  const signOutLabel = React.useMemo(() => i18n("HubScreen", "SignOut"), []);
  const deleteAllDownloadsLabel = React.useMemo(() => i18n("HubScreen", "DeleteAllDownloads"), []);
  const changeProjectLabel = React.useMemo(() => i18n("HubScreen", "ChangeProject"), []);
  const filterLabel = React.useMemo(() => i18n("HubScreen", "Filter"), []);

  // Note: This doesn't list isMountedRef as a dependency, because doing so would be useless. The function
  // is passed into tasks that take time. They cannot be updated. As it happens, isMountedRef never changes,
  // since the React.useEffect inside useIsMountedRef() in mobile-ui-react passes an empty dependency list.
  // However, conceptually we need to be aware that if it changed, whatever operation that was using the
  // callback would continue to have its original pointer, so the change wouldn't do any good.
  const handleProgress = React.useCallback((progressInfo: ProgressInfo) => {
    if (isMountedRef.current) {
      setProgress(progressInfo);
      return true;
    }
    return false;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch the list of all projects that this user has access to, then let the user choose one.
  const fetchProjects = React.useCallback(async () => {
    try {
      setProject(undefined);
      setButtonTitles([]);
      setHubStep(HubStep.FetchingProjects);
      console.log("Fetching projects list...");
      const startTicks = performance.now();
      const fetchedProjects = (await getProjects(handleProgress)).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", undefined, { sensitivity: "base" }));
      console.log(`Fetched ${fetchedProjects.length} projects.`);
      if (!isMountedRef.current) return;
      setProgress(undefined);
      setProjects(fetchedProjects);
      const elapsed = performance.now() - startTicks;
      console.log("Fetched projects list in " + (elapsed / 1000) + " seconds.");
      const names = fetchedProjects.filter((project) => project.name).map((project) => project.name!);
      setButtonTitles(names);
      setHubStep(HubStep.SelectProject);
    } catch (error) {
      // There was a problem fetching the projects. Show the error, and give the user the option
      // to sign out.
      presentError("FetchProjectsErrorFormat", error);
      setButtonTitles([signOutLabel]);
    }
  }, [isMountedRef, signOutLabel, handleProgress]);

  // Called when a user selects a project from the list, or when loading the
  // active project stored in localState.
  const selectProject = React.useCallback(async (project: ITwin) => {
    setHubStep(HubStep.FetchingIModels);
    setIModels([]);
    setButtonTitles([]);
    try {
      const imodelsClient = new IModelsClient();
      const getAuthorization = async (): Promise<Authorization> => {
        const token = (await IModelApp.getAccessToken()).slice("Bearer ".length);
        return { scheme: "Bearer", token };
      };
      const minimalIModels: MinimalIModel[] = [];
      // Fetch the list of iModels.
      for await (const minimalIModel of imodelsClient.iModels.getMinimalList({
        authorization: getAuthorization,
        urlParams: {
          projectId: project.id,
        }
      })) {
        minimalIModels.push(minimalIModel);
      }
      if (!isMountedRef.current) return;
      // Sort them by name using case-insensitive sort.
      minimalIModels.sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }));
      const iModelInfos: IModelInfo[] = [];
      let numCachedBriefcases = 0;
      for (const minimalIModel of minimalIModels) {
        const localBriefcases = await NativeApp.getCachedBriefcases(minimalIModel.id);
        if (!isMountedRef.current) return;
        const briefcase = localBriefcases.length > 0 ? localBriefcases[0] : undefined;
        if (briefcase) {
          ++numCachedBriefcases;
        }
        setHaveCachedBriefcase(numCachedBriefcases !== 0);
        iModelInfos.push({ minimalIModel, briefcase });
      }
      setIModels(iModelInfos);
      const names = minimalIModels.map((imodel) => imodel.displayName);
      setButtonTitles(names);
      setHubStep(HubStep.SelectIModel);
    } catch (error) {
      // There was a problem fetching iModels. Show the error, and give the user the option
      // to sign out.
      presentError("GetIModelsErrorFormat", error);
      setButtonTitles([signOutLabel]);
    }
  }, [isMountedRef, signOutLabel]);

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
        await IModelApp.authorizationClient?.getAccessToken();
        if (!isMountedRef.current) return;
        const elapsed = performance.now() - startTicks;
        console.log("Signin took " + (elapsed / 1000) + " seconds.");
        // Do whatever comes next.
        afterSignedIn();
      } catch (error) {
        // There was a problem signing in. Show the error, and give the user the option
        // to sign out.
        presentError("SigninErrorFormat", error);
        setButtonTitles([signOutLabel]);
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
  }, [project, initialized, fetchProjects, selectProject, isMountedRef, signOutLabel]);

  // onClick handler for the project list.
  const handleSelectProject = React.useCallback((index: number, name: string) => {
    let newProject;
    if (filter) {
      // This assumes that project names have to be unique. I believe that is true, but it might not be.
      // If not, we would have to store an index lookup as a state variable.
      newProject = projects[projects.findIndex((project) => project.name === name)];
    } else {
      newProject = projects[index];
    }
    setProject(newProject);
    // Remember the most recently selected project so that it will load by default later.
    localStorage.setItem("activeProjectInfo", JSON.stringify(newProject))
    selectProject(newProject);
  }, [projects, selectProject, filter]);

  // Open the imodel referenced by the briefcase. It is already downloaded before this is called.
  const openIModel = React.useCallback((briefcase: LocalBriefcaseProps) => {
    onOpen(briefcase.fileName, BriefcaseConnection.openFile(briefcase));
  }, [onOpen]);

  // Download the specified imodel, then open it once it has been downloaded.
  const downloadIModel = React.useCallback(async (iModel: MinimalIModel) => {
    const origButtonTitles = [...buttonTitles];
    setButtonTitles([]);
    setHubStep(HubStep.DownloadIModel);
    const opts: DownloadBriefcaseOptions = { syncMode: SyncMode.PullOnly };
    let downloader: BriefcaseDownloader | undefined;
    try {
      downloader = await NativeApp.requestDownloadBriefcase(project!.id!, iModel.id!, opts, undefined, (progress: ProgressInfo) => {
        if (!handleProgress(progress)) {
          console.log("Canceling download.");
          if (!downloader) {
            console.log("NO downloader to cancel!");
          }
          downloader?.requestCancel();
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
    } catch (error) {
      // There was an error downloading the iModel. Show the error, then go back to the
      // iModels list.
      presentError("DownloadErrorFormat", error);
      if (!isMountedRef.current) return;
      setButtonTitles(origButtonTitles);
      setHubStep(HubStep.SelectIModel);
    }
  }, [openIModel, project, isMountedRef, buttonTitles, handleProgress]);

  // onClick handler for iModel list.
  const handleSelectIModel = React.useCallback(async (index) => {
    console.log("Select iModel: " + JSON.stringify(iModels[index]));
    const iModel = iModels[index].minimalIModel;
    try {
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
    } catch (error) {
      // There was a problem loading the iModel. Show the error, and give the user the option
      // to sign out.
      presentError("LoadErrorFormat", error, "App");
      setButtonTitles([signOutLabel]);
    }
  }, [iModels, downloadIModel, openIModel, isMountedRef, signOutLabel]);

  let filteredTitles = buttonTitles;
  if (filter && hubStep === HubStep.SelectProject) {
    filteredTitles = buttonTitles.filter((value) => value.toLocaleLowerCase().indexOf(filter) !== -1);
  }
  // Convert the button titles into buttons.
  const buttons = filteredTitles.map((title: string, index: number) => {
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
            try {
              await MobileCore.deleteCachedBriefcase(briefcase);
              if (!isMountedRef.current) return;
              if (project) {
                selectProject(project);
              }
            } catch (error) {
              // There was a problem deleting the cached briefcase. Show the error.
              presentError("DeleteErrorFormat", error);
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
          if (title === signOutLabel) {
            if (IModelApp.authorizationClient instanceof ITMAuthorizationClient) {
              try {
                await IModelApp.authorizationClient.signOut();
              } catch (error) {
                console.log(`Error signing out: ${error}`);
              }
            }
            onBack();
          }
          if (hubStep === HubStep.SelectProject) {
            handleSelectProject(index, title);
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
            try {
              await MobileCore.deleteCachedBriefcases(project.id);
              if (!isMountedRef.current) return;
            } catch (error) {
              // There was a problem deleting the cached briefcases. Show the error, then refresh
              // anyway so if any were successfully deleted, it will reflect that.
              presentError("DeleteAllErrorFormat", error);
            }
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

  let filterSection;

  if (hubStep === HubStep.SelectProject && projects.length > 5) {
    const handleFilter = (value: string) => {
      if (!isMountedRef.current) return;
      setFilter(value.toLocaleLowerCase());
    };
    filterSection = (
      <div className="filter-section">
        <FilterControl placeholder={filterLabel} onFilter={handleFilter} />
      </div>
    );
  }
  return (
    <Screen>
      <div className="hub-screen">
        <div className="title">
          <VisibleBackButton onClick={onBack} />
          <div className="title-text">{titleLabels[hubStep] + progressString(progress)}</div>
          <div className="right-tools-parent">
            {moreButton}
          </div>
        </div>
        {filterSection}
        <div className="list">
          <div className="list-items">{buttons}</div>
        </div>
      </div>
    </Screen>
  );
}
