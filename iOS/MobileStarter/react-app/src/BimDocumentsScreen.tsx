import React from "react";
import { Messenger, VisibleBackButton } from "@itwin/mobileui-react";
import { Button, Screen } from "./Exports";
import { IModelConnection, SnapshotConnection } from "@bentley/imodeljs-frontend";
import "./BimDocumentsScreen.scss";

export interface BimDocumentsScreenProps {
  onOpen: (filename: string, iModel: IModelConnection) => void;
  onBack: () => void;
}

export function BimDocumentsScreen(props: BimDocumentsScreenProps) {
  const {onOpen, onBack} = props;
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
        onOpen(document, iModel);
      }}
      title={documentName} />
  });

  return (
    <Screen>
      <div className="bim-documents-screen">
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
