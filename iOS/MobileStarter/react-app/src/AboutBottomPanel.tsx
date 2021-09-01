/*---------------------------------------------------------------------------------------------
* Copyright (c) 2021 Bentley Systems, Incorporated. All rights reserved.
*--------------------------------------------------------------------------------------------*/
import { BottomPanel, BottomPanelProps } from "@itwin/mobileui-react";

import "./AboutBottomPanel.scss";

// [[BottomPanel]] React Component with fixed content, here simply as an example.
export function AboutBottomPanel(props: BottomPanelProps) {
  return (
    <BottomPanel {...props} className="about-bottom-panel">
      <div className="title">About</div>
      <div>Random about text goes here.</div>
      <div>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</div>
    </BottomPanel>
  );
}
