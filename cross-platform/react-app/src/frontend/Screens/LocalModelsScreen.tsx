/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { Messenger } from "@itwin/mobile-sdk-core";
import { BackButton, NavigationButton, useIsMountedRef } from "@itwin/mobile-ui-react";
import { Button, ModelNameCache, Screen, useLocalizedString } from "../Exports";
import { BriefcaseConnection, IModelConnection, NativeApp, SnapshotConnection } from "@itwin/core-frontend";
import { LocalBriefcaseProps } from "@itwin/core-common";
import "./LocalModelsScreen.scss";

/** Properties for the {@link LocalModelsScreen} React component. */
export interface LocalModelsScreenProps {
  /** Callback called when the user selects an iModel. */
  onOpen: (filename: string, iModelPromise: Promise<IModelConnection>) => Promise<void>;
  /** Callback called to go back to the previous screen (Home). */
  onBack: () => void;
}

/** React component that displays a list of iModels stored on the device. */
export function LocalModelsScreen(props: LocalModelsScreenProps) {
  const { onOpen, onBack } = props;
  const [snapshots, setSnapshots] = React.useState<string[]>([]);
  const [briefcases, setBriefcases] = React.useState<LocalBriefcaseProps[]>([]);
  const chooseFileLabel = useLocalizedString("LocalModelsScreen", "ChooseFile");
  const selectIModelLabel = useLocalizedString("Shared", "SelectIModel");
  const deviceDocumentsLabel = useLocalizedString("LocalModelsScreen", "DeviceDocuments");
  const hubDocumentsLabel = useLocalizedString("LocalModelsScreen", "HubDocuments");
  // Any time we do anything asynchronous, we have to check if the component is still mounted,
  // or it can lead to a run-time exception. The async calls used here are so fast as to be
  // extremely difficult to trigger a problem, but going to this screen and immediately backing
  // out could in theory trigger an exception.
  const isMountedRef = useIsMountedRef();

  // This function sends a message to the native code requesting an array containing the paths to
  // all the *.bim files in the app's Documents folder. Note that fetching this list should be
  // nearly instantaneous, so there is no loading spinner.
  const updateSnapshots = React.useCallback(async () => {
    const bimDocuments: string[] = await Messenger.query("getBimDocuments");
    if (!isMountedRef.current) return;
    setSnapshots(bimDocuments.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })));
  }, [isMountedRef]);

  // This function asks NativeApp for a list of cached briefcases. While that is 100% on-device, and
  // works with no network, for some reason it is not QUITE visually instantaneous. (It is less than
  // half a second on my iPad, but long enough that I see the screen without the cached models
  // before it then updates to include them.) As such, perhaps a loading spinner should be used, but
  // it is not used right now.
  const updateBriefcases = React.useCallback(async () => {
    const localBriefcases = await NativeApp.getCachedBriefcases();
    if (!isMountedRef.current) return;
    setBriefcases(localBriefcases);
  }, [isMountedRef]);

  // React effect run during component initialization.
  React.useEffect(() => {
    void updateSnapshots();
    void updateBriefcases();
  }, [updateSnapshots, updateBriefcases]);

  // Start with a button that uses the OS's file picker to choose a *.bim file.
  const bimButtons = [
    <Button
      key={"choose-file"}
      onClick={async () => {
        const document: string = await Messenger.query("chooseDocument");
        // Note: isMounted check not needed because onOpen comes from HomeScreen.
        if (document.length) {
          // Open the given snapshot iModel, and then pass it to the onOpen props callback.
          void onOpen(document, SnapshotConnection.openFile(document));
        }
      }}
      title={chooseFileLabel}
    />,
  ];

  // Convert the array of snapshot paths into an array of Button components, where each button loads
  // the corresponding snapshot iModel.
  const snapshotButtons = snapshots.map((document: string, index: number) => {
    const lastSlash = document.lastIndexOf("/");
    const documentName = lastSlash === -1 ? document : document.substring(lastSlash + 1);
    return <Button
      key={`snapshot-${index}`}
      onClick={async () => {
        // Open the given snapshot iModel, and then pass it to the onOpen props callback.
        void onOpen(document, SnapshotConnection.openFile(document));
      }}
      title={documentName} />;
  });

  if (snapshotButtons.length) {
    bimButtons.push(<div key="snapshots" className="localmodels-divider">{deviceDocumentsLabel}</div>);
    bimButtons.push(...snapshotButtons);
  }

  // Add a button for each downloaded hub iModel (cached briefcase).
  const briefcaseButtons = briefcases.map((localBriefcase: LocalBriefcaseProps, index: number) => {
    const name = ModelNameCache.get(localBriefcase.iModelId) ?? localBriefcase.iModelId;
    return <Button
      key={`briefcase-${index}`}
      title={name}
      onClick={async () => {
        void onOpen(localBriefcase.fileName, BriefcaseConnection.openFile({ ...localBriefcase, readonly: true }));
      }}
    />;
  });

  if (briefcaseButtons.length) {
    briefcaseButtons.sort((b1, b2) => b1.props.title.localeCompare(b2.props.title, undefined, { sensitivity: "base" }));
    bimButtons.push(<div key="briefcases" className="localmodels-divider">{hubDocumentsLabel}</div>);
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
              void updateSnapshots();
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
