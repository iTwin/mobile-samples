/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { combineReducers, createStore, Store } from "redux";
import { MobileApp, MobileAppOpts } from "@itwin/core-mobile/lib/cjs/MobileFrontend";
import { IModelApp, IModelConnection, SnapshotConnection, ToolAssistanceInstructions } from "@itwin/core-frontend";
import { AppNotificationManager, FrameworkReducer, FrameworkState, UiFramework } from "@itwin/appui-react";
import { Presentation } from "@itwin/presentation-frontend";
import { Messenger, MobileCore } from "@itwin/mobile-sdk-core";
import { MobileUi } from "@itwin/mobile-ui-react";
import { MeasureTools, FeatureTracking as MeasureToolsFeatureTracking } from "@itwin/measure-tools-react";
import { ActiveScreen, HomeScreen, HubScreen, LoadingScreen, LocalModelsScreen, ModelScreen, ModelScreenExtensionProps, presentError, ToolAssistance } from "./Exports";
import { getSupportedRpcs } from "../common/rpcs";
import "./App.scss";
import { OfflineMapNotifyHandler } from "./OfflineMap";

declare global {
  interface Window {
    /// Custom field on the window object that stores the settings that get passed via URL hash parameters.
    itmSampleParams: {
      lowResolution: boolean;
      haveBackButton: boolean;
      debugI18n: boolean;
    };
  }
}

// Initialize all boolean URL has parameters to false. (String parameters default to undefined.)
window.itmSampleParams = {
  lowResolution: false,
  haveBackButton: false,
  debugI18n: false,
};

/// Load the given boolean UrlSearchParam into the custom field on the window object.
function loadBooleanUrlSearchParam(name: "lowResolution" | "haveBackButton" | "debugI18n") {
  window.itmSampleParams[name] = MobileCore.getUrlSearchParam(name) === "YES";
}

/// Load the values stored in the URL hash params into the custom field on the window object.
function loadUrlSearchParams() {
  loadBooleanUrlSearchParam("lowResolution");
  loadBooleanUrlSearchParam("haveBackButton");
  loadBooleanUrlSearchParam("debugI18n");
}

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
// eslint-disable-next-line deprecation/deprecation
const appReduxStore: Store<RootState> = createStore(rootReducer, anyWindow.__REDUX_DEVTOOLS_EXTENSION__ && anyWindow.__REDUX_DEVTOOLS_EXTENSION__());

class AppToolAssistanceNotificationManager extends AppNotificationManager {
  public setToolAssistance(instructions: ToolAssistanceInstructions | undefined): void {
    ToolAssistance.onSetToolAssistance.emit(instructions);
    super.setToolAssistance(instructions);
  }
}

