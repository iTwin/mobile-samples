/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { MobileApp, MobileAppOpts } from "@itwin/core-mobile/lib/cjs/MobileFrontend";
import {
  IModelApp,
  IModelConnection,
  IpcApp,
  ITWINJS_CORE_VERSION,
  RenderSystem,
  SnapshotConnection,
  ToolAssistanceInstructions,
} from "@itwin/core-frontend";
import { AppNotificationManager, UiFramework } from "@itwin/appui-react";
import { Presentation } from "@itwin/presentation-frontend";
import { BentleyError, LogFunction, Logger, LoggingMetaData, LogLevel } from "@itwin/core-bentley";
import { Messenger, MobileCore } from "@itwin/mobile-sdk-core";
import { MobileUi, ToolAssistanceSuggestion } from "@itwin/mobile-ui-react";
import { MeasureTools, FeatureTracking as MeasureToolsFeatureTracking } from "@itwin/measure-tools-react";
import {
  ActiveScreen,
  getBriefcaseFileName,
  HomeScreen,
  HubScreen,
  LoadingScreen,
  LocalModelsScreen,
  ModelScreen,
  ModelScreenExtensionProps,
  presentError,
} from "./Exports";
import { FrontendIModelsAccess } from "@itwin/imodels-access-frontend";
import { IModelsClient } from "@itwin/imodels-client-management";
import { BackendLogParams, getSupportedRpcs } from "../common/rpcs";
import "./App.scss";

declare global {
  interface Window {
    /** Custom field on the window object that stores the settings that get passed via URL hash parameters. */
    itmSampleParams: {
      lowResolution: boolean;
      haveBackButton: boolean;
      debugI18n: boolean;
      apiPrefix: string;
    };
  }
}

/** Interface for the parameters passed in the "performActions" message. */
interface PerformActionsProps {
  /** The actions to perform. */
  actions: { [key: string]: string };
  /** The path to the app's documents folder */
  documentsPath: string;
}

// Initialize all boolean URL has parameters to false. (String parameters default to undefined.)
window.itmSampleParams = {
  lowResolution: false,
  haveBackButton: false,
  debugI18n: false,
  apiPrefix: "",
};

/** Load the given boolean UrlSearchParam into the custom field on the window object. */
function loadBooleanUrlSearchParam(name: "lowResolution" | "haveBackButton" | "debugI18n") {
  window.itmSampleParams[name] = MobileCore.getUrlSearchParam(name) === "YES";
}

/** Load the given string UrlSearchParam into the custom field on the window object. */
function loadStringUrlSearchParam(name: "apiPrefix") {
  window.itmSampleParams[name] = MobileCore.getUrlSearchParam(name) ?? "";
}

/** Load the values stored in the URL hash params into the custom field on the window object. */
function loadUrlSearchParams() {
  loadBooleanUrlSearchParam("lowResolution");
  loadBooleanUrlSearchParam("haveBackButton");
  loadBooleanUrlSearchParam("debugI18n");
  loadStringUrlSearchParam("apiPrefix");
  // Some classes (notable ProjectsAccessClient for this sample) require process.env.IMJS_URL_PREFIX
  // to be set. Due to the way that webpack works, that is done via the following.
  (globalThis as any).IMJS_URL_PREFIX = window.itmSampleParams.apiPrefix;
}

/** Interface to allow switching from one screen to another. */
interface ActiveInfo {
  /** The active screen represented by this entry in the activeStack. */
  activeScreen: ActiveScreen;
  /** The optional cleanup function to call when switching to another screen. */
  cleanup?: () => void;
}

class AppToolAssistanceNotificationManager extends AppNotificationManager {
  public override setToolAssistance(instructions: ToolAssistanceInstructions | undefined): void {
    ToolAssistanceSuggestion.onSetToolAssistance.emit({ instructions });
    super.setToolAssistance(instructions);
  }
}

/**
 * Get the options to be passed into the `iModelApp.renderSys` property of the {@link MobileAppOpts}
 * passed into {@link MobileApp.startup}.
 * @returns The appropriate options, or undefined if there aren't any.
 */
