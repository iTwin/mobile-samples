import React from "react";
import "./Screen.scss";

export interface ScreenProps {
  children?: React.ReactNode;
}

export function Screen(props?: ScreenProps) {
  return <div className="screen">{props?.children}</div>
}
