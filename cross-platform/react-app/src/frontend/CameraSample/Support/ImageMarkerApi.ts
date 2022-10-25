/*---------------------------------------------------------------------------------------------
* Copyright (c) 2020 Bentley Systems, Incorporated. All rights reserved.
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

    // The scale factor adjusts the size of the image so it appears larger when close to the camera eye point.
    // Make size 75% at back of frustum and 200% at front of frustum (if camera is on)
    this.setScaleFactor({ low: .75, high: 2.0 });
  }

  public get url() {
    return this._url;
  }

  public get onClickCallback() {
    return this._onClickCallback;
  }

  public onMouseButton(ev: BeButtonEvent): boolean {
    if ((ev instanceof BeTouchEvent && ev.isSingleTap) || (ev.button === BeButton.Data && ev.isDown)) {
      this._onClickCallback?.(this._url);
    }
    return true; // Don't allow clicks to be sent to active tool
  }

  public drawDecoration(ctx: CanvasRenderingContext2D) {
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

  protected drawHilited(ctx: CanvasRenderingContext2D) {
    // Don't draw differently if we have a click handler
    if (this._onClickCallback)
      return false;
    return super.drawHilited(ctx);
  }
}

class BadgedImageMarker extends ImageMarker {
  private count = 0;
  private static activeColor: string;

  constructor(location: XYAndZ, size: XAndY, cluster: Cluster<ImageMarker>) {
    super(location, size, cluster.markers[0].url, cluster.markers[0].image!, cluster.markers[0].onClickCallback);
    this.count = cluster.markers.length;
    const aspect = this.image!.width / this.image!.height;
    const halfHeight = size.y / 2;
    this.labelOffset = { x: -((halfHeight * aspect) - 5), y: halfHeight - 5 };
    if (!BadgedImageMarker.activeColor)
      BadgedImageMarker.activeColor = getCssVariable("--muic-active");
  }

  public override drawDecoration(ctx: CanvasRenderingContext2D): void {
    super.drawDecoration(ctx);

    if (this.count !== 0) {
      ctx.font = this.labelFont ? this.labelFont : "14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const text = this.count.toString();
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
 * A MarkerSet sub-class that uses a gready clustering algorithm. Sub-classes should use the [[getAverageLocation]] function
 * to set the location of the marker they return in getClusterMarker.
 */
abstract class GreedyClusteringMarkerSet<T extends Marker> extends MarkerSet<T> {
  /// The radius (in pixels) for clustering markers, default 150.
  protected clusterRadius = 150;

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

  /**
   * Sets the cluster's rect by averaging the rects of all the markers in the cluster.
   * @param cluster Cluster to set rect of.
   */
  // protected setClusterRectFromMarkers<T extends Marker>(cluster: Cluster<T>) {
  //   const len = cluster.markers.length;
  //   if (len > 1) {
  //     const midPoint = Point3d.createZero();
  //     const size = Point3d.createZero();
  //     cluster.markers.forEach((marker) => {
  //       const center = new Point2d(marker.rect.left + (marker.rect.width / 2), marker.rect.top + (marker.rect.height / 2));
  //       midPoint.addXYZInPlace(center.x, center.y);
  //       size.addXYZInPlace(marker.rect.width, marker.rect.height);
  //     });
  //     midPoint.scaleInPlace(1 / len);
  //     size.scaleInPlace(0.5 * (1 / len));
  //     cluster.rect.init(midPoint.x - size.x, midPoint.y - size.y, midPoint.x + size.x, midPoint.y + size.y);
  //   }
  // }

