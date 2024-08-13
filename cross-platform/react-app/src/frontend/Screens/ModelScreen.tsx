/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { ColorDef } from "@itwin/core-common";
import {
  FitViewTool,
  IModelApp,
  IModelConnection,
  StandardViewId,
  ViewCreator3d,
  ViewCreator3dOptions,
  ViewState,
  ViewToggleCameraTool,
} from "@itwin/core-frontend";
import { ViewportComponent } from "@itwin/imodel-components-react";
import { IconSpec } from "@itwin/core-react";
import { viewWithUnifiedSelection } from "@itwin/presentation-components";
import { ActionSheetGravity, ActionStyle, AlertAction, getCssVariable, Messenger, presentAlert } from "@itwin/mobile-sdk-core";
import { ThemeProvider } from "@itwin/itwinui-react";
import {
  ActionSheetButton,
  IconImage,
  MobileUi,
  MobileUiContent,
  NavigationPanel,
  PreferredColorScheme,
  TabOrPanelDef,
  useBeEvent,
  useFirstViewport,
  useIsMountedRef,
  useTabsAndStandAlonePanels,
  VisibleBackButton,
} from "@itwin/mobile-ui-react";
import {
  AboutBottomPanel,
  CompassBottomPanel,
  ElementPropertiesPanel,
  i18n,
  InfoBottomPanel,
  presentError,
  ToolAssistance,
  ToolsBottomPanel,
  ToolsBottomPanelProps,
  useLocalizedString,
  ViewsBottomPanel,
} from "../Exports";
import "./ModelScreen.scss";

// tslint:disable-next-line: variable-name
const UnifiedSelectionViewportComponent = viewWithUnifiedSelection(ViewportComponent);

/** Interface for adding extensions to the model screen; used by the camera sample. */
export interface ModelScreenExtensionProps {
  /** Optional bottom panel override. */
  toolsBottomPanel?: React.FunctionComponent<ToolsBottomPanelProps>;
  /** Additional components */
  additionalComponents?: React.ReactNode;
  /** Additional tabs */
  additionalTabs?: TabOrPanelDef[];
}

/** Properties for the {@link ModelScreen} React component. */
export interface ModelScreenProps extends ModelScreenExtensionProps {
  /** The full path to the currently loaded iModel. */
  filename: string;
  /** The currently loaded iModel. */
  iModel: IModelConnection;
  /** Callback to go back to the previous screen. */
  onBack: () => void;
  /** Optional bottom panel override. */
  toolsBottomPanel?: React.FunctionComponent<ToolsBottomPanelProps>;
  /** Additional components */
  additionalComponents?: React.ReactNode;
  /** Additional tabs */
  additionalTabs?: TabOrPanelDef[];
}

/**
 * Set the model background color based on the currently active dark/light color scheme.
 * @param viewState The {@link ViewState} in which to update the background color.
 */
export function updateBackgroundColor(viewState: ViewState) {
  const displayStyle = viewState.displayStyle;
  // Note: the value of the --muic-background-model CSS variable automatically updates when the
  // color scheme of the web view changes.
  const bgColor = getCssVariable("--muic-background-model");
  displayStyle.backgroundColor = ColorDef.fromString(bgColor);
}

