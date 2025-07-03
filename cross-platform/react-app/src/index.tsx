/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { createRoot } from "react-dom/client";
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
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found.");
  }
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ImportedApp />
    </React.StrictMode>,
  );
}

void render();
