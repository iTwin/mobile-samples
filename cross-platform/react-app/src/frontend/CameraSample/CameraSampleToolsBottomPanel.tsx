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

const addImageMarker = async (point: Point3d, photoLibrary: boolean, iModelId: string) => {
  const fileUrl = await ImageCache.pickImage(iModelId, photoLibrary);
  if (fileUrl)
    ImageMarkerApi.addMarker(point, fileUrl);
};

class PlacePhotoMarkerTool extends PlaceMarkerTool {
  public static toolId = "PlacePhotoMarkerTool";
  public static iconSpec = "icon-image";
  public static prompt = "";
  public static enableSnap = false;

  constructor(iModelId: string) {
    super(async (point: Point3d) => {
      await addImageMarker(point, true, iModelId);
    });
    if (!PlacePhotoMarkerTool.prompt)
      PlacePhotoMarkerTool.prompt = CameraSampleAppGetLocalizedString("CameraSampleToolsBottomPanel", "EnterPointPhotoPrompt");
  }
}

class PlaceCameraMarkerTool extends PlaceMarkerTool {
  public static toolId = "PlaceCameraMarkerTool";
  public static iconSpec = "icon-camera";
  public static prompt = "";
  public static enableSnap = false;

  constructor(iModelId: string) {
    super(async (point: Point3d) => {
      await addImageMarker(point, false, iModelId);
    });
    if (!PlaceCameraMarkerTool.prompt)
      PlaceCameraMarkerTool.prompt = CameraSampleAppGetLocalizedString("CameraSampleToolsBottomPanel", "EnterPointCameraPrompt");
  }
}

export function CameraSampleToolsBottomPanel(props: ToolsBottomPanelProps) {
  const { iModel } = props;
  const tools = React.useMemo(() => {
    const allTools = getDefaultTools();
    allTools.splice(1, 0, { labelKey: "CameraSampleApp:CameraSampleToolsBottomPanel.Camera", icon: "icon-camera", toolItemDef: ToolItemDef.getItemDefForTool(PlaceCameraMarkerTool, undefined, iModel?.iModelId) });
    allTools.splice(1, 0, { labelKey: "CameraSampleApp:CameraSampleToolsBottomPanel.Picture", icon: "icon-image", toolItemDef: ToolItemDef.getItemDefForTool(PlacePhotoMarkerTool, undefined, iModel?.iModelId) });
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

    ImageMarkerApi.startup(iModel.iModelId);

    return () => {
      ImageMarkerApi.shutdown();
    };
  }, [iModel, vp]);
  return <ToolsBottomPanel {...props} tools={tools} />;
}
