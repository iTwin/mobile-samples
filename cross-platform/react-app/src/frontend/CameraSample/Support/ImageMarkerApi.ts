/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import {
  Point2d,
  Point3d,
  XAndY,
  XYAndZ,
} from "@itwin/core-geometry";
import {
  BeButton,
  BeButtonEvent,
  BeTouchEvent,
  Cluster,
  DecorateContext,
  Decorator,
  IModelApp,
  Marker,
  MarkerImage,
  MarkerSet,
  tryImageElementFromUrl,
} from "@itwin/core-frontend";
import { BeUiEvent } from "@itwin/core-bentley";
import { getCssVariable } from "@itwin/core-react";

/** Displays a single image Marker at a given world location. */
class ImageMarker extends Marker {
  private static readonly HEIGHT = 100;
  private _url: string;
  private _onClickCallback?: (url: string) => void;

  constructor(point: XYAndZ, _size: XAndY, url: string, image: MarkerImage, onClickCallback?: (url: string) => void) {
    // Use the same height for all the markers, but preserve the aspect ratio from the image
    const aspect = image.width / image.height;
    const size = new Point2d(aspect * ImageMarker.HEIGHT, ImageMarker.HEIGHT);
    super(point, size);

    this._url = url;
    this._onClickCallback = onClickCallback;

    this.setImage(image);

    // The scale factor adjusts the size of the image so it appears larger when close to the camera
    // eye point. Make size 75% at back of frustum and 200% at front of frustum (if camera is on)
    this.setScaleFactor({ low: .75, high: 2.0 });
  }

  public get url() {
    return this._url;
  }

  public get onClickCallback() {
    return this._onClickCallback;
  }

  public override onMouseButton(ev: BeButtonEvent): boolean {
    if ((ev instanceof BeTouchEvent && ev.isSingleTap) || (ev.button === BeButton.Data && ev.isDown)) {
      this._onClickCallback?.(this._url);
    }
    return true; // Don't allow clicks to be sent to active tool
  }

  public override drawDecoration(ctx: CanvasRenderingContext2D) {
    // add a shadow to the image
    ctx.shadowBlur = 10;
    ctx.shadowColor = "black";

    super.drawDecoration(ctx);

    // draw a border around the image
    ctx.shadowBlur = 0;
    const size = this.imageSize ? this.imageSize : this.size;
    const offset = new Point2d(size.x / 2, size.y / 2);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(-offset.x, -offset.y, size.x, size.y);
  }

  protected override drawHilited(ctx: CanvasRenderingContext2D) {
    // Don't draw differently if we have a click handler
    if (this._onClickCallback)
      return false;
    return super.drawHilited(ctx);
  }
}

/** Displays a Marker for a group of images, along with a count badge. */
class BadgedImageMarker extends ImageMarker {
  private _count = 0;
  private static activeColor: string;

  constructor(location: XYAndZ, size: XAndY, cluster: Cluster<ImageMarker>) {
    super(location, size, cluster.markers[0].url, cluster.markers[0].image!, cluster.markers[0].onClickCallback);
    this._count = cluster.markers.length;
    const aspect = this.image!.width / this.image!.height;
    const halfHeight = size.y / 2;
    this.labelOffset = { x: -((halfHeight * aspect) - 5), y: halfHeight - 5 };
    if (!BadgedImageMarker.activeColor)
      BadgedImageMarker.activeColor = getCssVariable("--muic-active");
  }

  public override drawDecoration(ctx: CanvasRenderingContext2D): void {
    super.drawDecoration(ctx);

    if (this._count !== 0) {
      ctx.font = this.labelFont ? this.labelFont : "14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const text = this._count.toString();
      const metrics = ctx.measureText(text);
      const x = this.labelOffset ? -this.labelOffset.x : 0;
      const y = this.labelOffset ? -this.labelOffset.y : 0;

      // draw the badge background
      const fontHeight = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
      const actualHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
      const measuredHeight = (actualHeight > 0 ? actualHeight : fontHeight);
      const padding = measuredHeight;
      const height = measuredHeight + padding;
      const width = Math.max(height, metrics.width + padding);
      ctx.fillStyle = BadgedImageMarker.activeColor;
      this.drawPill(ctx, x, y, width, height);

      // draw the badge number
      ctx.fillStyle = this.labelColor ? this.labelColor : "white";
      ctx.fillText(text, x, y);
    }
  }

