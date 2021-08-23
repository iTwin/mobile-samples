import React from "react";
import { IOSApp, IOSAppOpts } from "@bentley/mobile-manager/lib/MobileFrontend";
import { IModelApp, IModelConnection } from "@bentley/imodeljs-frontend";
import { Presentation } from "@bentley/presentation-frontend";
import { Messenger, MobileUi } from "@itwin/mobileui-react";
import { ActiveScreen, SnapshotsScreen, HomeScreen, HubScreen, LoadingScreen, ModelScreen } from "./Exports";
import { getSupportedRpcs } from "./common/rpcs";
import "./App.scss";

interface ActiveInfo {
  activeScreen: ActiveScreen;
  cleanup?: () => void;
}

function App() {
  const [activeScreen, setActiveScreen] = React.useState(ActiveScreen.Loading);
  const [modelFilename, setModelFilename] = React.useState("");
  const [iModel, setIModel] = React.useState<IModelConnection>();
  const [activeStack, setActiveStack] = React.useState<ActiveInfo[]>([{activeScreen: ActiveScreen.Loading}]);
  const [initialized, setInitialized] = React.useState(false);

  const pushActiveInfo = React.useCallback((screen: ActiveScreen, cleanup?: () => void) => {
    setActiveStack((old) => {
      return [...old, {activeScreen: activeScreen, cleanup}];
    });
    setActiveScreen(screen);
  }, [activeScreen]);

  React.useEffect(() => {
    const initialize = async () => {
      try {
        console.log("Initializing...");
        const opts: IOSAppOpts = {
          iModelApp: {
            rpcInterfaces: getSupportedRpcs(),
          },
        }
        await Messenger.initialize();
        Messenger.sendMessage("loading");
        await IOSApp.startup(opts);
        await Presentation.initialize();
        await MobileUi.initialize(IModelApp.i18n);
        Messenger.sendMessage("didFinishLaunching");
        pushActiveInfo(ActiveScreen.Home);
      } catch (ex) {
        console.log("Exception during initialization: " + ex);
      }
    };
    if (!initialized) {
      setInitialized(true);
      initialize();
    }
  }, [pushActiveInfo, initialized]);

  const handleOpen = React.useCallback((filename: string, newIModel: IModelConnection) => {
    setModelFilename(filename);
    setIModel(newIModel);
    const cleanup = async () => {
      const viewport = IModelApp.viewManager.getFirstOpenView();
      if (viewport) {
        IModelApp.viewManager.dropViewport(viewport);
      }
      await iModel?.close();
      setIModel(undefined);
      setModelFilename("");
    };
    pushActiveInfo(ActiveScreen.Model, cleanup);
  }, [iModel, pushActiveInfo]);

  const handleBack = React.useCallback(() => {
    const lastScreen = activeStack[activeStack.length - 1];
    lastScreen.cleanup?.();
    setActiveStack((old) => {
      return old.slice(0, old.length - 1);
    });
    setActiveScreen(lastScreen.activeScreen);
  }, [activeStack]);

  const handleHomeSelect = React.useCallback((screen: ActiveScreen) => {
    pushActiveInfo(screen);
  }, [pushActiveInfo]);

  switch (activeScreen) {
    case ActiveScreen.Home:
      return <HomeScreen onSelect={handleHomeSelect} />;
    case ActiveScreen.Snapshots:
      return <SnapshotsScreen onOpen={handleOpen} onBack={handleBack} />;
    case ActiveScreen.Hub:
      return <HubScreen onOpen={handleOpen} onBack={handleBack} />;
    case ActiveScreen.Model:
      return <ModelScreen filename={modelFilename} iModel={iModel!} onBack={handleBack}/>
    default:
      return <LoadingScreen />;
  }
}

export default App;
