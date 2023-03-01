/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import * as React from "react";
import { IModelApp, IModelConnection } from "@itwin/core-frontend";
import { FillCentered, Orientation } from "@itwin/core-react";
import { useElementSize } from "usehooks-ts";
import { VirtualizedPropertyGridWithDataProvider } from "@itwin/components-react";
import { IPresentationPropertyDataProvider, PresentationPropertyDataProvider, PresentationPropertyDataProviderProps, usePropertyDataProviderWithUnifiedSelection } from "@itwin/presentation-components";
import { DraggableComponent, IconImage, ResizableBottomPanel, ResizableBottomPanelProps, useBeEvent } from "@itwin/mobile-ui-react";
import { HeaderTitle, i18n } from "../Exports";

import "./ElementPropertiesPanel.scss";

interface PropertiesPanelProps extends ResizableBottomPanelProps {
  selectionCount: number;
  children: React.ReactNode;
}

interface PropertyGridParentProps {
  dataProvider: IPresentationPropertyDataProvider;
  height: number;
}

interface UnifiedSelectionPropertyGridProps extends PropertyGridParentProps {
  width: number;
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
  return <VirtualizedPropertyGridWithDataProvider {...props} orientation={Orientation.Horizontal} />;
}

function PropertyGridParent(props: PropertyGridParentProps) {
  const [gridRef, elementSize] = useElementSize();
  const allProps = {
    width: elementSize.width,
    ...props,
  };
  return (
    <div className="property-grid-parent" ref={gridRef}>
      <UnifiedSelectionPropertyGrid {...allProps} />
    </div>
  );
}

export function ElementPropertiesPanel(props: ElementPropertiesPanelProps) {
  const { iModel, onCloseClick } = props;
  const [selectionCount, setSelectionCount] = React.useState(IModelApp.viewManager.getFirstOpenView()?.view.iModel.selectionSet.size ?? 0);
  const ppdpProps = React.useMemo(() => {
    return {
      imodel: iModel,
      ruleset: "Items",
    } as PresentationPropertyDataProviderProps;
  }, [iModel]);
  const dataProvider = React.useMemo(() => new PresentationPropertyDataProvider(ppdpProps), [ppdpProps]);
  const propertiesLabel = React.useMemo(() => i18n("ElementPropertiesPanel", "Properties"), []);
  const [height, setHeight] = React.useState(0);

  useBeEvent(() => {
    setSelectionCount(iModel.selectionSet.size);
  }, iModel.selectionSet.onChanged);

  return (
    <PropertiesPanel
      {...props}
      onOpen={(panelHeight) => setHeight(panelHeight)}
      onResized={(panelHeight) => {
        setHeight(panelHeight);
        return false;
      }}
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
          <PropertyGridParent
            dataProvider={dataProvider}
            height={height - 40}
          />
        </div>
      }
    </PropertiesPanel>
  );
}
