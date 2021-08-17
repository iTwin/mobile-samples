import React from "react";
import { Messenger } from "@itwin/mobileui-react";
import { Button, Screen } from "./Exports";
import "./BimDocumentsScreen.scss";
import { IModelConnection, SnapshotConnection } from "@bentley/imodeljs-frontend";

export interface BimDocumentsScreenProps {
  onOpen: (filename: string, iModel: IModelConnection) => void;
}

export function BimDocumentsScreen(props: BimDocumentsScreenProps) {
  const [bimDocuments, setBimDocuments] = React.useState<string[]>([]);

  React.useEffect(() =>
  {
    const updateBimDocuments = async () => {
      setBimDocuments(await Messenger.query("getBimDocuments"));
    }
    updateBimDocuments();
  }, []);

  const bimButtons = bimDocuments.map((document: string, index: number) => {
    const lastSlash = document.lastIndexOf("/");
    const documentName = lastSlash === -1 ? document : document.substring(lastSlash + 1);
    return <Button
      key={index}
      onClick={async () => {
        const iModel = await SnapshotConnection.openFile(document);
        props.onOpen(document, iModel);
      }}
      title={documentName} />
  });

  return (
    <Screen>
      <div className="bim-documents-screen">
        <div className="title">Select an iModel.</div>
        <div className="list">
          <div className="list-items">{bimButtons}</div>
        </div>
      </div>
    </Screen>
  );
}
