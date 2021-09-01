/*---------------------------------------------------------------------------------------------
* Copyright (c) 2021 Bentley Systems, Incorporated. All rights reserved.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { Messenger } from "@itwin/mobile-core";
import { VisibleBackButton } from "@itwin/mobileui-react";
import { Button, Screen } from "./Exports";
import { IModelConnection, SnapshotConnection } from "@bentley/imodeljs-frontend";
import "./SnapshotsScreen.scss";

/// Properties for the [[SnapshotsScreen]] React component.
export interface SnapshotsScreenProps {
  /// Callback called when the user selects a snapshot iModel.
  onOpen: (filename: string, iModel: IModelConnection) => void;
  /// Callback called to go back to the previous screen (Home).
  onBack: () => void;
}

/// React component that displays a list of snapshot iModels stored in the app's Documents folder.
export function SnapshotsScreen(props: SnapshotsScreenProps) {
  const {onOpen, onBack} = props;
  const [snapshots, setSnapshots] = React.useState<string[]>([]);

  // React effect run during component initialization.
  React.useEffect(() =>
  {
    // This function sends a message to the native code requesting an array containing the paths to all
    // the *.bim files in the app's Documents folder. Note that fetching this list should be nearly
    // instantaneous, so there is no loading spinner.
    // React.useEffect callbacks cannot be async, since they have a meaningful return value that is
    // not a Promise.
    const updateBimDocuments = async () => {
      const bimDocuments: string[] = await Messenger.query("getBimDocuments");
      setSnapshots(bimDocuments.sort((a, b) => a.localeCompare(b, undefined, {sensitivity: "base"})));
    }
    updateBimDocuments();
  }, []);

  // Convert the array of paths into an array of [[Button]] components, where each button loads the
  // corresponding snapshot iModel.
  const bimButtons = snapshots.map((document: string, index: number) => {
    const lastSlash = document.lastIndexOf("/");
    const documentName = lastSlash === -1 ? document : document.substring(lastSlash + 1);
    return <Button
      key={index}
      onClick={async () => {
        // Open the given snapshot iModel, and then pass it to the onOpen props callback.
        const iModel = await SnapshotConnection.openFile(document);
        onOpen(document, iModel);
      }}
      title={documentName} />
  });

  // Add a button to the beginning of the list to use the OS's file picker to choose a *.bim file.
  bimButtons.unshift(
    <Button
      key={bimButtons.length}
      onClick={async () => {
        const document: string = await Messenger.query("chooseDocument");
        if (document.length) {
          // Open the given snapshot iModel, and then pass it to the onOpen props callback.
          const iModel = await SnapshotConnection.openFile(document);
          onOpen(document, iModel);
        }
      }}
      title={"Choose File..."} 
    />
  );

  return (
    <Screen>
      <div className="snapshots-screen">
        <div className="title">
          <VisibleBackButton onClick={onBack} />
          <div className="title-text">Select iModel</div>          
        </div>
        <div className="list">
          <div className="list-items">{bimButtons}</div>
        </div>
      </div>
    </Screen>
  );
}
