import React from "react";
import { IModelConnection, ScreenViewport, ViewState } from "@bentley/imodeljs-frontend";
import { ViewportComponent } from "@bentley/ui-components";
import {
  ActionSheetActions,
  ActionSheetButton,
  ActionStyle,
  MobileUiContent,
  NavigationPanel,
  TabOrPanelDef,
  useTabsAndStandAlonePanels,
  VisibleBackButton,
} from "@itwin/mobileui-react";
import { AboutBottomPanel, InfoBottomPanel, ViewsBottomPanel } from "./Exports";
import "./ModelScreen.scss";

export interface ModelScreenProps {
  filename: string;
  iModel: IModelConnection;
  onBack: () => void;
}

export function ModelScreen(props: ModelScreenProps) {
  const tabsAndPanelsAPI = useTabsAndStandAlonePanels();
  const { filename, iModel, onBack } = props;
  const lastSlash = filename.lastIndexOf("/");
  const documentName = lastSlash === -1 ? filename : filename.substring(lastSlash + 1);
  const [viewState, setViewState] = React.useState<ViewState>();
  const moreActions: ActionSheetActions = [
    {
      name: "one",
      title: "One",
      onSelected: () => {console.log("One")},
    },
    {
      name: "cancel",
      title: "Cancel",
      style: ActionStyle.Cancel,
      onSelected: () => {},
    },
  ];
  const moreButton=<ActionSheetButton actions={moreActions} />

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
        onViewSelected={() => {tabsAndPanelsAPI.closeSelectedPanel();}}
      />
    },
  ];

  tabsAndPanelsAPI.setPanels(panels);

  React.useEffect(() => {
    const loadViewState = async () => {
      const defaultViewId = await iModel.views.queryDefaultViewId();
      console.log("Got defaultViewId of " + defaultViewId + " for " + documentName);
      const defaultViewState = await iModel.views.load(defaultViewId);
      console.log("Loaded default viewState: " + defaultViewState.id);
      setViewState(defaultViewState);
    };
    loadViewState();
  }, [iModel.views, documentName]);

  const viewportRefHandler = (vp: ScreenViewport) => {
    if (vp) {
      console.log("Viewport created: " + (vp.canvas ? "with " : "without ") + "canvas");
    }
  };

  return (
    <MobileUiContent>
      {viewState &&
        <div id="main-viewport">
          <ViewportComponent imodel={iModel} viewState={viewState} viewportRef={viewportRefHandler}/>
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
