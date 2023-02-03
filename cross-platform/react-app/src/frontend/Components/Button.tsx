/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import classnames from "classnames";
import "./Button.scss";

/// Properties for the [[Button]] React component.
export interface ButtonProps extends React.HTMLAttributes<HTMLDivElement> {
  /// The title of the button.
  title: string;
  /// Optional react node to put to the left of the title, intended to contain an icon.
  icon?: React.ReactNode;
}

/// Extremely basic text button React component.
export function Button(props: ButtonProps) {
  const { className, title, icon, children, ...others } = props;
  return <div className={classnames("Button", className)} {...others}>{icon}{title}{children}</div>;
}