/** React component showing the iModel and containing UI for interacting with it. */
export function ModelScreen(props: ModelScreenProps) {
  const tabsAndPanelsAPI = useTabsAndStandAlonePanels();
  const { filename, iModel, onBack, toolsBottomPanel, additionalComponents, additionalTabs } = props;
  const [viewState, setViewState] = React.useState<ViewState>();
  const locationLabel = useLocalizedString("ModelScreen", "Location");
  const errorLabel = useLocalizedString("Shared", "Error");
  const okLabel = useLocalizedString("Shared", "OK");
  const showCurrentLocationLabel = useLocalizedString("ModelScreen", "ShowCurrentLocation");
  const fitViewLabel = useLocalizedString("ModelScreen", "FitView");
  const defaultViewLabel = useLocalizedString("ModelScreen", "DefaultView");
  const toggleCameraLabel = useLocalizedString("ModelScreen", "ToggleCamera");
  const alertDemoLabel = useLocalizedString("ModelScreen", "AlertDemo");
  const oneLabel = useLocalizedString("ModelScreen", "One");
  const twoLabel = useLocalizedString("ModelScreen", "Two");
  const threeLabel = useLocalizedString("ModelScreen", "Three");
  const fourLabel = useLocalizedString("ModelScreen", "Four");
  const fiveLabel = useLocalizedString("ModelScreen", "Five");
  const sixLabel = useLocalizedString("ModelScreen", "Six");
  const destructiveLabel = useLocalizedString("ModelScreen", "Destructive");
  const youChoseLabel = useLocalizedString("ModelScreen", "YouChose");
  const infoLabel = useLocalizedString("ModelScreen", "Info");
  const compassLabel = useLocalizedString("ModelScreen", "Compass");
  const aboutLabel = useLocalizedString("AboutBottomPanel", "About");
  const viewsLabel = useLocalizedString("ViewsBottomPanel", "Views");
  const toolsLabel = useLocalizedString("ModelScreen", "Tools");
  const elementPropertiesLabel = useLocalizedString("ModelScreen", "Properties");
  const changeAppearanceLabel = useLocalizedString("ModelScreen", "ChangeAppearance");
  const cancelLabel = useLocalizedString("HubScreen", "Cancel");
  const lightLabel = useLocalizedString("ModelScreen", "Light");
  const darkLabel = useLocalizedString("ModelScreen", "Dark");
  const automaticLabel = useLocalizedString("ModelScreen", "Automatic");
  const vp = useFirstViewport();
  const [firstRenderStarted, setFirstRenderStarted] = React.useState(false);
  const [firstRenderFinished, setFirstRenderFinished] = React.useState(false);

  // Any time we do anything asynchronous, we have to check if the component is still mounted,
  // or it can lead to a run-time exception.
  const isMountedRef = useIsMountedRef();
  // Passing an arrow function as the actions instead of the array itself allows for the list
  // of actions to be dynamic. In this case, the element properties action is only shown if the
  // selection set is active.
  const moreActions = () => {
    const handleShowLocation = () => {
      // Ask for the device's current location, then show the latitude and longitude to the user.
      // Note that this makes use of a Geolocation Polyfill to work around the fact that the web
      // view on both iOS and Android does not allow location lookups for non-https pages.
      navigator.geolocation.getCurrentPosition((position: GeolocationPosition) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        void presentAlert({
          title: locationLabel,
          message: i18n("ModelScreen", "LocationFormat", { latitude, longitude }),
          showStatusBar: true,
          actions: [{
            name: "ok",
            title: okLabel,
          }],
        });
      }, (positionError: GeolocationPositionError) => {
        const error = positionError.message;
        void presentAlert({
          title: errorLabel,
          message: i18n("ModelScreen", "LocationErrorFormat", { error }),
          showStatusBar: true,
          actions: [{
            name: "ok",
            title: okLabel,
          }],
        });
      });
    };
    const handleFitView = () => {
      void IModelApp.tools.run(FitViewTool.toolId, IModelApp.viewManager.getFirstOpenView(), true);
    };
    const handleToggleCamera = () => {
      void IModelApp.tools.run(ViewToggleCameraTool.toolId, IModelApp.viewManager.getFirstOpenView());
    };

    const actions: AlertAction[] = [
      {
        name: "location",
        title: showCurrentLocationLabel,
        onSelected: handleShowLocation,
      },
      {
        name: "fitView",
        title: fitViewLabel,
        onSelected: handleFitView,
      },
      {
        name: "defaultView",
        title: defaultViewLabel,
        onSelected: applyDefaultView,
      },
      {
        name: "toggleCamera",
        title: toggleCameraLabel,
        onSelected: handleToggleCamera,
      },
      {
        name: "appearance",
        title: changeAppearanceLabel,
        onSelected: async () => {
          const result = await presentAlert({
            title: changeAppearanceLabel,
            showStatusBar: true,
            actions: [
              { name: automaticLabel, title: automaticLabel },
              { name: lightLabel, title: lightLabel },
              { name: darkLabel, title: darkLabel },
              { name: cancelLabel, title: cancelLabel, style: ActionStyle.Cancel },
            ],
          });
          switch (result) {
            case lightLabel:
              MobileUi.preferredColorScheme = PreferredColorScheme.Light;
              break;
            case darkLabel:
              MobileUi.preferredColorScheme = PreferredColorScheme.Dark;
              break;
            case automaticLabel:
              MobileUi.preferredColorScheme = PreferredColorScheme.Automatic;
              break;
          }
        },
      },
      {
        name: "alertDemo",
        title: alertDemoLabel,
        onSelected: async () => {
          const result = await presentAlert({
            title: alertDemoLabel,
            message: "This message is only visible in iOS.",
            showStatusBar: true,
            actions: [
              {
                name: oneLabel,
                title: oneLabel,
              },
              {
                name: twoLabel,
                title: twoLabel,
              },
              {
                name: threeLabel,
                title: threeLabel,
              },
              {
                name: fourLabel,
                title: fourLabel,
              },
              {
                name: fiveLabel,
                title: fiveLabel,
              },
              {
                name: sixLabel,
                title: sixLabel,
              },
              {
                name: destructiveLabel,
                title: destructiveLabel,
                style: ActionStyle.Destructive,
              },
            ],
          });
          void presentAlert({
            title: youChoseLabel,
            message: result,
            showStatusBar: true,
            actions: [{
              name: "ok",
              title: okLabel,
            }],
          });
        },
      },
    ];
    if (IModelApp.viewManager.getFirstOpenView()?.view.iModel.selectionSet.isActive) {
      actions.push(
        {
          name: elementPropertiesLabel,
          title: elementPropertiesLabel,
          onSelected: () => { tabsAndPanelsAPI.openPanel(elementPropertiesLabel); },
        });
    }
    return actions;
  };
  const moreButton = <ActionSheetButton actions={moreActions} showStatusBar gravity={ActionSheetGravity.BottomRight} />;
  // Definitions for the bottom tab bar (with panels) and other bottom panels (element properties).
  const panels: TabOrPanelDef[] = [
    {
      label: infoLabel,
      isTab: true,
      popup: <InfoBottomPanel
        key="info"
        name={iModel.name}
        filename={filename}
      />,
    },
    {
      label: compassLabel,
      isTab: true,
      popup: <CompassBottomPanel
        key="compass"
      />,
    },
    {
      label: aboutLabel,
      isTab: true,
      popup: <AboutBottomPanel key="about" />,
    },
    {
      label: toolsLabel,
      isTab: true,
      // The tools panel can be overridden (as is done in the camera sample).
      popup: React.createElement(toolsBottomPanel ?? ToolsBottomPanel,
        {
          key: "tools",
          iModel,
          // Close the Tools bottom panel when a tool is selected from it.
          onToolClick: () => { tabsAndPanelsAPI.closeSelectedPanel(); },
        }),
    },
    {
      label: viewsLabel,
      isTab: true,
      popup: <ViewsBottomPanel
        key="views"
        iModel={iModel}
        // Close the Views bottom panel when a view is selected from it.
        onViewSelected={() => { tabsAndPanelsAPI.closeSelectedPanel(); }}
      />,
    },
    {
      label: elementPropertiesLabel,
      // Not a tab like the others, but still a bottom panel.
      isTab: false,
      popup: <ElementPropertiesPanel
        key={elementPropertiesLabel}
        iModel={iModel}
        onCloseClick={() => tabsAndPanelsAPI.closeSelectedPanel()}
        onAutoClose={() => {
          tabsAndPanelsAPI.closeSelectedPanel();
          return tabsAndPanelsAPI.autoCloseHandler();
        }}
      />,
    },
  ];

  // The camera sample adds a pictures tab.
  if (additionalTabs) {
    panels.push(...additionalTabs);
  }

  tabsAndPanelsAPI.setPanels(panels);

  // Update the model background color when the color scheme changes.
  useBeEvent(React.useCallback(() => {
    const firstOpenView = IModelApp.viewManager.getFirstOpenView()?.view;
    if (firstOpenView) {
      updateBackgroundColor(firstOpenView);
    }
  }, []), MobileUi.onColorSchemeChanged);

  React.useEffect(() => {
    if (!firstRenderStarted) {
      setFirstRenderStarted(true);
      Messenger.sendMessage("firstRenderStarted");
    }
  }, [firstRenderStarted]);

  useBeEvent(React.useCallback(() => {
    if (!vp || firstRenderFinished) return;
    if (vp.numReadyTiles > 0 && vp.numRequestedTiles === 0) {
      // If we get here, at least one tile has loaded, and there aren't any pending tiles waiting to
      // be loaded, so the model has fully drawn from the initial viewpoint.
      setFirstRenderFinished(true);
      Messenger.sendMessage("firstRenderFinished");
    }
  }, [vp, firstRenderFinished]), vp ? vp.onRender : IModelApp.viewManager.onFinishRender);

  const applyDefaultView = React.useCallback(async () => {
    try {
      const opts: ViewCreator3dOptions = {
        standardViewId: StandardViewId.Iso,
      };
      const vc = new ViewCreator3d(iModel);
      const defaultViewState = await vc.createDefaultView(opts);
      if (!isMountedRef.current) return;
      updateBackgroundColor(defaultViewState);
      setViewState(defaultViewState);
    } catch (error) {
      // I don't think this can ever happen.
      presentError("ApplyDefaultViewErrorFormat", error, "ModelScreen");
    }
  }, [iModel, isMountedRef]);

  // Effect to apply the default view state after component is loaded.
  React.useEffect(() => {
    void applyDefaultView();
  }, [applyDefaultView]);

  // Note: Changes to the viewState field of ViewportProps are ignored after the component is
  // first created. So don't create the ViewportComponent until after we have loaded the default
  // view state.
  return (
    <ThemeProvider theme="os">
      {viewState &&
        <div id="main-viewport">
          <UnifiedSelectionViewportComponent imodel={iModel} viewState={viewState} />
        </div>
      }
      <MobileUiContent>
        <NavigationPanel
          left={
            <>
              <VisibleBackButton onClick={onBack} />
            </>
          }
          right={
            <>
              {moreButton}
            </>
          }
        />
        <ToolAssistance />
        {additionalComponents}
        {tabsAndPanelsAPI.renderTabBarAndPanels()}
      </MobileUiContent >
    </ThemeProvider>
  );
}

/** Properties for the {@link HeaderTitle} React component. */
export interface HeaderTitleProps {
  iconSpec?: IconSpec; // eslint-disable-line deprecation/deprecation
  label?: string;
  moreElements?: React.ReactNode;
}

/** React component to use for the title of bottom panels. */
export function HeaderTitle(props: HeaderTitleProps) {
  const { iconSpec, label, moreElements } = props;
  return <div className="title">
    {iconSpec && <IconImage style={{ display: "inline-block", marginRight: 10 }} iconSpec={iconSpec} />}
    {label}
    {moreElements}
  </div>;
}
