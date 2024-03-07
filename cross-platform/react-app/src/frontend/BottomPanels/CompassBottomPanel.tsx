/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { BottomPanel, BottomPanelProps, IconImage } from "@itwin/mobile-ui-react";

import "./CompassBottomPanel.scss";

/** Properties for the {@link Compass} React component. */
interface CompassProps {
  showHeading?: boolean;
}

/**
 * React hook that returns the compass heading.
 * __Note__: This requires location access permissions. If they have not already been granted, the
 * user will be prompted to provide them. If the user refuses such permissions, this will always
 * return `undefined`.
 * @returns The current compass heading, or `undefined` if that is unknown.
 */
function useHeading() {
  const [heading, setHeading] = React.useState<number | undefined>();
  React.useEffect(() => {
    const watchId = navigator.geolocation.watchPosition((position: GeolocationPosition) => {
      const newHeading = position.coords.heading;
      if (newHeading == null) {
        setHeading(undefined);
      } else {
        setHeading(newHeading);
      }
    }, (_e: GeolocationPositionError) => {
      setHeading(undefined);
    });
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);
  return heading;
}

/**
 * Convert a heading into a CSS rotation transform.
 * @param heading The compass heading in degrees.
 * @returns A CSS style object that rotates based on {@link heading}.
 */
function styleFromHeading(heading: number) {
  return { transform: `rotate(${Math.round(-heading)}deg)` };
}

/** React component that shows the arrow of a compass. */
function CompassArrow() {
  const heading = useHeading();
  if (heading !== undefined) {
    return (
      <div className="compass-arrow" style={styleFromHeading(heading)}><IconImage size="50px" iconSpec="icon-arrow-up"></IconImage></div>
    );
  } else {
    return <div className="compass-arrow">?</div>;
  }
}

/** React component that shows a compass. */
function Compass(props: CompassProps) {
  return (
    <div className="compass-parent">
      <div className="compass">
        {props.showHeading && <CompassArrow />}
      </div>
    </div>
  );
}

/** {@link BottomPanel} React component that shows a compass. */
export function CompassBottomPanel(props: BottomPanelProps) {
  // Only show the heading if the panel is open so that location watching doesn't get started if the
  // user doesn't open the panel, and doesn't run while the panel is closed. Note that the first
  // time location watching is enabled, it may ask the user for location permissions.
  return (
    <BottomPanel {...props} className="compass-bottom-panel">
      <Compass showHeading={props.isOpen} />
    </BottomPanel>
  );
}
