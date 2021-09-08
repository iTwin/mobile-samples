/*---------------------------------------------------------------------------------------------
* Copyright (c) 2021 Bentley Systems, Incorporated. All rights reserved.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { VisibleBackButton } from "@itwin/mobileui-react";
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

/// React component to allow downloading and opening models from the iModel Hub.
export function HubScreen(props: HubScreenProps) {
  const { onOpen, onBack } = props;
  const [hubStep, setHubStep] = React.useState(HubStep.SignIn);
  const [projects, setProjects] = React.useState<ProjectInfo[]>([]);
  const [hubIModels, setHubIModels] = React.useState<HubIModel[]>([]);
  const [buttonTitles, setButtonTitles] = React.useState<string[]>([]);
  const [project, setProject] = React.useState<ProjectInfo>();

  React.useEffect(() => {
    const updateHubIModels = async () => {
      try {
        let startTicks = performance.now();
        if (!IModelApp.authorizationClient?.hasSignedIn) {
          console.log("About to sign in.");
          await IModelApp.authorizationClient?.signIn();
        }
        setHubStep(HubStep.FetchingProjects);
        let elapsed = performance.now() - startTicks;
        console.log("Signed in: " + elapsed);
        startTicks = performance.now();
        const fetchedProjects = await getProjects();
        setProjects(fetchedProjects);
        setHubStep(HubStep.SelectProject);
        elapsed = performance.now() - startTicks;
        console.log("Fetched projects list in " + (elapsed / 1000) + "seconds.");
        console.log("Projects: " + JSON.stringify(fetchedProjects));
        const names = fetchedProjects.map((project) => project.name);
        setButtonTitles(names);
      } catch (error) {
        setButtonTitles(["" + error]);
      }
    }
    updateHubIModels();
  }, []);

  const selectProject = React.useCallback(async (index) => {
    setHubStep(HubStep.FetchingIModels);
    const hubClient = new IModelHubClient();
    // /* get the iModel name */
    const requestContext = await AuthorizedFrontendRequestContext.create();
    setProject(projects[index]);
    const imodels = (await hubClient.iModels.get(requestContext, projects[index].wsgId)).sort((a, b) => (a.name ?? "<Unknown").localeCompare(b.name ?? "<Unknown>", undefined, { sensitivity: "base" }));
    setHubIModels(imodels);
    const names = imodels.map((imodel) => imodel.name ?? "<Unknown>");
    setButtonTitles(names);
    setHubStep(HubStep.SelectIModel);
  }, [projects]);

  const openIModel = React.useCallback((briefcase: LocalBriefcaseProps) => {
    onOpen(briefcase.fileName, BriefcaseConnection.openFile(briefcase));
  }, [onOpen]);

  const downloadIModel = React.useCallback(async (iModel: HubIModel) => {
    setHubStep(HubStep.DownloadIModel);
    const opts: DownloadBriefcaseOptions = { syncMode: SyncMode.PullOnly };
    const downloader = await NativeApp.requestDownloadBriefcase(project!.wsgId!, iModel.id!, opts);
    await downloader.downloadPromise;
    const localBriefcases = await NativeApp.getCachedBriefcases(iModel.id);
    if (localBriefcases.length === 0) {
      console.error("Error downloading iModel.");
    } else {
      openIModel(localBriefcases[0]);
    }
  }, [openIModel, project]);

  const selectIModel = React.useCallback(async (index) => {
    console.log("Select iModel: " + JSON.stringify(hubIModels[index]));
    const iModel = hubIModels[index];
    const localBriefcases = await NativeApp.getCachedBriefcases(iModel.id);
    if (localBriefcases.length === 0) {
      downloadIModel(iModel);
    } else {
      openIModel(localBriefcases[0]);
    }
  }, [hubIModels, downloadIModel, openIModel]);

  const iModelButtons = buttonTitles.map((document: string, index: number) => {
    const lastSlash = document.lastIndexOf("/");
    const documentName = lastSlash === -1 ? document : document.substring(lastSlash + 1);
    return <Button
      key={index}
      onClick={async () => {
        if (hubStep === HubStep.SelectProject) {
          selectProject(index);
        }
        if (hubStep === HubStep.SelectIModel) {
          selectIModel(index);
        }
      }}
      title={documentName} />
  });

  return (
    <Screen>
      <div className="hub-screen">
        <div className="title">
          <VisibleBackButton onClick={onBack} />
          <div className="title-text">{titles[hubStep]}</div>
        </div>
        <div className="list">
          <div className="list-items">{iModelButtons}</div>
        </div>
      </div>
    </Screen>
  );
}
