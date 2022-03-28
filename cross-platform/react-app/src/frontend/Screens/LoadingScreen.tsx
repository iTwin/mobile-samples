/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { Screen } from "../Exports";
import "./LoadingScreen.scss";

/// React component that shows while the application is doing its initial loading of iModelJS and iTwinMobileUI.
export function LoadingScreen() {
  return (
    <Screen>
      <div className="loading-screen">
        Loading...
        <div className="message">Note: this screen shows before the i18next used by iModelJS has been initialized.</div>
        <div className="message">That should happen fast enough that you don&apos;t need to show text to the user, but this cannot be localized.</div>
      </div>
    </Screen>
  );
}
