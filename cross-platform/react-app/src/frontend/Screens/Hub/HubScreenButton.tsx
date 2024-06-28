/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import classnames from "classnames";
import { ProgressRadial } from "@itwin/itwinui-react";
import { Button, ButtonProps } from "../../Exports";
import { useScroll } from "@itwin/mobile-ui-react";

/** React component to show a button on the hub screen. */
export function HubScreenButton(props: ButtonProps) {
  const { className, ...others } = props;
  return <Button className={classnames("hubscreen-button", className)} {...others} />;
}

/** Properties for the {@link HubScreenButtonList} React component. */
export interface HubScreenButtonListProps {
  children?: React.ReactNode;
  loading?: boolean;
  onScroll?: (element: HTMLElement) => void;
}

/** React component to show a list of buttons on the hub screen. */
export function HubScreenButtonList(props: HubScreenButtonListProps) {
  const { children, loading, onScroll } = props;
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const handleScroll = React.useCallback((element: HTMLElement) => {
    onScroll?.(element);
  }, [onScroll]);
  useScroll(listRef.current, handleScroll);

  // In order for the useScroll effect to work, we need to ALWAYS return the list div, so
  // we just hide it or the loading spinner depending on the loading state.
  const getDisplayStyle = (none: boolean) => none ? { display: "none" } : undefined;
  return <>
    <div style={getDisplayStyle(!loading)} className="centered-list"><ProgressRadial indeterminate /></div>
    <div style={getDisplayStyle(!!loading)} ref={listRef} className="hubscreen-list">
      <div className="list-items">{children}</div>
    </div>
  </>;
}
