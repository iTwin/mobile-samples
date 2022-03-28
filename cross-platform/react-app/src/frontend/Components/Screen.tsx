/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { IModelApp } from "@itwin/core-frontend";
import { ProgressInfo } from "@itwin/core-frontend/lib/cjs/request/Request";
import { presentAlert } from "@itwin/mobile-sdk-core";
import { useTheme } from "@itwin/itwinui-react";
import { useActiveColorSchemeIsDark } from "@itwin/mobile-ui-react";
import "./Screen.scss";

/// Properties for the [[Screen]] React component.
export interface ScreenProps {
  /// The optional children of this full-screen component.
  children?: React.ReactNode;
}

export function i18n(prefix: string, key: string, options?: any) {
  if (window.itmSampleParams.debugI18n) {
    return `=${IModelApp.localization.getLocalizedStringWithNamespace("ReactApp", `${prefix}.${key}`, options)}=`;
  } else {
    return IModelApp.localization.getLocalizedStringWithNamespace("ReactApp", `${prefix}.${key}`, options);
  }
}

export function roundedNumber(input: number, decimals?: number) {
  if (decimals === undefined) {
    decimals = 2;
  }
  const decimalSeparator = (1.2).toLocaleString().indexOf(",") === -1 ? "." : ",";
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
  return ` (${percent}%)`;
}

/// React component for a simple full-screen UI with arbitrary children.
export function Screen(props?: ScreenProps) {
  const isDark = useActiveColorSchemeIsDark();

  // The useTheme hook below does not currently detect theme changes on the fly if "os" is
  // set as the theme.
  useTheme(isDark ? "dark" : "light");
  return <div className="screen">{props?.children}</div>;
}

export function presentError(formatKey: string, error: any, namespace = "App", showStatusBar = true) {
  const errorMessage = (error instanceof Error) ? error.message : error;
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  presentAlert({
    title: i18n("Shared", "Error"),
    message: i18n(namespace, formatKey, { error: errorMessage }),
    showStatusBar,
    actions: [{
      name: "ok",
      title: i18n("Shared", "OK"),
    }],
  });
}
