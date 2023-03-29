/*---------------------------------------------------------------------------------------------
* Copyright (c) 2020 Bentley Systems, Incorporated. All rights reserved.
*--------------------------------------------------------------------------------------------*/
import * as React from "react";
import classnames from "classnames";
import { CoreTools, ToolItemDef } from "@itwin/appui-react";
import { IModelApp, IModelConnection, ToolSettings, ViewClipClearTool, WalkViewTool } from "@itwin/core-frontend";
// import { MeasureToolDefinitions } from "@itwin/measure-tools-react";
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

export interface ToolEntry {
  labelKey: string;
  icon?: string;
  toolItemDef: ToolItemDef;
}

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
ButtonRow.displayName = "ButtonRow";

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
ActiveButtonRow.displayName = "ActiveButtonRow";

export interface ToolsBottomPanelProps extends BottomPanelProps {
  /// The loaded iModel.
  iModel: IModelConnection;

  /// Optional callback that is called after a tool is selected.
  onToolClick?: () => void;
  tools?: ToolEntry[];
}

function viewLookAndMoveCommand() {
  return new ToolItemDef({
    toolId: "View.LookAndMove",
    iconSpec: WalkViewTool.iconSpec,
    label: WalkViewTool.flyover,
    description: WalkViewTool.description,
    isHidden: false,
    execute: async () => IModelApp.tools.run("View.LookAndMove", IModelApp.viewManager.selectedView),
  });
}

export function getDefaultTools(): ToolEntry[] {
  return [
    { labelKey: "ReactApp:ToolsBottomPanel.Select", icon: "icon-gesture-touch", toolItemDef: CoreTools.selectElementCommand },
    // { labelKey: "ReactApp:ToolsBottomPanel.Distance", icon: "icon-measure-distance", toolItemDef: MeasureToolDefinitions.measureDistanceToolCommand },
    // { labelKey: "ReactApp:ToolsBottomPanel.Location", icon: "icon-measure-location", toolItemDef: MeasureToolDefinitions.measureLocationToolCommand },
    // { labelKey: "ReactApp:ToolsBottomPanel.Area", icon: "icon-measure-2d", toolItemDef: MeasureToolDefinitions.measureAreaToolCommand },
    // { labelKey: "ReactApp:ToolsBottomPanel.Radius", icon: "icon-measure-arc", toolItemDef: MeasureToolDefinitions.measureRadiusToolCommand },
    // { labelKey: "ReactApp:ToolsBottomPanel.Angle", icon: "icon-measure-angle", toolItemDef: MeasureToolDefinitions.measureAngleToolCommand },
    // { labelKey: "ReactApp:ToolsBottomPanel.Perpendicular", icon: "icon-measure-perpendicular", toolItemDef: MeasureToolDefinitions.measurePerpendicularToolCommand },
    // { labelKey: "ReactApp:ToolsBottomPanel.Clear", icon: "icon-measure-clear", toolItemDef: MeasureToolDefinitions.clearMeasurementsToolCommand },
    { labelKey: "ReactApp:ToolsBottomPanel.Walk", icon: "icon-walk", toolItemDef: viewLookAndMoveCommand() },
    { labelKey: "ReactApp:ToolsBottomPanel.SectionByPlane", toolItemDef: CoreTools.sectionByPlaneCommandItemDef },
    { labelKey: "ReactApp:ToolsBottomPanel.SectionByElement", toolItemDef: CoreTools.sectionByElementCommandItemDef },
    { labelKey: "ReactApp:ToolsBottomPanel.SectionByRange", toolItemDef: CoreTools.sectionByRangeCommandItemDef },
    { labelKey: "ReactApp:ToolsBottomPanel.SectionByShape", toolItemDef: CoreTools.sectionByShapeCommandItemDef },
    { labelKey: "ReactApp:ToolsBottomPanel.ClearSection", icon: "icon-section-clear", toolItemDef: ToolItemDef.getItemDefForTool(ViewClipClearTool) },
  ];
}

export function ToolsBottomPanel(props: ToolsBottomPanelProps) {
  const defaultTools = React.useMemo(getDefaultTools, []);
  const { iModel: _iModel, onToolClick, tools = defaultTools, ...others } = props;
  const activeToolId = useActiveToolId();
  const activeToolIndex = activeToolId !== undefined ? tools.findIndex((tool) => activeToolId === tool.toolItemDef.toolId) : undefined;
  const toolsRowRef = React.useRef<HTMLDivElement>(null);

  // Use the virtual cursor for locating elements other than the select tool
  // Any time activeToolId changes, ToolsBottomPanel() will execute again (due to useActiveToolId updating activeToolId).
  // This allows us to put this here instead of inside the tool activation. If this is in the tool activation, it won't
  // auto-detect when a tool ends on its own (switching back to select tool). The section tools all end on their own.
  ToolSettings.enableVirtualCursorForLocate = activeToolId !== CoreTools.selectElementCommand.toolId;

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
          label={IModelApp.localization.getLocalizedString(value.labelKey)}
          iconSpec={value.icon ?? value.toolItemDef.iconSpec}
          selected={activeToolId === value.toolItemDef.toolId}
          onClick={async () => {
            // Ensure the selectedView is the main viewport otherwise some tools won't execute as the selected view is incompatible.
            // This only applies when an app has more than one viewport, but does no harm.
            void IModelApp.viewManager.setSelectedView(IModelApp.viewManager.getFirstOpenView());

            value.toolItemDef.execute();
            onToolClick?.();
          }}
        />;
      })}
    </ActiveButtonRow>
  </BottomPanel>;
}
