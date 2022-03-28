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
import { getCssVariable, IconSpec } from "@itwin/core-react";
import { viewWithUnifiedSelection } from "@itwin/presentation-components";
import { AlertAction, presentAlert } from "@itwin/mobile-sdk-core";
import { useTheme } from "@itwin/itwinui-react";
import {
  ActionSheetButton,
  IconImage,
  MobileUi,
  MobileUiContent,
  NavigationPanel,
  TabOrPanelDef,
  useActiveColorSchemeIsDark,
  useBeEvent,
  useIsMountedRef,
  useTabsAndStandAlonePanels,
  VisibleBackButton,
} from "@itwin/mobile-ui-react";
import { AboutBottomPanel, ElementPropertiesPanel, i18n, InfoBottomPanel, presentError, ToolAssistance, ToolsBottomPanel, ViewsBottomPanel } from "../Exports";
import "./ModelScreen.scss";

// tslint:disable-next-line: variable-name
const UnifiedSelectionViewportComponent = viewWithUnifiedSelection(ViewportComponent);

/// Properties for the [[ModelScreen]] React component.
export interface ModelScreenProps {
  /// The full path to the currently loaded iModel.
  filename: string;
  /// The currently loaded iModel.
  iModel: IModelConnection;
  /// Callback to go back to the previous screen.
  onBack: () => void;
}

// Set the model background color based on the currently active dark/light color scheme.
export function updateBackgroundColor(viewState: ViewState) {
  const displayStyle = viewState.displayStyle;
  // Note: the value of the --muic-background-model CSS variable automatically updates when the
  // color scheme of the web view changes.
  const bgColor = getCssVariable("--muic-background-model");
  displayStyle.backgroundColor = ColorDef.fromString(bgColor);
}

/// React component showing the iModel and containing UI for interacting with it.
export function ModelScreen(props: ModelScreenProps) {
  const tabsAndPanelsAPI = useTabsAndStandAlonePanels();
  const { filename, iModel, onBack } = props;
  const [viewState, setViewState] = React.useState<ViewState>();
  const isDark = useActiveColorSchemeIsDark();
  const locationLabel = React.useMemo(() => i18n("ModelScreen", "Location"), []);
  const errorLabel = React.useMemo(() => i18n("Shared", "Error"), []);
  const okLabel = React.useMemo(() => i18n("Shared", "OK"), []);
  const showCurrentLocationLabel = React.useMemo(() => i18n("ModelScreen", "ShowCurrentLocation"), []);
  const fitViewLabel = React.useMemo(() => i18n("ModelScreen", "FitView"), []);
  const defaultViewLabel = React.useMemo(() => i18n("ModelScreen", "DefaultView"), []);
  const toggleCameraLabel = React.useMemo(() => i18n("ModelScreen", "ToggleCamera"), []);
  const infoLabel = React.useMemo(() => i18n("ModelScreen", "Info"), []);
  const aboutLabel = React.useMemo(() => i18n("ModelScreen", "About"), []);
  const viewsLabel = React.useMemo(() => i18n("ModelScreen", "Views"), []);
  const toolsLabel = React.useMemo(() => i18n("ModelScreen", "Tools"), []);
  const elementPropertiesLabel = React.useMemo(() => i18n("ModelScreen", "Properties"), []);
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
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        presentAlert({
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
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        presentAlert({
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
      IModelApp.tools.run(FitViewTool.toolId, IModelApp.viewManager.getFirstOpenView(), true); // eslint-disable-line @typescript-eslint/no-floating-promises
    };
    const actions: AlertAction[] =
      [
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
          onSelected: toggleCamera,
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
  const moreButton = <ActionSheetButton actions={moreActions} showStatusBar />;
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
      label: aboutLabel,
      isTab: true,
      popup: <AboutBottomPanel key="about" />,
    },
    {
      label: toolsLabel,
      isTab: true,
      popup: <ToolsBottomPanel
        key="tools"
        // Close the Views bottom panel when a view is selected from it.
        onToolClick={() => { tabsAndPanelsAPI.closeSelectedPanel(); }}
      />,
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

  tabsAndPanelsAPI.setPanels(panels);

  // Update the model background color when the color scheme changes.
  useBeEvent(() => {
    const firstOpenView = IModelApp.viewManager.getFirstOpenView()?.view;
    if (firstOpenView) {
      updateBackgroundColor(firstOpenView);
    }
  }, MobileUi.onColorSchemeChanged);

  const applyDefaultView = React.useCallback(async () => {
    try {
      const opts: ViewCreator3dOptions = {
        standardViewId: StandardViewId.RightIso,
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

  const toggleCamera = React.useCallback(() => {
    IModelApp.tools.run(ViewToggleCameraTool.toolId, IModelApp.viewManager.getFirstOpenView()); // eslint-disable-line @typescript-eslint/no-floating-promises
  }, []);

  // Effect to apply the default view state after component is loaded.
  React.useEffect(() => {
    applyDefaultView(); // eslint-disable-line @typescript-eslint/no-floating-promises
  }, [applyDefaultView]);

  // The useTheme hook below does not currently detect theme changes on the fly if "os" is
  // set as the theme.
  useTheme(isDark ? "dark" : "light");

  // Note: Changes to the [[viewState]] field of [[ViewportProps]] are ignored after the component is
  // first created. So don't create the [[ViewportComponent]] until after we have loaded the default
  // view state.
  return (
    <>
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
        {tabsAndPanelsAPI.renderTabBarAndPanels()}
      </MobileUiContent >
    </>
  );
}

export interface HeaderTitleProps {
  iconSpec?: IconSpec;
  label?: string;
}

export function HeaderTitle(props: HeaderTitleProps) {
  const { iconSpec, label } = props;
  return <div className="title">
    {iconSpec && <IconImage style={{ display: "inline-block", marginRight: 10 }} iconSpec={iconSpec} />}
    {label}
  </div>;
}
