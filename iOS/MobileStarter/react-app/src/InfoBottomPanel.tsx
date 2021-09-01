/*---------------------------------------------------------------------------------------------
* Copyright (c) 2021 Bentley Systems, Incorporated. All rights reserved.
*--------------------------------------------------------------------------------------------*/
import { BottomPanel, BottomPanelProps } from "@itwin/mobileui-react";

import "./InfoBottomPanel.scss";

/// Properties for the [[InfoBottomPanel]] React component.
interface InfoBottomPanelProps extends BottomPanelProps {
  /// The name of the iModel.
  name: string;
  /// The path for the iModel.
  filename: string;
}

/// [[BottomPanel]] React component that shows the iModel name and path.
export function InfoBottomPanel(props: InfoBottomPanelProps) {
  const { name, filename } = props;
  return (
    <BottomPanel {...props} className="info-bottom-panel">
      <div className="title">{name}</div>
      <div>Path: {filename}</div>
    </BottomPanel>
  );
}
