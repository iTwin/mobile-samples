/*---------------------------------------------------------------------------------------------
* Copyright (c) 2020 Bentley Systems, Incorporated. All rights reserved.
*--------------------------------------------------------------------------------------------*/
import * as React from "react";
import classnames from "classnames";
import { CoreTools } from "@bentley/ui-framework";
import {
  IModelApp, ToolSettings,
} from "@bentley/imodeljs-frontend";
import {
  MeasureToolDefinitions
} from "@bentley/measure-tools-react";
import {
  assignRef,
  BottomPanel,
  BottomPanelProps,
  CircularButton,
  horizontallyScrollChildVisible,
  HorizontalScrollableWithFades,
  makeRefHandler,
  MutableHtmlDivRefOrFunction,
  useActiveToolId,
  useHorizontalScrollChildVisibleOnResize,
  useScrolling,
} from "@itwin/mobile-ui-react";

import "./ToolsBottomPanel.scss";

export type ButtonRowProps = React.HTMLAttributes<HTMLDivElement>;

// tslint:disable-next-line: variable-name
export const ButtonRow = React.forwardRef((props: ButtonRowProps, ref: MutableHtmlDivRefOrFunction) => {
  const { className, children, ...nonChildren } = props;
  const divRef = React.useRef<HTMLDivElement | null>(null);
  const scrolling = useScrolling(divRef.current);

  return (
    <HorizontalScrollableWithFades
      {...nonChildren}
      scrollableClassName={classnames("button-row", className, scrolling && "scrolling")}
      fadesClassName="button-row-fades"
      onSetScrollable={(scrollable) => {
        divRef.current = scrollable;
        assignRef(ref, scrollable);
      }}
    >
      {children && <div className="button-spacer" />}
      {children}
      {children && <div className="button-spacer" />}
    </HorizontalScrollableWithFades>
  );
});

export interface ActiveButtonRowProps extends ButtonRowProps {
  activeIndex?: number;
}

// tslint:disable-next-line: variable-name
export const ActiveButtonRow = React.forwardRef((props: ActiveButtonRowProps, ref: MutableHtmlDivRefOrFunction) => {
  const { activeIndex, ...others } = props;
  const divRef = React.useRef<HTMLDivElement | null>(null);

  useHorizontalScrollChildVisibleOnResize(divRef.current, activeIndex !== undefined && activeIndex >= 0 ? activeIndex + 1 : undefined);

  return <ButtonRow ref={makeRefHandler(ref, divRef)} {...others} />;
});
export interface ToolsBottomPanelProps extends BottomPanelProps {
  onToolClick?: () => void;
}

export function ToolsBottomPanel(props: ToolsBottomPanelProps) {
  const { onToolClick, ...others } = props;
  const tools = [
    { labelKey: "ReactApp:ToolsBottomPanel.Select", icon: "icon-gesture-touch", toolItemDef: CoreTools.selectElementCommand },
    { labelKey: "ReactApp:ToolsBottomPanel.Distance", icon: "icon-measure-distance", toolItemDef: MeasureToolDefinitions.measureDistanceToolCommand },
    { labelKey: "ReactApp:ToolsBottomPanel.Location", icon: "icon-measure-location", toolItemDef: MeasureToolDefinitions.measureLocationToolCommand },
    { labelKey: "ReactApp:ToolsBottomPanel.Area", icon: "icon-measure-2d", toolItemDef: MeasureToolDefinitions.measureAreaToolCommand },
    { labelKey: "ReactApp:ToolsBottomPanel.Radius", icon: "icon-measure-arc", toolItemDef: MeasureToolDefinitions.measureRadiusToolCommand },
    { labelKey: "ReactApp:ToolsBottomPanel.Angle", icon: "icon-measure-angle", toolItemDef: MeasureToolDefinitions.measureAngleToolCommand },
    { labelKey: "ReactApp:ToolsBottomPanel.Perpendicular", icon: "icon-measure-perpendicular", toolItemDef: MeasureToolDefinitions.measurePerpendicularToolCommand },
    { labelKey: "ReactApp:ToolsBottomPanel.Clear", icon: "icon-measure-clear", toolItemDef: MeasureToolDefinitions.clearMeasurementsToolCommand },
  ];

  const activeToolId = useActiveToolId();
  const activeToolIndex = activeToolId !== undefined ? tools.findIndex((tool) => activeToolId === tool.toolItemDef.toolId) : undefined;
  const toolsRowRef = React.useRef<HTMLDivElement>(null);

  return <BottomPanel
    {...others}
    className="tools-bottom-panel"
    onOpen={() => {
      if (toolsRowRef.current && activeToolIndex !== undefined)
        horizontallyScrollChildVisible(toolsRowRef.current, activeToolIndex + 1);
    }}>
    <ActiveButtonRow ref={toolsRowRef}
      activeIndex={activeToolIndex}>
      {tools.map((value) => {
        return <CircularButton
          key={value.labelKey}
          className="tool-button"
          label={IModelApp.i18n.translate(value.labelKey)}
          iconSpec={/* value.toolItemDef.iconSpec ??  */value.icon}
          selected={activeToolId === value.toolItemDef.toolId}
          onClick={async () => {
            // Ensure the selectedView is the main viewport otherwise some tools won't execute as the selected view is incompatible.
            // This only applies when an app has more than one viewport, but does no harm.
            IModelApp.viewManager.setSelectedView(IModelApp.viewManager.getFirstOpenView());

            // Always use the virtual cursor for locating elements
            ToolSettings.enableVirtualCursorForLocate = true;

            value.toolItemDef.execute();
            onToolClick?.();
          }}
        />;
      })}
    </ActiveButtonRow>
  </BottomPanel>;
}
