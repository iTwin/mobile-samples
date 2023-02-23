/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import * as React from "react";
import { IModelApp, IModelConnection } from "@itwin/core-frontend";
import { FillCentered } from "@itwin/core-react";
import { PropertyGrid } from "@itwin/components-react";
import { IPresentationPropertyDataProvider, PresentationPropertyDataProvider, PresentationPropertyDataProviderProps, usePropertyDataProviderWithUnifiedSelection } from "@itwin/presentation-components";
import { DraggableComponent, IconImage, ResizableBottomPanel, ResizableBottomPanelProps, useBeEvent } from "@itwin/mobile-ui-react";
import { HeaderTitle, i18n } from "../Exports";

import "./ElementPropertiesPanel.scss";

interface PropertiesPanelProps extends ResizableBottomPanelProps {
  selectionCount: number;
  children: React.ReactNode;
}

interface UnifiedSelectionPropertyGridProps {
  dataProvider: IPresentationPropertyDataProvider;
}

export interface ElementPropertiesPanelProps extends ResizableBottomPanelProps {
  iModel: IModelConnection;
  onCloseClick: () => void;
}

function PropertiesPanel(props: PropertiesPanelProps) {
  const { isOpen, selectionCount, children, ...otherProps } = props;
  const openAndHaveSelection = isOpen && selectionCount > 0;

  return <ResizableBottomPanel
    isStandAlone
    isOpen={openAndHaveSelection}
    {...otherProps}
    heightCanExceedContents
    minInitialHeight={window.outerHeight / 2} // stand-alone so we don't include the tab bar nor bottom safe area
  >
    {children}
  </ResizableBottomPanel>;
}

function UnifiedSelectionPropertyGrid(props: UnifiedSelectionPropertyGridProps) {
  const { isOverLimit } = usePropertyDataProviderWithUnifiedSelection({ dataProvider: props.dataProvider });
  if (isOverLimit) {
    return (<FillCentered>Too many elements selected.</FillCentered>);
  }
  // @todo: use VirtualizedPropertyGrid instead, seems like a non-trivial change
  return <PropertyGrid {...props} />; // eslint-disable-line deprecation/deprecation
}

export function ElementPropertiesPanel(props: ElementPropertiesPanelProps) {
  const { iModel, onCloseClick } = props;
  const [selectionCount, setSelectionCount] = React.useState(IModelApp.viewManager.getFirstOpenView()?.view.iModel.selectionSet.size ?? 0);
  const ppdpProps: PresentationPropertyDataProviderProps = {
    imodel: iModel,
    ruleset: "Items",
  };
  const dataProvider = new PresentationPropertyDataProvider(ppdpProps);
  const propertiesLabel = React.useMemo(() => i18n("ElementPropertiesPanel", "Properties"), []);

  useBeEvent(() => {
    setSelectionCount(iModel.selectionSet.size);
  }, iModel.selectionSet.onChanged);

  return (
    <PropertiesPanel
      {...props}
      selectionCount={selectionCount}
      header={<DraggableComponent className="resizable-panel-header">
        <div className="header-row">
          <HeaderTitle label={propertiesLabel} iconSpec="icon-details" />
          <div className="title">
            <div style={{ marginRight: 10, pointerEvents: "auto" }}
              onClick={onCloseClick}>
              <IconImage iconSpec="icon-close-2" />
            </div>
          </div>
        </div>
      </DraggableComponent>}
    >
      {dataProvider &&
        <div className="properties-panel">
          <div className="property-grid-parent">
            <UnifiedSelectionPropertyGrid
              dataProvider={dataProvider}
            />
          </div>
        </div>
      }
    </PropertiesPanel>
  );
}
