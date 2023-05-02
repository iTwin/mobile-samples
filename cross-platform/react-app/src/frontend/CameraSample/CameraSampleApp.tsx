/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import * as React from "react";
import { useBeUiEvent } from "@itwin/mobile-ui-react";
import { IModelApp, IModelConnection } from "@itwin/core-frontend";
import { App, ModelScreenExtensionProps } from "../Exports";
import {
  CameraSampleToolsBottomPanel,
  ImageMarkerApi,
  PicturesBottomPanel,
  PictureView,
} from "./Exports";

/**
 * Look up a localized string in the `CameraSampleApp` i18n namespace.
 *
 * __Note__: If debugI18n is set to true in the app URL, the localized string has an equals sign
 * added to both the front and back. (For example, "About" becomes "=About=").
 *
 * @param prefix The prefix of (top-level group) for the localized string.
 * @param key The name of the localized string.
 * @param options Optional options to pass to `getLocalizedString`.
 * @returns The given localized string.
 */
export function CameraSampleAppGetLocalizedString(prefix: string, key: string, options?: any) {
  if (window.itmSampleParams.debugI18n) {
    return `=${IModelApp.localization.getLocalizedString(`CameraSampleApp:${prefix}.${key}`, options)}=`;
  } else {
    return IModelApp.localization.getLocalizedString(`CameraSampleApp:${prefix}.${key}`, options);
  }
}

/** React component to show a marker image when it is selected. */
function ImageSelectionHandler() {
  const [selectedPictureUrl, setSelectedPictureUrl] = React.useState<string>();

  useBeUiEvent((url) => setSelectedPictureUrl(url), ImageMarkerApi.onImageSelected);
  return selectedPictureUrl ? <PictureView url={selectedPictureUrl} onClick={(e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setSelectedPictureUrl(undefined);
  }} /> : null;
}

/** Top-level React component for the camera sample app. */
export function CameraSampleApp() {
  return <App
    onInitialize={async () => {
      await IModelApp.localization.registerNamespace("CameraSampleApp");
    }}
    getModelScreenExtensions={(iModel: IModelConnection): ModelScreenExtensionProps => {
      return {
        toolsBottomPanel: CameraSampleToolsBottomPanel,
        additionalComponents: <ImageSelectionHandler />,
        additionalTabs: [{
          label: CameraSampleAppGetLocalizedString("PicturesBottomPanel", "Pictures"),
          isTab: true,
          popup: <PicturesBottomPanel key="pictures" iModel={iModel} />,
        }],
      };
    }}
  />;
}
