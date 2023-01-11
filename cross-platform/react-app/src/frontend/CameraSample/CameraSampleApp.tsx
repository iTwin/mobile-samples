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

export function CameraSampleAppGetLocalizedString(prefix: string, key: string, options?: any) {
  if (window.itmSampleParams.debugI18n) {
    return `=${IModelApp.localization.getLocalizedString(`CameraSampleApp:${prefix}.${key}`, options)}=`;
  } else {
    return IModelApp.localization.getLocalizedString(`CameraSampleApp:${prefix}.${key}`, options);
  }
}

function ImageSelectionHandler() {
  const [selectedPictureUrl, setSelectedPictureUrl] = React.useState<string>();

  useBeUiEvent((url) => setSelectedPictureUrl(url), ImageMarkerApi.onImageSelected);
  return selectedPictureUrl ? <PictureView url={selectedPictureUrl} onClick={(e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setSelectedPictureUrl(undefined);
  }} /> : null;
}

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
