/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import classnames from "classnames";
import { IModelApp } from "@itwin/core-frontend";
import { Messenger, presentAlert } from "@itwin/mobile-sdk-core";
import { useTheme } from "@itwin/itwinui-react";
import "./Screen.scss";

/**
 * The App's active screen
 *
 * Note: Putting this in App.tsx leads to circular imports.
 */
export enum ActiveScreen {
  Loading,
  Home,
  LocalModels,
  Hub,
  Model,
}

/** Properties for the {@link Screen} React component. */
export interface ScreenProps {
  className?: string;
  /** The optional children of this full-screen component. */
  children?: React.ReactNode;
}

/**
 * Look up a localized string in the `ReactApp` i18n namespace.
 *
 * @param prefix The prefix of (top-level group) for the localized string.
 * @param key The name of the localized string.
 * @param options Optional options to pass to `getLocalizedString`.
 * @returns The given localized string.
 */
export function i18n(prefix: string, key: string, options?: any) {
  if (window.itmSampleParams.debugI18n) {
    return `=${IModelApp.localization.getLocalizedString(`ReactApp:${prefix}.${key}`, options)}=`;
  } else {
    return IModelApp.localization.getLocalizedString(`ReactApp:${prefix}.${key}`, options);
  }
}

/**
 * Convert a number to a string, rounded to a requested number of decimal places.
 *
 * @param input The number to round.
 * @param decimals The number of decimal places to round to, default 2.
 * @returns A string representation of {@link input}, rounded to the requested decimal places.
 */
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
    rounded = rounded.substring(0, len);
  } else {
    rounded = "";
  }
  return rounded;
}

/**
 * Convert a number representing a file size to a human-readable format.
 *
 * @param input The size of the file.
 * @param decimals The number of decimal places to round to, default 2.
 * @returns A human-readable representation of the file size, like "42.89 MB".
 */
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

/** React component for a simple full-screen UI with arbitrary children. */
export function Screen(props: ScreenProps = {}) {
  const { className, children } = props;

  useTheme("os");
  return <div className={classnames("screen", className)}>{children}</div>;
}

/**
 * Show an alert box for the given error using {@link presentAlert}.
 *
 * __Note__: Even though {@link presentAlert} is async, this function does not wait for it to complete.
 *
 * @param formatKey The localization key for the format string used to describe the error.
 * @param error The error that is being presented.
 * @param namespace The i18n namespace for {@link formatKey}, default "App".
 * @param showStatusBar Whether or not the device status bar should be visible while displaying the alert, default `true`.
 */
export function presentError(formatKey: string, error: any, namespace = "App", showStatusBar = true) {
  const errorMessage = (error instanceof Error) ? error.message : error;
  void presentAlert({
    title: i18n("Shared", "Error"),
    message: i18n(namespace, formatKey, { error: errorMessage }),
    showStatusBar,
    actions: [{
      name: "ok",
      title: i18n("Shared", "OK"),
    }],
  });
}

/**
 * Sign out of OIDC, presenting an error if there is a problem doing that.
 */
export async function signOut() {
  try {
    await Messenger.query("signOut");
  } catch (error) {
    presentError("SignOutErrorFormat", error);
  }
}
