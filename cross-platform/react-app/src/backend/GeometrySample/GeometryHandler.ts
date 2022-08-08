/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { GeometryPart, IModelDb, IpcHandler, PhysicalObject, RenderMaterialElement, SpatialCategory, SubCategory } from "@itwin/core-backend";
import { Id64String } from "@itwin/core-bentley";
import { Code, ColorDef, GeometryParams, GeometryPartProps, GeometryStreamBuilder, PhysicalElementProps, SubCategoryAppearance } from "@itwin/core-common";
import { Box, Point3d, Vector3d, YawPitchRollAngles } from "@itwin/core-geometry";
import { geometryChannel, GeometryInterface } from "../../common/GeometrySample/GeometryInterface";

export class GeometryHandler extends IpcHandler implements GeometryInterface {
  public get channelName() { return geometryChannel; }
  private static useCount = 0;

  // private createSphere(radius: number, categoryId?: Id64String, subCategoryId?: Id64String, renderMaterialId?: Id64String, geometryPartId?: Id64String) {
  //   const gsb = new GeometryStreamBuilder();
  //   if ((undefined !== categoryId) && (undefined !== subCategoryId)) {
  //     gsb.appendSubCategoryChange(subCategoryId);
  //     if (undefined !== renderMaterialId) {
  //       const geometryParams = new GeometryParams(categoryId, subCategoryId);
  //       geometryParams.materialId = renderMaterialId;
  //       gsb.appendGeometryParamsChange(geometryParams);
  //     }
  //   }
  //   const sphere = Sphere.createCenterRadius(Point3d.createZero(), radius);
  //   gsb.appendGeometry(sphere);
  //   if (undefined !== geometryPartId) {
  //     gsb.appendGeometryPart3d(geometryPartId);
  //   }
  //   return gsb.geometryStream;
  // }

  private createBox(size: Point3d, categoryId?: Id64String, subCategoryId?: Id64String, renderMaterialId?: Id64String, geometryPartId?: Id64String) {
    const geometryStreamBuilder = new GeometryStreamBuilder();
    if ((undefined !== categoryId) && (undefined !== subCategoryId)) {
      geometryStreamBuilder.appendSubCategoryChange(subCategoryId);
      if (undefined !== renderMaterialId) {
        const geometryParams = new GeometryParams(categoryId, subCategoryId);
        geometryParams.materialId = renderMaterialId;
        geometryStreamBuilder.appendGeometryParamsChange(geometryParams);
      }
    }
    geometryStreamBuilder.appendGeometry(Box.createDgnBox(
      Point3d.createZero(), Vector3d.unitX(), Vector3d.unitY(), new Point3d(0, 0, size.z),
      size.x, size.y, size.x, size.y, true,
    )!);
    if (undefined !== geometryPartId) {
      geometryStreamBuilder.appendGeometryPart3d(geometryPartId);
    }
    return geometryStreamBuilder.geometryStream;
  }

  private insertSphereGeometryPart(iModel: IModelDb, modelId: Id64String, radius: number) {
    const props: GeometryPartProps = {
      classFullName: GeometryPart.classFullName,
      model: modelId,
      code: GeometryPart.createCode(iModel, modelId, this.useString("Sphere")),
      geom: this.createBox(new Point3d(radius, radius, radius)),
    };
    return iModel.elements.insertElement(props);
  }

  public insertPhysicalSphere(iModel: IModelDb, center: Point3d, radius: number, physicalModelId: Id64String, spatialCategoryId: Id64String, subCategoryId?: Id64String, renderMaterialId?: Id64String, geometryPartId?: Id64String) {
    const physicalObjectProps: PhysicalElementProps = {
      classFullName: PhysicalObject.classFullName,
      model: physicalModelId,
      category: spatialCategoryId,
      code: Code.createEmpty(),
      userLabel: this.useString("PhysicalObject"),
      geom: this.createBox(new Point3d(radius, radius, radius), spatialCategoryId, subCategoryId, renderMaterialId, geometryPartId),
      placement: {
        origin: center,
        angles: YawPitchRollAngles.createDegrees(0, 0, 0),
      },
    };
    return iModel.elements.insertElement(physicalObjectProps);
  }

  private insertSpatialCategory(iModel: IModelDb, modelId: Id64String, categoryName: string, color: ColorDef): Id64String {
    const appearance: SubCategoryAppearance.Props = {
      color: color.toJSON(),
      transp: 0,
      invisible: false,
    };
    return SpatialCategory.insert(iModel, modelId, categoryName, appearance);
  }

  private useString(prefix: string) {
    return `GeomDemo${prefix}${GeometryHandler.useCount}`;
  }

  public async addCube(iModelKey: string, definitionModelId: Id64String, physicalModelId: Id64String, center: number[], size: number) {
    ++GeometryHandler.useCount;
    const iModel = IModelDb.findByKey(iModelKey);
    const centerPoint = Point3d.createFrom({ x: center[0] - size, y: center[1] - size, z: center[2] - size });
    const spatialCategoryId = this.insertSpatialCategory(iModel, definitionModelId, this.useString("SpatialCategory"), ColorDef.green);
    const subCategoryId = SubCategory.insert(iModel, spatialCategoryId, "SubCategory", { color: ColorDef.blue.toJSON() });
    const renderMaterialId = RenderMaterialElement.insert(iModel, definitionModelId, this.useString("RenderMaterial"), new RenderMaterialElement.Params("PaletteName"));
    const geometryPartId = this.insertSphereGeometryPart(iModel, definitionModelId, size);
    await iModel.locks.acquireLocks({ shared: [definitionModelId, physicalModelId] });
    this.insertPhysicalSphere(iModel, centerPoint, size, physicalModelId, spatialCategoryId, subCategoryId, renderMaterialId, geometryPartId);
    iModel.saveChanges();
  }
}
