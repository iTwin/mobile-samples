import React from "react";
import { IModelApp, IModelConnection } from "@bentley/imodeljs-frontend";
import { PanelHeader, ResizableBottomPanel, ResizableBottomPanelProps } from "@itwin/mobileui-react";

import "./ViewsBottomPanel.scss";
import { Button } from "./Button";

export interface ViewsBottomPanelProps extends ResizableBottomPanelProps {
  iModel: IModelConnection;
  onViewSelected?: () => void;
}

export function ViewsBottomPanel(props: ViewsBottomPanelProps) {
  const { iModel, onViewSelected, ...otherProps } = props;
  const [viewSpecs, setViewSpecs] = React.useState<IModelConnection.ViewSpec[]>([]);

  React.useEffect(() => {
    const loadViewSpecs = async () => {
      const query = { wantPrivate: false };
      const result = await iModel.views.getViewList(query);
      setViewSpecs(result.sort((a, b) => {return a.name.localeCompare(b.name, undefined, {sensitivity: "base"});}));
    };
    loadViewSpecs();
  }, [iModel.views]);

  const handleLoadView = React.useCallback((viewSpec: IModelConnection.ViewSpec) => {
    const changeView = async () => {
      const viewState = await iModel.views.load(viewSpec.id);
      IModelApp.viewManager.getFirstOpenView()?.changeView(viewState);
      onViewSelected?.();
    };
    changeView();
  }, [iModel.views, onViewSelected]);

  const viewButtons = viewSpecs.map((viewSpec, index) => {
    return <Button key={index} title={viewSpec.name} onClick={() => {handleLoadView(viewSpec);}}/>;
  });

  return (
    <ResizableBottomPanel
      {...otherProps}
      className="views-bottom-panel"
      header={<PanelHeader draggable
        title="Views"
      />}
    >
      <div className="list">
        <div className="list-items">
          {viewButtons}
        </div>
      </div>
    </ResizableBottomPanel>
  );
}
