import React from "react";
import * as base64 from "base64-js";
import { IModelApp, IModelConnection } from "@bentley/imodeljs-frontend";
import { ThumbnailProps } from "@bentley/imodeljs-common";
import { DraggableComponent, IconImage, ResizableBottomPanel, ResizableBottomPanelProps } from "@itwin/mobileui-react";

import "./ViewsBottomPanel.scss";

export interface ViewsBottomPanelProps extends ResizableBottomPanelProps {
  iModel: IModelConnection;
  onViewSelected?: () => void;
}

export function ViewsBottomPanel(props: ViewsBottomPanelProps) {
  const { iModel, onViewSelected, ...otherProps } = props;
  const [viewSpecs, setViewSpecs] = React.useState<IModelConnection.ViewSpec[]>([]);
  const [thumbnails, setThumbnails] = React.useState<(string | undefined)[]>([]);

  React.useEffect(() => {
    const getThumbnailUrl = (thumbnail: ThumbnailProps) => {
      const base64String = base64.fromByteArray(thumbnail.image);
      return "data:image/" + thumbnail.format + ";base64," + base64String;
    };
    const loadThumbnails = async (viewSpecsParam: IModelConnection.ViewSpec[]) => {
      const localThumbnails: (string | undefined)[] = [];
      for (const viewSpec of viewSpecsParam) {
        const getThumbnail = async () => {
          try {
            return await iModel.views.getThumbnail(viewSpec.id);
          } catch (ex) {
            return undefined;
          }
        }
        const thumbnail = await getThumbnail();
        if (thumbnail) {
          localThumbnails.push(getThumbnailUrl(thumbnail));
        } else {
          localThumbnails.push(undefined);
        }
      }
      setThumbnails(localThumbnails);
    };

    const loadViewSpecs = async () => {
      const query = { wantPrivate: false };
      const result = await iModel.views.getViewList(query);
      const sortedResult = result.sort((a, b) => a.name.localeCompare(b.name, undefined, {sensitivity: "base"}));
      setViewSpecs(sortedResult);
      loadThumbnails(sortedResult);
    };
    loadViewSpecs();
  }, [iModel.views]);

  const handleChangeView = React.useCallback((viewSpec: IModelConnection.ViewSpec) => {
    const changeView = async () => {
      const viewState = await iModel.views.load(viewSpec.id);
      IModelApp.viewManager.getFirstOpenView()?.changeView(viewState);
      onViewSelected?.();
    };
    changeView();
  }, [iModel.views, onViewSelected]);

  const viewButtons = viewSpecs.map((viewSpec, index) => {
    if (thumbnails.length > index && thumbnails[index]) {
      return (
        <div className="list-item" key={index} onClick={() => {handleChangeView(viewSpec);}}>
          <div>{viewSpec.name}</div>
          <img src={thumbnails[index]} alt="View Thumbnail"/>
        </div>
      );
    } else {
      return (
        <div className="list-item" key={index} onClick={() => {handleChangeView(viewSpec);}}>
          <div>{viewSpec.name}</div>
          <IconImage iconSpec="icon-saved-view" size="100px"/>
        </div>
      );
    }
  });

  // Add 10 0-height dummy items after the real items to force the last row to be left-justified.
  const dummyItems: React.ReactNode[] = [];
  for (let i = 0; i < 10; ++i) {
    dummyItems.push(<div className="dummy-item" key={i + viewSpecs.length} />);
  }

  return (
    <ResizableBottomPanel
      {...otherProps}
      className="views-bottom-panel"
      header={<DraggableComponent className="header">
        <div className="title">
          <IconImage style={{display: "inline-block", marginRight: 5}} iconSpec="icon-saved-view"/>
          Views
        </div>
      </DraggableComponent>}
    >
      <div className="list">
        <div className="list-items">
          {viewButtons}
          {dummyItems}
        </div>
      </div>
    </ResizableBottomPanel>
  );
}
