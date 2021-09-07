/*---------------------------------------------------------------------------------------------
* Copyright (c) 2021 Bentley Systems, Incorporated. All rights reserved.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { combineReducers, createStore, Store } from "redux";
import { IOSApp, IOSAppOpts } from "@bentley/mobile-manager/lib/MobileFrontend";
import { IModelApp, IModelConnection, SnapshotConnection } from "@bentley/imodeljs-frontend";
import { FrameworkReducer, FrameworkState, UiFramework } from "@bentley/ui-framework";
import { Presentation } from "@bentley/presentation-frontend";
import { Messenger, presentAlert } from "@itwin/mobile-core";
import { MobileUi } from "@itwin/mobileui-react";
import { ActiveScreen, SnapshotsScreen, HomeScreen, HubScreen, LoadingScreen, ModelScreen } from "./Exports";
import { getSupportedRpcs } from "./common/rpcs";
import "./App.scss";

/// Interface to allow switching from one screen to another.
interface ActiveInfo {
  /// The active screen represented by this entry in the activeStack.
  activeScreen: ActiveScreen;
  /// The optional cleanup function to call when switching to another screen.
  cleanup?: () => void;
}

export interface RootState {
  frameworkState?: FrameworkState;
}

const rootReducer = combineReducers({
  frameworkState: FrameworkReducer,
});
const anyWindow: any = window;
const appReduxStore: Store<RootState> = createStore(rootReducer, anyWindow.__REDUX_DEVTOOLS_EXTENSION__ && anyWindow.__REDUX_DEVTOOLS_EXTENSION__());

function App() {
  // Start out on the Loading screen.
  const [activeScreen, setActiveScreen] = React.useState(ActiveScreen.Loading);
  // Keep a stack of active screens, so that handleBack can automatically go to the correct place.
  const [activeStack, setActiveStack] = React.useState<ActiveInfo[]>([{activeScreen}]);
  const [modelFilename, setModelFilename] = React.useState("");
  // The currently loaded iModel, or undefined if none is loaded.
  const [iModel, setIModel] = React.useState<IModelConnection>();
  const [initialized, setInitialized] = React.useState(false);
  const [openUrlPath, setOpenUrlPath] = React.useState<string>();

  const pushActiveInfo = React.useCallback((screen: ActiveScreen, cleanup?: () => void) => {
    // Push the current activeScreen onto the activeStack, along with the cleanup function for the new active screen.
    // Note: the top entry of the stack contains the previous active screen, along with an optional cleanup
    // function for the new active screen. The activeScreen variable (set after updating the activeStack)
    // tracks the current active screen.
    setActiveStack((old) => {
      return [...old, {activeScreen: activeScreen, cleanup}];
    });
    // Set the new screen as active.
    setActiveScreen(screen);
  }, [activeScreen]);

  React.useEffect(() => {
    const initialize = async () => {
      try {
        console.log("Initializing...");
        // Note: Messenger is initialized inside MobileUi.initialize, but doing so here allows
        // us to send a message before that has happened. The native-side code shows the hidden
        // web view when it receives the "loading" message.
        await Messenger.initialize();
        Messenger.sendMessage("loading");
        const opts: IOSAppOpts = {
          iModelApp: {
            rpcInterfaces: getSupportedRpcs(),
          },
        }
        await IOSApp.startup(opts);
        await UiFramework.initialize(appReduxStore);
        await Presentation.initialize();
        await MobileUi.initialize(IModelApp.i18n);
        // The following message lets the native side know that it is safe to send app-specific
        // messages from the native code to the TypeScript code.
        Messenger.sendMessage("didFinishLaunching");
        // Switch from the Loading screen to the Home screen.
        pushActiveInfo(ActiveScreen.Home);
        console.log("...Done Initializing.");
      } catch (ex) {
        console.log("Exception during initialization: " + ex);
      }
    };
    // This React hooks runs more than once, despite attempts to prevent that. So use initialized
    // to prevent it from initializing more than once.
    if (!initialized) {
      setInitialized(true);
      initialize();
    }
  }, [pushActiveInfo, initialized]);

  // Callback called by screens after an iModel is loaded.
  const handleOpen = React.useCallback(async (filename: string, newIModelPromise: Promise<IModelConnection>) => {
    try {
      const newIModel = await newIModelPromise;
      setModelFilename(filename);
      setIModel(newIModel);
      UiFramework.setIModelConnection(newIModel);
      // The cleanup function used to close the iModel when the back button on the Model screen is pressed.
      const cleanup = async () => {
        const viewport = IModelApp.viewManager.getFirstOpenView();
        if (viewport) {
          IModelApp.viewManager.dropViewport(viewport);
        }
        await iModel?.close();
        setIModel(undefined);
        UiFramework.setIModelConnection(undefined);
        setModelFilename("");
      };
      pushActiveInfo(ActiveScreen.Model, cleanup);
    } catch (error) {
      presentAlert({
        title: "Error",
        message: "Error loading iModel:\n" + error,
        actions: [{
          name: "ok",
          title: "OK",
        }],
      })
    }
  }, [iModel, pushActiveInfo]);

  // Called when the back button is pressed on any screen.
  const handleBack = React.useCallback(() => {
    // Get the last element in activeStack (top of stack).
    const lastScreen = activeStack[activeStack.length - 1];
    // Call the associated cleanup function, if it exists.
    lastScreen.cleanup?.();
    setActiveStack((old) => {
      // Remove the last element in activeStack (top of stack).
      return old.slice(0, old.length - 1);
    });
    // Note that the activeScreen stored at the top of the stack is the previous active screen.
    setActiveScreen(lastScreen.activeScreen);
  }, [activeStack]);

  // Callback to select another screen from the Home screen. Note that none of those screens needs a
  // cleanup callback.
  const handleHomeSelect = React.useCallback((screen: ActiveScreen) => {
    pushActiveInfo(screen);
  }, [pushActiveInfo]);

  React.useEffect(() => {
    if (initialized) {
      return Messenger.onQuery("openModel").setHandler(async (modelPath: string) => {
        if (activeScreen === ActiveScreen.Model) {
          // If the user is currently on the Model screen, we need to close the current
          // model before opening a new one. The handleBack() call below triggers the
          // cleanup function for the Model screen.
          handleBack();
          // The asynchronous nature of React useState variables means that even if the
          // handleBack above were async, and we waited for it to complete, we'd still end
          // up in a situation where the Model screen was active, but the iModel is undefined.
          // Also, the model we open below would be immediately closed, and the previously
          // open model would get abandoned. (In other words, checking for an undefined iModel
          // before displaying the Model screen would not fix the problem.)
          // So instead of opening the model right here, we set another state variable that
          // will do so once the previous model is done closing and its state variable has
          // switched to undefined.
          setOpenUrlPath(modelPath);
        } else {
          handleOpen(modelPath, SnapshotConnection.openFile(modelPath));  
        }
      });
    }
  }, [handleOpen, initialized, handleBack, activeScreen]);

  // When openUrlPath is set above, wait for iModel to become undefined, then open the
  // specified model.
  React.useEffect(() => {
    if (iModel === undefined && openUrlPath) {
      // Get a local copy of openUrlPath.
      const modelPath = "" + openUrlPath;
      // Clear openUrlPath before doing anything else.
      setOpenUrlPath(undefined);
      const openFunc = async () => {
        // Open the requested snapshot iModel.
        handleOpen(modelPath, SnapshotConnection.openFile(modelPath));
      }
      openFunc();
    }
  }, [iModel, openUrlPath, handleOpen]);

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
