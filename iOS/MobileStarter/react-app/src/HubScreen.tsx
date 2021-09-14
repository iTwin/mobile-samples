/*---------------------------------------------------------------------------------------------
* Copyright (c) 2021 Bentley Systems, Incorporated. All rights reserved.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { VisibleBackButton } from "@itwin/mobile-ui-react";
import { ProjectInfo, ProjectScope } from "@bentley/ui-framework";
import { DefaultProjectServices } from "@bentley/ui-framework/lib/ui-framework/clientservices/DefaultProjectServices";
import { AuthorizedFrontendRequestContext, BriefcaseConnection, DownloadBriefcaseOptions, IModelApp, IModelConnection, NativeApp } from "@bentley/imodeljs-frontend";
import { HubIModel, IModelHubClient } from "@bentley/imodelhub-client";
import { LocalBriefcaseProps, SyncMode } from "@bentley/imodeljs-common";
import { Button, Screen } from "./Exports";
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
  const projectServices = new DefaultProjectServices();
  return projectServices.getProjects(ProjectScope.MostRecentlyUsed, 40, 0);
}

enum HubStep {
  SignIn,
  FetchingProjects,
  SelectProject,
  FetchingIModels,
  SelectIModel,
  DownloadIModel,
}

const titles = [
  "Connecting...",
  "Getting Project List...",
  "Select Project",
  "Getting iModel List...",
  "Select iModel",
  "Downloading iModel..."
];

function getActiveProject() {
  const projectInfoJson = localStorage.getItem("activeProjectInfo");
  if (projectInfoJson) {
    return JSON.parse(projectInfoJson) as ProjectInfo;
  }
  return undefined;
}

/// React component to allow downloading and opening models from the iModel Hub.
export function HubScreen(props: HubScreenProps) {
  const { onOpen, onBack } = props;
  const [hubStep, setHubStep] = React.useState(HubStep.SignIn);
  const [projects, setProjects] = React.useState<ProjectInfo[]>([]);
  const [hubIModels, setHubIModels] = React.useState<HubIModel[]>([]);
  const [buttonTitles, setButtonTitles] = React.useState<string[]>([]);
  const [project, setProject] = React.useState(getActiveProject());
  const [initialized, setInitialized] = React.useState(false);

  // Fetch the list of all projects that this user has access to, then let the user choose one.
  const fetchProjects = React.useCallback(async () => {
    try {
      setProject(undefined);
      setHubStep(HubStep.FetchingProjects);
      console.log("Fetching projects list...");
      const startTicks = performance.now();
      const fetchedProjects = await getProjects();
      setProjects(fetchedProjects);
      setHubStep(HubStep.SelectProject);
      const elapsed = performance.now() - startTicks;
      console.log("Fetched projects list in " + (elapsed / 1000) + " seconds.");
      const names = fetchedProjects.map((project) => project.name);
      setButtonTitles(names);
    } catch (error) {
      // There was a problem fetching the projects. Show the error, and give the user the option
      // to sign out. (A token expired error requires sign out.)
      setButtonTitles(["Fetch Projects " + error, "Sign Out"]);
    }
  }, []);

  // Called when a user selects a project from the list, or when loading the
  // active project stored in localState.
  const selectProject = React.useCallback(async (project: ProjectInfo) => {
    setHubStep(HubStep.FetchingIModels);
    const hubClient = new IModelHubClient();
    const requestContext = await AuthorizedFrontendRequestContext.create();
    const getName = (imodel: HubIModel) => {
      return imodel.name ?? "<Unknown>";
    };
    // Fetch the list of imodels, then sort them by name using case-insensitive sort.
    const imodels = (await hubClient.iModels.get(requestContext, project.wsgId)).sort((a, b) => (getName(a)).localeCompare(getName(b), undefined, { sensitivity: "base" }));
    setHubIModels(imodels);
    const names = imodels.map((imodel) => getName(imodel));
    setButtonTitles(names);
    setHubStep(HubStep.SelectIModel);
  }, []);

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
        await IModelApp.authorizationClient?.signIn();
        const elapsed = performance.now() - startTicks;
        console.log("Signin took " + (elapsed / 1000) + " seconds.");
        // Do whatever comes next.
        afterSignedIn();
      } catch (error) {
        // There was a problem signing in. Show the error, and give the user the option
        // to sign out. (A token expired error requires sign out.)
        setButtonTitles(["Fetch Projects " + error, "Sign Out"]);
        setButtonTitles(["Signin " + error, "Sign Out"]);
      }
    }
    // We only want to do this once, and since the effect gets called when various things
    // change, use the initialized state variable to track whether or not we have executed.
    if (!initialized) {
      // Set the initialized state variable to true to prevent us from redoing this.
      setInitialized(true);
      if (IModelApp.authorizationClient?.hasSignedIn) {
        // We're already signed in, so do whatever comes next.
        afterSignedIn();
      } else {
        // Sign in, then do whatever comes next.
        signin();
      }
    }
  }, [project, initialized, fetchProjects, selectProject]);

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
    setHubStep(HubStep.DownloadIModel);
    const opts: DownloadBriefcaseOptions = { syncMode: SyncMode.PullOnly };
    const downloader = await NativeApp.requestDownloadBriefcase(project!.wsgId!, iModel.id!, opts);
    // Wait for the download to complete.
    await downloader.downloadPromise;
    const localBriefcases = await NativeApp.getCachedBriefcases(iModel.id);
    if (localBriefcases.length === 0) {
      // This should never happen, since we just downloaded it, but check, just in case.
      console.error("Error downloading iModel.");
    } else {
      // Open the now-downloaded imodel.
      openIModel(localBriefcases[0]);
    }
  }, [openIModel, project]);

  // onClick handler for iModel list.
  const handleSelectIModel = React.useCallback(async (index) => {
    console.log("Select iModel: " + JSON.stringify(hubIModels[index]));
    const iModel = hubIModels[index];
    // First, check to see if we have a local copy of the iModel.
    // NOTE: This does not check to see if the iModel has been updated since it was last
    // downloaded.
    const localBriefcases = await NativeApp.getCachedBriefcases(iModel.id);
    if (localBriefcases.length === 0) {
      // We don't have a local copy of the iModel, so download it and then open it.
      downloadIModel(iModel);
    } else {
      // We do have a local copy of the iModel, so open that local copy.
      openIModel(localBriefcases[0]);
    }
  }, [hubIModels, downloadIModel, openIModel]);

  // Convert the button titles into buttons.
  const iModelButtons = buttonTitles.map((document: string, index: number) => {
    const lastSlash = document.lastIndexOf("/");
    const documentName = lastSlash === -1 ? document : document.substring(lastSlash + 1);
    return <Button
      key={index}
      onClick={async () => {
        if (document === "Sign Out") {
          IModelApp.authorizationClient?.signOut();
          onBack();
        }
        if (hubStep === HubStep.SelectProject) {
          handleSelectProject(index);
        }
        if (hubStep === HubStep.SelectIModel) {
          handleSelectIModel(index);
        }
      }}
      title={documentName} />
  });

  let changeProjectButton;
  if (project) {
    // If the user has selected a project, give them the chance to select a different one.
    changeProjectButton = (
      <div className="change-project ">
        <div
          onClick={() => fetchProjects()}
        >
          Change Project
        </div>
      </div>
    );
  }
  return (
    <Screen>
      <div className="hub-screen">
        <div className="title">
          <VisibleBackButton onClick={onBack} />
          <div className="title-text">{titles[hubStep]}</div>
          {changeProjectButton}
        </div>
        <div className="list">
          <div className="list-items">{iModelButtons}</div>
        </div>
      </div>
    </Screen>
  );
}
