/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { IModelApp } from "@itwin/core-frontend";
import { ProgressInfo } from "@bentley/itwin-client";
import { MobileCore, presentAlert } from "@itwin/mobile-sdk-core";
import "./Screen.scss";

/// Properties for the [[Screen]] React component.
export interface ScreenProps {
  /// The optional children of this full-screen component.
  children?: React.ReactNode;
}

let debugI18n = false;
let debugI18nChecked = false;

function shouldDebugI18n() {
  if (!debugI18nChecked) {
    debugI18n = MobileCore.getUrlSearchParam("debugI18n") === "YES";
    debugI18nChecked = true;
  }
  return debugI18n;
}

export function i18n(prefix: string, key: string, options?: any) {
  if (shouldDebugI18n()) {
    return "=" + IModelApp.localization.getLocalizedStringWithNamespace("ReactApp", `${prefix}.${key}`, options) + "=";
  } else {
    return IModelApp.localization.getLocalizedStringWithNamespace("ReactApp", `${prefix}.${key}`, options);
  }
}

export function roundedNumber(input: number, decimals?: number) {
  if (decimals === undefined) {
    decimals = 2;
  }
  let decimalSeparator = (1.2).toLocaleString().indexOf(",") === -1 ? "." : ",";
  let rounded = input.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: decimals });
  let len = rounded.length;
  if (len > 0) {
    if (rounded.charAt(len - 1) === decimalSeparator) {
      --len;
    }
    rounded = rounded.substr(0, len);
  } else {
    rounded = "";
  }
  return rounded;
}

export function fileSizeString(input?: number, decimals?: number) {
  if (input === undefined) {
    return i18n("Screen", "MBFormat", { size: "?" });
  }
  const kb = 1024; // Should it be 1000?
  const mb = kb * kb;
  const gb = mb * kb;

  if (input < kb) {
    return i18n("Screen", "BFormat", { size: input.toString() });
  } else if (input < mb) {
    return i18n("Screen", "KBFormat", { size: roundedNumber(input / kb, decimals).toString() });
  } else if (input < gb) {
    return i18n("Screen", "MBFormat", { size: roundedNumber(input / mb, decimals).toString() });
  } else {
    return i18n("Screen", "GBFormat", { size: roundedNumber(input / gb, decimals).toString() });
  }
}

export function progressString(progress: ProgressInfo | undefined) {
  let percent = progress?.percent?.toString();
  if (percent === undefined && progress?.total) {
    percent = roundedNumber(100.0 * progress.loaded / progress.total, 0);
  }
  if (percent === undefined) {
    if (progress && progress.loaded) {
      return i18n("Screen", "LoadedFormat", { value: progress.loaded });
    } else {
      return "";
    }
  }
  return " (" + percent + "%)";
}


/// React component for a simple full-screen UI with arbitrary children.
export function Screen(props?: ScreenProps) {
  return <div className="screen">{props?.children}</div>
}

export function presentError(formatKey: string, error: any, namespace = "App") {
  const errorMessage = (error instanceof Error) ? error.message : error;
  presentAlert({
    title: i18n("Shared", "Error"),
    message: i18n(namespace, formatKey, { error: errorMessage }),
    actions: [{
      name: "ok",
      title: i18n("Shared", "OK"),
    }],
  });
}
