/*---------------------------------------------------------------------------------------------
* Copyright (c) 2021 Bentley Systems, Incorporated. All rights reserved.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import "./Screen.scss";

/// Properties for the [[Screen]] React component.
export interface ScreenProps {
  /// The optional children of this full-screen component.
  children?: React.ReactNode;
}

/// React component for a simple full-screen UI with arbitrary children.
export function Screen(props?: ScreenProps) {
  return <div className="screen">{props?.children}</div>
}
