/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import * as base64 from "base64-js";
import { IModelApp, IModelConnection } from "@itwin/core-frontend";
import { ThumbnailProps } from "@itwin/core-common";
import { ReloadedEvent } from "@itwin/mobile-sdk-core";
import { DraggableComponent, IconImage, ResizableBottomPanel, ResizableBottomPanelProps } from "@itwin/mobile-ui-react";
import { HeaderTitle, i18n, updateBackgroundColor } from "../Exports";

import "./ViewsBottomPanel.scss";

/// Properties for the [[ViewsBottomPanel]] React component.
export interface ViewsBottomPanelProps extends ResizableBottomPanelProps {
  /// The loaded iModel from which to pick views.
  iModel: IModelConnection;
  /// Optional callback that is called after a view is selected.
  onViewSelected?: () => void;
}

/** [[ResizableBottomPanel]] React component that allows the user to select any of the views saved in the iModel.
 *
 * This is a relatively simple example of a view selector that shows the view thumbnails.
 */
export function ViewsBottomPanel(props: ViewsBottomPanelProps) {
  const { iModel, onViewSelected, ...otherProps } = props;
  const [viewSpecs, setViewSpecs] = React.useState<IModelConnection.ViewSpec[]>([]);
  const [thumbnails, setThumbnails] = React.useState<(string | undefined)[]>([]);
  const viewsLabel = React.useMemo(() => i18n("ViewsBottomPanel", "Views"), []);
  const reloadedEvent = React.useRef(new ReloadedEvent());

  // React effect run during component initialization.
  React.useEffect(() => {
    // This function turns an array of image bytes into a data: URL for display.
    const getThumbnailUrl = (thumbnail: ThumbnailProps | undefined) => {
      if (!thumbnail) return undefined;
      const base64String = base64.fromByteArray(thumbnail.image);
      return `data:image/${thumbnail.format};base64,${base64String}`;
    };
    // This function asynchronously loads the thumbnails for all the views in the current iModel.
    const loadThumbnails = async (viewSpecsParam: IModelConnection.ViewSpec[]) => {
      // Clear any existing thumbnails.
      setThumbnails([]);
      for (const viewSpec of viewSpecsParam) {
        // iModel.views.getThumbnail throws an exception if the given view does not have a
        // thumbnail. This function simply calls that, but catches the exception and returns
        // undefined.
        const getThumbnail = async (viewSpecId: string) => {
          try {
            return await iModel.views.getThumbnail(viewSpecId);
          } catch (ex) {
            return undefined;
          }
        };
        // Get the thumbnail image bytes for the current viewSpec.
        const thumbnail = await getThumbnail(viewSpec.id);
        // Convert the thumbnail bytes into a data: URL string (or undefined if there is not thumbnail).
        const thumbnailUrl = getThumbnailUrl(thumbnail);
        // Append the new thumbnail to thumbnails. If there are a bunch of views in the model, this will
        // cause the component show the thumbnails as they get loaded, and show a generic view icon for
        // the ones that are not yet loaded. Any views that lack a thumbnail will continue to show the
        // generic view icon.
        setThumbnails((old) => {
          return [...old, thumbnailUrl];
        });
        reloadedEvent.current.emit();
      }
    };

    // This function loads all the ViewSpecs in the iModel, then sets those to our React useState
    // variable, then loads the thumbnails for all those ViewSpecs.
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
      // Load the thumbnails asynchronously, then display them as they are loaded.
      loadThumbnails(sortedResult);
    };
    loadViewSpecs();
  }, [iModel.views]);

  const handleChangeView = React.useCallback((viewSpec: IModelConnection.ViewSpec) => {
    const changeView = async () => {
      const viewState = await iModel.views.load(viewSpec.id);
      updateBackgroundColor(viewState);
      IModelApp.viewManager.getFirstOpenView()?.changeView(viewState);
      onViewSelected?.();
    };
    changeView();
  }, [iModel.views, onViewSelected]);

  const viewButtons = viewSpecs.map((viewSpec, index) => {
    if (thumbnails.length > index && thumbnails[index]) {
      return (
        <div className="list-item" key={index} onClick={() => { handleChangeView(viewSpec); }}>
          <div>{viewSpec.name}</div>
          <img src={thumbnails[index]} alt="View Thumbnail" />
        </div>
      );
    } else {
      return (
        <div className="list-item" key={index} onClick={() => { handleChangeView(viewSpec); }}>
          <div>{viewSpec.name}</div>
          <IconImage iconSpec="icon-saved-view" size="100px" />
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
