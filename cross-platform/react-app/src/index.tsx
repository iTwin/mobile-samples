/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import ReactDOM from "react-dom";
import "./index.css";

async function importBuildTarget() {
  if (process.env.REACT_APP_BUILD_TARGET === "Camera") {
    const { CameraSampleApp } = await import("./frontend/CameraSample/CameraSampleApp");
    return CameraSampleApp;
  } else {
    const { App } = await import("./frontend/App");
    return App;
  }
}

async function render() {
  const ImportedApp = await importBuildTarget();
  ReactDOM.render(
    <React.StrictMode>
      <ImportedApp />
    </React.StrictMode>,
    document.getElementById("root"),
  );
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
render();
