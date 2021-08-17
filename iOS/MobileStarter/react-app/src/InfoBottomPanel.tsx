import { BottomPanel, BottomPanelProps } from "@itwin/mobileui-react";

import "./InfoBottomPanel.scss";

interface InfoBottomPanelProps extends BottomPanelProps {
  name: string;
  filename: string;
}

export function InfoBottomPanel(props: InfoBottomPanelProps) {
  const { name, filename } = props;
  return (
    <BottomPanel {...props} className="info-bottom-panel">
      <div className="title">{name}</div>
      <div>Path: {filename}</div>
    </BottomPanel>
  );
}
