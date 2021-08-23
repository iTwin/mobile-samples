import React from "react";
import { Messenger, VisibleBackButton } from "@itwin/mobileui-react";
import { Button, Screen } from "./Exports";
import { IModelConnection, SnapshotConnection } from "@bentley/imodeljs-frontend";
import "./SnapshotsScreen.scss";

export interface SnapshotsScreenProps {
  onOpen: (filename: string, iModel: IModelConnection) => void;
  onBack: () => void;
}

export function SnapshotsScreen(props: SnapshotsScreenProps) {
  const {onOpen, onBack} = props;
  const [snapshots, setSnapshots] = React.useState<string[]>([]);

  React.useEffect(() =>
  {
    const updateBimDocuments = async () => {
      const bimDocuments: string[] = await Messenger.query("getBimDocuments");
      setSnapshots(bimDocuments.sort((a, b) => a.localeCompare(b, undefined, {sensitivity: "base"})));
    }
    updateBimDocuments();
  }, []);

  const bimButtons = snapshots.map((document: string, index: number) => {
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
      <div className="snapshots-screen">
        <div className="title">
          <VisibleBackButton onClick={onBack} />
          Select an iModel.
        </div>
        <div className="list">
          <div className="list-items">{bimButtons}</div>
        </div>
      </div>
    </Screen>
  );
}
