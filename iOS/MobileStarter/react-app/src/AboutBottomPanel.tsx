/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { BottomPanel, BottomPanelProps } from "@itwin/mobile-ui-react";
import { HeaderTitle } from "./Exports";

import "./AboutBottomPanel.scss";

// [[BottomPanel]] React Component with fixed content, here simply as an example.
export function AboutBottomPanel(props: BottomPanelProps) {
  return (
    <BottomPanel {...props} className="about-bottom-panel">
      <HeaderTitle label="About" iconSpec="icon-lightbulb" />
      <div className="header">Random about text goes here.</div>
      <div className="about">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</div>
    </BottomPanel>
  );
}
