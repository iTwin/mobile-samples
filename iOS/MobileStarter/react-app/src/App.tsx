import React from "react";
import { IOSApp, IOSAppOpts } from "@bentley/mobile-manager/lib/MobileFrontend";
import { IModelApp, IModelConnection } from "@bentley/imodeljs-frontend";
import { Presentation } from "@bentley/presentation-frontend";
import { Messenger, MobileUi } from "@itwin/mobileui-react";
import { BimDocumentsScreen, LoadingScreen, ModelScreen } from "./Exports";
import { getSupportedRpcs } from "./common/rpcs";
import "./App.scss";

enum ActiveScreen {
  Loading,
  BimDocuments,
  Model,
};

function App() {
  const [activeScreen, setActiveScreen] = React.useState(ActiveScreen.Loading);
  const [modelFilename, setModelFilename] = React.useState("");
  const [iModel, setIModel] = React.useState<IModelConnection>();

  React.useEffect(() => {
    const initialize = async () => {
      try {
        console.log("Initializing...");
        const opts: IOSAppOpts = {
          iModelApp: {
            rpcInterfaces: getSupportedRpcs(),
          },
          nativeApp: { authConfig: { clientId: "", redirectUri: "", scope: "" } },
        }
        await Messenger.initialize();
        Messenger.sendMessage("loading");
        await IOSApp.startup(opts);
        await Presentation.initialize();
        await MobileUi.initialize(IModelApp.i18n);
        Messenger.sendMessage("didFinishLaunching");
        setActiveScreen(ActiveScreen.BimDocuments);
      } catch (ex) {
        console.log("Exception during initialization: " + ex);
      }
    };
    initialize();
  }, []);

  const handleOpen = React.useCallback((filename: string, newIModel: IModelConnection) => {
    setModelFilename(filename);
    setIModel(newIModel);
    setActiveScreen(ActiveScreen.Model);
  }, []);

  const handleModelBack = React.useCallback(() => {
    const closeIModel = async () => {
      const viewport = IModelApp.viewManager.getFirstOpenView();
      if (viewport) {
        IModelApp.viewManager.dropViewport(viewport);
      }
      await iModel?.close();
      setIModel(undefined);
    };
    closeIModel();
    setActiveScreen(ActiveScreen.BimDocuments);
    setModelFilename("");
  }, [iModel]);

  switch (activeScreen) {
    case ActiveScreen.BimDocuments:
      return <BimDocumentsScreen onOpen={handleOpen} />;
    case ActiveScreen.Model:
      return <ModelScreen filename={modelFilename} iModel={iModel!} onBack={handleModelBack}/>
    default:
      return <LoadingScreen />;
  }
}

export default App;
