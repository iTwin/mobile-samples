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

export class PlaceMarkerTool extends PrimitiveTool {
  // Sub-classes can override these properties
  public static toolId = "PlaceMarkerTool";
  public static iconSpec = "icon-location";
  public static prompt = "Enter point";
  public static enableSnap = true;

  protected _createMarkerCallback: (pt: Point3d) => {};

  constructor(callback: (pt: Point3d) => {}) {
    super();
    this._createMarkerCallback = callback;
  }

  public get ctor() { return this.constructor as typeof PlaceMarkerTool; }
  public isCompatibleViewport(vp: Viewport | undefined, isSelectedViewChange: boolean): boolean { return (super.isCompatibleViewport(vp, isSelectedViewChange) && undefined !== vp); }
  public isValidLocation(_ev: BeButtonEvent, _isButtonEvent: boolean): boolean { return true; } // Allow clicking anywhere
  public requireWriteableTarget(): boolean { return false; } // Tool doesn't modify the imodel.
  public async onPostInstall() { await super.onPostInstall(); this.setupAndPromptForNextAction(); }
  public async onRestartTool() { await this.exitTool(); }

  protected setupAndPromptForNextAction(): void {
    if (this.ctor.enableSnap)
      IModelApp.accuSnap.enableSnap(true);
    IModelApp.notifications.setToolAssistance(ToolAssistance.createInstructions(ToolAssistance.createInstruction(this.iconSpec, this.ctor.prompt)));
  }

  // A reset button is the secondary action button, ex. right mouse button.
  public async onResetButtonUp(_ev: BeButtonEvent): Promise<EventHandled> {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.onReinitialize(); // Calls onRestartTool to exit
    return EventHandled.No;
  }

  // A data button is the primary action button, ex. left mouse button.
  public async onDataButtonDown(ev: BeButtonEvent): Promise<EventHandled> {
    if (undefined === ev.viewport)
      return EventHandled.No; // Shouldn't really happen

    // ev.point is the current world coordinate point adjusted for snap and locks
    this._createMarkerCallback(ev.point);

    // this.onReinitialize(); // Calls onRestartTool to exit
    return EventHandled.No;
  }
}
