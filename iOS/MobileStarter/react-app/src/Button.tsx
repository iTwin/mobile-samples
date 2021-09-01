/*---------------------------------------------------------------------------------------------
* Copyright (c) 2021 Bentley Systems, Incorporated. All rights reserved.
*--------------------------------------------------------------------------------------------*/
import React from "react";

import "./Button.css";

/// Properties for the [[Button]] React component.
export interface ButtonProps {
  /// The title of the button.
  title: string;
  /// Optional callback for when the button is tapped.
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

/// Extremely basic text button React component.
export function Button(props: ButtonProps) {
  const { title, onClick } = props;
  return <div className="Button" onClick={onClick}>{title}</div>
}
