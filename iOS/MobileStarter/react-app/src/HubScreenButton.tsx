/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import classnames from "classnames";
import { LoadingSpinner } from "@itwin/core-react";
import { Button, ButtonProps } from "./Exports";

export function HubScreenButton(props: ButtonProps) {
  const { className, ...others } = props;
  return <Button className={classnames("imodel-row", className)} {...others} />;
}

export interface HubScreenButtonListProps {
  children?: React.ReactNode;
  loading?: boolean;
}

export function HubScreenButtonList(props: HubScreenButtonListProps) {
  const { children, loading } = props;
  if (loading)
    return <div className="centered"><LoadingSpinner /></div>;

  return <div className="list">
    <div className="list-items">{children}</div>
  </div>;
}