  /**
   * Draws a filled pill shape.
   *
   * __Note__: This uses the context's current fillStyle color.
   * @param ctx The context to draw into.
   * @param x The x coordinate of center of the pill.
   * @param y The y coordinate of the center of the pill.
   * @param width The width of the pill. If less than `height`, a circle will be drawn with a
   * diameter of `height`.
   * @param height The height of the pill.
   */
  private drawPill(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
    const radius = height / 2;
    ctx.beginPath();
    if (width <= height) {
      ctx.arc(x, y, radius, 0, Math.PI * 2);
    } else {
      const diff = width - height;
      ctx.arc(x + diff, y, radius, Math.PI / 2, Math.PI * 1.5, true);
      ctx.arc(x - diff, y, radius, Math.PI * 1.5, Math.PI / 2, true);
    }
    ctx.fill();
  }
}

/**
 * A MarkerSet sub-class that uses a greedy clustering algorithm. Sub-classes should use the
 * {@link getAverageLocation} function to set the location of the marker they return in
 * getClusterMarker.
 */
abstract class GreedyClusteringMarkerSet<T extends Marker> extends MarkerSet<T> {
  /** The radius (in pixels) for clustering markers, default 150. */
  protected override clusterRadius = 150;

  /**
   * Gets the average of the cluster markers worldLocation.
   * @param cluster Cluster to get average location of.
   * @returns The average of the cluster markers worldLocation.
   */
  protected getAverageLocation(cluster: Cluster<T>) {
    const location = Point3d.createZero();
    cluster.markers.forEach((marker) => location.addInPlace(marker.worldLocation));
    location.scaleInPlace(1 / cluster.markers.length);
    return location;
  }

  protected clusterMarkers(context: DecorateContext) {
    const vp = context.viewport;
    // eslint-disable-next-line @itwin/no-internal
    const entries = this._entries;

    // get the visible markers
    const visibleMarkers: T[] = [];
    this.markers.forEach((marker) => {
      if (marker.setPosition(vp, this)) {
        visibleMarkers.push(marker);
      }
    });

    // Greedy clustering algorithm:
    // - Start with any point from the dataset.
    // - Find all points within a certain radius around that point.
    // - Form a new cluster with the nearby points.
    // - Choose a new point that isn’t part of a cluster, and repeat until we have visited all the
    //   points.
    const distSquared = this.clusterRadius * this.clusterRadius;
    const clustered = new Set<T>();

    for (const marker of visibleMarkers) {
      if (clustered.has(marker))
        continue;

      const clusterMarkers: T[] = [];
      for (const otherMarker of visibleMarkers) {
        if (marker === otherMarker || clustered.has(marker))
          continue;

        if (marker.position.distanceSquaredXY(otherMarker.position) <= distSquared)
          clusterMarkers.push(otherMarker);
      }

      if (clusterMarkers.length > 0) {
        clusterMarkers.unshift(marker);
        clusterMarkers.forEach((m) => clustered.add(m));
        const cluster = new Cluster(clusterMarkers);
        // this.setClusterRectFromMarkers(cluster);
        entries.push(cluster);
      }
    }

    // add any unprocessed markers to the entries
    visibleMarkers.forEach((m) => {
      if (!clustered.has(m))
        entries.push(m);
    });
  }

