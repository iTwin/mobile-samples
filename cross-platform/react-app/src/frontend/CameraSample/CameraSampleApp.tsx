/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import * as React from "react";
import { useUiEvent } from "@itwin/mobile-ui-react";
import { IModelConnection } from "@itwin/core-frontend";
import { App, i18n, ModelScreenExtensionProps } from "../Exports";
import {
  CameraSampleToolsBottomPanel,
  ImageMarkerApi,
  PicturesBottomPanel,
  PictureView,
} from "./Exports";

function ImageSelectionHandler() {
  const [selectedPictureUrl, setSelectedPictureUrl] = React.useState<string>();

  useUiEvent((url) => setSelectedPictureUrl(url), ImageMarkerApi.onImageSelected);
  return selectedPictureUrl ? <PictureView url={selectedPictureUrl} onClick={(e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setSelectedPictureUrl(undefined);
  }} /> : null;
}

export function CameraSampleApp() {
  return <App getModelScreenExtensions={(iModel: IModelConnection): ModelScreenExtensionProps => {
    return {
      toolsBottomPanel: CameraSampleToolsBottomPanel,
      additionalComponents: <ImageSelectionHandler />,
      additionalTabs: [{
        label: i18n("PicturesBottomPanel", "Pictures"),
        isTab: true,
        popup: <PicturesBottomPanel key="pictures" iModel={iModel} />,
      }],
    };
  }} />;
}
