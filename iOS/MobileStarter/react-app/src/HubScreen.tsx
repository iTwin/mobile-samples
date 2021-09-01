/*---------------------------------------------------------------------------------------------
* Copyright (c) 2021 Bentley Systems, Incorporated. All rights reserved.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { VisibleBackButton } from "@itwin/mobileui-react";
import { ProjectScope } from "@bentley/ui-framework";
import { DefaultProjectServices } from "@bentley/ui-framework/lib/ui-framework/clientservices/DefaultProjectServices";
// import { IModelHubClient } from "@bentley/imodelhub-client";
import { AuthorizedFrontendRequestContext, IModelConnection, SnapshotConnection } from "@bentley/imodeljs-frontend";
import { Button, Screen } from "./Exports";
import "./HubScreen.scss";

/// Properties for the [[HubScreen]] React component.
export interface HubScreenProps {
  /// Callback called when an iModel is opened.
  onOpen: (filename: string, iModel: IModelConnection) => void;
  /// Callback called when the back button is pressed to go to the previous screen.
  onBack: () => void;
}

async function getProjects() {
  const projectServices = new DefaultProjectServices();
  return projectServices.getProjects(ProjectScope.MostRecentlyUsed, 40, 0);
}

/// React component to allow downloading and opening models from the iModel Hub.
export function HubScreen(props: HubScreenProps) {
  const {onOpen, onBack} = props;
  const [hubIModels, setHubIModels] = React.useState<string[]>([]);

  React.useEffect(() =>
  {
    const updateHubIModels = async () => {
      const requestContext = await AuthorizedFrontendRequestContext.create();
      const projects = await getProjects();
      const names = projects.map((project) => project.name);
      setHubIModels(names);
      // const hubClient = new IModelHubClient();
      // /* get the iModel name */
      // const imodels = await hubClient.iModels.get(requestContext, contextId, new IModelQuery().byId(iModelId));
      // IModelApp.iModelClient.
      // setHubIModels(await Messenger.query("getBimDocuments"));
    }
    updateHubIModels();
  }, []);

  const iModelButtons = hubIModels.map((document: string, index: number) => {
    const lastSlash = document.lastIndexOf("/");
    const documentName = lastSlash === -1 ? document : document.substring(lastSlash + 1);
    return <Button
      key={index}
      onClick={async () => {
        const iModel = await SnapshotConnection.openFile(document);
        onOpen(document, iModel);
      }}
      title={documentName} />
  });

  return (
    <Screen>
      <div className="hub-screen">
        <div className="title">
          <VisibleBackButton onClick={onBack} />
          <div className="title-text">Select iModel</div>          
        </div>
        <div className="list">
          <div className="list-items">{iModelButtons}</div>
        </div>
      </div>
    </Screen>
  );
}
