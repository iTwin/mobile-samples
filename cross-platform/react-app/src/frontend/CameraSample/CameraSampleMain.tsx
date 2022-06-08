/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import * as React from "react";
import {
  useUiEvent,
} from "@itwin/mobile-ui-react";
import {
  ImageMarkerApi,
  PictureView,
} from "../CameraSample/Exports";

export function CameraSampleMain() {
  const [selectedPictureUrl, setSelectedPictureUrl] = React.useState<string>();

  useUiEvent((url) => setSelectedPictureUrl(url), ImageMarkerApi.onImageSelected);
  return selectedPictureUrl ? <PictureView url={selectedPictureUrl} onClick={(e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setSelectedPictureUrl(undefined);
  }} /> : null;
}
