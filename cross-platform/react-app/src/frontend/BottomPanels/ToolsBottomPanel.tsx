/*---------------------------------------------------------------------------------------------
* Copyright (c) 2020 Bentley Systems, Incorporated. All rights reserved.
*--------------------------------------------------------------------------------------------*/
import * as React from "react";
import classnames from "classnames";
import { CoreTools, ToolItemDef } from "@itwin/appui-react";
import { IModelApp, IModelConnection, ToolSettings, ViewClipClearTool, WalkViewTool } from "@itwin/core-frontend";
import { MeasureToolDefinitions } from "@itwin/measure-tools-react";
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

/** Properties for the {@link ButtonRow} React component. */
export type ButtonRowProps = React.HTMLAttributes<HTMLDivElement>;

/** Information about one entry in the Tools panel. */
export interface ToolEntry {
  labelKey: string;
  icon?: string;
  // @todo AppUI deprecation
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  toolItemDef: ToolItemDef;
}

/** A horizontally scrollable container for Buttons that forwards the scrollable div to its parent. */
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

/** Properties for the {@link ActiveButtonRow} React component. */
export interface ActiveButtonRowProps extends ButtonRowProps {
  /** The index of the active button. */
  activeIndex?: number;
}

/**
 * A horizontally scrollable container for Buttons that ensures the child at the activeIndex is visible when resized.
 * As with {@link ButtonRow}, it forwards the scrollable div's reference to its parent.
 */
export const ActiveButtonRow = React.forwardRef((props: ActiveButtonRowProps, ref: MutableHtmlDivRefOrFunction) => {
  const { activeIndex, ...others } = props;
  const divRef = React.useRef<HTMLDivElement | null>(null);

  useHorizontalScrollChildVisibleOnResize(divRef.current, activeIndex !== undefined && activeIndex >= 0 ? activeIndex + 1 : undefined);

  return <ButtonRow ref={makeRefHandler(ref, divRef)} {...others} />;
});
ActiveButtonRow.displayName = "ActiveButtonRow";

/** Properties for the {@link ToolsBottomPanel} React component. */
export interface ToolsBottomPanelProps extends BottomPanelProps {
  /** The loaded iModel. */
  iModel: IModelConnection;

  /** Optional callback that is called after a tool is selected. */
  onToolClick?: () => void;
  /** Optional tools to show instead of the default ones. Used by the camera sample. */
  tools?: ToolEntry[];
}

/** Command called by the walk tool. */
function viewLookAndMoveCommand() {
  // @todo AppUI deprecation
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  return new ToolItemDef({
    toolId: "View.LookAndMove",
    iconSpec: WalkViewTool.iconSpec,
    label: WalkViewTool.flyover,
    description: WalkViewTool.description,
    isHidden: false,
    execute: async () => IModelApp.tools.run("View.LookAndMove", IModelApp.viewManager.selectedView),
  });
}

/**
 * Generate the array of default tools.
 * @returns An array of {@link ToolEntry} values for all of the default tools.
 */
export function getDefaultTools(): ToolEntry[] {
  return [
    // @todo AppUI deprecation
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    { labelKey: "ReactApp:ToolsBottomPanel.Select", icon: "icon-gesture-touch", toolItemDef: CoreTools.selectElementCommand },
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    { labelKey: "ReactApp:ToolsBottomPanel.Distance", icon: "icon-measure-distance", toolItemDef: MeasureToolDefinitions.measureDistanceToolCommand },
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    { labelKey: "ReactApp:ToolsBottomPanel.Location", icon: "icon-measure-location", toolItemDef: MeasureToolDefinitions.measureLocationToolCommand },
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    { labelKey: "ReactApp:ToolsBottomPanel.Area", icon: "icon-measure-2d", toolItemDef: MeasureToolDefinitions.measureAreaToolCommand },
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    { labelKey: "ReactApp:ToolsBottomPanel.Radius", icon: "icon-measure-arc", toolItemDef: MeasureToolDefinitions.measureRadiusToolCommand },
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    { labelKey: "ReactApp:ToolsBottomPanel.Angle", icon: "icon-measure-angle", toolItemDef: MeasureToolDefinitions.measureAngleToolCommand },
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    { labelKey: "ReactApp:ToolsBottomPanel.Perpendicular", icon: "icon-measure-perpendicular", toolItemDef: MeasureToolDefinitions.measurePerpendicularToolCommand },
    { labelKey: "ReactApp:ToolsBottomPanel.Clear", icon: "icon-measure-clear", toolItemDef: MeasureToolDefinitions.clearMeasurementsToolCommand },
    { labelKey: "ReactApp:ToolsBottomPanel.Walk", icon: "icon-walk", toolItemDef: viewLookAndMoveCommand() },
    // @todo AppUI deprecation
    /* eslint-disable @typescript-eslint/no-deprecated */
    { labelKey: "ReactApp:ToolsBottomPanel.SectionByPlane", toolItemDef: CoreTools.sectionByPlaneCommandItemDef },
    { labelKey: "ReactApp:ToolsBottomPanel.SectionByElement", toolItemDef: CoreTools.sectionByElementCommandItemDef },
    { labelKey: "ReactApp:ToolsBottomPanel.SectionByRange", toolItemDef: CoreTools.sectionByRangeCommandItemDef },
    { labelKey: "ReactApp:ToolsBottomPanel.SectionByShape", toolItemDef: CoreTools.sectionByShapeCommandItemDef },
    { labelKey: "ReactApp:ToolsBottomPanel.ClearSection", icon: "icon-section-clear", toolItemDef: ToolItemDef.getItemDefForTool(ViewClipClearTool) },
    /* eslint-enable @typescript-eslint/no-deprecated */
  ];
}

/** {@link BottomPanel} React component that shows tools. */
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
  // @todo AppUI deprecation
  // eslint-disable-next-line @typescript-eslint/no-deprecated
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
