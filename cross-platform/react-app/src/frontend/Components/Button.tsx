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
}

/// Extremely basic text button React component.
export function Button(props: ButtonProps) {
  const { className, title, children, ...others } = props;
  return <div className={classnames("Button", className)} {...others}>{title}{children}</div>;
}