function useAppState(onInitialize?: () => Promise<void>) {
  // Start out on the Loading screen.
  const [activeScreen, setActiveScreen] = React.useState(ActiveScreen.Loading);
  // Keep a stack of active screens, so that handleBack can automatically go to the correct place.
  const [activeStack, setActiveStack] = React.useState<ActiveInfo[]>([{ activeScreen }]);
  const [modelFilename, setModelFilename] = React.useState("");
  // The currently loaded iModel, or undefined if none is loaded.
  const [iModel, setIModel] = React.useState<IModelConnection>();
  const [initialized, setInitialized] = React.useState(false);
  const [openUrlPath, setOpenUrlPath] = React.useState<string>();
  const [haveBackButton, setHaveBackButton] = React.useState(false);

  const pushActiveInfo = React.useCallback((screen: ActiveScreen, cleanup?: () => void) => {
    // Push the current activeScreen onto the activeStack, along with the cleanup function for the new active screen.
    // Note: the top entry of the stack contains the previous active screen, along with an optional cleanup
    // function for the new active screen. The activeScreen variable (set after updating the activeStack)
    // tracks the current active screen.
    setActiveStack((old) => {
      return [...old, { activeScreen, cleanup }];
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
        loadUrlSearchParams();
        const opts: MobileAppOpts = {
          iModelApp: {
            rpcInterfaces: getSupportedRpcs(),
            notifications: new AppToolAssistanceNotificationManager(),
          },
        };
        if (window.itmSampleParams.lowResolution) {
          // Improves FPS on really slow devices and iOS simulator.
          // Shader compilation still causes one-time slowness when interacting with model.

          // Note: Seemingly every other build the ! below goes from being required to not allowed.
          // The underlying types don't change, and yet sometimes TypeScript states that
          // opts.iModelApp is an optional value (which it is in IpcAppOptions), and sometimes
          // states that the ! is unnecessary. Since it keeps breaking the build for no reason,
          // I am including the !, and adding an eslint comment to disable the associated warning.
          // I am 99% sure that a TypeScript compiler bug is causing this inconsistent behavior.
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
          opts.iModelApp!.renderSys = {
            devicePixelRatioOverride: 0.25, // Reduce resolution
            dpiAwareLOD: true, // Reduce tile LOD for low resolution
          };
        }
        await MobileApp.startup(opts);
        await UiFramework.initialize(appReduxStore);
        await Presentation.initialize();
        await MobileUi.initialize(IModelApp.localization);
        await IModelApp.localization.registerNamespace("ReactApp");
        setHaveBackButton(window.itmSampleParams.haveBackButton);
        await MeasureTools.startup();
        MeasureToolsFeatureTracking.stop();
        OfflineMapNotifyHandler.register();
        await onInitialize?.();

        // The following message lets the native side know that it is safe to send app-specific
        // messages from the native code to the TypeScript code.
        Messenger.sendMessage("didFinishLaunching");
        // Switch from the Loading screen to the Home screen.
        pushActiveInfo(ActiveScreen.Home);
        console.log("...Done Initializing.");
      } catch (ex) {
        console.log(`Exception during initialization: ${ex}`);
      }
    };
    // This React hooks runs more than once, despite attempts to prevent that. So use initialized
    // to prevent it from initializing more than once.
    if (!initialized) {
      setInitialized(true);
      initialize(); // eslint-disable-line @typescript-eslint/no-floating-promises
    }
  }, [pushActiveInfo, initialized, onInitialize]);

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
      presentError("LoadErrorFormat", error);
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
          handleOpen(modelPath, SnapshotConnection.openFile(modelPath)); // eslint-disable-line @typescript-eslint/no-floating-promises
        }
      });
    }
  }, [handleOpen, initialized, handleBack, activeScreen]);

  // When openUrlPath is set above, wait for iModel to become undefined, then open the
  // specified model.
  React.useEffect(() => {
    if (iModel === undefined && openUrlPath) {
      // Get a local copy of openUrlPath.
      const modelPath = `${openUrlPath}`;
      // Clear openUrlPath before doing anything else.
      setOpenUrlPath(undefined);
      const openFunc = async () => {
        // Open the requested snapshot iModel.
        handleOpen(modelPath, SnapshotConnection.openFile(modelPath)); // eslint-disable-line @typescript-eslint/no-floating-promises
      };
      openFunc(); // eslint-disable-line @typescript-eslint/no-floating-promises
    }
  }, [iModel, openUrlPath, handleOpen]);

  return { activeScreen, handleHomeSelect, handleOpen, handleBack, haveBackButton, iModel, modelFilename };
}

export interface AppProps {
  getModelScreenExtensions?: (iModel: IModelConnection) => ModelScreenExtensionProps;
  onInitialize?: () => Promise<void>;
}

export function App(props: AppProps) {
  const { getModelScreenExtensions, onInitialize } = props;
  const { activeScreen, handleHomeSelect, handleOpen, handleBack, haveBackButton, iModel, modelFilename } = useAppState(onInitialize);

  switch (activeScreen) {
    case ActiveScreen.Home:
      return <HomeScreen onSelect={handleHomeSelect} showBackButton={haveBackButton} />;
    case ActiveScreen.LocalModels:
      return <LocalModelsScreen onOpen={handleOpen} onBack={handleBack} />;
    case ActiveScreen.Hub:
      return <HubScreen onOpen={handleOpen} onBack={handleBack} />;
    case ActiveScreen.Model:
      return <ModelScreen filename={modelFilename} iModel={iModel!} onBack={handleBack} {...props} {...getModelScreenExtensions?.(iModel!)} />;
    default:
      return <LoadingScreen />;
  }
}
