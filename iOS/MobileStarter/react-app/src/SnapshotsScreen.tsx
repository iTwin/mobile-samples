/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { Messenger } from "@itwin/mobile-sdk-core";
import { NavigationButton, VisibleBackButton } from "@itwin/mobile-ui-react";
import { Button, i18n, Screen } from "./Exports";
import { IModelConnection, SnapshotConnection } from "@itwin/core-frontend";
import "./SnapshotsScreen.scss";

/// Properties for the [[SnapshotsScreen]] React component.
export interface SnapshotsScreenProps {
  /// Callback called when the user selects a snapshot iModel.
  onOpen: (filename: string, iModelPromise: Promise<IModelConnection>) => Promise<void>;
  /// Callback called to go back to the previous screen (Home).
  onBack: () => void;
}

/// React component that displays a list of snapshot iModels stored in the app's Documents folder.
export function SnapshotsScreen(props: SnapshotsScreenProps) {
  const { onOpen, onBack } = props;
  const [snapshots, setSnapshots] = React.useState<string[]>([]);
  const chooseFileLabel = React.useMemo(() => i18n("SnapshotsScreen", "ChooseFile"), []);
  const selectIModelLabel = React.useMemo(() => i18n("Shared", "SelectIModel"), []);

  // This function sends a message to the native code requesting an array containing the paths to all
  // the *.bim files in the app's Documents folder. Note that fetching this list should be nearly
  // instantaneous, so there is no loading spinner.
  const updateBimDocuments = React.useCallback(async () => {
    const bimDocuments: string[] = await Messenger.query("getBimDocuments");
    setSnapshots(bimDocuments.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })));
  }, []);

  // React effect run during component initialization.
  React.useEffect(() => {
    updateBimDocuments();
  }, [updateBimDocuments]);

  // Convert the array of paths into an array of [[Button]] components, where each button loads the
  // corresponding snapshot iModel.
  const bimButtons = snapshots.map((document: string, index: number) => {
    const lastSlash = document.lastIndexOf("/");
    const documentName = lastSlash === -1 ? document : document.substring(lastSlash + 1);
    return <Button
      key={index}
      onClick={async () => {
        // Open the given snapshot iModel, and then pass it to the onOpen props callback.
        onOpen(document, SnapshotConnection.openFile(document));
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
          onOpen(document, SnapshotConnection.openFile(document));
        }
      }}
      title={chooseFileLabel}
    />
  );

  return (
    <Screen>
      <div className="snapshots-screen">
        <div className="title">
          <div className="back-button">
            <VisibleBackButton onClick={onBack} />
          </div>
          <div className="title-text">{selectIModelLabel}</div>
          <div className="refresh">
            <NavigationButton
              iconSpec="icon-refresh"
              onClick={() => {
                updateBimDocuments();
              }}
            />
          </div>
        </div>
        <div className="list">
          <div className="list-items">{bimButtons}</div>
        </div>
      </div>
    </Screen>
  );
}
