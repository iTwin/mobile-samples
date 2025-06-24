/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import * as React from "react";
import { ToolItemDef } from "@itwin/appui-react";
import { IModelApp } from "@itwin/core-frontend";
import { useFirstViewport } from "@itwin/mobile-ui-react";
import { getDefaultTools, ToolsBottomPanel, ToolsBottomPanelProps } from "../Exports";
import {
  CameraSampleAppGetLocalizedString,
  ImageCache,
  ImageMarkerApi,
  PlaceMarkerTool,
} from "./Exports";
import { Point3d } from "@itwin/core-geometry";

/**
 * Select and then add an image marker to the given iModel at the given location.
 * @param point The 3D location of the image marker in the iModel.
 * @param photoLibrary Whether or not to pick the image from the photo library (true) or use the
 * camera (false).
 * @param iModelId The iModelId of the iModel to which to add the image marker.
 */
const addImageMarker = async (point: Point3d, photoLibrary: boolean, iModelId: string) => {
  const fileUrl = await ImageCache.pickImage(iModelId, photoLibrary);
  if (fileUrl)
    void ImageMarkerApi.addMarker(point, fileUrl);
};

/**
 * {@link PlaceMarkerTool} to allow the user to select a location in the model, then place a marker
 * image from the photo gallery into that location.
 */
class PlacePhotoMarkerTool extends PlaceMarkerTool {
  public static override toolId = "PlacePhotoMarkerTool";
  public static override iconSpec = "icon-image";
  public static override prompt = "";

  constructor(iModelId: string) {
    super(async (point: Point3d) => {
      await addImageMarker(point, true, iModelId);
    });
    if (!PlacePhotoMarkerTool.prompt)
      PlacePhotoMarkerTool.prompt = CameraSampleAppGetLocalizedString("CameraSampleToolsBottomPanel", "EnterPointPhotoPrompt");
  }
}

/**
 * {@link PlaceMarkerTool}  to allow the user to select a location in the model, then place a marker
 * image taken from camera into that location.
 */
class PlaceCameraMarkerTool extends PlaceMarkerTool {
  public static override toolId = "PlaceCameraMarkerTool";
  public static override iconSpec = "icon-camera";
  public static override prompt = "";

  constructor(iModelId: string) {
    super(async (point: Point3d) => {
      await addImageMarker(point, false, iModelId);
    });
    if (!PlaceCameraMarkerTool.prompt)
      PlaceCameraMarkerTool.prompt = CameraSampleAppGetLocalizedString("CameraSampleToolsBottomPanel", "EnterPointCameraPrompt");
  }
}

/** {@link ToolsBottomPanel} React component with extra camera sample-specific tools added. */
export function CameraSampleToolsBottomPanel(props: ToolsBottomPanelProps) {
  const { iModel } = props;
  const tools = React.useMemo(() => {
    const allTools = getDefaultTools();
    // @todo AppUI deprecation
    /* eslint-disable @typescript-eslint/no-deprecated */
    allTools.splice(1, 0, { labelKey: "CameraSampleApp:CameraSampleToolsBottomPanel.Camera", icon: "icon-camera", toolItemDef: ToolItemDef.getItemDefForTool(PlaceCameraMarkerTool, undefined, iModel?.iModelId) });
    allTools.splice(1, 0, { labelKey: "CameraSampleApp:CameraSampleToolsBottomPanel.Picture", icon: "icon-image", toolItemDef: ToolItemDef.getItemDefForTool(PlacePhotoMarkerTool, undefined, iModel?.iModelId) });
    /* eslint-enable @typescript-eslint/no-deprecated */
    return allTools;
  }, [iModel]);
  const vp = useFirstViewport();

  React.useEffect(() => {
    if (!vp)
      return;

    // Register tools if they aren't already registered
    if (!IModelApp.tools.find(PlacePhotoMarkerTool.toolId))
      IModelApp.tools.register(PlacePhotoMarkerTool, "CameraSampleApp");
    if (!IModelApp.tools.find(PlaceCameraMarkerTool.toolId))
      IModelApp.tools.register(PlaceCameraMarkerTool, "CameraSampleApp");

    if (iModel.iModelId) {
      ImageMarkerApi.startup(iModel.iModelId);
    } else {
      ImageMarkerApi.shutdown();
    }

    return () => {
      ImageMarkerApi.shutdown();
    };
  }, [iModel, vp]);
  return <ToolsBottomPanel {...props} tools={tools} />;
}