  protected clusterMarkers(context: DecorateContext) {
    const vp = context.viewport;
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
    // - Choose a new point that isn’t part of a cluster, and repeat until we have visited all the points.
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

  /** This method should be called from [[Decorator.decorate]]. It will add this MarkerSet to the supplied DecorateContext.
   * This method implements the logic that turns overlapping Markers into a Cluster.
   * @param context The DecorateContext for the Markers
   */
  public addDecoration(context: DecorateContext): void {
    const vp = context.viewport;
    if (vp !== this.viewport) {
      return; // not viewport of this MarkerSet, ignore it
    }

    // Don't recreate the entries array if the view hasn't changed. This is important for performance, but also necessary for hilite of
    // clusters (otherwise they're recreated continually and never hilited.) */
    if (!this._worldToViewMap.isAlmostEqual(vp.worldToViewMap.transform0)) {
      this._worldToViewMap.setFrom(vp.worldToViewMap.transform0);
      this._minScaleViewW = undefined; // Invalidate current value.
      this._entries.length = 0; // start over.
      this.clusterMarkers(context);
    }

    // we now have an array of Markers and Clusters, add them to context
    for (const entry of this._entries) {
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

class ImageMarkerSet extends GreedyClusteringMarkerSet<ImageMarker> {
  protected clusterRadius = 150;

  protected getClusterMarker(cluster: Cluster<ImageMarker>): Marker {
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

class ImageLocations {
  public static getLocation(fileUrl: string) {
    const val = localStorage.getItem(fileUrl);
    if (!val)
      return undefined;
    return Point3d.fromJSON(JSON.parse(val));
  }

  public static setLocation(fileUrl: string, point: Point3d) {
    localStorage.setItem(fileUrl, JSON.stringify(point.toJSON()));
  }

  public static clearLocation(fileUrl: string) {
    localStorage.removeItem(fileUrl);
  }

  private static getImageCacheKeys(iModelId?: string) {
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

  public static clearLocations(iModelId?: string) {
    for (const removal of this.getImageCacheKeys(iModelId)) {
      localStorage.removeItem(removal);
    }
  }

  public static getLocations(iModelId?: string) {
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

export class ImageMarkerApi {
  private static _decorator?: ImageMarkerDecorator;

  public static onImageSelected = new BeUiEvent<string>();
  public static onMarkerAdded = new BeUiEvent<string>();

  public static startup(iModelId?: string, enabled = true) {
    this._decorator = new ImageMarkerDecorator();
    if (enabled)
      IModelApp.viewManager.addDecorator(this._decorator);

    // Load existing image markers
    this._decorator?.clearMarkers();
    const locations = ImageLocations.getLocations(iModelId);
    for (const [url, location] of locations) {
      this.addMarker(location, url);
    }
  }

  public static shutdown() {
    this.enabled = false;
    this._decorator = undefined;
  }

  public static get enabled(): boolean {
    return !!this._decorator && IModelApp.viewManager.decorators.includes(this._decorator);
  }

  public static set enabled(value: boolean) {
    if (value === this.enabled)
      return;

    if (value) {
      if (!this._decorator)
        this.startup();
      else
        IModelApp.viewManager.addDecorator(this._decorator);
    } else if (!!this._decorator) {
      IModelApp.viewManager.dropDecorator(this._decorator);
    }
  }

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

  public static deleteMarker(fileUrl: string) {
    ImageLocations.clearLocation(fileUrl);
    this._decorator?.deleteMarker(fileUrl);
  }

  public static deleteMarkers(iModelId: string | undefined) {
    ImageLocations.clearLocations(iModelId);
    this._decorator?.clearMarkers();
  }
}

/**
 * !!!!!!!!!!!!!!!!!!!!!!!! NOTE !!!!!!!!!!!!!!!!!!!!!!!!
 * The following two functions (imageElementFromUrl and tryImageElementFromUrl) were copied
 * from core-frontend in order to prevent a cross origin check. The line of code that causes
 * problems is here:
 * https://github.com/iTwin/itwinjs-core/blob/5562afe6d456f406c8fa70f518ccd7d01d118580/core/frontend/src/ImageUtil.ts#L207
 * With that line of code present, the app either fails to load the image or crashes (due to an
 * apparent bug in iOS that will be reported separately).
 * I created a PR on core-frontend to add the skipCrossOriginCheck argument. Once that change is
 * in a release that we use, we can remove these functions and use core-frontend again.
 */

/** Create an html Image element from a URL.
 * @param url The URL pointing to the image data.
 * @returns A Promise resolving to an HTMLImageElement when the image data has been loaded from the URL.
 * @see tryImageElementFromUrl.
 * @public
 */
async function imageElementFromUrl(url: string, skipCrossOriginCheck = false): Promise<HTMLImageElement> {
  // We must set crossorigin property so that images loaded from same origin can be used with texImage2d.
  // We must do that outside of the promise constructor or it won't work, for reasons.
  const image = new Image();
  if (!skipCrossOriginCheck) {
    image.crossOrigin = "anonymous";
  }
  return new Promise((resolve: (image: HTMLImageElement) => void, reject) => {
    image.onload = () => resolve(image);

    // The "error" produced by Image is not an Error. It looks like an Event, but isn't one.
    image.onerror = () => reject(new Error("Failed to create image from url"));
    image.src = url;
  });
}

/** Try to create an html Image element from a URL.
 * @param url The URL pointing to the image data.
 * @returns A Promise resolving to an HTMLImageElement when the image data has been loaded from the URL, or to `undefined` if an exception occurred.
 * @see imageElementFromUrl
 * @public
 */
async function tryImageElementFromUrl(url: string, skipCrossOriginCheck = false): Promise<HTMLImageElement | undefined> {
  try {
    return await imageElementFromUrl(url, skipCrossOriginCheck);
  } catch {
    return undefined;
  }
}
