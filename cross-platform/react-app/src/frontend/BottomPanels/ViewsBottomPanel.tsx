/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { IModelApp, IModelConnection } from "@itwin/core-frontend";
import { ReloadedEvent } from "@itwin/mobile-sdk-core";
import { DraggableComponent, IconImage, ResizableBottomPanel, ResizableBottomPanelProps } from "@itwin/mobile-ui-react";
import { HeaderTitle, updateBackgroundColor, useLocalizedString } from "../Exports";

import "./ViewsBottomPanel.scss";

/** Properties for the {@link ViewsBottomPanel} React component. */
export interface ViewsBottomPanelProps extends ResizableBottomPanelProps {
  /** The loaded iModel from which to pick views. */
  iModel: IModelConnection;
  /** Optional callback that is called after a view is selected. */
  onViewSelected?: () => void;
}

/**
 * {@link ResizableBottomPanel} React component that allows the user to select any of the views saved in the iModel.
 *
 * This is a relatively simple example of a view selector.
 */
export function ViewsBottomPanel(props: ViewsBottomPanelProps) {
  const { iModel, onViewSelected, ...otherProps } = props;
  const [viewSpecs, setViewSpecs] = React.useState<IModelConnection.ViewSpec[]>([]);
  const viewsLabel = useLocalizedString("ViewsBottomPanel", "Views");
  const reloadedEvent = React.useRef(new ReloadedEvent());

  // React effect run during component initialization.
  React.useEffect(() => {
    // This function loads all the ViewSpecs in the iModel, then sets those to our React useState
    // variable.
    // React.useEffect callbacks cannot be async, since they have a meaningful return value that is
    // not a Promise.
    const loadViewSpecs = async () => {
      const query = { wantPrivate: false };
      const viewList = await iModel.views.getViewList(query);
      const localViewSpecs: IModelConnection.ViewSpec[] = [];
      for (const viewSpec of viewList) {
        const view = await iModel.views.load(viewSpec.id);
        // If the view has a userLabel, it needs to be used instead of the ViewSpec name.
        // So copy all the fields from viewSpec, then override the name when appropriate.
        localViewSpecs.push({ ...viewSpec, name: view.userLabel ?? viewSpec.name });
      }
      // Sort the ViewSpecs by name using case-insensitive compare.
      const sortedResult = localViewSpecs.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
      // Display the loaded ViewSpecs with generic view icons.
      setViewSpecs(sortedResult);
    };
    void loadViewSpecs();
  }, [iModel.views]);

  // Callback called when the user selects a view.
  const handleChangeView = React.useCallback((viewSpec: IModelConnection.ViewSpec) => {
    const changeView = async () => {
      const viewState = await iModel.views.load(viewSpec.id);
      updateBackgroundColor(viewState);
      IModelApp.viewManager.getFirstOpenView()?.changeView(viewState);
      onViewSelected?.();
    };
    void changeView();
  }, [iModel.views, onViewSelected]);

  const viewButtons = viewSpecs.map((viewSpec, index) => {
    const icon = <IconImage iconSpec="icon-saved-view" size="100px" />;
    return (
      <div className="list-item" key={index} onClick={() => { handleChangeView(viewSpec); }}>
        <div>{viewSpec.name}</div>
        {icon}
      </div>
    );
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
      header={<DraggableComponent className="resizable-panel-header">
        <HeaderTitle label={viewsLabel} iconSpec="icon-saved-view" />
      </DraggableComponent>}
      reloadedEvent={reloadedEvent.current}
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
