/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { Id64String } from "@itwin/core-bentley";

export const geometryChannel = "geometryIpc";

export interface GeometryInterface {
  addCube: (iModelKey: string, definitionModelId: Id64String, physicalModelId: Id64String, center: number[], size: number) => Promise<void>;
}
