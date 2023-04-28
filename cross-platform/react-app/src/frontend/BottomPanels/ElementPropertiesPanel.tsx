/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import * as React from "react";
import { IModelApp, IModelConnection } from "@itwin/core-frontend";
import { FillCentered } from "@itwin/core-react";
import useResizeObserver from "@react-hook/resize-observer";
import { VirtualizedPropertyGridWithDataProvider } from "@itwin/components-react";
import { IPresentationPropertyDataProvider, PresentationPropertyDataProvider, PresentationPropertyDataProviderProps, usePropertyDataProviderWithUnifiedSelection } from "@itwin/presentation-components";
import { DraggableComponent, IconImage, ResizableBottomPanel, ResizableBottomPanelProps, useBeEvent } from "@itwin/mobile-ui-react";
import { HeaderTitle, useLocalizedString } from "../Exports";

import "./ElementPropertiesPanel.scss";

interface ElementSize {
  width: number;
  height: number;
}

const useElementSize = (target: React.RefObject<HTMLElement>) => {
  const [size, setSize] = React.useState<ElementSize>();

  React.useLayoutEffect(() => {
    if (target.current) {
      const rect = target.current?.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    } else {
      setSize(undefined);
    }
  }, [target]);
  useResizeObserver(target, (entry) => setSize(entry.contentRect));
  return size ?? ({ x: 0, y: 0, width: 0, height: 0 } as DOMRect);
};

interface PropertiesPanelProps extends ResizableBottomPanelProps {
  selectionCount: number;
  children: React.ReactNode;
}

interface PropertyGridParentProps {
  dataProvider: IPresentationPropertyDataProvider;
}

interface UnifiedSelectionPropertyGridProps extends PropertyGridParentProps {
  width: number;
  height: number;
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
  const toManyElementsLabel = useLocalizedString("ElementPropertiesPanel", "TooManyElements");
  if (isOverLimit) {
    return (<FillCentered className="too-many-elements">{toManyElementsLabel}</FillCentered>);
  }
  return <VirtualizedPropertyGridWithDataProvider {...props} horizontalOrientationMinWidth={400} />;
}

function PropertyGridParent(props: PropertyGridParentProps) {
  const divRef = React.useRef<HTMLDivElement | null>(null);
  const { width, height } = useElementSize(divRef);
  const allProps = {
    width,
    height,
    ...props,
  };
  return (
    <div className="property-grid-parent" ref={divRef}>
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
  const propertiesLabel = useLocalizedString("ElementPropertiesPanel", "Properties");

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
          <PropertyGridParent
            dataProvider={dataProvider}
          />
        </div>
      }
    </PropertiesPanel>
  );
}