function getRenderSysOptions(): RenderSystem.Options | undefined {
  if (window.itmSampleParams.lowResolution) {
    // Improves FPS on really slow devices and iOS simulator.
    // Shader compilation still causes one-time slowness when interacting with model.
    return {
      devicePixelRatioOverride: 0.25, // Reduce resolution
      dpiAwareLOD: true, // Reduce tile LOD for low resolution
    };
  }
  return undefined;
}

/**
 * Add a listener that receives "backend-log" messages from the backend and forwards them to the
 * corresponding `Logger` functions. Also sends a "frontend-listening" message to the backend to
 * let it know that we are listening.
 */
function forwardBackendLogsToLogger() {
  IpcApp.addListener("backend-log", (_evt: Event, data: BackendLogParams) => {
    switch (data.level) {
      case LogLevel.Error:
        Logger.logError(data.category, data.message, data.metaData);
        break;
      case LogLevel.Info:
        Logger.logInfo(data.category, data.message, data.metaData);
        break;
      case LogLevel.Trace:
        Logger.logTrace(data.category, data.message, data.metaData);
        break;
      case LogLevel.Warning:
        Logger.logWarning(data.category, data.message, data.metaData);
        break;
    }
  });
  IpcApp.send("frontend-listening");
}

/**
 * Initialize `Logger`-based logging.
 */
function initializeLogging() {
  const getLogFunction = (level: LogLevel): LogFunction => {
    return (category: string, message: string, metaData?: LoggingMetaData): void => {
      Messenger.sendMessage("log", {
        level: LogLevel[level],
        category,
        message,
        metaData: BentleyError.getMetaData(metaData),
      });
    };
  };
  Logger.initialize(getLogFunction(LogLevel.Error), getLogFunction(LogLevel.Warning), getLogFunction(LogLevel.Info), getLogFunction(LogLevel.Trace));
  Logger.setLevelDefault(LogLevel.Warning);
  forwardBackendLogsToLogger();
}

