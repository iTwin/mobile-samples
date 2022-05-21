/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { Messenger } from "@itwin/mobile-sdk-core";
import { BackButton, NavigationButton } from "@itwin/mobile-ui-react";
import { Button, i18n, ModelNameCache, Screen } from "../Exports";
import { BriefcaseConnection, IModelConnection, NativeApp, SnapshotConnection } from "@itwin/core-frontend";
import { LocalBriefcaseProps } from "@itwin/core-common";
import "./LocalModelsScreen.scss";

/// Properties for the [[LocalModelsScreen]] React component.
export interface LocalModelsScreenProps {
  /// Callback called when the user selects an iModel.
  onOpen: (filename: string, iModelPromise: Promise<IModelConnection>) => Promise<void>;
  /// Callback called to go back to the previous screen (Home).
  onBack: () => void;
}

/// React component that displays a list of iModels stored on the device.
export function LocalModelsScreen(props: LocalModelsScreenProps) {
  const { onOpen, onBack } = props;
  const [snapshots, setSnapshots] = React.useState<string[]>([]);
  const chooseFileLabel = React.useMemo(() => i18n("LocalModelsScreen", "ChooseFile"), []);
  const selectIModelLabel = React.useMemo(() => i18n("Shared", "SelectIModel"), []);
  const [briefcases, setBriefcases] = React.useState<LocalBriefcaseProps[]>([]);
  const deviceDocumentsLabel = React.useMemo(() => i18n("LocalModelsScreen", "DeviceDocuments"), []);
  const hubDocumentsLabel = React.useMemo(() => i18n("LocalModelsScreen", "HubDocuments"), []);

  // This function sends a message to the native code requesting an array containing the paths to all
  // the *.bim files in the app's Documents folder. Note that fetching this list should be nearly
  // instantaneous, so there is no loading spinner.
  const updateBimDocuments = React.useCallback(async () => {
    const bimDocuments: string[] = await Messenger.query("getBimDocuments");
    setSnapshots(bimDocuments.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })));
  }, []);

  // React effect run during component initialization.
  React.useEffect(() => {
    updateBimDocuments(); // eslint-disable-line @typescript-eslint/no-floating-promises
  }, [updateBimDocuments]);

  const updateBriefcases = React.useCallback(async () => {
    const localBriefcases = await NativeApp.getCachedBriefcases();
    setBriefcases(localBriefcases);
  }, []);

  React.useEffect(() => {
    updateBriefcases(); // eslint-disable-line @typescript-eslint/no-floating-promises
  }, [updateBriefcases]);

  // Add a button to the beginning of the list to use the OS's file picker to choose a *.bim file.
  const bimButtons = [
    <Button
      key={0}
      onClick={async () => {
        const document: string = await Messenger.query("chooseDocument");
        if (document.length) {
          // Open the given snapshot iModel, and then pass it to the onOpen props callback.
          onOpen(document, SnapshotConnection.openFile(document)); // eslint-disable-line @typescript-eslint/no-floating-promises
        }
      }}
      title={chooseFileLabel}
    />,
  ];

  // Convert the array of paths into an array of [[Button]] components, where each button loads the
  // corresponding snapshot iModel.
  const snapshotButtons = snapshots.map((document: string, index: number) => {
    const lastSlash = document.lastIndexOf("/");
    const documentName = lastSlash === -1 ? document : document.substring(lastSlash + 1);
    return <Button
      key={index + bimButtons.length}
      onClick={async () => {
        // Open the given snapshot iModel, and then pass it to the onOpen props callback.
        onOpen(document, SnapshotConnection.openFile(document)); // eslint-disable-line @typescript-eslint/no-floating-promises
      }}
      title={documentName} />;
  });

  if (snapshotButtons.length) {
    bimButtons.push(<div className="localmodels-divider">{deviceDocumentsLabel}</div>);
    bimButtons.push(...snapshotButtons);
  }

  // Add a button for each downloaded hub iModel (cached briefcase).
  const briefcaseButtons = briefcases.map((localBriefcase: LocalBriefcaseProps, index: number) => {
    const name = ModelNameCache.getModelName(localBriefcase.iModelId) ?? localBriefcase.iModelId;
    return <Button
      key={index + bimButtons.length}
      title={name}
      onClick={async () => {
        onOpen(localBriefcase.fileName, BriefcaseConnection.openFile(localBriefcase)); // eslint-disable-line @typescript-eslint/no-floating-promises
      }}
    />;
  });

  if (briefcaseButtons.length) {
    briefcaseButtons.sort((b1, b2) => b1.props.title.localeCompare(b2.props.title));
    bimButtons.push(<div className="localmodels-divider">{hubDocumentsLabel}</div>);
    bimButtons.push(...briefcaseButtons);
  }

  return (
    <Screen className="localmodels-screen">
      <div className="title">
        <div className="back-button">
          <BackButton onClick={onBack} />
        </div>
        <div className="title-text">{selectIModelLabel}</div>
        <div className="refresh">
          <NavigationButton
            iconSpec="icon-refresh"
            onClick={() => {
              updateBimDocuments(); // eslint-disable-line @typescript-eslint/no-floating-promises
            }}
          />
        </div>
      </div>
      <div className="list">
        <div className="list-items">{bimButtons}</div>
      </div>
    </Screen>
  );
}
