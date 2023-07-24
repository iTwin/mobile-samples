/*---------------------------------------------------------------------------------------------
* Copyright (c) 2020 Bentley Systems, Incorporated. All rights reserved.
*--------------------------------------------------------------------------------------------*/
import {
  BeButtonEvent,
  EventHandled,
  IModelApp,
  PrimitiveTool,
  ToolAssistance,
  Viewport,
} from "@itwin/core-frontend";
import { Point3d } from "@itwin/core-geometry";

/**
 * {@link PrimitiveTool} to allow the user to select a location in the model, then place a marker
 * image from the either the photo gallery or camera into that location.
 */
export class PlaceMarkerTool extends PrimitiveTool {
  // Sub-classes can override these properties
  public static override toolId = "PlaceMarkerTool";
  public static override iconSpec = "icon-location";
  public static prompt = "Enter point";

  protected _createMarkerCallback: (pt: Point3d) => {};

  constructor(callback: (pt: Point3d) => {}) {
    super();
    this._createMarkerCallback = callback;
  }

  public override get ctor() { return this.constructor as typeof PlaceMarkerTool; }
  public override isCompatibleViewport(vp: Viewport | undefined, isSelectedViewChange: boolean): boolean {
    return (super.isCompatibleViewport(vp, isSelectedViewChange) && undefined !== vp);
  }
  public override isValidLocation(_ev: BeButtonEvent, _isButtonEvent: boolean): boolean { return true; } // Allow clicking anywhere
  public override requireWriteableTarget(): boolean { return false; } // Tool doesn't modify the imodel.
  public override async onPostInstall() {
    await super.onPostInstall();
    IModelApp.notifications.setToolAssistance(ToolAssistance.createInstructions(ToolAssistance.createInstruction(this.iconSpec, this.ctor.prompt)));
  }
  public async onRestartTool() { await this.exitTool(); }

  // A reset button is the secondary action button, ex. right mouse button or two-finger tap.
  public override async onResetButtonUp(_ev: BeButtonEvent): Promise<EventHandled> {
    void this.onReinitialize(); // Calls onRestartTool to exit
    return EventHandled.No;
  }

  // A data button is the primary action button, ex. left mouse button or one-finger tap.
  public override async onDataButtonDown(ev: BeButtonEvent): Promise<EventHandled> {
    if (undefined === ev.viewport)
      return EventHandled.No; // Shouldn't really happen

    // ev.point is the current world coordinate point adjusted for snap and locks
    this._createMarkerCallback(ev.point);

    // this.onReinitialize(); // Calls onRestartTool to exit
    return EventHandled.No;
  }
}