  /**
   * This method should be called from {@link Decorator.decorate}. It will add this MarkerSet to the
   * supplied DecorateContext.
   *
   * This method implements the logic that turns overlapping Markers into a Cluster.
   * @param context The DecorateContext for the Markers
   */
  public override addDecoration(context: DecorateContext): void {
    const vp = context.viewport;
    if (vp !== this.viewport) {
      return; // not viewport of this MarkerSet, ignore it
    }

    // Don't recreate the entries array if the view hasn't changed. This is important for
    // performance, but also necessary for hilite of clusters (otherwise they're recreated
    // continually and never hilited.) */
    // eslint-disable-next-line @itwin/no-internal
    const worldToViewMap = this._worldToViewMap;
    // eslint-disable-next-line @itwin/no-internal
    const entries = this._entries;
    if (!worldToViewMap.isAlmostEqual(vp.worldToViewMap.transform0)) {
      worldToViewMap.setFrom(vp.worldToViewMap.transform0);
      // eslint-disable-next-line @itwin/no-internal
      this._minScaleViewW = undefined; // Invalidate current value.
      entries.length = 0; // start over.
      this.clusterMarkers(context);
    }

    // We now have an array of Markers and Clusters, add them to context.
    for (const entry of entries) {
      if (entry instanceof Cluster) { // is this entry a Cluster?
        if (entry.markers.length <= this.minimumClusterSize) { // yes, does it have more than the minimum number of entries?
          entry.markers.forEach((marker) => marker.addMarker(context)); // no, just draw all of its Markers
        } else {
          // yes, get and draw the Marker for this Cluster
          if (undefined === entry.clusterMarker) { // have we already created this cluster marker?
            const clusterMarker = this.getClusterMarker(entry); // no, get it now.
            // set the marker's position as we shouldn't assume getClusterMarker sets it
            if (clusterMarker.rect.isNull)
              clusterMarker.setPosition(vp, this);
            entry.clusterMarker = clusterMarker;
          }
          entry.clusterMarker.addMarker(context);
        }
      } else {
        entry.addMarker(context); // entry is a non-overlapping Marker, draw it.
      }
    }
  }
}

/**
 * A GreedyClusteringMarkerSet subclass using {@link ImageMarker} as its Marker type.
 */
class ImageMarkerSet extends GreedyClusteringMarkerSet<ImageMarker> {
  protected override clusterRadius = 150;

  protected override getClusterMarker(cluster: Cluster<ImageMarker>): Marker {
    return new BadgedImageMarker(this.getAverageLocation(cluster), cluster.markers[0].size, cluster);
  }

  public addMarker(point: Point3d, image: HTMLImageElement, url: string) {
    this.markers.add(new ImageMarker(point, Point2d.createZero(), url, image, (urlParam: string) => ImageMarkerApi.onImageSelected.emit(urlParam)));
    IModelApp.viewManager.selectedView?.invalidateDecorations();
  }

  public deleteMarker(url: string) {
    for (const marker of this.markers) {
      if (marker.url === url) {
        this.markers.delete(marker);
        IModelApp.viewManager.selectedView?.invalidateDecorations();
        return;
      }
    }
  }

  public clearMarkers() {
    this.markers.clear();
    IModelApp.viewManager.selectedView?.invalidateDecorations();
  }
}

/** A Decorator that uses ImageMarkerSet to draw the decoration. */
class ImageMarkerDecorator implements Decorator {
  private _markerSet?: ImageMarkerSet;

  public addMarker(point: Point3d, image: HTMLImageElement, url: string) {
    if (!this._markerSet)
      this._markerSet = new ImageMarkerSet();
    this._markerSet.addMarker(point, image, url);
  }

  public deleteMarker(url: string) {
    this._markerSet?.deleteMarker(url);
  }

  public decorate(context: DecorateContext): void {
    this._markerSet?.addDecoration(context);
  }

  public clearMarkers() {
    this._markerSet?.clearMarkers();
  }
}

/** Helper class to store and retrieve image locations for an iModel. */
class ImageLocations {
  /**
   * Get the image location for the given image URL from {@link localStorage}.
   * @param fileUrl The URL of the image.
   * @returns The 3D location of the image.
   */
  public static getLocation(fileUrl: string) {
    const val = localStorage.getItem(fileUrl);
    if (!val)
      return undefined;
    return Point3d.fromJSON(JSON.parse(val));
  }

  /**
   * Set the image location for the given image URL in {@link localStorage}.
   * @param fileUrl The URL of the image.
   * @param point The 3D location of the image.
   */
  public static setLocation(fileUrl: string, point: Point3d) {
    localStorage.setItem(fileUrl, JSON.stringify(point.toJSON()));
  }

  /**
   * Remove The image location for the givn image URL from {@link localStorage}.
   * @param fileUrl The URL of the image.
   */
  public static clearLocation(fileUrl: string) {
    localStorage.removeItem(fileUrl);
  }

