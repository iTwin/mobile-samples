/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";

import "./Button.css";

/// Properties for the [[Button]] React component.
export interface ButtonProps {
  /// The title of the button.
  title: string;
  /// Optional callback for when the button is tapped.
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  children?: React.ReactNode;
}

/// Extremely basic text button React component.
export function Button(props: ButtonProps) {
  const { title, onClick, children } = props;
  return <div className="Button" onClick={onClick}>{title}{children}</div>
}