/**
 * React hook that returns an object containing all of the import app state.
 *
 * This is present to allow for specific samples (like the camera sample) to perform more
 * customization than they would otherwise be able to.
 * @param onInitialize If present, called during initialization.
 * @returns An app state object with all the fields needed to render the app.
 */
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
  const [openRemoteValues, setOpenRemoteValues] = React.useState<string[]>();

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
        const baseUrl = `https://${window.itmSampleParams.apiPrefix}api.bentley.com/imodels`;
        const imodelsClient = new IModelsClient({ api: { baseUrl } });
        const opts: MobileAppOpts = {
          iModelApp: {
            rpcInterfaces: getSupportedRpcs(),
            notifications: new AppToolAssistanceNotificationManager(),
            renderSys: getRenderSysOptions(),
            hubAccess: new FrontendIModelsAccess(imodelsClient),
          },
        };
        await MobileApp.startup(opts);
        initializeLogging();
        await UiFramework.initialize();
        await Presentation.initialize();
        await MobileUi.initialize(IModelApp.localization);
        await IModelApp.localization.registerNamespace("ReactApp");
        setHaveBackButton(window.itmSampleParams.haveBackButton);
        await MeasureTools.startup();
        MeasureToolsFeatureTracking.stop();
        await onInitialize?.();

        Messenger.onQuery("queryExample").setHandler(async (params) => params.value);
        Messenger.onQuery("voidExample").setHandler(async () => "void input");
        Messenger.onQuery("oneWayExample").setHandler(async (params) => {
          console.log(`oneWayExample received value: ${params.value}`);
        });
        // Switch from the Loading screen to the Home screen.
        pushActiveInfo(ActiveScreen.Home);

        // The following message lets the native side know that it is safe to send app-specific
        // messages from the native code to the TypeScript code.
        Messenger.sendMessage("didFinishLaunching", { iTwinVersion: ITWINJS_CORE_VERSION });

        console.log("...Done Initializing.");
      } catch (ex: any) {
        console.log(`Exception during initialization: ${ex}`);
      }
    };
    // This React hooks runs more than once, despite attempts to prevent that. So use initialized
    // to prevent it from initializing more than once.
    if (!initialized) {
      setInitialized(true);
      void initialize();
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
        await newIModel.close();
        setIModel(undefined);
        UiFramework.setIModelConnection(undefined);
        setModelFilename("");
      };
      pushActiveInfo(ActiveScreen.Model, cleanup);
    } catch (error) {
      void presentError("LoadErrorFormat", error);
    }
  }, [pushActiveInfo]);

  // Called when the back button is pressed on any screen.
  const handleBack = React.useCallback(() => {
    // Get the last element in activeStack (top of stack).
    const lastScreen = activeStack[activeStack.length - 1];
    // Call the associated cleanup function, if it exists.
    lastScreen.cleanup?.();
    setActiveStack((old) => {
      // Remove the last element in activeStack (top of stack).
      return old.slice(0, -1);
    });
    // Clear openRemoteValues when going back.
    setOpenRemoteValues(undefined);
    // Note that the activeScreen stored at the top of the stack is the previous active screen.
    setActiveScreen(lastScreen.activeScreen);
  }, [activeStack]);

  // Callback to select another screen from the Home screen. Note that none of those screens needs a
  // cleanup callback.
  const handleHomeSelect = React.useCallback((screen: ActiveScreen) => {
    pushActiveInfo(screen);
  }, [pushActiveInfo]);

  // Open the given model file.
  const openModelFile = React.useCallback(async (modelPath: string) => {
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
      void handleOpen(modelPath, SnapshotConnection.openFile(modelPath));
    }
  }, [handleBack, handleOpen, activeScreen]);

  // Handler for "openModel" Messenger query.
  React.useEffect(() => {
    if (initialized) {
      return Messenger.onQuery("openModel").setHandler(async (modelPath: string) => {
        await openModelFile(modelPath);
      });
    }
  }, [openModelFile, initialized]);

  // Handler for "performActions" Messenger query.
  React.useEffect(() => {
    if (initialized) {
      return Messenger.onQuery("performActions").setHandler(async (props: PerformActionsProps) => {
        const { actions, documentsPath } = props;
        const openValue = actions.OPEN;
        if (openValue) {
          const [source, ...values] = openValue.split(":");
          switch (source) {
            case "document":
              await openModelFile(`${documentsPath}/${values[0]}`);
              break;
            case "local":
              const fileName = await getBriefcaseFileName(values[0]);
              await openModelFile(fileName);
              break;
            case "remote":
              setOpenRemoteValues(values);
              pushActiveInfo(ActiveScreen.Hub);
              break;
          }
        }
      });
    }
  }, [openModelFile, pushActiveInfo, initialized]);

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
        void handleOpen(modelPath, SnapshotConnection.openFile(modelPath));
      };
      void openFunc();
    }
  }, [iModel, openUrlPath, handleOpen]);

  return { activeScreen, handleHomeSelect, handleOpen, handleBack, haveBackButton, iModel, modelFilename, openRemoteValues };
}

/** Properties for the {@link App} React component. */
export interface AppProps {
  getModelScreenExtensions?: (iModel: IModelConnection) => ModelScreenExtensionProps;
  onInitialize?: () => Promise<void>;
}

/** Top-level React component for the standard sample app. */
export function App(props: AppProps) {
  const { getModelScreenExtensions, onInitialize } = props;
  const { activeScreen, handleHomeSelect, handleOpen, handleBack, haveBackButton, iModel, modelFilename, openRemoteValues } = useAppState(onInitialize);

  switch (activeScreen) {
    case ActiveScreen.Home:
      return <HomeScreen onSelect={handleHomeSelect} showBackButton={haveBackButton} />;
    case ActiveScreen.LocalModels:
      return <LocalModelsScreen onOpen={handleOpen} onBack={handleBack} />;
    case ActiveScreen.Hub:
      return <HubScreen onOpen={handleOpen} onBack={handleBack} openRemoteValues={openRemoteValues} />;
    case ActiveScreen.Model:
      if (!iModel) {
        throw new Error("iModel is undefined when trying to render ModelScreen.");
      }
      return <ModelScreen filename={modelFilename} iModel={iModel} onBack={handleBack} {...props} {...getModelScreenExtensions?.(iModel)} />;
    default:
      return <LoadingScreen />;
  }
}