  /**
   * Get all the local storage keys that represent image locations for the given iModel.
   * @param iModelId The iModelId of the iModel to get the keys for.
   * @returns An array of {@link localStorage} keys for all the image locations in the given iModel.
   */
  private static getImageCacheKeys(iModelId: string) {
    const urls = new Array<string>();
    let prefix = "com.bentley.itms-image-cache://";
    if (iModelId !== undefined && iModelId.length)
      prefix += `${iModelId}/`;

    for (let i = 0; i < localStorage.length; ++i) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        urls.push(key);
      }
    }
    return urls;
  }

  /**
   * Remove all the image location entries in {@link localStorage} for the given iModel.
   * @param iModelId The iModelId of the iModel to clear the keys for.
   */
  public static clearLocations(iModelId: string) {
    for (const removal of this.getImageCacheKeys(iModelId)) {
      localStorage.removeItem(removal);
    }
  }

  /**
   * Get all the image locations associated with the given iModel.
   * @param iModelId The iModelId of the iModel to get locations for.
   * @returns An array of {@link Point3d} values representing all the image locations for the given
   * iModel.
   */
  public static getLocations(iModelId: string) {
    const locations = new Map<string, Point3d>();
    const urls = this.getImageCacheKeys(iModelId);
    for (const url of urls) {
      const point = this.getLocation(url);
      if (point)
        locations.set(url, point);
    }
    return locations;
  }
}

/** Class implementing the API for interacting with image markers. */
export class ImageMarkerApi {
  private static _decorator?: ImageMarkerDecorator;
  private static _iModelId?: string;

  /**
   * Event posted when an image is selected by the user. The parameter is the URL of the image.
   */
  public static onImageSelected = new BeUiEvent<string>();
  /**
   * Event posted when a marker is added. The parameter is the URL of the image.
   */
  public static onMarkerAdded = new BeUiEvent<string>();

  /**
   * Initialize display of image markers for the given iModel.
   *
   * __Note__: Call {@link shutdown} when done.
   */
  public static startup(iModelId: string) {
    this._iModelId = iModelId;
    this._decorator = new ImageMarkerDecorator();
    IModelApp.viewManager.addDecorator(this._decorator);

    // Load existing image markers
    this._decorator?.clearMarkers();
    const locations = ImageLocations.getLocations(iModelId);
    for (const [url, location] of locations) {
      void this.addMarker(location, url);
    }
  }

  /** Deinitialize the display of image markers. */
  public static shutdown() {
    this.enabled = false;
    this._decorator = undefined;
    this._iModelId = undefined;
  }

  /** Check if display of image markers is enabled. */
  public static get enabled(): boolean {
    return !!this._decorator && IModelApp.viewManager.decorators.includes(this._decorator);
  }

  /** Enable or disable display of image markers. */
  public static set enabled(value: boolean) {
    if (value === this.enabled)
      return;

    if (value) {
      if (!this._decorator) {
        if (this._iModelId) {
          this.startup(this._iModelId);
        } else {
          throw new Error("Must call startup() before setting enabled to true.");
        }
      } else {
        IModelApp.viewManager.addDecorator(this._decorator);
      }
    } else if (!!this._decorator) {
      IModelApp.viewManager.dropDecorator(this._decorator);
    }
  }

  /**
   * Add an image marker with the given URL to the given 3D location.
   * @param point The location to which to add the image marker.
   * @param fileUrl The URL of the image.
   */
  public static async addMarker(point: Point3d, fileUrl: string) {
    const image = await tryImageElementFromUrl(fileUrl, true);
    if (image) {
      ImageLocations.setLocation(fileUrl, point);
      this._decorator?.addMarker(point, image, fileUrl);
      this.onMarkerAdded.emit(fileUrl);
    } else {
      ImageLocations.clearLocation(fileUrl);
    }
  }

  /**
   * Delete an image marker.
   * @param fileUrl The URL of the image marker to delete.
   */
  public static deleteMarker(fileUrl: string) {
    ImageLocations.clearLocation(fileUrl);
    this._decorator?.deleteMarker(fileUrl);
  }

  /**
   * Delete image markers.
   * @param iModelId The iModelId of the iModel from which to delete all image markers.
   */
  public static deleteMarkers(iModelId: string) {
    ImageLocations.clearLocations(iModelId);
    this._decorator?.clearMarkers();
  }
}
