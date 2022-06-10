/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import { App, CameraSampleApp } from "./frontend/App";

ReactDOM.render(
  <React.StrictMode>
    <CameraSampleApp />
    {/* <App /> */}
  </React.StrictMode>,
  document.getElementById("root"),
);
