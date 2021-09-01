/*---------------------------------------------------------------------------------------------
* Copyright (c) 2021 Bentley Systems, Incorporated. All rights reserved.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { IModelConnection, ViewState } from "@bentley/imodeljs-frontend";
import { ViewportComponent } from "@bentley/ui-components";
import { ActionSheetActions } from "@itwin/mobile-core";
import {
  ActionSheetButton,
  MobileUiContent,
  NavigationPanel,
  TabOrPanelDef,
  useTabsAndStandAlonePanels,
  VisibleBackButton,
} from "@itwin/mobileui-react";
import { AboutBottomPanel, InfoBottomPanel, ViewsBottomPanel } from "./Exports";
import "./ModelScreen.scss";

/// Properties for the [[ModelScreen]] React component.
export interface ModelScreenProps {
  /// The full path to the currently loaded iModel.
  filename: string;
  /// The currently loaded iModel.
  iModel: IModelConnection;
  /// Callback to go back to the previous screen.
  onBack: () => void;
}

/// React component showing the iModel and containing UI for interacting with it.
export function ModelScreen(props: ModelScreenProps) {
  const tabsAndPanelsAPI = useTabsAndStandAlonePanels();
  const { filename, iModel, onBack } = props;
  const lastSlash = filename.lastIndexOf("/");
  const documentName = lastSlash === -1 ? filename : filename.substring(lastSlash + 1);
  const [viewState, setViewState] = React.useState<ViewState>();
  // TODO: Add element properties item as only more action.
  const moreActions: ActionSheetActions = [
    {
      name: "one",
      title: "One",
      onSelected: () => {console.log("One")},
    },
  ];
  const moreButton=<ActionSheetButton actions={moreActions} />

  // TODO: Create non-tab element properties panel.
  const panels: TabOrPanelDef[] = [
    {
      label: "Info",
      isTab: true,
      popup: <InfoBottomPanel
        key="info"
        name={documentName}
        filename={filename}
      />
    },
    {
      label: "About",
      isTab: true,
      popup: <AboutBottomPanel key="about" />
    },
    {
      label: "Views",
      isTab: true,
      popup: <ViewsBottomPanel
        key="views"
        iModel={iModel}
        // Close the Views bottom panel when a view is selected from it.
        onViewSelected={() => {tabsAndPanelsAPI.closeSelectedPanel();}}
      />
    },
  ];

  tabsAndPanelsAPI.setPanels(panels);

  // Effect to load the default view state.
  React.useEffect(() => {
    // React.useEffect callbacks cannot be async, since they have a meaningful return value that is
    // not a Promise.
    const loadViewState = async () => {
      try {
        const defaultViewId = await iModel.views.queryDefaultViewId();
        const defaultViewState = await iModel.views.load(defaultViewId);
        setViewState(defaultViewState);
      } catch (error) {
        // This should never happen in a non-corrupt iModel.
        console.error("Error loading default view state: " + error);
      }
    };
    loadViewState();
  }, [iModel.views]);

  // Note: Changes to the [[viewState]] field of [[ViewportProps]] are ignored after the component is
  // first created. So don't create the [[ViewportComponent]] until after we have loaded the default
  // view state.
  return (
    <MobileUiContent>
      {viewState &&
        <div id="main-viewport">
          <ViewportComponent imodel={iModel} viewState={viewState}/>
        </div>
      }
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
      {tabsAndPanelsAPI.renderTabBarAndPanels()}
    </MobileUiContent>
  );
}
